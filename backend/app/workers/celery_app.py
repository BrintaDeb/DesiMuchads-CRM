from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery = Celery(
    "muchadcrm_workers",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.tasks"],
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    beat_schedule={
        "check-idle-attendance-sessions-hourly": {
            "task": "app.workers.tasks.regularize_idle_attendance_task",
            "schedule": crontab(minute="*/30"),
        },
        "check-sla-escalation-daemon": {
            "task": "app.workers.tasks.check_sla_escalations_task",
            "schedule": crontab(minute="*/15"),
        },
        "daily-invoice-gating-and-recurring-billing": {
            "task": "app.workers.tasks.enforce_invoice_gating_task",
            "schedule": crontab(hour=0, minute=0),
        },
    },
)

