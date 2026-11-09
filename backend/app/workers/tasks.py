import asyncio
from datetime import datetime, timedelta, date
from sqlalchemy import select, update
from app.workers.celery_app import celery
from app.core.database import AsyncSessionLocal
from app.models.models import AttendanceLog, Task, Invoice, Client, Notification, AutomationAuditLog
from app.models.enums import AttendanceStatus, TaskPriority, TaskStatus, InvoiceStatus, ClientStatus
from app.services.automation_bus import automation_bus
import logging

logger = logging.getLogger(__name__)


def run_async(coro):
    """Utility to run async database coroutine inside Celery sync worker."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


@celery.task(name="app.workers.tasks.regularize_idle_attendance_task")
def regularize_idle_attendance_task():
    """
    Detects open attendance sessions exceeding 12 hours without checkout,
    flags them as REGULARIZATION_NEEDED, and alerts manager.
    """
    async def _execute():
        async with AsyncSessionLocal() as db:
            now = datetime.utcnow()
            twelve_hours_ago = now - timedelta(hours=12)

            query = select(AttendanceLog).where(
                AttendanceLog.clock_out_at.is_(None),
                AttendanceLog.clock_in_at <= twelve_hours_ago,
                AttendanceLog.status.in_([AttendanceStatus.ACTIVE, AttendanceStatus.ON_BREAK]),
            )
            res = await db.execute(query)
            idle_logs = res.scalars().all()

            for log in idle_logs:
                log.status = AttendanceStatus.REGULARIZATION_NEEDED
                log.clock_out_at = now
                log.net_worked_seconds = int((now - log.clock_in_at).total_seconds()) - log.total_break_seconds

                # Notify user
                notif = Notification(
                    user_id=log.user_id,
                    title="⚠️ Attendance Flagged: Regularization Needed",
                    message="Your attendance session exceeded 12 hours without clocking out and has been flagged for regularization.",
                    category="SLA_WARNING",
                    link="/attendance",
                )
                db.add(notif)

            if idle_logs:
                await db.commit()
                logger.info(f"Regularized {len(idle_logs)} idle attendance sessions.")

    return run_async(_execute())


@celery.task(name="app.workers.tasks.check_sla_escalations_task")
def check_sla_escalations_task():
    """
    Checks for high priority tasks overdue by >4 hours and escalates them to CRITICAL.
    """
    async def _execute():
        async with AsyncSessionLocal() as db:
            logs = await automation_bus.check_sla_escalations(db)
            logger.info(f"SLA Escalation daemon processed: {logs}")
            return logs

    return run_async(_execute())


@celery.task(name="app.workers.tasks.enforce_invoice_gating_task")
def enforce_invoice_gating_task():
    """
    Checks for overdue invoices (>7 days past due) and gates client accounts.
    """
    async def _execute():
        async with AsyncSessionLocal() as db:
            logs = await automation_bus.enforce_invoice_gating(db)
            logger.info(f"Invoice gating daemon processed: {logs}")
            return logs

    return run_async(_execute())

