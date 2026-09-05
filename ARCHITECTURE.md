# Recovery Copilot — Architecture Document

## Problem Statement

Indian SaaS and fintech platforms lose an estimated 8–15% of recurring revenue to failed UPI AutoPay mandates, eNACH debit failures, and card charge declines. Each failure requires a human judgment call: *Is this recoverable? When? How? Via which channel?*

Recovery Copilot automates this judgment with an AI agent pipeline, wrapping it in hard compliance guardrails to prevent regulatory violations on every decision.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RECOVERY COPILOT SYSTEM                              │
│                                                                              │
│  ┌──────────────────────────────────────┐                                    │
│  │        React 19 Frontend             │                                    │
│  │        (Vite, TailwindCSS v4)        │                                    │
│  │                                      │                                    │
│  │  DashboardView ── MetricHero         │       ┌──────────────────────────┐ │
│  │  EventsView ──── CaseFeedTable       │       │  FastAPI Backend          │ │
│  │  EventDrillDown ─ DecisionChain      │◄─────►│  (Python 3.13, port 8000)│ │
│  │  AutomationView ─ Guardrail Config   │  REST │                          │ │
│  │  ModelPerformanceView                │  JSON │  /api/batch/run          │ │
│  │  BatchRunner (Live + Simulation)     │       │  /api/cases              │ │
│  └──────────────────────────────────────┘       │  /api/metrics/summary    │ │
│                                                  │  /api/compliance/config  │ │
│  ┌─────────────────────────────────────┐         │  /api/audit              │ │
│  │  Offline Simulation Engine          │         └──────────┬───────────────┘ │
│  │  (src/services/executionEngine.ts)  │                    │                 │
│  │  Identical scenario logic,          │         ┌──────────▼───────────────┐ │
│  │  runs client-side when API offline  │         │  Services Pipeline        │ │
│  └─────────────────────────────────────┘         │                          │ │
│                                                  │  synthetic.py            │ │
└─────────────────────────────────────────────────│  classifier.py (Claude)  │─┘
                                                   │  compliance.py           │
                                                   │  strategy.py (Claude)    │
                                                   │  actions.py (Razorpay)   │
                                                   │  scheduler.py (APSched.) │
                                                   │  audit.py (Immutable)    │
                                                   └──────────┬───────────────┘
                                                              │
                                                   ┌──────────▼───────────────┐
                                                   │  SQLite (SQLAlchemy)     │
                                                   │                          │
                                                   │  cases                   │
                                                   │  diagnoses               │
                                                   │  actions                 │
                                                   │  promises                │
                                                   │  audit_log               │
                                                   │  opt_outs                │
                                                   │  outreach_counters       │
                                                   │  compliance_config       │
                                                   └──────────────────────────┘
```

---

## Agent Pipeline (Phase 1 & 2)

Each failed transaction flows through this sequential pipeline:

```
INGESTION
    │  Raw transaction payload (amount, bank, failure code, retry count)
    ▼
CLASSIFY_FAILURE  ──── Claude 3.5 Sonnet (tool call)
    │                  OR Gemini Flash (rate-limit fallback)
    │                  OR Heuristic Engine (offline fallback)
    │  Output: { root_cause, confidence, recoverable_prob, reasoning, feature_attributions }
    ▼
AUDIT_LOG (DIAGNOSIS_COMPLETED)  ◄── Written BEFORE any action
    ▼
COMPLIANCE_GUARDRAILS  ──── SEQUENTIAL, ALL MUST PASS
    │  1. Opt-Out / DND Hard Block      → BLOCKED: Stand Down
    │  2. Regulatory Account Freeze     → BLOCKED: Stand Down
    │  3. High-Value Escalation (≥₹10K) → ESCALATED: Human Review
    │  4. Max Retry Exhaustion (≥3)     → ESCALATED: Human Review
    │  5. 24h Frequency Cap (≥3 msgs)   → BLOCKED: Stand Down
    ▼
AUDIT_LOG (GUARDRAIL_EVALUATION)  ◄── Written regardless of pass/fail
    ▼
DECIDE_RECOVERY_ACTION  ──── Claude 3.5 Sonnet (tool call) OR Heuristic Engine
    │  Output: { action_type, channel, message_body, delay_hours, rationale }
    ▼
AUDIT_LOG (STRATEGY_DECIDED + ACTION_DISPATCH_INITIATED)  ◄── Written BEFORE execution
    ▼
EXECUTE_ACTION
    │  ├── Retry Flow A/B/Soft  → Razorpay Test API Capture
    │  ├── WhatsApp Prompt      → Mock Provider (+ SMS fallback on outage)
    │  ├── SMS Prompt           → Mock Provider
    │  ├── Email Prompt         → Mock Provider
    │  ├── Promise to Pay       → APScheduler follow-up registered
    │  ├── Escalate             → Ops Queue entry
    │  └── Stand Down           → No action taken, case closed BLOCKED
    ▼
AUDIT_LOG (ACTION_COMPLETED)  ◄── Written with result & recovered amount
    ▼
CASE STATUS UPDATE  → RECOVERED / IN_PROGRESS / ESCALATED / BLOCKED / FAILED
```

---

## LLM Tool-Calling Architecture

### Tool 1: `classify_failure`
```json
{
  "name": "classify_failure",
  "input": "{ transaction_id, failure_code, amount, bank, retry_count, tenure_days }",
  "output": {
    "root_cause": "Transient Gateway Network Drop",
    "confidence": "HIGH",
    "recoverable_probability": 0.94,
    "reasoning": "Chain-of-thought explanation...",
    "feature_attributions": [{ "name": "gateway_health", "weight": 0.48, "impact": "positive" }]
  }
}
```

### Tool 2: `decide_recovery_action`
```json
{
  "name": "decide_recovery_action",
  "input": "{ case, diagnosis }",
  "output": {
    "action_type": "Retry Flow A",
    "channel": "GATEWAY",
    "message_body": null,
    "recommended_delay_hours": 0,
    "strategy_rationale": "Transient switch timeout. Immediate reroute via backup gateway."
  }
}
```

**Model Priority:**
1. Claude 3.5 Sonnet (primary — best reasoning for structured tool calls)
2. Gemini 2.5 Flash (secondary — rate-limit protection for demo day)
3. Heuristic rule engine (offline fallback — deterministic, always available)

---

## Database Schema

| Table | Purpose |
|---|---|
| `cases` | Core failed transaction record with masked PII |
| `diagnoses` | LLM root-cause output per case |
| `actions` | Recovery action dispatched, with result payload |
| `promises` | Customer promise-to-pay commitments |
| `audit_log` | Immutable event log — Decision → Log → Action ordering |
| `opt_outs` | DND / customer opt-out registry (SHA-256 hashed only) |
| `outreach_counters` | Per-customer 24h frequency cap tracking |
| `compliance_config` | Live guardrail thresholds (configurable via Admin API) |

**SQLite** chosen for buildathon portability (zero-config). Switch to PostgreSQL via one-line `DATABASE_URL` environment variable change.

---

## Security Posture

| Concern | Implementation |
|---|---|
| PII masking | Phone, email, and card masked at ingestion in `core/security.py` |
| Opt-out lookups | Zero-knowledge SHA-256 hash comparison only |
| API authentication | `X-API-Key` header with Admin/Ops role separation |
| Secrets management | `.env` excluded from git; deployed via platform env vars |
| Test-mode isolation | `rzp_test_*` keys only; no real money moved |
| Audit tamper-resistance | `audit_log` is append-only; no UPDATE/DELETE |

---

## Deployment Plan

| Component | Platform | URL |
|---|---|---|
| Frontend | Vercel (static) | `https://recovery-copilot.vercel.app` |
| Backend API | Railway / Render | `https://recovery-copilot-api.up.railway.app` |

Frontend reads `VITE_API_URL` env var to point at the deployed backend.
