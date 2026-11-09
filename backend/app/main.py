import uuid
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, date, timedelta
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.core.security import hash_password
from app.models.models import (
    User,
    Client,
    WorkflowTemplate,
    WorkflowTemplateStep,
    Project,
    Task,
    ContentCalendarItem,
    Invoice,
    CalendarEvent,
    AutomationRule,
)
from app.models.enums import (
    UserRole,
    ClientStatus,
    DealStage,
    ServiceType,
    ProjectStatus,
    TaskStatus,
    TaskPriority,
    ContentPlatform,
    ContentType,
    ContentApprovalStatus,
    CalendarEventType,
    InvoiceStatus,
)
from app.core.permissions import ALL_PERMISSION_IDS, get_default_permissions_for_role

# API Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.attendance import router as attendance_router
from app.api.v1.crm import router as crm_router
from app.api.v1.projects import router as projects_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.content_calendar import router as content_router
from app.api.v1.master_calendar import router as master_calendar_router
from app.api.v1.billing import router as billing_router
from app.api.v1.vault import router as vault_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.ai import router as ai_router
from app.api.v1.assets import router as assets_router
from app.api.v1.users import router as users_router
from app.api.v1.automations import router as automations_router
from app.api.v1.lead_engine import router as lead_engine_router
from app.api.v1.bulk_messaging import router as bulk_messaging_router
from app.api.v1.websocket import router as ws_router
from app.services.attendance_service import attendance_service
from app.services.automation_bus import automation_bus

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_initial_agency_data():
    """
    Seeds initial default data for 'The Desi Muchads' if database is fresh.
    """
    async with AsyncSessionLocal() as session:
        # 1. Check if Super Admin exists
        admin_res = await session.execute(select(User).where(User.email == "admin@desimuchads.com"))
        admin_user = admin_res.scalar_one_or_none()

        if admin_user:
            admin_user.can_manage_automations = True
            admin_user.can_edit_projects = True
            admin_user.can_manage_billing = True
            admin_user.permissions = ALL_PERMISSION_IDS
            if not admin_user.employee_id:
                admin_user.employee_id = "DM-ADMIN-001"
            if not admin_user.phone:
                admin_user.phone = "+91 98765 00001"

            # Ensure other existing users have permissions, employee IDs and phone numbers
            all_users_res = await session.execute(select(User))
            for idx, u in enumerate(all_users_res.scalars().all()):
                if not u.employee_id:
                    u.employee_id = f"DM-EMP-{str(u.id)[:4].upper()}"
                if not u.phone:
                    u.phone = f"+91 98765 0000{idx + 1}"
                if not u.permissions:
                    u.permissions = get_default_permissions_for_role(
                        role=u.role,
                        can_manage_automations=u.can_manage_automations,
                        can_edit_projects=u.can_edit_projects,
                        can_manage_billing=u.can_manage_billing,
                    )
            # Also check if demo automation rules need seeding
            rule_check = await session.execute(select(AutomationRule))
            if not rule_check.scalars().first():
                demo_rules = [
                    AutomationRule(
                        name="AI Creative Hook Generator on Task Ingestion",
                        description="Automatically triggers Gemini AI hook studio whenever a creative task moves to INTERNAL_QA",
                        trigger_event="TASK_STATUS_CHANGED",
                        conditions={"target_status": "INTERNAL_QA", "department": "Creative & Media"},
                        action_type="AI_HOOK_GENERATE",
                        action_config={"angles_count": 5, "format": "REEL"},
                        is_active=True,
                    ),
                    AutomationRule(
                        name="Zero-Touch Client Deliverable Portal Dispatch",
                        description="Instantly delivers client review link and triggers WhatsApp/Email alert when deliverable passes QA",
                        trigger_event="CONTENT_APPROVAL_SUBMITTED",
                        conditions={"approval_status": "CLIENT_REVIEW"},
                        action_type="NOTIFY_CLIENT",
                        action_config={"channels": ["PORTAL", "WHATSAPP", "EMAIL"]},
                        is_active=True,
                    ),
                    AutomationRule(
                        name="High-Priority SLA Auto-Escalation (<4h)",
                        description="Detects tasks due within 4 hours, escalates priority to CRITICAL, and alerts assigned Account Manager",
                        trigger_event="SLA_BREACH",
                        conditions={"priority": "HIGH", "threshold_hours": 4},
                        action_type="ESCALATE_SLA",
                        action_config={"escalate_to": "CRITICAL", "notify_am": True},
                        is_active=True,
                    ),
                    AutomationRule(
                        name="Autonomous Won Deal Full-Stack Provisioning",
                        description="Converts won deals into active client orgs, creates AES-256 vault, generates service blueprint tasks, and creates invoice",
                        trigger_event="DEAL_WON",
                        conditions={"deal_stage": "WON"},
                        action_type="AUTO_ONBOARD",
                        action_config={"generate_tasks": True, "create_invoice": True},
                        is_active=True,
                    ),
                ]
                session.add_all(demo_rules)
            await session.commit()

        if not admin_user:
            logger.info("Seeding initial agency users and workflow templates...")
            admin_user = User(
                email="admin@desimuchads.com",
                phone="+91 98765 00001",
                password_hash=hash_password("admin123456"),
                full_name="Muchad Founder (Super Admin)",
                employee_id="DM-ADMIN-001",
                role=UserRole.SUPER_ADMIN,
                department="Executive Leadership",
                hourly_cost=100.0,
                weekly_capacity_hours=40,
                can_manage_automations=True,
                can_edit_projects=True,
                can_manage_billing=True,
                permissions=ALL_PERMISSION_IDS,
                is_active=True,
            )
            manager_user = User(
                email="manager@desimuchads.com",
                phone="+91 98765 00002",
                password_hash=hash_password("manager123456"),
                full_name="Aarav Sharma (Account Manager)",
                employee_id="DM-EMP-0002",
                role=UserRole.ACCOUNT_MANAGER,
                department="Client Success",
                hourly_cost=50.0,
                weekly_capacity_hours=40,
                can_manage_automations=True,
                can_edit_projects=True,
                can_manage_billing=False,
                permissions=get_default_permissions_for_role(UserRole.ACCOUNT_MANAGER, can_manage_automations=True, can_edit_projects=True, can_manage_billing=False),
                is_active=True,
            )
            specialist_user = User(
                email="specialist@desimuchads.com",
                phone="+91 98765 00003",
                password_hash=hash_password("specialist123456"),
                full_name="Priya Patel (Lead Designer & Copy)",
                employee_id="DM-EMP-0003",
                role=UserRole.SPECIALIST,
                department="Creative & Media",
                hourly_cost=35.0,
                weekly_capacity_hours=40,
                can_manage_automations=False,
                can_edit_projects=True,
                can_manage_billing=False,
                permissions=get_default_permissions_for_role(UserRole.SPECIALIST, can_manage_automations=False, can_edit_projects=True, can_manage_billing=False),
                is_active=True,
            )
            client_user = User(
                email="client@bombaychaico.com",
                password_hash=hash_password("client123456"),
                full_name="Kabir Mehta (Bombay Chai Co)",
                role=UserRole.CLIENT,
                department="External Client",
                hourly_cost=0.0,
                weekly_capacity_hours=0,
                permissions=get_default_permissions_for_role(UserRole.CLIENT),
                is_active=True,
            )
            session.add_all([admin_user, manager_user, specialist_user, client_user])
            await session.flush()

            # 2. Workflow Blueprints
            bp1 = WorkflowTemplate(
                name="Monthly Social Media Retainer",
                service_type=ServiceType.SOCIAL_MEDIA_RETAINER,
                description="End-to-end 30-day social media workflow from copywriting to client approval and scheduling.",
            )
            session.add(bp1)
            await session.flush()

            bp1_steps = [
                WorkflowTemplateStep(
                    template_id=bp1.id,
                    step_order=1,
                    title="Content Strategy & Monthly Pillar Ideation",
                    description="Formulate 12 content themes across Reels, Carousels and Stories for the upcoming month.",
                    default_role=UserRole.ACCOUNT_MANAGER,
                    relative_due_days=3,
                    estimated_hours=4.0,
                    dependency_step_order=None,
                ),
                WorkflowTemplateStep(
                    template_id=bp1.id,
                    step_order=2,
                    title="Copywriting & Reel Scripting",
                    description="Draft catchy hooks, captions, and hashtag strategies for all 12 pillars.",
                    default_role=UserRole.SPECIALIST,
                    relative_due_days=6,
                    estimated_hours=6.0,
                    dependency_step_order=1,
                ),
                WorkflowTemplateStep(
                    template_id=bp1.id,
                    step_order=3,
                    title="Visual Asset Design & Video Editing",
                    description="Produce high-contrast graphics and edit vertical videos adhering to brand guidelines.",
                    default_role=UserRole.SPECIALIST,
                    relative_due_days=10,
                    estimated_hours=12.0,
                    dependency_step_order=2,
                ),
                WorkflowTemplateStep(
                    template_id=bp1.id,
                    step_order=4,
                    title="Client Portal Presentation & Sign-off",
                    description="Upload assets to content pipeline for internal QA and client 1-click review.",
                    default_role=UserRole.ACCOUNT_MANAGER,
                    relative_due_days=12,
                    estimated_hours=2.0,
                    dependency_step_order=3,
                ),
            ]
            session.add_all(bp1_steps)

            # Blueprint 2: Performance Marketing Setup
            bp2 = WorkflowTemplate(
                name="Performance Marketing Setup",
                service_type=ServiceType.PERFORMANCE_MARKETING,
                description="Meta & Google Ads tracking pixel setup, audience segmentation, and initial ad campaign launch.",
            )
            session.add(bp2)
            await session.flush()

            bp2_steps = [
                WorkflowTemplateStep(
                    template_id=bp2.id,
                    step_order=1,
                    title="Ad Account & Pixel Audit",
                    description="Check Meta Conversions API and Google Tag Manager firing properly.",
                    default_role=UserRole.SPECIALIST,
                    relative_due_days=2,
                    estimated_hours=3.0,
                    dependency_step_order=None,
                ),
                WorkflowTemplateStep(
                    template_id=bp2.id,
                    step_order=2,
                    title="Audience Research & Funnel Mapping",
                    description="Build Custom and Lookalike audiences with high-intent segmentation.",
                    default_role=UserRole.SPECIALIST,
                    relative_due_days=5,
                    estimated_hours=5.0,
                    dependency_step_order=1,
                ),
                WorkflowTemplateStep(
                    template_id=bp2.id,
                    step_order=3,
                    title="Campaign Launch & Real-Time Monitoring",
                    description="Deploy ads with initial A/B testing budget and track CPL / ROAS daily.",
                    default_role=UserRole.ACCOUNT_MANAGER,
                    relative_due_days=8,
                    estimated_hours=4.0,
                    dependency_step_order=2,
                ),
            ]
            session.add_all(bp2_steps)

            # Blueprint 3: Influencer Marketing & Creator Collabs
            bp3 = WorkflowTemplate(
                name="Influencer Marketing & Creator Collabs",
                service_type=ServiceType.INFLUENCER_MARKETING,
                description="Influencer discovery, barter/commercial contracting, sample dispatch, draft review, and live story tracking.",
            )
            session.add(bp3)
            await session.flush()

            bp3_steps = [
                WorkflowTemplateStep(
                    template_id=bp3.id,
                    step_order=1,
                    title="Influencer Roster Selection & Rate Benchmarking",
                    description="Curate list of 15 relevant creators matching brand aesthetics and target demographics.",
                    default_role=UserRole.ACCOUNT_MANAGER,
                    relative_due_days=3,
                    estimated_hours=4.0,
                    dependency_step_order=None,
                ),
                WorkflowTemplateStep(
                    template_id=bp3.id,
                    step_order=2,
                    title="Legal Barter & Commercial Agreement Dispatch",
                    description="Finalize deliverables agreement and secure written confirmation.",
                    default_role=UserRole.ACCOUNT_MANAGER,
                    relative_due_days=5,
                    estimated_hours=3.0,
                    dependency_step_order=1,
                ),
                WorkflowTemplateStep(
                    template_id=bp3.id,
                    step_order=3,
                    title="Product Sample Dispatch & Logistics Tracking",
                    description="Coordinate branded courier delivery of sample hampers with tracking IDs.",
                    default_role=UserRole.SPECIALIST,
                    relative_due_days=8,
                    estimated_hours=2.0,
                    dependency_step_order=2,
                ),
                WorkflowTemplateStep(
                    template_id=bp3.id,
                    step_order=4,
                    title="Creator Draft Video Review & Brand Compliance QA",
                    description="Verify brand messaging, discount codes, and audio quality before creator publishes.",
                    default_role=UserRole.SPECIALIST,
                    relative_due_days=14,
                    estimated_hours=5.0,
                    dependency_step_order=3,
                ),
                WorkflowTemplateStep(
                    template_id=bp3.id,
                    step_order=5,
                    title="Story/Reel Live Monitoring & Coupon Code Performance",
                    description="Track views, link clicks, and coupon redemption conversions.",
                    default_role=UserRole.ACCOUNT_MANAGER,
                    relative_due_days=18,
                    estimated_hours=3.0,
                    dependency_step_order=4,
                ),
            ]
            session.add_all(bp3_steps)

            # Blueprint 4: Brand Identity & Packaging Design Sprint
            bp4 = WorkflowTemplate(
                name="Brand Identity & Packaging Design Sprint",
                service_type=ServiceType.BRAND_IDENTITY_SPRINT,
                description="Brand archetype strategy, 3x logo explorations, typography system, 3D packaging renders, and print files.",
            )
            session.add(bp4)
            await session.flush()

            bp4_steps = [
                WorkflowTemplateStep(
                    template_id=bp4.id,
                    step_order=1,
                    title="Brand Archetype & Visual Moodboard",
                    description="Define color psychology, competitor positioning, and visual texture direction.",
                    default_role=UserRole.ACCOUNT_MANAGER,
                    relative_due_days=3,
                    estimated_hours=4.0,
                    dependency_step_order=None,
                ),
                WorkflowTemplateStep(
                    template_id=bp4.id,
                    step_order=2,
                    title="3x Distinct Logo & Monogram Concepts",
                    description="Design vector emblems and typographic marks for client presentation.",
                    default_role=UserRole.SPECIALIST,
                    relative_due_days=8,
                    estimated_hours=10.0,
                    dependency_step_order=1,
                ),
                WorkflowTemplateStep(
                    template_id=bp4.id,
                    step_order=3,
                    title="Packaging Dielines & Color Swatch System",
                    description="Prepare exact packaging specifications with Pantone and CMYK values.",
                    default_role=UserRole.SPECIALIST,
                    relative_due_days=14,
                    estimated_hours=8.0,
                    dependency_step_order=2,
                ),
                WorkflowTemplateStep(
                    template_id=bp4.id,
                    step_order=4,
                    title="3D Photorealistic Packaging Mockup Renders",
                    description="Render packaging bottles, boxes, and pouch mockups for digital marketing assets.",
                    default_role=UserRole.SPECIALIST,
                    relative_due_days=18,
                    estimated_hours=6.0,
                    dependency_step_order=3,
                ),
                WorkflowTemplateStep(
                    template_id=bp4.id,
                    step_order=5,
                    title="Print-Ready Vector Master Files & Brand Book Delivery",
                    description="Handoff final AI/EPS vectors and 24-page Brand Guidelines PDF.",
                    default_role=UserRole.ACCOUNT_MANAGER,
                    relative_due_days=22,
                    estimated_hours=3.0,
                    dependency_step_order=4,
                ),
            ]
            session.add_all(bp4_steps)

            # Blueprint 5: WhatsApp CRM & Conversational Commerce
            bp5 = WorkflowTemplate(
                name="WhatsApp CRM & Conversational Commerce",
                service_type=ServiceType.WHATSAPP_CRM,
                description="Meta WhatsApp Cloud API setup, catalog sync, automated abandoned cart bot, and broadcast campaigns.",
            )
            session.add(bp5)
            await session.flush()

            bp5_steps = [
                WorkflowTemplateStep(
                    template_id=bp5.id,
                    step_order=1,
                    title="Meta WhatsApp Cloud API & Business Verification",
                    description="Register WABA, setup webhooks, and submit official business verification.",
                    default_role=UserRole.SPECIALIST,
                    relative_due_days=4,
                    estimated_hours=4.0,
                    dependency_step_order=None,
                ),
                WorkflowTemplateStep(
                    template_id=bp5.id,
                    step_order=2,
                    title="E-Commerce Catalog & Webhook Integration",
                    description="Connect Shopify/WooCommerce store product catalog to WhatsApp commerce.",
                    default_role=UserRole.SPECIALIST,
                    relative_due_days=7,
                    estimated_hours=6.0,
                    dependency_step_order=1,
                ),
                WorkflowTemplateStep(
                    template_id=bp5.id,
                    step_order=3,
                    title="Abandoned Cart Recovery & Order Confirmation Chatbots",
                    description="Build automated interactive flow templates with discount incentives.",
                    default_role=UserRole.SPECIALIST,
                    relative_due_days=11,
                    estimated_hours=6.0,
                    dependency_step_order=2,
                ),
                WorkflowTemplateStep(
                    template_id=bp5.id,
                    step_order=4,
                    title="Broadcast Marketing Campaign Template Approval",
                    description="Draft utility and marketing templates for Meta approval and launch initial blast.",
                    default_role=UserRole.ACCOUNT_MANAGER,
                    relative_due_days=14,
                    estimated_hours=3.0,
                    dependency_step_order=3,
                ),
            ]
            session.add_all(bp5_steps)

            # Blueprint 6: Commercial Video & Reel Shoot Production
            bp6 = WorkflowTemplate(
                name="Commercial Video & Reel Shoot Production",
                service_type=ServiceType.VIDEO_PRODUCTION,
                description="Pre-production scripting, location scouting, 4K shoot day, raw S3 ingestion, and DaVinci color grading.",
            )
            session.add(bp6)
            await session.flush()

            bp6_steps = [
                WorkflowTemplateStep(
                    template_id=bp6.id,
                    step_order=1,
                    title="Video Shoot Scripting & Director's Treatment Deck",
                    description="Write scene-by-scene script, audio cues, and visual references.",
                    default_role=UserRole.SPECIALIST,
                    relative_due_days=4,
                    estimated_hours=5.0,
                    dependency_step_order=None,
                ),
                WorkflowTemplateStep(
                    template_id=bp6.id,
                    step_order=2,
                    title="Casting, Props Sourcing & Location Permitting",
                    description="Coordinate on-screen talent, lighting gear rental, and location booking.",
                    default_role=UserRole.ACCOUNT_MANAGER,
                    relative_due_days=9,
                    estimated_hours=6.0,
                    dependency_step_order=1,
                ),
                WorkflowTemplateStep(
                    template_id=bp6.id,
                    step_order=3,
                    title="Production Shoot Day (On-Site)",
                    description="Execute 4K camera capture, directional audio recording, and b-roll shots.",
                    default_role=UserRole.SPECIALIST,
                    relative_due_days=12,
                    estimated_hours=10.0,
                    dependency_step_order=2,
                ),
                WorkflowTemplateStep(
                    template_id=bp6.id,
                    step_order=4,
                    title="Raw Footage S3 Ingestion & Rough Cut Assembly",
                    description="Upload multi-gigabyte footage via presigned URLs and build initial edit timeline.",
                    default_role=UserRole.SPECIALIST,
                    relative_due_days=16,
                    estimated_hours=8.0,
                    dependency_step_order=3,
                ),
                WorkflowTemplateStep(
                    template_id=bp6.id,
                    step_order=5,
                    title="Color Grading (LUTs), Sound Design & Subtitles",
                    description="Apply cinematic color tones, sound effect transitions, and styled captioning.",
                    default_role=UserRole.SPECIALIST,
                    relative_due_days=20,
                    estimated_hours=6.0,
                    dependency_step_order=4,
                ),
                WorkflowTemplateStep(
                    template_id=bp6.id,
                    step_order=6,
                    title="Client Review & 4K Final Master Delivery",
                    description="Host client review screening, apply final tweaks, and deliver master exports.",
                    default_role=UserRole.ACCOUNT_MANAGER,
                    relative_due_days=23,
                    estimated_hours=2.0,
                    dependency_step_order=5,
                ),
            ]
            session.add_all(bp6_steps)

            # 3. Seed Sample Client & Project
            client1 = Client(
                company_name="Bombay Chai Co.",
                industry="D2C Beverage",
                primary_contact_name="Kabir Mehta",
                contact_email="client@bombaychaico.com",
                contact_phone="+91 98765 43210",
                retainer_amount=75000.0,
                billing_cycle_day=1,
                gst_tax_id="27AABCB1234D1Z5",
                health_score=95,
                status=ClientStatus.ACTIVE,
                deal_stage=DealStage.WON,
                deal_value=75000.0,
                account_manager_id=manager_user.id,
            )
            lead1 = Client(
                company_name="Urban Vibe Apparels",
                industry="E-Commerce Fashion",
                primary_contact_name="Sneha Kapoor",
                contact_email="sneha@urbanvibe.in",
                contact_phone="+91 91234 56789",
                retainer_amount=120000.0,
                billing_cycle_day=5,
                gst_tax_id="29XYZAB5678C1Z2",
                health_score=100,
                status=ClientStatus.LEAD,
                deal_stage=DealStage.PROPOSAL_SENT,
                deal_value=120000.0,
                account_manager_id=manager_user.id,
            )
            session.add_all([client1, lead1])
            await session.flush()

            # Seed a project for Bombay Chai Co
            proj1 = Project(
                client_id=client1.id,
                name="Bombay Chai Co. - Q4 Social Retainer",
                service_type=ServiceType.SOCIAL_MEDIA_RETAINER,
                start_date=date.today(),
                target_end_date=date.today() + timedelta(days=30),
                status=ProjectStatus.ACTIVE,
                progress_percentage=45.0,
            )
            session.add(proj1)
            await session.flush()

            # Seed Tasks with DAG dependency
            task1 = Task(
                project_id=proj1.id,
                title="Q4 Campaign Moodboard & Pillar Strategy",
                description="Finalize 4 cultural themes for winter festive season.",
                assigned_to_id=manager_user.id,
                priority=TaskPriority.HIGH,
                status=TaskStatus.COMPLETED,
                estimated_hours=4.0,
                logged_hours=4.5,
                due_at=datetime.utcnow() - timedelta(days=2),
                completed_at=datetime.utcnow() - timedelta(days=2),
            )
            session.add(task1)
            await session.flush()

            task2 = Task(
                project_id=proj1.id,
                title="10x Festive Ad Copy & Reel Scripts",
                description="Write script concepts focusing on warm winter masala chai ritual.",
                assigned_to_id=specialist_user.id,
                priority=TaskPriority.HIGH,
                status=TaskStatus.IN_PROGRESS,
                estimated_hours=6.0,
                logged_hours=2.0,
                due_at=datetime.utcnow() + timedelta(days=2),
                depends_on_task_id=task1.id,
            )
            task3 = Task(
                project_id=proj1.id,
                title="Festive Motion Graphics & Packaging Reel",
                description="Render 3D chai packaging reveal with upbeat acoustic rhythm.",
                assigned_to_id=specialist_user.id,
                priority=TaskPriority.MEDIUM,
                status=TaskStatus.BLOCKED,
                estimated_hours=8.0,
                logged_hours=0.0,
                due_at=datetime.utcnow() + timedelta(days=5),
                depends_on_task_id=task2.id,  # Blocked until task 2 completes!
            )
            session.add_all([task2, task3])

            # Seed sample content item
            item1 = ContentCalendarItem(
                client_id=client1.id,
                project_id=proj1.id,
                platform=ContentPlatform.INSTAGRAM,
                content_type=ContentType.REEL,
                title="Monsoon to Winter: The Ultimate Masala Chai Brew Guide",
                caption_copy="There is nothing quite like a steaming cup of handmade kadak chai on a cold evening. Tap the link in bio to shop our freshly ground spices! ☕🍂 #BombayChai #ChaiLove",
                media_urls=["https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80"],
                scheduled_for=datetime.utcnow() + timedelta(days=3),
                approval_status=ContentApprovalStatus.CLIENT_REVIEW,
                version_number=1,
            )
            session.add(item1)

            # Seed sample invoice
            today = date.today()
            inv1 = Invoice(
                invoice_number=f"INV-{today.strftime('%Y%m')}-0001",
                client_id=client1.id,
                subtotal=75000.0,
                tax_amount=13500.0,  # 18% GST
                total_amount=88500.0,
                currency="INR",
                status=InvoiceStatus.PAID,
                due_date=today + timedelta(days=7),
                paid_at=datetime.utcnow(),
            )
            session.add(inv1)

            # Seed calendar event
            event1 = CalendarEvent(
                title="Bombay Chai Co. Bi-Weekly Growth Sync",
                event_type=CalendarEventType.MEETING,
                start_time=datetime.utcnow() + timedelta(days=1, hours=4),
                end_time=datetime.utcnow() + timedelta(days=1, hours=5),
                client_id=client1.id,
                created_by_id=admin_user.id,
                attendees=["admin@desimuchads.com", "manager@desimuchads.com", "client@bombaychaico.com"],
                meeting_link="https://meet.google.com/xyz-muchad-sync",
            )
            session.add(event1)

            # Seed default automation rules if none exist
            rule_check = await session.execute(select(AutomationRule))
            if not rule_check.scalars().first():
                demo_rules = [
                    AutomationRule(
                        name="AI Creative Hook Generator on Task Ingestion",
                        description="Automatically triggers Gemini AI hook studio whenever a creative task moves to INTERNAL_QA",
                        trigger_event="TASK_STATUS_CHANGED",
                        conditions={"target_status": "INTERNAL_QA", "department": "Creative & Media"},
                        action_type="AI_HOOK_GENERATE",
                        action_config={"angles_count": 5, "format": "REEL"},
                        is_active=True,
                    ),
                    AutomationRule(
                        name="Zero-Touch Client Deliverable Portal Dispatch",
                        description="Instantly delivers client review link and triggers WhatsApp/Email alert when deliverable passes QA",
                        trigger_event="CONTENT_APPROVAL_SUBMITTED",
                        conditions={"approval_status": "CLIENT_REVIEW"},
                        action_type="NOTIFY_CLIENT",
                        action_config={"channels": ["PORTAL", "WHATSAPP", "EMAIL"]},
                        is_active=True,
                    ),
                    AutomationRule(
                        name="High-Priority SLA Auto-Escalation (<4h)",
                        description="Detects tasks due within 4 hours, escalates priority to CRITICAL, and alerts assigned Account Manager",
                        trigger_event="SLA_BREACH",
                        conditions={"priority": "HIGH", "threshold_hours": 4},
                        action_type="ESCALATE_SLA",
                        action_config={"escalate_to": "CRITICAL", "notify_am": True},
                        is_active=True,
                    ),
                    AutomationRule(
                        name="Autonomous Won Deal Full-Stack Provisioning",
                        description="Converts won deals into active client orgs, creates AES-256 vault, generates service blueprint tasks, and creates invoice",
                        trigger_event="DEAL_WON",
                        conditions={"deal_stage": "WON"},
                        action_type="AUTO_ONBOARD",
                        action_config={"generate_tasks": True, "create_invoice": True},
                        is_active=True,
                    ),
                ]
                session.add_all(demo_rules)

            await session.commit()
            logger.info("Database seeding completed successfully.")


async def background_maintenance_daemon():
    """
    Autonomous background daemon executing maintenance cycles every 60 seconds:
    - Auto-checkout & regularization for sessions >12h
    - Task SLA escalation for high priority items overdue >4h
    - Retainer invoice gating for unpaid items >7 days
    - Deal decay follow-up alerts for opportunities untouched >48h
    """
    logger.info("Autonomous agency background maintenance daemon active.")
    while True:
        try:
            await asyncio.sleep(60)
            async with AsyncSessionLocal() as session:
                await attendance_service.regularize_idle_sessions(session)
                await automation_bus.check_sla_escalations(session)
                await automation_bus.enforce_invoice_gating(session)
                await automation_bus.check_deal_decay(session)
        except asyncio.CancelledError:
            logger.info("Background maintenance daemon stopped.")
            break
        except Exception as e:
            logger.error(f"Error in background maintenance daemon cycle: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist and seed demo data
    logger.info("Initializing database schema...")
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            res = await conn.run_sync(lambda sync_conn: sync_conn.execute(text("PRAGMA table_info(users)")).fetchall())
            cols = [r[1] for r in res]
            if "permissions" not in cols:
                logger.info("Migrating schema: adding 'permissions' column to users table...")
                await conn.run_sync(lambda sync_conn: sync_conn.execute(text("ALTER TABLE users ADD COLUMN permissions JSON DEFAULT '[]'")))
            if "employee_id" not in cols:
                logger.info("Migrating schema: adding 'employee_id' column to users table...")
                await conn.run_sync(lambda sync_conn: sync_conn.execute(text("ALTER TABLE users ADD COLUMN employee_id VARCHAR(50)")))
            if "phone" not in cols:
                logger.info("Migrating schema: adding 'phone' column to users table...")
                await conn.run_sync(lambda sync_conn: sync_conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(50) DEFAULT NULL")))
        except Exception as e:
            logger.warning(f"Could not verify users schema: {e}")

    await seed_initial_agency_data()
    daemon_task = asyncio.create_task(background_maintenance_daemon())
    yield
    # Shutdown
    daemon_task.cancel()
    try:
        await daemon_task
    except asyncio.CancelledError:
        pass
    logger.info("Shutting down database engine...")
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="Enterprise Agency OS & Single Source of Truth for The Desi Muchads",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - Configured for both localhost and mobile devices on LAN/Wi-Fi
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global standardized exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "data": None,
            "meta": {"timestamp": datetime.utcnow().isoformat()},
            "error": str(exc) if settings.DEBUG else "Internal server error occurred.",
        },
    )


# Health Check
@app.get("/health", tags=["System Health"])
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
    }


# Mount Routers under /api/v1
app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(automations_router, prefix="/api/v1")
app.include_router(attendance_router, prefix="/api/v1")
app.include_router(crm_router, prefix="/api/v1")
app.include_router(lead_engine_router, prefix="/api/v1")
app.include_router(bulk_messaging_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(tasks_router, prefix="/api/v1")
app.include_router(content_router, prefix="/api/v1")
app.include_router(master_calendar_router, prefix="/api/v1")
app.include_router(billing_router, prefix="/api/v1")
app.include_router(vault_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(ai_router, prefix="/api/v1")
app.include_router(assets_router, prefix="/api/v1")
app.include_router(ws_router)

