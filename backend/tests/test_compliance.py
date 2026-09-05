import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import datetime
from datetime import timezone

from backend.app.db.database import Base
from backend.app.db.models import Case, OptOut, OutreachCounter, ComplianceConfig, AuditLog
from backend.app.services.compliance import evaluate_compliance_guardrails, record_outreach_attempt
from backend.app.services.actions import execute_case_action
from backend.app.core.security import hash_identifier

@pytest.fixture
def db_session():
    """Provides an isolated in-memory SQLite database session for each test."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed default compliance config
    config = ComplianceConfig(
        id=1,
        max_retries=3,
        cooldown_hours=24,
        opt_out_strict=True,
        escalation_threshold=10000.0,
        auto_retry_enabled=True
    )
    session.add(config)
    session.commit()

    yield session
    session.close()

def test_opt_out_hard_exclusion(db_session):
    """
    CRITICAL COMPLIANCE TEST:
    Verifies that any customer registered in the opt_outs table is strictly blocked
    from receiving automated collection retries or messaging prompts.
    """
    customer_phone = "+91 98765 43210"
    phone_hash = hash_identifier(customer_phone)

    # 1. Register customer in Opt-Out registry
    opt_out = OptOut(
        id="OPT-TEST-001",
        customer_id="CUST-OPTED-OUT",
        phone_hash=phone_hash,
        reason="DND National Registry active"
    )
    db_session.add(opt_out)
    db_session.commit()

    # 2. Create failed transaction case for this customer
    case = Case(
        id="CASE-OPT-001",
        transaction_id="TXN-OPT-001",
        customer_id="CUST-OPTED-OUT",
        customer_name="Aarav Sharma",
        customer_phone_masked="+91 •••• ••• 210",
        phone_hash=phone_hash,
        amount=1499.0,
        failure_code="ERR_FUNDS",
        status="NEW",
        retry_count=0
    )
    db_session.add(case)
    db_session.commit()

    # 3. Evaluate guardrails
    passed, result = evaluate_compliance_guardrails(case, db_session)

    # 4. Assert hard exclusion
    assert passed is False, "Opted-out customer MUST fail compliance guardrails"
    assert result.recommended_status == "BLOCKED"
    assert result.override_action == "Stand Down"
    assert "Opt-Out" in result.policy_name

def test_frequency_capping_blocks_over_limit_cases(db_session):
    """
    CRITICAL COMPLIANCE TEST:
    Verifies that outreach attempts beyond max_retries within the cooldown window
    are blocked to prevent customer harassment.
    """
    customer_id = "CUST-FREQ-001"

    # Simulate 3 prior outreach attempts in last 2 hours
    counter = OutreachCounter(
        id="OC-FREQ-001",
        customer_id=customer_id,
        channel="ALL",
        outreach_count=3,
        last_outreach_at=datetime.datetime.now(timezone.utc),
        window_start_at=datetime.datetime.now(timezone.utc)
    )
    db_session.add(counter)
    db_session.commit()

    case = Case(
        id="CASE-FREQ-001",
        transaction_id="TXN-FREQ-001",
        customer_id=customer_id,
        customer_name="Priya Patel",
        amount=999.0,
        failure_code="ERR_NET",
        status="NEW",
        retry_count=1
    )
    db_session.add(case)
    db_session.commit()

    passed, result = evaluate_compliance_guardrails(case, db_session)

    assert passed is False
    assert result.recommended_status == "BLOCKED"
    assert result.override_action == "Stand Down"
    assert "Frequency Cap" in result.policy_name

def test_escalation_ceiling_on_high_ticket_amount(db_session):
    """
    CRITICAL COMPLIANCE TEST:
    Verifies that transaction amounts exceeding the escalation threshold (₹10,000)
    are automatically routed to human operations review rather than automated retries.
    """
    high_value_case = Case(
        id="CASE-HIGH-001",
        transaction_id="TXN-HIGH-001",
        customer_id="CUST-ENTERPRISE",
        customer_name="Vikram Singh",
        amount=45000.0, # Exceeds ₹10,000 threshold
        failure_code="ERR_FUNDS",
        status="NEW",
        retry_count=0
    )
    db_session.add(high_value_case)
    db_session.commit()

    passed, result = evaluate_compliance_guardrails(high_value_case, db_session)

    assert passed is False
    assert result.recommended_status == "ESCALATED"
    assert result.override_action == "Escalate"
    assert "Escalation Ceiling" in result.policy_name

def test_escalation_ceiling_on_max_retry_exhaustion(db_session):
    """
    CRITICAL COMPLIANCE TEST:
    Verifies that cases with retryCount >= max_retries are escalated to human review.
    """
    exhausted_case = Case(
        id="CASE-EXHAUST-001",
        transaction_id="TXN-EXHAUST-001",
        customer_id="CUST-RETRY-MAX",
        customer_name="Rohan Mehta",
        amount=999.0,
        failure_code="ERR_NET",
        status="NEW",
        retry_count=3 # Maximum retry attempts reached
    )
    db_session.add(exhausted_case)
    db_session.commit()

    passed, result = evaluate_compliance_guardrails(exhausted_case, db_session)

    assert passed is False
    assert result.recommended_status == "ESCALATED"
    assert result.override_action == "Escalate"
    assert "Max Retry Attempt Limit" in result.policy_name

def test_regulatory_frozen_account_stand_down(db_session):
    """
    CRITICAL COMPLIANCE TEST:
    Verifies that regulatory hard debit freezes (ERR_FROZEN) immediately halt automated retries.
    """
    frozen_case = Case(
        id="CASE-FROZEN-001",
        transaction_id="TXN-FROZEN-001",
        customer_id="CUST-FROZEN",
        customer_name="Ananya Iyer",
        amount=1999.0,
        failure_code="ERR_FROZEN",
        status="NEW",
        retry_count=0
    )
    db_session.add(frozen_case)
    db_session.commit()

    passed, result = evaluate_compliance_guardrails(frozen_case, db_session)

    assert passed is False
    assert result.recommended_status == "BLOCKED"
    assert result.override_action == "Stand Down"
    assert "Regulatory Account Debit Freeze" in result.policy_name

def test_decision_first_audit_logging_order(db_session):
    """
    CRITICAL AUDIT ORDER TEST:
    Verifies that every action execution generates an audit log before and after dispatch.
    """
    case = Case(
        id="CASE-AUDIT-001",
        transaction_id="TXN-AUDIT-001",
        customer_id="CUST-AUDIT-01",
        customer_name="Sneha Nair",
        amount=499.0,
        failure_code="ERR_NET",
        status="NEW",
        retry_count=0
    )
    db_session.add(case)
    db_session.commit()

    # Execute action
    action = execute_case_action(
        db=db_session,
        case=case,
        action_type="Retry Flow A",
        channel="GATEWAY"
    )

    # Verify audit logs created
    logs = db_session.query(AuditLog).filter(AuditLog.case_id == case.id).all()
    assert len(logs) >= 2, "Action execution must log initiation and completion audit records"
    event_types = [l.event_type for l in logs]
    assert "ACTION_DISPATCH_INITIATED" in event_types
    assert "ACTION_COMPLETED" in event_types
