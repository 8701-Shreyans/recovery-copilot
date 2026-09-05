import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from ...db.database import get_db
from ...db.models import ComplianceConfig, OptOut
from ...schemas.models import ComplianceConfigUpdate, OptOutCreate
from ...services.compliance import get_compliance_config
from ...core.auth import require_admin
from ...core.security import hash_identifier

router = APIRouter(prefix="/compliance", tags=["Compliance & Guardrails"])

@router.get("/config")
def get_config(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Returns active compliance guardrail rules and thresholds."""
    config = get_compliance_config(db)
    return {
        "max_retries": config.max_retries,
        "cooldown_hours": config.cooldown_hours,
        "opt_out_strict": config.opt_out_strict,
        "escalation_threshold": config.escalation_threshold,
        "auto_retry_enabled": config.auto_retry_enabled,
        "updated_at": config.updated_at
    }

@router.put("/config")
def update_config(
    payload: ComplianceConfigUpdate,
    db: Session = Depends(get_db),
    admin_role: str = Depends(require_admin)
) -> Dict[str, Any]:
    """Updates compliance guardrail rules. Requires Admin role."""
    config = get_compliance_config(db)
    if payload.max_retries is not None:
        config.max_retries = payload.max_retries
    if payload.cooldown_hours is not None:
        config.cooldown_hours = payload.cooldown_hours
    if payload.opt_out_strict is not None:
        config.opt_out_strict = payload.opt_out_strict
    if payload.escalation_threshold is not None:
        config.escalation_threshold = payload.escalation_threshold
    if payload.auto_retry_enabled is not None:
        config.auto_retry_enabled = payload.auto_retry_enabled

    db.commit()
    db.refresh(config)
    return {"success": True, "message": "Compliance configuration updated successfully", "config": config}

@router.get("/opt-outs")
def list_opt_outs(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Returns registered opt-outs (zero-knowledge hashes)."""
    opt_outs = db.query(OptOut).order_by(OptOut.opted_out_at.desc()).limit(100).all()
    return [
        {
            "id": o.id,
            "customer_id": o.customer_id,
            "reason": o.reason,
            "opted_out_at": o.opted_out_at
        }
        for o in opt_outs
    ]

@router.post("/opt-outs")
def register_opt_out(
    payload: OptOutCreate,
    db: Session = Depends(get_db),
    admin_role: str = Depends(require_admin)
) -> Dict[str, Any]:
    """Registers customer opt-out with SHA-256 phone/email hashes."""
    existing = db.query(OptOut).filter(OptOut.customer_id == payload.customer_id).first()
    if existing:
        return {"success": True, "message": "Customer already registered in opt-out directory", "id": existing.id}

    opt_id = f"OPT-{uuid.uuid4().hex[:6].upper()}"
    phone_hash = hash_identifier(payload.phone) if payload.phone else None
    email_hash = hash_identifier(payload.email) if payload.email else None

    entry = OptOut(
        id=opt_id,
        customer_id=payload.customer_id,
        phone_hash=phone_hash,
        email_hash=email_hash,
        reason=payload.reason or "Customer opted out via support portal"
    )
    db.add(entry)
    db.commit()
    return {"success": True, "id": opt_id, "customer_id": payload.customer_id}
