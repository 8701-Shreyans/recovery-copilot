import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from ..db.database import SessionLocal
from ..db.models import Promise, Case
from .audit import log_audit_event

scheduler = BackgroundScheduler()

def process_promise_follow_ups():
    """
    Scheduled job running every 60 seconds.
    Sweeps due promises, checks recovery status, and dispatches automated reminder or fulfills promise.
    """
    db = SessionLocal()
    try:
        now = datetime.datetime.utcnow()
        due_promises = db.query(Promise).filter(
            Promise.status == "PENDING",
            Promise.follow_up_scheduled_at <= now
        ).all()

        for promise in due_promises:
            case = db.query(Case).filter(Case.id == promise.case_id).first()
            if not case:
                continue

            # If case was already recovered
            if case.status == "RECOVERED":
                promise.status = "FULFILLED"
                log_audit_event(
                    db=db,
                    case_id=case.id,
                    event_type="PROMISE_FULFILLED",
                    actor="SCHEDULER_DAEMON",
                    state_before="PENDING",
                    state_after="FULFILLED",
                    payload={"promise_id": promise.id, "amount": promise.promised_amount}
                )
            else:
                # Dispatch scheduled follow-up reminder
                log_audit_event(
                    db=db,
                    case_id=case.id,
                    event_type="PROMISE_FOLLOW_UP_TRIGGERED",
                    actor="SCHEDULER_DAEMON",
                    state_before="PENDING",
                    state_after="PENDING",
                    payload={
                        "promise_id": promise.id,
                        "promise_date": promise.promise_date.strftime("%Y-%m-%d"),
                        "action": "Automated payment link reminder sent on follow-up schedule"
                    }
                )
                # Reschedule next check in 24 hours if not fulfilled
                promise.follow_up_scheduled_at = now + datetime.timedelta(days=1)

        db.commit()
    except Exception as e:
        print(f"[Scheduler] Error processing promise follow-ups: {e}")
    finally:
        db.close()

def start_scheduler():
    """Initializes and starts background APScheduler."""
    if not scheduler.running:
        scheduler.add_job(
            process_promise_follow_ups,
            trigger="interval",
            seconds=60,
            id="promise_tracker_job",
            replace_existing=True
        )
        scheduler.start()
        print("[Scheduler] APScheduler daemon started successfully.")

def shutdown_scheduler():
    """Graceful shutdown of scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("[Scheduler] APScheduler shutdown.")
