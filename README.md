# Recovery Copilot

> **AI-powered revenue recovery console for Indian fintech platforms.** Diagnoses failed UPI AutoPay, eNACH mandates, and card transactions using LLM tool-calling, applies strict compliance guardrails, and autonomously dispatches recovery actions with a complete decision audit trail.

[![CI](https://github.com/yourusername/recovery-copilot/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/recovery-copilot/actions)

---

## What It Does

Failed payment recovery at scale involves three hard problems:
1. **Why did this payment fail?** — The failure codes are ambiguous (ERR_NET could be a 30-second blip or a bank holiday outage).
2. **What's the best recovery action?** — Retry immediately? Send a WhatsApp link? Escalate to Tier-2 ops?
3. **Is this action even allowed?** — DND customers, frozen accounts, and high-value mandates have hard compliance constraints.

Recovery Copilot solves all three with a sequential AI agent pipeline:

```
Transaction Failure → Classify Root Cause (LLM) → Evaluate Compliance Guardrails
→ Decide Recovery Strategy (LLM) → Write Audit Log → Execute Action
→ Dashboard KPIs + Decision Chain Viewer
```

---

## Architecture

```
┌──────────────────────────────────┐    ┌───────────────────────────────┐
│   React 19 + Vite + Tailwind     │◄──►│   FastAPI + SQLAlchemy        │
│   (Port 3000)                    │    │   (Port 8000)                 │
│                                  │    │                               │
│  • DashboardView (MetricHero)    │    │  services/                    │
│  • EventDrillDown (DecisionChain)│    │    classifier.py  (Claude)    │
│  • AutomationView (Guardrails)   │    │    compliance.py  (Guardrails)│
│  • ModelPerformanceView          │    │    strategy.py    (Claude)    │
│  • BatchRunner                   │    │    actions.py     (Razorpay)  │
└──────────────────────────────────┘    │    scheduler.py   (APScheduler│
                                        │    audit.py       (Immutable) │
                                        │                               │
                                        │  SQLite (recovery_copilot.db) │
                                        └───────────────────────────────┘
```

**Deliberate SQLite choice:** Zero-config embedded database for buildathon portability. SQLAlchemy ORM means a 1-line `DATABASE_URL` change migrates to Postgres in production.

---

## Synthetic vs Real Data

| Component | Type | Notes |
|---|---|---|
| Transaction failures | **Synthetic** | 50–150 realistic cases generated per batch run |
| LLM diagnosis | **Real API** | Claude 3.5 Sonnet (Anthropic) or heuristic fallback |
| Payment retry | **Razorpay test-mode** | Sandbox only — no real money moved |
| Messaging delivery | **Mock** | Logs to DB; no real WhatsApp/SMS/Email sent |
| Customer PII | **Synthetic** | Names from Indian name pool, masked phone/email |

---

## Quick Start

### Prerequisites
- Python 3.13+
- Node.js 20+

### 1. Clone & Configure
```bash
git clone https://github.com/yourusername/recovery-copilot.git
cd recovery-copilot
cp .env.example .env
# Fill in ANTHROPIC_API_KEY and/or GEMINI_API_KEY in .env
```

### 2. Backend
```bash
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
# → API docs at http://localhost:8000/docs
```

### 3. Frontend
```bash
npm install
npm run dev
# → Dashboard at http://localhost:3000
```

### 4. Run Tests
```bash
python -m pytest backend/tests -v
```

---

## API Reference

Interactive Swagger docs available at `http://localhost:8000/docs` when running locally.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/batch/run` | Run full recovery pipeline batch |
| `GET` | `/api/cases` | List all cases (filterable) |
| `GET` | `/api/cases/{id}` | Full case detail + audit trail |
| `GET` | `/api/metrics/summary` | Dashboard KPI aggregations |
| `GET` | `/api/compliance/config` | Current guardrail thresholds |
| `PUT` | `/api/compliance/config` | Update guardrail thresholds (Admin) |
| `GET` | `/api/audit` | Audit trail explorer |

---

## Compliance Guardrails

Enforced in strict order before any automated action:
1. **Opt-Out / DND Hard Block** — Customer opted out → immediate Stand Down
2. **Regulatory Account Freeze** (`ERR_FROZEN`) → immediate Stand Down
3. **High-Value Escalation** (≥ ₹10,000) → Human Ops queue
4. **Max Retry Exhaustion** (≥ 3 retries) → Escalate
5. **24h Frequency Cap** (≥ 3 outreaches) → Pause

See [SECURITY.md](./SECURITY.md) for full compliance reference.
See [WHAT_BROKE.md](./WHAT_BROKE.md) for incident narrative.

---

## Team & Submission
- **Demo Link:** *(Add your deployed URL here)*
- **Pitch Video:** *(Add your video link here)*
- **Architecture Doc:** [ARCHITECTURE.md](./ARCHITECTURE.md)
