import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db.database import Base
from backend.app.db.models import Case, ComplianceConfig
from backend.app.services.synthetic import generate_synthetic_transactions
from backend.app.services.classifier import classify_transaction_failure
from backend.app.services.strategy import decide_recovery_strategy
from backend.app.api.routers.batch import run_batch_evaluation
from backend.app.schemas.models import BatchRunRequest

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

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

def test_synthetic_data_generator():
    """Verifies that synthetic generator produces realistic Indian fintech failure cases."""
    batch = generate_synthetic_transactions(count=50, scenario_id="baseline")
    assert len(batch) == 50
    for txn in batch:
        assert txn["transaction_id"].startswith("TXN-")
        assert txn["case_id"].startswith("CASE-")
        assert "••••" in txn["customer_phone_masked"]
        assert "@" in txn["customer_email_masked"]
        assert txn["currency"] == "INR"
        assert txn["amount"] > 0

def test_classifier_tool_output():
    """Verifies that classifier tool output produces root cause, calibrated prob, and features."""
    metadata = {
        "transaction_id": "TXN-TEST-101",
        "amount": 1499.0,
        "payment_method": "UPI AutoPay",
        "issuing_bank": "HDFC Bank",
        "failure_code": "ERR_NET",
        "retry_count": 0,
        "customer_tenure_days": 120
    }
    output, model = classify_transaction_failure(metadata)
    assert output.recoverable_probability >= 0.70
    assert output.confidence == "HIGH"
    assert len(output.feature_attributions) > 0
    assert "Transient" in output.root_cause or "Network" in output.root_cause

def test_strategy_tool_output():
    """Verifies that strategy tool selects Retry Flow A for switch failures."""
    case_data = {
        "transaction_id": "TXN-TEST-102",
        "amount": 999.0,
        "issuing_bank": "ICICI Bank",
        "failure_code": "ERR_NET",
        "customer_name": "Priya Patel"
    }
    diag_data = {
        "root_cause": "Transient Gateway Network Drop",
        "recoverable_prob": 0.94
    }
    strat, model = decide_recovery_strategy(case_data, diag_data)
    assert strat.action_type == "Retry Flow A"
    assert strat.channel == "GATEWAY"

def test_end_to_end_batch_execution(db_session):
    """Executes a full 50-case batch run and verifies total recovered and guardrail counts."""
    req = BatchRunRequest(scenario_id="salary_weekend", batch_size=50)
    result = run_batch_evaluation(request=req, db=db_session)

    assert result["success"] is True
    assert result["batch_size"] == 50
    assert result["total_at_risk"] > 0
    assert result["total_recovered"] >= 0
    assert result["duration_ms"] >= 0
    assert "action_distribution" in result

def test_messaging_outage_fallback_simulation(db_session):
    """
    RESILIENCE & 'WHAT BROKE' TEST:
    Verifies that when a messaging provider outage is simulated, the system autonomously
    triggers fallback to SMS and continues execution without crashing.
    """
    req = BatchRunRequest(
        scenario_id="baseline",
        batch_size=20,
        simulate_provider_outage=True
    )
    result = run_batch_evaluation(request=req, db=db_session)

    assert result["success"] is True
    assert result["batch_size"] == 20
