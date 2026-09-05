from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ...db.database import get_db
from ...db.models import AuditLog
from ...schemas.models import AuditLogRead

router = APIRouter(prefix="/audit", tags=["Audit Log"])

@router.get("", response_model=List[AuditLogRead])
def get_audit_trail(
    case_id: Optional[str] = Query(None, description="Filter audit trail by specific Case ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Retrieves immutable chronological audit logs."""
    query = db.query(AuditLog)
    if case_id:
        query = query.filter(AuditLog.case_id == case_id)
    if event_type:
        query = query.filter(AuditLog.event_type == event_type)

    return query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
