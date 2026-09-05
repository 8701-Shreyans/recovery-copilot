# 🛡️ Recovery Copilot — AI Revenue Recovery Platform

> **AI-powered revenue recovery copilot for Indian fintech platforms.** Diagnoses failed UPI AutoPay, eNACH mandates, and card transactions using LLM tool-calling, enforces strict compliance guardrails (RBI DND/frequency caps), and autonomously dispatches recovery actions with an immutable decision audit trail.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=flat-square&logo=vercel)](https://recovery-copilot-ten.vercel.app/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Tests](https://img.shields.io/badge/pytest-11%20passed-brightgreen?style=flat-square)](https://pytest.org)

🌐 **Live Application:** [https://recovery-copilot-ten.vercel.app/](https://recovery-copilot-ten.vercel.app/)

---

## 📌 Table of Contents
1. [Overview & Problem Statement](#-overview--problem-statement)
2. [End-to-End System Architecture](#-end-to-end-system-architecture)
3. [Agent Pipeline & Tool-Calling Design](#-agent-pipeline--tool-calling-design)
4. [Security, Compliance & Guardrails](#-security-compliance--guardrails)
5. [Resilience & "What Broke" Incident Log](#-resilience--what-broke-incident-log)
6. [Synthetic vs Real Data Matrix](#-synthetic-vs-real-data-matrix)
7. [API Reference](#-api-reference)
8. [Quick Start & Local Setup](#-quick-start--local-setup)
9. [Deployment Guide (Vercel + Backend)](#-deployment-guide)

---

## 🎯 Overview & Problem Statement

Indian SaaS and fintech platforms lose an estimated **8–15% of recurring revenue** to failed UPI AutoPay mandates, eNACH debit failures, and card declines. Each failure requires a nuanced judgment call:
- *Why did this payment fail?* (e.g., transient bank switch timeout vs. structural insufficient balance vs. frozen account)
- *What is the optimal recovery action?* (immediate smart retry vs. WhatsApp nudge vs. customer payment link vs. ops escalation)
- *Is this action legally and ethically permitted?* (DND registries, frequency caps, RBI mandate recovery limits)

**Recovery Copilot** automates this entire lifecycle with a bounded, sequential AI agent pipeline backed by deterministic compliance guardrails and immutable audit logging.

```
Transaction Failure ──► Classify Root Cause (LLM) ──► Evaluate Compliance Guardrails
  ──► Decide Recovery Strategy (LLM) ──► Write Pre-Action Audit Log ──► Execute Action
  ──► Real-Time Dashboard KPIs & Decision Chain Viewer
```

---

## 🏗️ End-to-End System Architecture

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
│                                                  │  classifier.py (Claude)  │ │
│                                                  │  compliance.py           │ │
│                                                  │  strategy.py (Claude)    │ │
│                                                  │  actions.py (Razorpay)   │ │
│                                                  │  scheduler.py (APSched.) │ │
│                                                  │  audit.py (Immutable)    │ │
│                                                  └──────────┬───────────────┘ │
│                                                             │                 │
│                                                  ┌──────────▼───────────────┐ │
│                                                  │  SQLite (SQLAlchemy)     │ │
│                                                  │                          │ │
│                                                  │  cases                   │ │
│                                                  │  diagnoses               │ │
│                                                  │  actions                 │ │
│                                                  │  promises                │ │
│                                                  │  audit_log               │ │
│                                                  │  opt_outs                │ │
│                                                  │  outreach_counters       │ │
│                                                  │  compliance_config       │ │
│                                                  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Schema

| Table | Purpose |
|---|---|
| `cases` | Core failed transaction record with masked customer PII |
| `diagnoses` | LLM root-cause output per case (probabilities & feature weights) |
| `actions` | Recovery action dispatched, with execution result and channel status |
| `promises` | Customer promise-to-pay commitments and follow-up timestamps |
| `audit_log` | Immutable event log enforcing strict **Decision → Log → Action** ordering |
| `opt_outs` | DND / customer opt-out registry (zero-knowledge SHA-256 hashes only) |
| `outreach_counters` | Per-customer 24h frequency cap tracking |
| `compliance_config` | Live guardrail thresholds (configurable via Admin API) |

*Zero-config SQLite default for portability; production migration to PostgreSQL requires only updating `DATABASE_URL`.*

---

## 🧠 Agent Pipeline & Tool-Calling Design

Every failure event transitions through a 6-stage sequential agent pipeline:

```
1. INGESTION               ── Raw transaction failure event ingested
      ▼
2. CLASSIFY_FAILURE        ── LLM Tool Call (Claude 3.5 Sonnet / Gemini Flash / Heuristic)
      ▼
3. AUDIT LOG (DIAGNOSIS)   ── Written to database BEFORE any outreach or payment retry
      ▼
4. COMPLIANCE GUARDRAILS   ── 5 sequential deterministic guardrail rules (ALL MUST PASS)
      ▼
5. DECIDE_RECOVERY_STRATEGY── LLM Tool Call generates optimal channel, delay & copy
      ▼
6. EXECUTE & AUDIT         ── Razorpay Test capture / Mock messaging with automatic fallback
```

### Model Tool Specifications

#### 1. `classify_failure`
```json
{
  "name": "classify_failure",
  "input": {
    "transaction_id": "TXN-8841-UPI",
    "failure_code": "ERR_NET",
    "amount": 1499.0,
    "bank": "HDFC Bank",
    "retry_count": 0,
    "tenure_days": 120
  },
  "output": {
    "root_cause": "Transient Gateway Network Drop",
    "confidence": "HIGH",
    "recoverable_probability": 0.94,
    "reasoning": "Transient network error on prime banking rails with 0 prior retries.",
    "feature_attributions": [
      { "name": "gateway_health", "weight": 0.48, "impact": "positive" },
      { "name": "customer_tenure", "weight": 0.22, "impact": "positive" }
    ]
  }
}
```

#### 2. `decide_recovery_action`
```json
{
  "name": "decide_recovery_action",
  "input": { "case_id": "CASE-101", "root_cause": "Transient Gateway Network Drop" },
  "output": {
    "action_type": "Retry Flow A",
    "channel": "GATEWAY",
    "message_body": null,
    "recommended_delay_hours": 0,
    "strategy_rationale": "Transient switch timeout. Immediate reroute via secondary payment gateway."
  }
}
```

**Model Priority:**
1. **Claude 3.5 Sonnet** (Primary — state-of-the-art reasoning for structured tool calls)
2. **Gemini 2.5 Flash** (Secondary — fast fallback and rate-limit mitigation)
3. **Heuristic Rule Engine** (Deterministic offline fallback — always active)

---

## 🔒 Security, Compliance & Guardrails

### 1. Test-Mode & Sandbox Isolation
This project operates exclusively in sandbox/test-mode:
- Razorpay integration uses test API keys (`rzp_test_*`).
- Customer PII and transaction records are synthetically generated.
- No real monetary deductions or live banking credentials are used.

### 2. PII Masking & Zero-Knowledge Hash Storage
Customer PII is masked at ingestion before persistence or UI rendering:

| Field | Raw Value | Stored / Displayed |
|---|---|---|
| Phone Number | `+91 98765 43210` | `+91 •••• ••• 210` |
| Email Address | `aarav.sharma@email.com` | `a***r@email.com` |
| Card Number | `4111 1111 1111 1234` | `•••• •••• •••• 1234` |
| Opt-Out Lookups | Raw Phone / Email | **SHA-256 Hash Comparison Only** |

### 3. Five Strict RBI Compliance Guardrails
All guardrails run in strict order **before** an action is executed:

1. **Opt-Out Registry (DND/RBI)** — Hard block. If phone/email SHA-256 matches opt-out list, immediately `BLOCKED` with action `Stand Down`.
2. **Regulatory Account Freeze (`ERR_FROZEN`)** — Immediate stand-down. Automated retries on frozen accounts are prohibited under RBI guidelines.
3. **High-Value Escalation Ceiling** — Transactions $\ge$ ₹10,000 are escalated to human ops queue.
4. **Max Retry Exhaustion** — Cases with $\ge$ 3 retries are escalated to prevent customer harassment.
5. **24h Frequency Cap** — Maximum 3 automated outreach attempts per customer in a 24-hour rolling window.

### 4. Role-Based Access Control (RBAC)

| Role | Header | Capabilities |
|---|---|---|
| **`ops`** (Default) | `X-User-Role: ops` | View dashboard, inspect decision chains, run batch simulations |
| **`admin`** | `X-User-Role: admin` | All ops permissions + adjust guardrail thresholds & manage opt-outs |

---

## 💥 Resilience & "What Broke" Incident Log

### Incident 1: WhatsApp Messaging Provider 503 Outage
- **Issue:** During high-volume failure batches (`salary_weekend` scenario), external WhatsApp Cloud API returned sustained `503 Service Unavailable`.
- **Impact Without Fallback:** 23% of cases would have been silently dropped in `IN_PROGRESS` state.
- **Autonomous Fix:** The action engine detects provider downtime and triggers an **Autonomous Fallback to SMS**:
  ```python
  if (simulate_outage or settings.SIMULATE_MESSAGING_OUTAGE) and channel == "WHATSAPP":
      fallback_channel = "SMS"
      return ActionExecutionResult(
          success=True,
          status="FALLBACK_TRIGGERED",
          channel=fallback_channel,
          message="Primary WhatsApp API 503 Outage. Autonomous Fallback to SMS dispatched."
      )
  ```
- **Audit Trace:** An audit entry is recorded documenting the `FALLBACK_TRIGGERED` state, ensuring zero silent failures.

### Incident 2: Multi-Channel Opt-Out Bypass Resolution
- **Issue:** Opt-out checks initially matched on `customer_id` only, missing cases where an opted-out customer used a different identifier.
- **Fix:** Upgraded query to check union of `customer_id`, `phone_hash`, and `email_hash`. Verified via `test_opt_out_hard_exclusion()`.

---

## 📊 Synthetic vs Real Data Matrix

| Component | Implementation | Notes |
|---|---|---|
| Transaction Failures | **Synthetic Generator** | Generates 50–150 realistic Indian payment failure scenarios |
| LLM Diagnosis | **Real API** | Claude 3.5 Sonnet / Gemini API with heuristic fallback |
| Payment Retries | **Razorpay Test API** | Sandbox environment (`rzp_test_*`) |
| Messaging Dispatch | **Mock Engine + Resilience** | Dispatches WhatsApp/SMS/Email with fallback circuit |
| Customer PII | **Synthetic + Masked** | Indian name pool with masked emails and phone hashes |

---

## 🔌 API Reference

Interactive Swagger documentation is available at `http://localhost:8000/docs` when running the backend.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/batch/run` | Execute full AI recovery pipeline on batch scenario |
| `GET` | `/api/cases` | List all recovery cases (filterable by status/search) |
| `GET` | `/api/cases/{id}` | Detailed case record with complete decision audit chain |
| `POST` | `/api/cases/ingest` | Ingest synthetic transaction failure batch |
| `POST` | `/api/cases/promises` | Register a customer promise-to-pay commitment |
| `GET` | `/api/metrics/summary` | Dashboard KPI summary (Recovered ₹, Precision, ECE) |
| `GET` | `/api/compliance/config` | View current compliance guardrail rules |
| `PUT` | `/api/compliance/config` | Update guardrail rules (Admin role required) |
| `GET` | `/api/audit` | Query immutable audit log records |

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- **Python 3.13+**
- **Node.js 20+** & npm

### 1. Clone & Configure Environment
```bash
git clone https://github.com/8701-Shreyans/recovery-copilot.git
cd recovery-copilot
cp .env.example .env
```
*(Optional: Add your `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` in `.env` for live LLM diagnosis. If omitted, the heuristic classification engine runs automatically).*

### 2. Backend Setup
```bash
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```
- API Server: `http://localhost:8000`
- Swagger UI Docs: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
npm install
npm run dev
```
- Dashboard UI: `http://localhost:3000`

### 4. Run Test Suite
```bash
python -m pytest backend/tests -v
```
*(All 11 unit & integration tests covering compliance rules, LLM pipeline, and outage fallbacks).*

---

## 🌐 Deployment Guide

### Deploy Frontend on Vercel
1. Push your repository to GitHub.
2. Import the project into **[Vercel](https://vercel.com)**.
3. Vercel automatically detects the configuration in `vercel.json`:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Set Environment Variable *(optional)*:
   - `VITE_API_URL` = `https://your-backend-url.com/api`
5. Click **Deploy**.

### Deploy Backend API (Render / Railway / Fly.io)
1. Deploy from the same GitHub repo using Python environment.
2. **Build Command:** `pip install -r backend/requirements.txt`
3. **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
4. Set environment variables from `.env.example`.
