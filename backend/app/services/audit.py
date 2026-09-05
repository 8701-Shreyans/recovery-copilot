import uuid
import datetime
from datetime import timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from ..db.models import AuditLog

def log_audit_event(
    db: Session,
    case_id: Optional[str],
    event_type: str,
    actor: str,
    state_before: Optional[str],
    state_after: Optional[str],
    payload: Dict[str, Any]
) -> AuditLog:
    """
    Persists an immutable audit log record before/at state transitions.
    Guarantees strict Decision-First audit ordering.
    """
    log_id = f"AUDIT-{uuid.uuid4().hex[:8].upper()}"
    entry = AuditLog(
        id=log_id,
        case_id=case_id,
        event_type=event_type,
        actor=actor,
        state_before=state_before,
        state_after=state_after,
        payload_json=payload,
        timestamp=datetime.datetime.now(timezone.utc)
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
