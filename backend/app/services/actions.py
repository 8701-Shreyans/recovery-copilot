import uuid
import datetime
from datetime import timezone
import random
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from ..core.config import settings
from ..db.models import Case, Action, AuditLog
from .audit import log_audit_event
from .compliance import record_outreach_attempt

class ActionExecutionResult:
    def __init__(
        self,
        success: bool,
        status: str,
        channel: str,
        message: str,
        recovered_amount: float = 0.0,
        metadata: Dict[str, Any] = None
    ):
        self.success = success
        self.status = status # EXECUTED, FAILED, FALLBACK_TRIGGERED, BLOCKED
        self.channel = channel
        self.message = message
        self.recovered_amount = recovered_amount
        self.metadata = metadata or {}

def execute_razorpay_retry(case: Case, retry_flow: str) -> ActionExecutionResult:
    """
    Simulates / triggers Razorpay test payment capture retry.
    In real test-mode: invokes Razorpay SDK client.
    """
    # Deterministic simulation based on root-cause recoverability
    is_recovered = True
    if case.failure_code == "ERR_FROZEN":
        is_recovered = False
    elif case.failure_code == "ERR_EXPIRED":
        is_recovered = random.random() < 0.25
    elif case.failure_code == "ERR_FUNDS":
        is_recovered = random.random() < 0.85
    else:
        is_recovered = random.random() < 0.92

    if is_recovered:
        return ActionExecutionResult(
            success=True,
            status="EXECUTED",
            channel="GATEWAY",
            message=f"Razorpay test payment capture successful via {retry_flow}. Bank Authorization Code: AUTH_{uuid.uuid4().hex[:6].upper()}",
            recovered_amount=case.amount,
            metadata={
                "gateway_reference": f"pay_{uuid.uuid4().hex[:14]}",
                "flow": retry_flow,
                "latency_ms": random.randint(180, 450)
            }
        )
    else:
        return ActionExecutionResult(
            success=False,
            status="FAILED",
            channel="GATEWAY",
            message="Gateway retry failed. Payment decline code: BANK_DECLINE_RETRY_LIMIT",
            recovered_amount=0.0,
            metadata={"gateway_reference": f"pay_{uuid.uuid4().hex[:14]}", "error": "BANK_DECLINE"}
        )

def dispatch_messaging_prompt(
    case: Case,
    channel: str,
    message_body: str,
    simulate_outage: bool = False
) -> ActionExecutionResult:
    """
    Simulates multi-channel communication dispatch (WhatsApp, SMS, Email).
    Features active resilience: if WhatsApp provider experiences simulated outage,
    gracefully executes SMS fallback.
    """
    # 1. Check for simulated outage (for "What Broke" narrative)
    if (simulate_outage or settings.SIMULATE_MESSAGING_OUTAGE) and channel == "WHATSAPP":
        # Outage detected -> Trigger Autonomous Fallback to SMS
        fallback_channel = "SMS"
        fallback_msg = f"[SMS Fallback] {message_body[:140]}"
        return ActionExecutionResult(
            success=True,
            status="FALLBACK_TRIGGERED",
            channel=fallback_channel,
            message=f"Primary WhatsApp API 503 Provider Outage. Autonomous Fallback to {fallback_channel} dispatched successfully.",
            metadata={
                "primary_channel": "WHATSAPP",
                "fallback_channel": fallback_channel,
                "primary_error": "WHATSAPP_PROVIDER_503_UNAVAILABLE",
                "delivery_id": f"MSG-FALLBACK-{uuid.uuid4().hex[:6].upper()}",
                "recipient": case.customer_phone_masked
            }
        )

    # 2. Normal dispatch
    delivery_id = f"MSG-{channel}-{uuid.uuid4().hex[:6].upper()}"
    return ActionExecutionResult(
        success=True,
        status="EXECUTED",
        channel=channel,
        message=f"{channel} message dispatched to {case.customer_phone_masked if channel != 'EMAIL' else case.customer_email_masked}. Delivery ID: {delivery_id}",
        metadata={
            "delivery_id": delivery_id,
            "channel": channel,
            "status": "DELIVERED",
            "body": message_body
        }
    )

def execute_case_action(
    db: Session,
    case: Case,
    action_type: str,
    channel: str,
    message_body: str = None,
    diagnosis_id: str = None,
    simulate_outage: bool = False
) -> Action:
    """
    Orchestrates execution of recovery action with strict audit tracking.
    """
    now = datetime.datetime.now(timezone.utc)
    action_id = f"ACT-{uuid.uuid4().hex[:8].upper()}"

    # Log pre-action execution intent in audit log
    log_audit_event(
        db=db,
        case_id=case.id,
        event_type="ACTION_DISPATCH_INITIATED",
        actor="ACTION_ORCHESTRATOR",
        state_before=case.status,
        state_after=case.status,
        payload={"action_type": action_type, "channel": channel, "action_id": action_id}
    )

    if action_type in ["Retry Flow A", "Retry Flow B", "Soft Retry"]:
        result = execute_razorpay_retry(case, action_type)
        record_outreach_attempt(case.customer_id, "RETRY", db)
        if result.success:
            case.status = "RECOVERED"
            case.recovered_amount = case.amount
        else:
            case.status = "FAILED"
            case.retry_count += 1

    elif action_type in ["WhatsApp Prompt", "SMS Prompt", "Email Prompt"]:
        result = dispatch_messaging_prompt(case, channel, message_body, simulate_outage)
        record_outreach_attempt(case.customer_id, channel, db)
        # Customer interactive link conversion (84% completion on recoverable failure modes)
        is_prompt_paid = (case.failure_code != "ERR_FROZEN") and (random.random() < 0.84)
        if is_prompt_paid:
            case.status = "RECOVERED"
            case.recovered_amount = case.amount
        else:
            case.status = "IN_PROGRESS"

    elif action_type == "Escalate":
        # VIP High-touch Operations Desk recovery conversion (78% success)
        is_escalation_recovered = (case.failure_code != "ERR_FROZEN") and (random.random() < 0.78)
        if is_escalation_recovered:
            case.status = "RECOVERED"
            case.recovered_amount = case.amount
            result = ActionExecutionResult(
                success=True,
                status="EXECUTED",
                channel="MANUAL_OPS",
                message="Case reviewed and settled via VIP Operations outreach.",
                recovered_amount=case.amount,
                metadata={"assigned_team": "FINTECH_OPS_TIER2", "resolution": "SETTLED"}
            )
        else:
            case.status = "ESCALATED"
            result = ActionExecutionResult(
                success=True,
                status="EXECUTED",
                channel="MANUAL_OPS",
                message="Case transferred to Tier-2 Operations escalation queue for high-touch review.",
                metadata={"assigned_team": "FINTECH_OPS_TIER2", "resolution": "PENDING_REVIEW"}
            )

    elif action_type == "Stand Down":
        result = ActionExecutionResult(
            success=True,
            status="EXECUTED",
            channel="MANUAL_OPS",
            message="Action halted due to regulatory / opt-out policy constraint.",
            metadata={"guardrail_action": "STAND_DOWN"}
        )
        case.status = "BLOCKED"

    else:
        result = ActionExecutionResult(
            success=True,
            status="EXECUTED",
            channel="MANUAL_OPS",
            message="Action processed."
        )

    # Persist Action record
    action_record = Action(
        id=action_id,
        case_id=case.id,
        diagnosis_id=diagnosis_id,
        action_type=action_type,
        channel=result.channel,
        message_body=message_body,
        status=result.status,
        result_payload=result.metadata,
        executed_at=now
    )
    db.add(action_record)
    case.updated_at = now
    db.commit()
    db.refresh(action_record)

    # Log post-action completion in audit log
    log_audit_event(
        db=db,
        case_id=case.id,
        event_type="ACTION_COMPLETED",
        actor="ACTION_ORCHESTRATOR",
        state_before="IN_PROGRESS",
        state_after=case.status,
        payload={
            "action_id": action_id,
            "status": result.status,
            "recovered_amount": case.recovered_amount,
            "message": result.message
        }
    )

    return action_record
