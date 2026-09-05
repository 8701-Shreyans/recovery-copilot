import time
import uuid
import datetime
from datetime import timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from ...db.database import get_db
from ...db.models import Case, Diagnosis, Action, ComplianceConfig, OptOut
from ...schemas.models import BatchRunRequest
from ...services.synthetic import generate_synthetic_transactions
from ...services.classifier import classify_transaction_failure
from ...services.compliance import evaluate_compliance_guardrails, get_compliance_config
from ...services.strategy import decide_recovery_strategy
from ...services.actions import execute_case_action
from ...services.audit import log_audit_event

router = APIRouter(prefix="/batch", tags=["Batch Runner"])

@router.post("/run")
def run_batch_evaluation(
    request: BatchRunRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Executes End-to-End Batch Recovery Pipeline:
    1. Ingests synthetic transactions for the requested scenario
    2. Runs Claude/Gemini root cause classification (`classify_failure`)
    3. Runs policy compliance guardrails (Opt-out, Freeze, Escalation, Frequency)
    4. Runs Strategy Agent decision (`decide_recovery_action`)
    5. Writes Decision-First Audit Trail
    6. Dispatches Action (Razorpay auto-retry, Mock WhatsApp/SMS, or Autonomous Fallback)
    7. Computes refreshed metrics
    """
    start_time = time.time()

    # Apply temporary rule overrides if provided
    config = get_compliance_config(db)
    if request.custom_rules:
        if request.custom_rules.max_retries is not None:
            config.max_retries = request.custom_rules.max_retries
        if request.custom_rules.cooldown_hours is not None:
            config.cooldown_hours = request.custom_rules.cooldown_hours
        if request.custom_rules.opt_out_strict is not None:
            config.opt_out_strict = request.custom_rules.opt_out_strict
        if request.custom_rules.escalation_threshold is not None:
            config.escalation_threshold = request.custom_rules.escalation_threshold
        db.commit()

    # Generate synthetic payload
    raw_txns = generate_synthetic_transactions(count=request.batch_size, scenario_id=request.scenario_id)

    processed_cases = []
    guardrail_interventions = []
    total_recovered = 0.0
    total_at_risk = 0.0
    action_counts: Dict[str, int] = {}

    for raw in raw_txns:
        total_at_risk += raw["amount"]

        # Ensure opt-out registry reflects synthetic flag
        if raw.get("is_opted_out"):
            opt_entry = db.query(OptOut).filter(OptOut.customer_id == raw["customer_id"]).first()
            if not opt_entry:
                opt_entry = OptOut(
                    id=f"OPT-{uuid.uuid4().hex[:6].upper()}",
                    customer_id=raw["customer_id"],
                    phone_hash=raw["phone_hash"],
                    email_hash=raw["email_hash"],
                    reason="Customer registered on National Do Not Disturb (DND) registry."
                )
                db.add(opt_entry)
                db.commit()

        # 1. Ingest Case
        case = Case(
            id=raw["case_id"],
            transaction_id=raw["transaction_id"],
            customer_id=raw["customer_id"],
            customer_name=raw["customer_name"],
            customer_phone_masked=raw["customer_phone_masked"],
            customer_email_masked=raw["customer_email_masked"],
            phone_hash=raw["phone_hash"],
            email_hash=raw["email_hash"],
            amount=raw["amount"],
            currency=raw["currency"],
            payment_method=raw["payment_method"],
            issuing_bank=raw["issuing_bank"],
            failure_code=raw["failure_code"],
            failure_raw_desc=raw["failure_raw_desc"],
            status="NEW",
            retry_count=raw["retry_count"],
            customer_tenure_days=raw["customer_tenure_days"]
        )
        db.add(case)
        db.flush()

        log_audit_event(
            db=db,
            case_id=case.id,
            event_type="INGESTION",
            actor="INGESTION_PIPELINE",
            state_before=None,
            state_after="NEW",
            payload={"amount": case.amount, "bank": case.issuing_bank, "failure_code": case.failure_code}
        )

        # 2. Classify Root Cause via LLM Tool-calling
        diagnosis_output, model_name = classify_transaction_failure({
            "transaction_id": case.transaction_id,
            "amount": case.amount,
            "payment_method": case.payment_method,
            "issuing_bank": case.issuing_bank,
            "failure_code": case.failure_code,
            "retry_count": case.retry_count,
            "customer_tenure_days": case.customer_tenure_days
        })

        diagnosis = Diagnosis(
            id=f"DIAG-{uuid.uuid4().hex[:8].upper()}",
            case_id=case.id,
            root_cause=diagnosis_output.root_cause,
            confidence=diagnosis_output.confidence,
            recoverable_prob=diagnosis_output.recoverable_probability,
            reasoning=diagnosis_output.reasoning,
            model_used=model_name,
            feature_attributions_json=[fa.model_dump() for fa in diagnosis_output.feature_attributions]
        )
        db.add(diagnosis)
        case.status = "DIAGNOSED"
        db.flush()

        log_audit_event(
            db=db,
            case_id=case.id,
            event_type="DIAGNOSIS_COMPLETED",
            actor="DIAGNOSIS_AGENT",
            state_before="NEW",
            state_after="DIAGNOSED",
            payload={
                "root_cause": diagnosis.root_cause,
                "confidence": diagnosis.confidence,
                "recoverable_prob": diagnosis.recoverable_prob,
                "model_used": model_name
            }
        )

        # 3. Compliance Guardrail Check
        guardrail_passed, compliance_res = evaluate_compliance_guardrails(case, db)

        log_audit_event(
            db=db,
            case_id=case.id,
            event_type="GUARDRAIL_EVALUATION",
            actor="COMPLIANCE_ENGINE",
            state_before="DIAGNOSED",
            state_after=compliance_res.recommended_status,
            payload=compliance_res.to_dict()
        )

        if not guardrail_passed:
            guardrail_interventions.append({
                "eventId": case.id,
                "transactionId": case.transaction_id,
                "modelIntent": "Retry Automated Collection",
                "policyBlock": compliance_res.policy_name,
                "finalAction": compliance_res.override_action or "Stand Down",
                "timestamp": datetime.datetime.now(timezone.utc).strftime("%H:%M:%S UTC"),
                "details": compliance_res.reason
            })
            action_type = compliance_res.override_action or "Stand Down"
            channel = "MANUAL_OPS"
            msg = None
        else:
            # 4. Strategy Agent Decision
            strategy_output, strat_model = decide_recovery_strategy(
                case_data={
                    "transaction_id": case.transaction_id,
                    "customer_id": case.customer_id,
                    "customer_name": case.customer_name,
                    "amount": case.amount,
                    "issuing_bank": case.issuing_bank,
                    "failure_code": case.failure_code
                },
                diagnosis_data={
                    "root_cause": diagnosis.root_cause,
                    "recoverable_prob": diagnosis.recoverable_prob
                }
            )
            action_type = strategy_output.action_type
            channel = strategy_output.channel
            msg = strategy_output.message_body

            log_audit_event(
                db=db,
                case_id=case.id,
                event_type="STRATEGY_DECIDED",
                actor="STRATEGY_AGENT",
                state_before="DIAGNOSED",
                state_after="IN_PROGRESS",
                payload={
                    "action_type": action_type,
                    "channel": channel,
                    "rationale": strategy_output.strategy_rationale
                }
            )

        # 5. Execute Action
        action_record = execute_case_action(
            db=db,
            case=case,
            action_type=action_type,
            channel=channel,
            message_body=msg,
            diagnosis_id=diagnosis.id,
            simulate_outage=request.simulate_provider_outage
        )

        if case.status == "RECOVERED" and case.recovered_amount:
            total_recovered += case.recovered_amount

        action_counts[action_type] = action_counts.get(action_type, 0) + 1
        processed_cases.append(case)

    db.commit()

    duration_ms = int((time.time() - start_time) * 1000)
    recovery_rate = (total_recovered / total_at_risk * 100) if total_at_risk > 0 else 0.0

    return {
        "success": True,
        "scenario_id": request.scenario_id,
        "batch_size": len(processed_cases),
        "duration_ms": duration_ms,
        "total_at_risk": round(total_at_risk, 2),
        "total_recovered": round(total_recovered, 2),
        "recovery_rate_pct": round(recovery_rate, 1),
        "guardrail_interventions_count": len(guardrail_interventions),
        "action_distribution": action_counts,
        "spotlight_intervention": guardrail_interventions[0] if guardrail_interventions else None
    }
