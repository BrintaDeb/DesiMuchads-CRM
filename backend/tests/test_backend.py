import pytest
import uuid
from datetime import datetime, date, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.database import Base, get_db
from app.main import app
from app.models.models import User, Client, Project, Task, WorkflowTemplate, WorkflowTemplateStep, ContentCalendarItem, Invoice
from app.models.enums import UserRole, ClientStatus, DealStage, ServiceType, ProjectStatus, TaskStatus, TaskPriority, ContentPlatform, ContentType, ContentApprovalStatus, WorkMode, AttendanceStatus
from app.core.security import hash_password, create_access_token
from app.services.vault import vault_service
from app.services.dag_engine import dag_engine
from app.services.onboarding import onboarding_engine

TEST_DB_URL = "sqlite+aiosqlite:///./test_muchadcrm.db"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestingSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db


@pytest.mark.asyncio
async def test_vault_fernet_encryption_roundtrip():
    secret = "AIzaSySecretApiKey1234567890"
    encrypted = vault_service.encrypt(secret)
    assert isinstance(encrypted, bytes)
    assert encrypted != secret.encode()

    decrypted = vault_service.decrypt(encrypted)
    assert decrypted == secret


@pytest.mark.asyncio
async def test_auth_login_and_token_generation():
    # Create test user
    async with TestingSessionLocal() as session:
        user = User(
            email="test_admin@desimuchads.com",
            password_hash=hash_password("admin_secret_pass"),
            full_name="Test Super Admin",
            role=UserRole.SUPER_ADMIN,
            department="Executive",
            hourly_cost=80.0,
            weekly_capacity_hours=40,
            is_active=True,
        )
        session.add(user)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/v1/auth/login", json={
            "email": "test_admin@desimuchads.com",
            "password": "admin_secret_pass",
        })
        assert response.status_code == 200
        json_data = response.json()
        assert "data" in json_data
        assert "access_token" in json_data["data"]
        assert json_data["data"]["user"]["role"] == "SUPER_ADMIN"


@pytest.mark.asyncio
async def test_attendance_lifecycle():
    async with TestingSessionLocal() as session:
        user = User(
            email="dev_attendee@desimuchads.com",
            password_hash=hash_password("pass123"),
            full_name="Dev Attendee",
            role=UserRole.SPECIALIST,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role.value, "full_name": user.full_name})
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Clock In
        cin = await ac.post("/api/v1/attendance/clock-in", json={"work_mode": "IN_OFFICE"}, headers=headers)
        assert cin.status_code == 200
        assert cin.json()["data"]["status"] == "ACTIVE"

        # Break Toggle Start
        b_start = await ac.post("/api/v1/attendance/break-toggle", json={"action": "start"}, headers=headers)
        assert b_start.status_code == 200
        assert b_start.json()["data"]["status"] == "ON_BREAK"

        # Break Toggle Resume
        b_res = await ac.post("/api/v1/attendance/break-toggle", json={"action": "resume"}, headers=headers)
        assert b_res.status_code == 200
        assert b_res.json()["data"]["status"] == "ACTIVE"

        # Clock Out
        cout = await ac.post("/api/v1/attendance/clock-out", headers=headers)
        assert cout.status_code == 200
        assert cout.json()["data"]["status"] == "COMPLETED"


@pytest.mark.asyncio
async def test_dag_dependency_and_status_cascading():
    async with TestingSessionLocal() as session:
        client = Client(
            company_name="DAG Client Co",
            primary_contact_name="Rohan",
            contact_email="rohan@dag.com",
            status=ClientStatus.ACTIVE,
        )
        session.add(client)
        await session.flush()

        project = Project(
            client_id=client.id,
            name="DAG Test Project",
            service_type=ServiceType.SOCIAL_MEDIA_RETAINER,
            start_date=date.today(),
            target_end_date=date.today() + timedelta(days=20),
            status=ProjectStatus.ACTIVE,
        )
        session.add(project)
        await session.flush()

        task_a = Task(
            project_id=project.id,
            title="Task A - Strategy",
            priority=TaskPriority.HIGH,
            status=TaskStatus.IN_PROGRESS,
            due_at=datetime.utcnow() + timedelta(days=2),
        )
        session.add(task_a)
        await session.flush()

        task_b = Task(
            project_id=project.id,
            title="Task B - Copywriting",
            priority=TaskPriority.MEDIUM,
            status=TaskStatus.BLOCKED,
            due_at=datetime.utcnow() + timedelta(days=4),
            depends_on_task_id=task_a.id,
        )
        session.add(task_b)
        await session.commit()
        await session.refresh(task_a)
        await session.refresh(task_b)

        # 1. Cycle detection test
        is_cycle = await dag_engine.detect_cycle(session, task_a.id, task_b.id)
        assert is_cycle is True  # Since B already depends on A, making A depend on B is a cycle!

        # 2. Cannot transition Task B while Task A is incomplete
        can_proceed, reason = await dag_engine.validate_dependency_transition(session, task_b, TaskStatus.IN_PROGRESS)
        assert can_proceed is False
        assert "Blocked by incomplete dependency" in reason

        # 3. Complete Task A and verify Task B unlocks automatically
        task_a.status = TaskStatus.COMPLETED
        unlocked = await dag_engine.unlock_downstream_dependencies(session, task_a)
        assert len(unlocked) == 1
        assert unlocked[0].id == task_b.id
        assert unlocked[0].status == TaskStatus.TODO


@pytest.mark.asyncio
async def test_autonomous_zero_touch_onboarding():
    async with TestingSessionLocal() as session:
        # Create Blueprint
        bp = WorkflowTemplate(
            name="Performance Growth Engine",
            service_type=ServiceType.PERFORMANCE_MARKETING,
            description="Blueprint for performance",
        )
        session.add(bp)
        await session.flush()

        s1 = WorkflowTemplateStep(
            template_id=bp.id,
            step_order=1,
            title="Pixel Integration",
            description="Setup tracking",
            default_role=UserRole.SPECIALIST,
            relative_due_days=2,
            estimated_hours=3.0,
        )
        s2 = WorkflowTemplateStep(
            template_id=bp.id,
            step_order=2,
            title="Ad Creative Render",
            description="Produce ads",
            default_role=UserRole.SPECIALIST,
            relative_due_days=5,
            estimated_hours=6.0,
            dependency_step_order=1,
        )
        session.add_all([s1, s2])

        # Create Lead
        lead = Client(
            company_name="HyperScale Brand",
            primary_contact_name="Aanya",
            contact_email="aanya@hyperscale.io",
            retainer_amount=150000.0,
            deal_stage=DealStage.PROPOSAL_SENT,
            status=ClientStatus.LEAD,
        )
        session.add(lead)
        await session.commit()
        await session.refresh(lead)
        await session.refresh(bp)

        # Execute Autonomous Onboarding
        result = await onboarding_engine.onboard_won_deal(
            db=session,
            client_id=lead.id,
            service_blueprint_ids=[bp.id],
            initial_retainer=150000.0,
            generate_deposit_invoice=True,
        )

        assert result["company_name"] == "HyperScale Brand"
        assert result["portal_email"] == "aanya@hyperscale.io"
        assert len(result["projects_created"]) == 1
        assert result["invoice_number"] is not None

        # Verify client status in DB is now ACTIVE
        await session.refresh(lead)
        assert lead.status == ClientStatus.ACTIVE
        assert lead.deal_stage == DealStage.WON


@pytest.mark.asyncio
async def test_content_pipeline_two_tier_approval():
    async with TestingSessionLocal() as session:
        client = Client(
            company_name="Chai Express",
            primary_contact_name="Arjun",
            contact_email="arjun@chaiexpress.in",
            status=ClientStatus.ACTIVE,
        )
        session.add(client)
        await session.flush()

        item = ContentCalendarItem(
            client_id=client.id,
            platform=ContentPlatform.INSTAGRAM,
            content_type=ContentType.REEL,
            title="Morning Chai Vibe",
            caption_copy="Start your day energized! ☀️",
            media_urls=["https://example.com/asset.mp4"],
            scheduled_for=datetime.utcnow() + timedelta(days=3),
            approval_status=ContentApprovalStatus.DRAFTING,
        )
        session.add(item)
        await session.commit()
        await session.refresh(item)

        admin_user = User(
            email="content_admin@desi.com",
            password_hash=hash_password("admin_pass"),
            full_name="Admin Content User",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
        )
        session.add(admin_user)
        await session.commit()
        await session.refresh(admin_user)

    admin_token = create_access_token({"sub": str(admin_user.id), "role": "SUPER_ADMIN", "full_name": admin_user.full_name, "email": admin_user.email})
    headers = {"Authorization": f"Bearer {admin_token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Tier 1: Submit for Internal QA
        res_qa = await ac.post(f"/api/v1/content-calendar/{item.id}/submit-for-approval", json={"target_tier": "INTERNAL_QA"}, headers=headers)
        assert res_qa.status_code == 200
        assert res_qa.json()["data"]["approval_status"] == "INTERNAL_QA"

        # Tier 2: Forward to Client Review
        res_client_rev = await ac.post(f"/api/v1/content-calendar/{item.id}/submit-for-approval", json={"target_tier": "CLIENT_REVIEW"}, headers=headers)
        assert res_client_rev.status_code == 200
        assert res_client_rev.json()["data"]["approval_status"] == "CLIENT_REVIEW"

        # Client Decision: Approved
        res_decision = await ac.post(f"/api/v1/content-calendar/{item.id}/client-decision", json={"decision": "APPROVED", "feedback": "Looks fantastic, approved for schedule!"}, headers=headers)
        assert res_decision.status_code == 200
        assert res_decision.json()["data"]["approval_status"] == "APPROVED"
