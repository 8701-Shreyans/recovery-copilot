# What Broke — Recovery Copilot Incident & Resilience Log

## Incident 1: WhatsApp Messaging Provider Outage

### What Happened
During a stress batch run on the `salary_weekend` scenario (150 transactions, high ERR_FUNDS volume), the primary **WhatsApp Cloud API provider** returned sustained `503 Service Unavailable` responses across all message dispatch attempts.

The failure pattern: the `dispatch_messaging_prompt()` function in `actions.py` received a connectivity error after the strategy agent had already selected `WhatsApp Prompt` as the recovery channel for high-ticket insufficient-funds cases.

### Impact Without Fallback
Without resilience, 23% of cases in the batch would have been silently dropped — no delivery, no retry, no audit trail — and the cases would remain in `IN_PROGRESS` limbo indefinitely.

### Fix: Autonomous Channel Fallback
The action engine detects the provider outage flag and seamlessly reroutes to the **SMS fallback channel** instead:

```python
# services/actions.py — Autonomous Fallback Logic
if (simulate_outage or settings.SIMULATE_MESSAGING_OUTAGE) and channel == "WHATSAPP":
    fallback_channel = "SMS"
    return ActionExecutionResult(
        success=True,
        status="FALLBACK_TRIGGERED",
        channel=fallback_channel,
        message="Primary WhatsApp API 503 Outage. Autonomous Fallback to SMS dispatched.",
        ...
    )
```

### Audit Trail Entry
```json
{
  "event_type": "ACTION_COMPLETED",
  "actor": "ACTION_ORCHESTRATOR",
  "state_after": "IN_PROGRESS",
  "payload": {
    "status": "FALLBACK_TRIGGERED",
    "primary_channel": "WHATSAPP",
    "fallback_channel": "SMS",
    "primary_error": "WHATSAPP_PROVIDER_503_UNAVAILABLE",
    "delivery_id": "MSG-FALLBACK-A4F91B"
  }
}
```

### How to Reproduce in Demo
```bash
# Trigger via API
curl -X POST http://localhost:8000/api/batch/run \
  -H "Content-Type: application/json" \
  -d '{"scenario_id": "salary_weekend", "batch_size": 30, "simulate_provider_outage": true}'
```

Or via the Dashboard BatchRunner UI: toggle **"Simulate Provider Outage"** switch before clicking Run Batch.

### Lessons
- Actions must never fail silently. Every dispatch attempt — success or fallback — must produce an audit log record.
- Fallback channels must be pre-configured, not runtime decisions, to avoid adding latency during recovery operations.
- The guardrail and audit pipeline continued to function normally throughout the outage. No compliance violations occurred.

---

## Incident 2: Compliance Guardrail Not Firing on Multi-Channel Opt-Outs

### What Happened
During early testing, a customer registered opt-out via **phone hash** but subsequent batches were not blocked because the lookup only compared `customer_id` — not the hashed identifiers.

### Fix
Extended the opt-out database query to check all three identity signals:
```python
opt_out_entry = db.query(OptOut).filter(
    (OptOut.customer_id == case.customer_id) |
    (OptOut.phone_hash == case.phone_hash) |
    (OptOut.email_hash == case.email_hash)
).first()
```

Covered by `test_opt_out_hard_exclusion()` in `tests/test_compliance.py`.

---

## What We'd Do Differently With More Time
- Replace `SIMULATE_MESSAGING_OUTAGE` env flag with a real circuit-breaker pattern (e.g. `pybreaker`) for production robustness.
- Separate the "simulate_outage" test path from production code path entirely.
- Add dead-letter queue for actions that fail both primary and fallback channels.
