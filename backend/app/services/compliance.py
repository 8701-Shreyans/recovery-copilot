from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from ..db.models import OptOut, OutreachCounter, ComplianceConfig, Case

class ComplianceResult:
    def __init__(self, passed: bool, policy_name: str, reason: str, recommended_status: str, override_action: Optional[str] = None):
        self.passed = passed
        self.policy_name = policy_name
        self.reason = reason
        self.recommended_status = recommended_status
        self.override_action = override_action

    def to_dict(self) -> Dict[str, Any]:
        return {
            "passed": self.passed,
            "policy_name": self.policy_name,
            "reason": self.reason,
            "recommended_status": self.recommended_status,
            "override_action": self.override_action
        }

def get_compliance_config(db: Session) -> ComplianceConfig:
    """Retrieves current compliance config or creates default."""
    config = db.query(ComplianceConfig).filter(ComplianceConfig.id == 1).first()
    if not config:
        config = ComplianceConfig(
            id=1,
            max_retries=3,
            cooldown_hours=24,
            opt_out_strict=True,
            escalation_threshold=10000.0,
            auto_retry_enabled=True
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

def evaluate_compliance_guardrails(case: Case, db: Session) -> Tuple[bool, ComplianceResult]:
    """
    Evaluates hard compliance guardrails against a transaction case:
    1. Opt-out Registry (Zero-tolerance exclusion)
    2. Regulatory Account Freeze (ERR_FROZEN Stand-down)
    3. Escalation Ceiling (Amount >= threshold or Retry count >= max_retries)
    4. Frequency Cap (Max attempts within cooldown window)
    """
    config = get_compliance_config(db)

    # 1. Opt-out Hard Exclusion
    if config.opt_out_strict:
        opt_out_entry = db.query(OptOut).filter(
            (OptOut.customer_id == case.customer_id) |
            (OptOut.phone_hash == case.phone_hash) |
            (OptOut.email_hash == case.email_hash)
        ).first()

        if opt_out_entry:
            return False, ComplianceResult(
                passed=False,
                policy_name="RBI Opt-Out & DND Compliance",
                reason=f"Customer {case.customer_id} has active communication opt-out registered on {opt_out_entry.opted_out_at.strftime('%Y-%m-%d')}.",
                recommended_status="BLOCKED",
                override_action="Stand Down"
            )

    # 2. Regulatory Account Freeze
    if case.failure_code == "ERR_FROZEN":
        return False, ComplianceResult(
            passed=False,
            policy_name="Regulatory Account Debit Freeze",
            reason="Debit operations suspended by regulatory mandate. Automated retries prohibited.",
            recommended_status="BLOCKED",
            override_action="Stand Down"
        )

    # 3. Escalation Ceiling (Amount or Retries)
    if case.amount >= config.escalation_threshold:
        return False, ComplianceResult(
            passed=False,
            policy_name="High-Value Escalation Ceiling",
            reason=f"Transaction value ₹{case.amount:,.2f} exceeds automated recovery ceiling (₹{config.escalation_threshold:,.2f}). Human review required.",
            recommended_status="ESCALATED",
            override_action="Escalate"
        )

    if case.retry_count >= config.max_retries:
        return False, ComplianceResult(
            passed=False,
            policy_name="Max Retry Attempt Limit",
            reason=f"Case has exceeded maximum permitted retries ({case.retry_count}/{config.max_retries}). Escalating to Operations.",
            recommended_status="ESCALATED",
            override_action="Escalate"
        )

    # 4. Frequency Capping / Cooldown Window
    cooldown_cutoff = datetime.now(timezone.utc) - timedelta(hours=config.cooldown_hours)
    outreach = db.query(OutreachCounter).filter(
        OutreachCounter.customer_id == case.customer_id,
        OutreachCounter.last_outreach_at >= cooldown_cutoff
    ).first()

    if outreach and outreach.outreach_count >= config.max_retries:
        return False, ComplianceResult(
            passed=False,
            policy_name="24-Hour Outreach Frequency Cap",
            reason=f"Customer received {outreach.outreach_count} outreach attempts within {config.cooldown_hours}h cooldown window. Pausing automated contact.",
            recommended_status="BLOCKED",
            override_action="Stand Down"
        )

    # All guardrails passed
    return True, ComplianceResult(
        passed=True,
        policy_name="All Guardrails Verified",
        reason="Case satisfies velocity, opt-out, and regulatory policy thresholds.",
        recommended_status="IN_PROGRESS"
    )

def record_outreach_attempt(customer_id: str, channel: str, db: Session):
    """Increments outreach counter for frequency capping."""
    now = datetime.now(timezone.utc)
    counter = db.query(OutreachCounter).filter(
        OutreachCounter.customer_id == customer_id,
        OutreachCounter.channel == channel
    ).first()

    if counter:
        counter.outreach_count += 1
        counter.last_outreach_at = now
    else:
        counter = OutreachCounter(
            id=f"OC-{customer_id[:10]}-{channel[:4]}",
            customer_id=customer_id,
            channel=channel,
            outreach_count=1,
            last_outreach_at=now,
            window_start_at=now
        )
        db.add(counter)
    db.commit()
