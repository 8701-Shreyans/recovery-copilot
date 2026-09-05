import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from .database import Base

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(64), primary_key=True, index=True) # e.g. CASE-1001-A9F
    transaction_id = Column(String(64), unique=True, index=True) # e.g. TXN-1001-HDF
    customer_id = Column(String(64), index=True) # e.g. CUST-8831
    customer_name = Column(String(128))
    customer_phone_masked = Column(String(32))
    customer_email_masked = Column(String(128))
    phone_hash = Column(String(64), index=True)
    email_hash = Column(String(64), index=True)
    
    amount = Column(Float, nullable=False)
    currency = Column(String(8), default="INR")
    payment_method = Column(String(64)) # UPI AutoPay, Visa Credit Card, eNACH Mandate, etc.
    issuing_bank = Column(String(64)) # HDFC Bank, ICICI Bank, SBI, etc.
    
    failure_code = Column(String(32), index=True) # ERR_FUNDS, ERR_NET, ERR_TIMEOUT, ERR_AUTH, ERR_FROZEN, ERR_EXPIRED, ERR_LIMIT
    failure_raw_desc = Column(String(255))
    
    status = Column(String(32), default="NEW", index=True) # NEW, DIAGNOSED, IN_PROGRESS, RECOVERED, ESCALATED, BLOCKED, FAILED
    retry_count = Column(Integer, default=0)
    customer_tenure_days = Column(Integer, default=180)
    recovered_amount = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    diagnoses = relationship("Diagnosis", back_populates="case", cascade="all, delete-orphan")
    actions = relationship("Action", back_populates="case", cascade="all, delete-orphan")
    promises = relationship("Promise", back_populates="case", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="case", cascade="all, delete-orphan")


class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id = Column(String(64), primary_key=True, index=True)
    case_id = Column(String(64), ForeignKey("cases.id"), nullable=False, index=True)
    root_cause = Column(String(128), nullable=False)
    confidence = Column(String(16), default="HIGH") # HIGH, MEDIUM, LOW
    recoverable_prob = Column(Float, nullable=False) # 0.0 to 1.0
    reasoning = Column(Text, nullable=False)
    model_used = Column(String(64), default="gemini-2.5-flash") # gemini-2.5-flash, rule-heuristic, claude-3-5-sonnet
    feature_attributions_json = Column(JSON, default=list) # [{ name, weight, impact }]
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    case = relationship("Case", back_populates="diagnoses")
    actions = relationship("Action", back_populates="diagnosis")


class Action(Base):
    __tablename__ = "actions"

    id = Column(String(64), primary_key=True, index=True)
    case_id = Column(String(64), ForeignKey("cases.id"), nullable=False, index=True)
    diagnosis_id = Column(String(64), ForeignKey("diagnoses.id"), nullable=True)
    
    action_type = Column(String(64), nullable=False) # Retry Flow A, Retry Flow B, Soft Retry, WhatsApp Prompt, SMS Prompt, Email Prompt, Escalate, Stand Down, Promise to Pay
    channel = Column(String(32), default="GATEWAY") # GATEWAY, WHATSAPP, SMS, EMAIL, MANUAL_OPS
    message_body = Column(Text, nullable=True)
    status = Column(String(32), default="PENDING") # PENDING, EXECUTED, FAILED, BLOCKED_GUARDRAIL
    result_payload = Column(JSON, default=dict)
    
    scheduled_at = Column(DateTime, nullable=True)
    executed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    case = relationship("Case", back_populates="actions")
    diagnosis = relationship("Diagnosis", back_populates="actions")


class Promise(Base):
    __tablename__ = "promises"

    id = Column(String(64), primary_key=True, index=True)
    case_id = Column(String(64), ForeignKey("cases.id"), nullable=False, index=True)
    promise_date = Column(DateTime, nullable=False)
    promised_amount = Column(Float, nullable=False)
    status = Column(String(32), default="PENDING") # PENDING, FULFILLED, BROKEN, CANCELLED
    follow_up_scheduled_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    case = relationship("Case", back_populates="promises")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(String(64), primary_key=True, index=True)
    case_id = Column(String(64), ForeignKey("cases.id"), nullable=True, index=True)
    event_type = Column(String(64), nullable=False) # INGESTION, DIAGNOSIS, GUARDRAIL_CHECK, STRATEGY_DECISION, ACTION_DISPATCH, PROMISE_LOGGED, ESCALATION
    actor = Column(String(64), default="SYSTEM_AGENT") # SYSTEM_AGENT, CLAUDE_AGENT, OPS_USER, COMPLIANCE_RULE
    state_before = Column(String(64), nullable=True)
    state_after = Column(String(64), nullable=True)
    payload_json = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    case = relationship("Case", back_populates="audit_logs")


class OptOut(Base):
    __tablename__ = "opt_outs"

    id = Column(String(64), primary_key=True, index=True)
    customer_id = Column(String(64), unique=True, index=True)
    phone_hash = Column(String(64), index=True)
    email_hash = Column(String(64), index=True)
    reason = Column(String(255), default="Customer requested communication stop")
    opted_out_at = Column(DateTime, default=datetime.datetime.utcnow)


class OutreachCounter(Base):
    __tablename__ = "outreach_counters"

    id = Column(String(64), primary_key=True, index=True)
    customer_id = Column(String(64), index=True)
    channel = Column(String(32), default="ALL") # ALL, WHATSAPP, SMS, EMAIL, RETRY
    outreach_count = Column(Integer, default=0)
    last_outreach_at = Column(DateTime, default=datetime.datetime.utcnow)
    window_start_at = Column(DateTime, default=datetime.datetime.utcnow)


class ComplianceConfig(Base):
    __tablename__ = "compliance_config"

    id = Column(Integer, primary_key=True, default=1)
    max_retries = Column(Integer, default=3)
    cooldown_hours = Column(Integer, default=24)
    opt_out_strict = Column(Boolean, default=True)
    escalation_threshold = Column(Float, default=10000.0) # INR 10,000 ceiling
    auto_retry_enabled = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
