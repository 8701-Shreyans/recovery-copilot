from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Tool Call Schemas ---

class FeatureAttribution(BaseModel):
    name: str
    weight: float
    impact: str = "positive" # positive, negative

class ClassifyFailureToolOutput(BaseModel):
    root_cause: str = Field(description="Root cause category of the transaction failure")
    confidence: str = Field(default="HIGH", description="Confidence level: HIGH, MEDIUM, LOW")
    recoverable_probability: float = Field(ge=0.0, le=1.0, description="Predicted probability of successful recovery (0.0 to 1.0)")
    reasoning: str = Field(description="Chain-of-thought explanation for this diagnosis")
    feature_attributions: List[FeatureAttribution] = Field(default_factory=list)

class DecideRecoveryActionToolOutput(BaseModel):
    action_type: str = Field(description="Selected action: Retry Flow A, Retry Flow B, Soft Retry, WhatsApp Prompt, SMS Prompt, Email Prompt, Promise to Pay, Escalate, Stand Down")
    channel: str = Field(default="GATEWAY", description="Communication/Execution channel: GATEWAY, WHATSAPP, SMS, EMAIL, MANUAL_OPS")
    message_body: Optional[str] = Field(default=None, description="Drafted customer communication message if messaging channel selected")
    recommended_delay_hours: int = Field(default=0, description="Recommended cooldown/delay before execution")
    strategy_rationale: str = Field(description="Reasoning explaining why this specific action and channel were chosen")

# --- API Request & Response Schemas ---

class CaseCreate(BaseModel):
    transaction_id: str
    customer_id: str
    customer_name: str
    customer_phone: str
    customer_email: str
    amount: float
    currency: str = "INR"
    payment_method: str
    issuing_bank: str
    failure_code: str
    failure_raw_desc: Optional[str] = None
    retry_count: int = 0
    customer_tenure_days: int = 180

class DiagnosisRead(BaseModel):
    id: str
    root_cause: str
    confidence: str
    recoverable_prob: float
    reasoning: str
    model_used: str
    feature_attributions_json: List[Dict[str, Any]]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ActionRead(BaseModel):
    id: str
    action_type: str
    channel: str
    message_body: Optional[str]
    status: str
    result_payload: Dict[str, Any]
    executed_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PromiseCreate(BaseModel):
    case_id: str
    promise_date: datetime
    promised_amount: float
    notes: Optional[str] = None

class PromiseRead(BaseModel):
    id: str
    case_id: str
    promise_date: datetime
    promised_amount: float
    status: str
    follow_up_scheduled_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AuditLogRead(BaseModel):
    id: str
    case_id: Optional[str]
    event_type: str
    actor: str
    state_before: Optional[str]
    state_after: Optional[str]
    payload_json: Dict[str, Any]
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

class CaseRead(BaseModel):
    id: str
    transaction_id: str
    customer_id: str
    customer_name: str
    customer_phone_masked: str
    customer_email_masked: str
    amount: float
    currency: str
    payment_method: str
    issuing_bank: str
    failure_code: str
    failure_raw_desc: Optional[str]
    status: str
    retry_count: int
    customer_tenure_days: int
    recovered_amount: Optional[float]
    created_at: datetime
    updated_at: datetime
    
    diagnoses: List[DiagnosisRead] = []
    actions: List[ActionRead] = []
    promises: List[PromiseRead] = []
    audit_logs: List[AuditLogRead] = []

    model_config = ConfigDict(from_attributes=True)

class ComplianceConfigUpdate(BaseModel):
    max_retries: Optional[int] = None
    cooldown_hours: Optional[int] = None
    opt_out_strict: Optional[bool] = None
    escalation_threshold: Optional[float] = None
    auto_retry_enabled: Optional[bool] = None

class OptOutCreate(BaseModel):
    customer_id: str
    phone: Optional[str] = None
    email: Optional[str] = None
    reason: Optional[str] = "Customer opted out"

class BatchRunRequest(BaseModel):
    scenario_id: str = "baseline" # baseline, salary_weekend, hdfc_degraded, upi_outage, strict_compliance
    batch_size: int = 50
    custom_rules: Optional[ComplianceConfigUpdate] = None
    simulate_provider_outage: bool = False # For "What Broke" fallback demonstration
