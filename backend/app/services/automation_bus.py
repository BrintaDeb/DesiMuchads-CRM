import uuid
from datetime import datetime, timedelta, date
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import logging

from app.models.models import (
    Task,
    ContentCalendarItem,
    Invoice,
    Client,
    User,
    Notification,
    AutomationAuditLog,
)
from app.models.enums import (
    TaskStatus,
    TaskPriority,
    ContentApprovalStatus,
    InvoiceStatus,
    UserRole,
    ClientStatus,
)
from app.services.dag_engine import dag_engine
from app.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)


class AutomationEventBus:
    """
    Event-driven rules engine implementing automated agency rules:
    - Rule 1: Task Handoff (Copywriting Done -> Design Unlocked & Notified)
    - Rule 2: Client Approval Loop (Internal QA passed -> 1-click portal notification)
    - Rule 3: SLA Escalation (Overdue >4h High Priority -> Critical + AM alert)
    - Rule 4: Overdue Retainer Invoice Gating (>7 days overdue -> Pause non-critical workflows)
    """

    @staticmethod
    async def on_task_completed(db: AsyncSession, completed_task: Task) -> List[str]:
        logs = []
        # Rule 1: Unlock downstream DAG dependencies
        unlocked_tasks = await dag_engine.unlock_downstream_dependencies(db, completed_task)
        for ut in unlocked_tasks:
            msg = f"DAG Rule 1 Executed: Dependency completed. Unlocked task '{ut.title}' (Status -> TODO)."
            logs.append(msg)

            # If assignee exists, notify them
            if ut.assigned_to_id:
                notif = Notification(
                    user_id=ut.assigned_to_id,
                    title="🔓 Task Unlocked for You",
                    message=f"Prerequisite '{completed_task.title}' was completed. You can now work on '{ut.title}'.",
                    category="AUTOMATION",
                    link=f"/tasks/{ut.id}",
                )
                db.add(notif)
                await ws_manager.send_personal_message(
                    {
                        "type": "NOTIFICATION",
                        "title": "Task Unlocked",
                        "message": f"Task '{ut.title}' is ready.",
                    },
                    str(ut.assigned_to_id),
                )

        # Broadcast task board refresh
        await ws_manager.broadcast({
            "type": "TASK_UPDATED",
            "task_id": str(completed_task.id),
            "status": completed_task.status.value,
        })
        return logs

    @staticmethod
    async def on_content_moved_to_client_review(db: AsyncSession, item: ContentCalendarItem) -> str:
        # Rule 2: Client Approval Loop
        # Fetch client
        q = select(Client).where(Client.id == item.client_id)
        res = await db.execute(q)
        client = res.scalar_one_or_none()

        action_msg = f"Rule 2 Executed: Content '{item.title}' ready for client. Dispatched review link to {client.contact_email if client else 'Client Portal'}."

        # Fetch client portal user to send notification
        if client:
            user_q = select(User).where(User.email == client.contact_email)
            u_res = await db.execute(user_q)
            client_user = u_res.scalar_one_or_none()
            if client_user:
                notif = Notification(
                    user_id=client_user.id,
                    title="🎨 New Deliverable Ready for Review",
                    message=f"'{item.title}' is ready for your review and approval.",
                    category="APPROVAL",
                    link=f"/client-portal/approvals/{item.id}",
                )
                db.add(notif)
                await ws_manager.send_personal_message(
                    {
                        "type": "CLIENT_APPROVAL_REQUIRED",
                        "item_id": str(item.id),
                        "title": item.title,
                    },
                    str(client_user.id),
                )

        return action_msg

    @staticmethod
    async def check_sla_escalations(db: AsyncSession) -> List[str]:
        # Rule 3: SLA Escalation
        now = datetime.utcnow()
        overdue_threshold = now - timedelta(hours=4)

        query = select(Task).where(
            Task.status.in_([TaskStatus.IN_PROGRESS, TaskStatus.TODO, TaskStatus.INTERNAL_QA]),
            Task.priority == TaskPriority.HIGH,
            Task.due_at <= overdue_threshold,
            Task.deleted_at.is_(None),
        )
        res = await db.execute(query)
        escalated_tasks = list(res.scalars().all())

        logs = []
        for task in escalated_tasks:
            task.priority = TaskPriority.CRITICAL
            msg = f"Rule 3 SLA Escalation: Task '{task.title}' overdue by >4h. Escalated to CRITICAL."
            logs.append(msg)

            audit = AutomationAuditLog(
                trigger_event="SLA_BREACH",
                entity_type="Task",
                entity_id=task.id,
                action_taken=msg,
                status="SUCCESS",
            )
            db.add(audit)

            # Alert assignee and account manager
            if task.assigned_to_id:
                notif = Notification(
                    user_id=task.assigned_to_id,
                    title="⚠️ SLA Breach: Priority Escalated to CRITICAL",
                    message=f"Task '{task.title}' is overdue by >4 hours and has been escalated.",
                    category="SLA_WARNING",
                    link=f"/tasks/{task.id}",
                )
                db.add(notif)

        if escalated_tasks:
            await db.commit()
            await ws_manager.broadcast({"type": "SLA_ESCALATION_TRIGGERED", "count": len(escalated_tasks)})

        return logs

    @staticmethod
    async def enforce_invoice_gating(db: AsyncSession) -> List[str]:
        # Rule 4: Overdue Invoice Gating
        seven_days_ago = date.today() - timedelta(days=7)
        query = select(Invoice).where(
            Invoice.status == InvoiceStatus.SENT,
            Invoice.due_date <= seven_days_ago,
        )
        res = await db.execute(query)
        overdue_invoices = list(res.scalars().all())

        logs = []
        for inv in overdue_invoices:
            inv.status = InvoiceStatus.OVERDUE
            # Mark client as paused if more than 14 days or alert
            client_q = select(Client).where(Client.id == inv.client_id)
            c_res = await db.execute(client_q)
            client = c_res.scalar_one_or_none()
            if client and client.status == ClientStatus.ACTIVE:
                client.status = ClientStatus.PAUSED
                msg = f"Rule 4 Invoice Gating: Client '{client.company_name}' paused due to overdue invoice {inv.invoice_number}."
                logs.append(msg)
                audit = AutomationAuditLog(
                    trigger_event="INVOICE_OVERDUE",
                    entity_type="Client",
                    entity_id=client.id,
                    action_taken=msg,
                    status="SUCCESS",
                )
                db.add(audit)

        if overdue_invoices:
            await db.commit()

        return logs

    @staticmethod
    async def check_deal_decay(db: AsyncSession) -> List[str]:
        """
        Follow-up Decay Daemon:
        Identifies open opportunities untouched for >48 hours and alerts the assigned Account Manager.
        """
        now = datetime.utcnow()
        decay_threshold = now - timedelta(hours=48)

        query = select(Client).where(
            Client.deal_stage.notin_([ClientStatus.ACTIVE, ClientStatus.CHURNED]),
            Client.last_activity_at <= decay_threshold,
            Client.deleted_at.is_(None),
        )
        res = await db.execute(query)
        decaying = list(res.scalars().all())

        logs = []
        for c in decaying:
            msg = f"Deal Decay Alert: Opportunity '{c.company_name}' in stage {c.deal_stage} untouched for >48h."
            logs.append(msg)

            if c.account_manager_id:
                notif = Notification(
                    user_id=c.account_manager_id,
                    title="⚠️ Deal Stalled: Follow-up Overdue",
                    message=f"Opportunity '{c.company_name}' has had no activity for over 48 hours. Schedule follow-up.",
                    category="DEAL_DECAY",
                    link="/crm",
                )
                db.add(notif)

        if decaying:
            await db.commit()
            await ws_manager.broadcast({"type": "DEAL_DECAY_ALERT", "count": len(decaying)})

        return logs


automation_bus = AutomationEventBus()

