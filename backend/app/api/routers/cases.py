from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ...db.database import get_db
from ...db.models import Case, Diagnosis, Action, Promise, AuditLog
from ...schemas.models import CaseRead, CaseCreate, PromiseCreate, PromiseRead
from ...services.synthetic import generate_synthetic_transactions
from ...services.audit import log_audit_event
from ...core.security import mask_phone, mask_email, hash_identifier
import datetime

router = APIRouter(prefix="/cases", tags=["Cases"])

@router.get("", response_model=List[CaseRead])
def list_cases(
    status: Optional[str] = Query(None, description="Filter by status (e.g. RECOVERED, ESCALATED, BLOCKED, NEW)"),
    search: Optional[str] = Query(None, description="Search by case ID, transaction ID, bank or failure code"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Returns list of transaction failure cases with full relationships."""
    query = db.query(Case)

    if status and status != "All Statuses":
        query = query.filter(Case.status == status)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (Case.id.ilike(search_fmt)) |
            (Case.transaction_id.ilike(search_fmt)) |
            (Case.failure_code.ilike(search_fmt)) |
            (Case.issuing_bank.ilike(search_fmt)) |
            (Case.customer_name.ilike(search_fmt))
        )

    cases = query.order_by(Case.created_at.desc()).offset(offset).limit(limit).all()
    return cases

@router.get("/{case_id}", response_model=CaseRead)
def get_case_detail(case_id: str, db: Session = Depends(get_db)):
    """Retrieves full case details including diagnosis, decisions, actions, and audit trail."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.post("/ingest", response_model=List[CaseRead])
def ingest_cases(
    count: int = Query(50, ge=1, le=200),
    scenario_id: str = Query("baseline"),
    db: Session = Depends(get_db)
):
    """Ingests a synthetic/test batch of failure cases and writes them as NEW."""
    raw_txns = generate_synthetic_transactions(count=count, scenario_id=scenario_id)
    ingested_cases = []

    for item in raw_txns:
        case = Case(
            id=item["case_id"],
            transaction_id=item["transaction_id"],
            customer_id=item["customer_id"],
            customer_name=item["customer_name"],
            customer_phone_masked=item["customer_phone_masked"],
            customer_email_masked=item["customer_email_masked"],
            phone_hash=item["phone_hash"],
            email_hash=item["email_hash"],
            amount=item["amount"],
            currency=item["currency"],
            payment_method=item["payment_method"],
            issuing_bank=item["issuing_bank"],
            failure_code=item["failure_code"],
            failure_raw_desc=item["failure_raw_desc"],
            status="NEW",
            retry_count=item["retry_count"],
            customer_tenure_days=item["customer_tenure_days"]
        )
        db.add(case)
        db.flush()

        log_audit_event(
            db=db,
            case_id=case.id,
            event_type="CASE_INGESTION",
            actor="INGESTION_GATEWAY",
            state_before=None,
            state_after="NEW",
            payload={
                "amount": case.amount,
                "failure_code": case.failure_code,
                "bank": case.issuing_bank,
                "payment_method": case.payment_method
            }
        )
        ingested_cases.append(case)

    db.commit()
    return ingested_cases

@router.post("/promises", response_model=PromiseRead)
def create_promise_to_pay(payload: PromiseCreate, db: Session = Depends(get_db)):
    """Logs customer promise to pay and registers scheduled follow-up check."""
    case = db.query(Case).filter(Case.id == payload.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    promise_id = f"PROM-{datetime.datetime.utcnow().strftime('%Y%m%d')}-{case.id[-4:]}"
    follow_up_date = payload.promise_date + datetime.timedelta(hours=6)

    promise = Promise(
        id=promise_id,
        case_id=case.id,
        promise_date=payload.promise_date,
        promised_amount=payload.promised_amount,
        status="PENDING",
        follow_up_scheduled_at=follow_up_date,
        notes=payload.notes
    )
    db.add(promise)
    case.status = "IN_PROGRESS"
    db.commit()
    db.refresh(promise)

    log_audit_event(
        db=db,
        case_id=case.id,
        event_type="PROMISE_TO_PAY_LOGGED",
        actor="OPS_USER",
        state_before="NEW",
        state_after="IN_PROGRESS",
        payload={
            "promise_id": promise_id,
            "promised_amount": promise.promised_amount,
            "promise_date": promise.promise_date.strftime("%Y-%m-%d"),
            "follow_up": follow_up_date.strftime("%Y-%m-%d %H:%M")
        }
    )

    return promise
