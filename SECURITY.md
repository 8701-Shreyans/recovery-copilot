# Recovery Copilot — Security & Compliance Reference

## Test-Mode Only Declaration

> **IMPORTANT:** This project operates exclusively in sandbox/test-mode. No real payment captures, real customer PII, or live banking credentials are used at any stage. The Razorpay integration targets the test API (`rzp_test_*` keys). All customer data shown is synthetically generated.

---

## PII Masking & Data Handling

All customer Personally Identifiable Information (PII) is masked before persistence or display:

| Field | Raw Value | Stored / Displayed |
|---|---|---|
| Phone Number | `+91 98765 43210` | `+91 •••• ••• 210` |
| Email Address | `aarav.sharma@email.com` | `a***r@email.com` |
| Card Number | `4111 1111 1111 1234` | `•••• •••• •••• 1234` |
| Customer Name | `Aarav Sharma` | Displayed as-is in Ops view only |

For opt-out registry lookups, **SHA-256 hashes** of phone/email are stored. Zero raw PII is written to `opt_outs` table:

```python
# core/security.py
hashlib.sha256(normalized.encode('utf-8')).hexdigest()
```

---

## Access Control Table

| Role | Permissions |
|---|---|
| **ops** (default) | Read cases, view audit trail, trigger batch run, replay simulation |
| **admin** | All ops permissions + modify compliance thresholds, add/remove opt-outs |

Authentication is via `X-API-Key` header or `X-User-Role` for local development. Keys are defined in `.env`:
```
ADMIN_API_KEY=rc-admin-secret-key-2026
OPS_API_KEY=rc-ops-secret-key-2026
```

---

## Compliance Guardrails

All guardrails are evaluated in strict order **before** any automated action is dispatched:

1. **Opt-Out Registry (DND/RBI)** — Zero-tolerance. If customer's phone_hash or email_hash matches any `opt_outs` record, the case is immediately `BLOCKED` with action `Stand Down`. No override permitted.

2. **Regulatory Account Freeze** (`ERR_FROZEN`) — Cases where the issuing bank reports a regulatory debit freeze are immediately halted. Automated retries on frozen accounts are illegal under RBI mandate recovery guidelines.

3. **High-Value Escalation Ceiling** — Transactions ≥ ₹10,000 (configurable) are automatically escalated to human operations. Automated AI recovery is not permitted for high-ticket mandates without human sign-off.

4. **Max Retry Exhaustion** — Cases with `retry_count >= max_retries` (default: 3) are escalated. Prevents excessive retry harassment.

5. **Frequency Cap (24h Cooldown)** — Maximum 3 automated outreach attempts per customer per 24-hour window across all channels. Prevents spamming.

---

## Audit Trail Guarantee

The audit system enforces strict **Decision → Log → Execute** ordering:

```
1. INGESTION          → Case created as NEW
2. DIAGNOSIS_COMPLETED → Root cause and recoverability scored
3. GUARDRAIL_EVALUATION → All 5 guardrails checked, result logged
4. STRATEGY_DECIDED    → Recovery action selected and logged
5. ACTION_DISPATCH_INITIATED → Pre-execution intent logged
6. ACTION_COMPLETED    → Post-execution result logged with recovered amount
```

Every audit log record is immutable once written. No `UPDATE` or `DELETE` operations are performed on `audit_log` table.

---

## HTTPS on Deployed Endpoints

- Frontend: Deployed to Vercel (HTTPS enforced by default on all domains).
- Backend: Deployed to Railway/Render (HTTPS enforced by default).
- `.env` secrets are injected via platform environment variables, never committed.

---

## Secret Scanning

- `.gitignore` explicitly excludes `.env`, `.env.local`, `*.db`, `*.sqlite`.
- `.env.example` contains only placeholder values with no real credentials.
- CI pipeline runs on GitHub Actions — no secrets should appear in any log output.
