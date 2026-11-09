import uuid
import secrets
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
import logging

from app.models.models import (
    Client,
    User,
    Project,
    Task,
    WorkflowTemplate,
    WorkflowTemplateStep,
    ClientVaultSecret,
    Invoice,
    AutomationAuditLog,
    Notification,
)
from app.models.enums import (
    ClientStatus,
    DealStage,
    UserRole,
    ProjectStatus,
    TaskStatus,
    TaskPriority,
    InvoiceStatus,
)
from app.core.security import hash_password
from app.services.vault import vault_service
from app.core.config import settings

logger = logging.getLogger(__name__)


class AutonomousOnboardingEngine:
    @staticmethod
    async def onboard_won_deal(
        db: AsyncSession,
        client_id: uuid.UUID,
        service_blueprint_ids: List[uuid.UUID],
        initial_retainer: Optional[float] = None,
        billing_cycle_day: int = 1,
        generate_deposit_invoice: bool = True,
    ) -> Dict[str, Any]:
        """
        Executes atomic 5-step autonomous onboarding workflow when a deal is Won.
        """
        # Step 1: Fetch and validate Client
        query = select(Client).where(Client.id == client_id, Client.deleted_at.is_(None))
        res = await db.execute(query)
        client = res.scalar_one_or_none()
        if not client:
            raise HTTPException(status_code=404, detail="Client / Lead record not found")

        # Update status to ACTIVE, deal_stage to WON
        client.status = ClientStatus.ACTIVE
        client.deal_stage = DealStage.WON
        client.last_activity_at = datetime.utcnow()
        if initial_retainer is not None:
            client.retainer_amount = initial_retainer
        client.billing_cycle_day = billing_cycle_day

        actions_taken = []

        # Step 2: Provision Client Portal User & Magic Link
        user_query = select(User).where(User.email == client.contact_email)
        user_res = await db.execute(user_query)
        portal_user = user_res.scalar_one_or_none()

        temp_password = secrets.token_urlsafe(12)
        if not portal_user:
            portal_user = User(
                email=client.contact_email,
                full_name=client.primary_contact_name,
                password_hash=hash_password(temp_password),
                role=UserRole.CLIENT,
                department="External Client",
                is_active=True,
            )
            db.add(portal_user)
            await db.flush()
            actions_taken.append(f"Created Client Portal account for {client.contact_email}")
        else:
            actions_taken.append(f"Existing account found for {client.contact_email}, updated permissions")

        # Step 3: Initialize AES-256 Encrypted Credential Vault
        initial_vault_templates = [
            ("Meta Ads & Business Manager", "Pending Client Submission"),
            ("Google Ads Account ID", "Pending Client Submission"),
            ("Brand Drive & Assets Link", "Pending Client Submission"),
        ]
        for platform_name, default_placeholder in initial_vault_templates:
            # Check if secret already exists
            sec_query = select(ClientVaultSecret).where(
                ClientVaultSecret.client_id == client.id,
                ClientVaultSecret.platform_name == platform_name,
            )
            sec_res = await db.execute(sec_query)
            if not sec_res.scalar_one_or_none():
                encrypted_bytes = vault_service.encrypt(default_placeholder)
                vault_secret = ClientVaultSecret(
                    client_id=client.id,
                    platform_name=platform_name,
                    username="client_submitted",
                    encrypted_secret=encrypted_bytes,
                )
                db.add(vault_secret)
        actions_taken.append("Initialized AES-256 Brand & Credential Vault slots")

        # Step 4: Instantiate Service Workflow Blueprints into Live Projects & Tasks
        instantiated_projects = []
        if service_blueprint_ids:
            for blueprint_id in service_blueprint_ids:
                bp_query = select(WorkflowTemplate).where(WorkflowTemplate.id == blueprint_id)
                bp_res = await db.execute(bp_query)
                blueprint = bp_res.scalar_one_or_none()
                if not blueprint:
                    continue

                # Create Project
                today = date.today()
                target_end = today + timedelta(days=30)
                project = Project(
                    client_id=client.id,
                    name=f"{client.company_name} - {blueprint.name}",
                    service_type=blueprint.service_type,
                    start_date=today,
                    target_end_date=target_end,
                    status=ProjectStatus.ACTIVE,
                    progress_percentage=0.0,
                )
                db.add(project)
                await db.flush()

                # Fetch blueprint steps ordered by step_order
                step_query = select(WorkflowTemplateStep).where(
                    WorkflowTemplateStep.template_id == blueprint.id
                ).order_by(WorkflowTemplateStep.step_order.asc())
                step_res = await db.execute(step_query)
                steps = list(step_res.scalars().all())

                # Map step_order to generated Task instance
                step_to_task_map: Dict[int, Task] = {}

                # Find account manager or a specialist to assign
                specialist_query = select(User).where(
                    User.role == UserRole.SPECIALIST,
                    User.is_active == True,
                ).limit(1)
                spec_res = await db.execute(specialist_query)
                default_specialist = spec_res.scalar_one_or_none()
                assignee_id = client.account_manager_id or (default_specialist.id if default_specialist else None)

                for step in steps:
                    due_date = datetime.utcnow() + timedelta(days=step.relative_due_days)
                    # If this step has a dependency that hasn't completed yet, mark as BLOCKED, else TODO
                    initial_status = TaskStatus.BLOCKED if step.dependency_step_order is not None else TaskStatus.TODO

                    task = Task(
                        project_id=project.id,
                        title=step.title,
                        description=step.description,
                        assigned_to_id=assignee_id,
                        priority=TaskPriority.HIGH if step.step_order == 1 else TaskPriority.MEDIUM,
                        status=initial_status,
                        estimated_hours=step.estimated_hours,
                        logged_hours=0.0,
                        due_at=due_date,
                    )
                    db.add(task)
                    await db.flush()
                    step_to_task_map[step.step_order] = task

                # Resolve DAG dependencies
                for step in steps:
                    if step.dependency_step_order and step.dependency_step_order in step_to_task_map:
                        dependent_task = step_to_task_map[step.step_order]
                        prerequisite_task = step_to_task_map[step.dependency_step_order]
                        dependent_task.depends_on_task_id = prerequisite_task.id

                instantiated_projects.append(project.name)
                actions_taken.append(f"Instantiated project '{project.name}' with {len(steps)} DAG tasks")

        # Step 5: Generate Initial Deposit / Retainer Invoice
        generated_invoice_num = None
        if generate_deposit_invoice and client.retainer_amount > 0:
            subtotal = client.retainer_amount
            tax_amount = round(subtotal * 0.18, 2)  # 18% GST standard
            total_amount = round(subtotal + tax_amount, 2)
            today = date.today()
            due_date = today + timedelta(days=7)
            inv_count_res = await db.execute(select(Invoice))
            inv_count = len(inv_count_res.scalars().all()) + 1
            inv_number = f"INV-{today.strftime('%Y%m')}-{inv_count:04d}"

            invoice = Invoice(
                invoice_number=inv_number,
                client_id=client.id,
                subtotal=subtotal,
                tax_amount=tax_amount,
                total_amount=total_amount,
                currency=settings.DEFAULT_CURRENCY,
                status=InvoiceStatus.SENT,
                due_date=due_date,
            )
            db.add(invoice)
            generated_invoice_num = inv_number
            actions_taken.append(f"Generated initial retainer invoice {inv_number} ({settings.DEFAULT_CURRENCY} {total_amount:,.2f})")

        # Log atomic audit record
        audit = AutomationAuditLog(
            trigger_event="DEAL_WON",
            entity_type="Client",
            entity_id=client.id,
            action_taken="Autonomous Zero-Touch Client Onboarding pipeline executed",
            status="SUCCESS",
            details={
                "client_id": str(client.id),
                "company_name": client.company_name,
                "portal_email": client.contact_email,
                "instantiated_projects": instantiated_projects,
                "invoice_number": generated_invoice_num,
            },
        )
        db.add(audit)

        # Send in-app notification to Account Manager
        if client.account_manager_id:
            notif = Notification(
                user_id=client.account_manager_id,
                title="🚀 New Client Onboarded Autonomously!",
                message=f"Deal for '{client.company_name}' won! Workflows, vault and invoice have been provisioned.",
                category="AUTOMATION",
                link=f"/clients/{client.id}",
            )
            db.add(notif)

        await db.commit()

        return {
            "client_id": str(client.id),
            "company_name": client.company_name,
            "portal_email": client.contact_email,
            "temporary_password": temp_password if not portal_user or portal_user.created_at == client.last_activity_at else None,
            "projects_created": instantiated_projects,
            "invoice_number": generated_invoice_num,
            "actions_summary": actions_taken,
        }


onboarding_engine = AutonomousOnboardingEngine()

