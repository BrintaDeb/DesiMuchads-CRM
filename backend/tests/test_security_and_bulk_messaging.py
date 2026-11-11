import pytest
import uuid
import random
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from app.core.database import Base, get_db
from app.main import app
from app.models.models import User, Client
from app.models.enums import UserRole, ClientStatus, DealStage
from app.core.security import hash_password
from app.core.rate_limiter import auth_rate_limiter
from app.core.permissions import ALL_PERMISSION_IDS

TEST_DB_URL = "sqlite+aiosqlite:///./test_muchadcrm.db"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestingSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    async def _init():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        async with TestingSessionLocal() as session:
            admin = User(
                id=uuid.uuid4(),
                email="admin@desimuchads.com",
                phone="+91 98765 00001",
                employee_id="DM-ADMIN-001",
                password_hash=hash_password("DesiMuchads@admin98"),
                full_name="Muchad Founder",
                role=UserRole.SUPER_ADMIN,
                department="Leadership",
                permissions=ALL_PERMISSION_IDS,
                is_active=True,
            )
            lead = Client(
                id=uuid.uuid4(),
                company_name="Raw Earth Organics",
                industry="D2C Cosmetics",
                primary_contact_name="Vikram Malhotra",
                contact_email="vikram@rawearth.in",
                contact_phone="+91 99887 66554",
                deal_stage=DealStage.LEAD_CAPTURED,
                deal_value=85000.0,
                status=ClientStatus.LEAD,
            )
            session.add_all([admin, lead])
            await session.commit()

    asyncio.run(_init())
    yield

    async def _teardown():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await test_engine.dispose()

    asyncio.run(_teardown())


@pytest.fixture(autouse=True)
def clear_rate_limiter():
    """Ensure in-memory rate limiter is fresh for every test."""
    with auth_rate_limiter._lock:
        auth_rate_limiter._failures.clear()


@pytest.mark.asyncio
async def test_dual_login_email_and_phone():
    """Verifies that an agent can log in using either their Email ID or their Phone Number."""
    rand_digits = random.randint(10000000, 99999999)
    unique_phone = f"+91 98{rand_digits}"
    clean_phone = f"98{rand_digits}"
    user_email = f"phone_user_{uuid.uuid4().hex[:6]}@desimuchads.com"

    async with TestingSessionLocal() as session:
        test_user = User(
            id=uuid.uuid4(),
            email=user_email,
            phone=unique_phone,
            employee_id="DM-TEST-007",
            password_hash=hash_password("secure_pass_123"),
            full_name="Phone Testing User",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
        )
        session.add(test_user)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Login with Email ID
        res_email = await ac.post("/api/v1/auth/login", json={
            "email": user_email,
            "password": "secure_pass_123",
        })
        assert res_email.status_code == 200, res_email.text
        data_email = res_email.json()["data"]
        assert data_email["user"]["email"] == user_email

        # 2. Login with Phone Number (with +91 format in login_id)
        res_phone1 = await ac.post("/api/v1/auth/login", json={
            "login_id": unique_phone,
            "password": "secure_pass_123",
        })
        assert res_phone1.status_code == 200, res_phone1.text
        assert res_phone1.json()["data"]["user"]["email"] == user_email

        # 3. Login with Clean Digits Phone Number (in phone field)
        res_phone2 = await ac.post("/api/v1/auth/login", json={
            "phone": clean_phone,
            "password": "secure_pass_123",
        })
        assert res_phone2.status_code == 200, res_phone2.text
        assert res_phone2.json()["data"]["user"]["email"] == user_email

        # 2. Login with Phone Number (with +91 format in login_id)
        res_phone1 = await ac.post("/api/v1/auth/login", json={
            "login_id": unique_phone,
            "password": "secure_pass_123",
        })
        assert res_phone1.status_code == 200, res_phone1.text
        assert res_phone1.json()["data"]["user"]["email"] == user_email

        # 3. Login with Clean Digits Phone Number (in phone field)
        res_phone2 = await ac.post("/api/v1/auth/login", json={
            "phone": clean_phone,
            "password": "secure_pass_123",
        })
        assert res_phone2.status_code == 200, res_phone2.text
        assert res_phone2.json()["data"]["user"]["email"] == user_email


@pytest.mark.asyncio
async def test_login_brute_force_rate_limiting():
    """Verifies that 5 consecutive failed login attempts trigger an HTTP 429 Too Many Requests lockout."""
    transport = ASGITransport(app=app)
    target_ident = f"target_{uuid.uuid4().hex[:6]}@muchad.com"

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Submit 5 invalid passwords
        for i in range(5):
            res = await ac.post("/api/v1/auth/login", json={
                "login_id": target_ident,
                "password": "wrong_password_xyz",
            })
            if i < 4:
                assert res.status_code == 401
                assert "remaining" in res.json()["detail"].lower()
            else:
                # 5th failure trips the rate limiter
                assert res.status_code in [401, 429]

        # 6th attempt MUST be blocked by Rate Limiter with 429
        blocked_res = await ac.post("/api/v1/auth/login", json={
            "login_id": target_ident,
            "password": "any_password",
        })
        assert blocked_res.status_code == 429, blocked_res.text
        assert "Too many failed login attempts" in blocked_res.json()["detail"]
        assert "Retry-After" in blocked_res.headers


@pytest.mark.asyncio
async def test_bulk_messaging_templates_and_audiences():
    """Verifies that bulk messaging templates and audience counts are retrieved."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Login as Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "admin@desimuchads.com",
            "password": "DesiMuchads@admin98",
        })
        token = login_res.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Templates
        tpl_res = await ac.get("/api/v1/crm/bulk-messaging/templates", headers=headers)
        assert tpl_res.status_code == 200
        templates = tpl_res.json()["data"]
        assert len(templates) >= 4
        assert any(t["channel"] == "WHATSAPP" for t in templates)

        # 2. Audiences
        aud_res = await ac.get("/api/v1/crm/bulk-messaging/audiences", headers=headers)
        assert aud_res.status_code == 200
        segments = aud_res.json()["data"]["segments"]
        assert any(s["key"] == "ALL_LEADS" for s in segments)
        assert any(s["key"] == "TEAM" for s in segments)


@pytest.mark.asyncio
async def test_bulk_messaging_preview_and_dispatch():
    """Verifies template token interpolation, preview rendering, and batch dispatch."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "admin@desimuchads.com",
            "password": "DesiMuchads@admin98",
        })
        token = login_res.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Preview
        preview_res = await ac.post(
            "/api/v1/crm/bulk-messaging/preview",
            json={
                "target_audience": "ALL_LEADS",
                "channel": "WHATSAPP",
                "message_template": "Hello {{first_name}}, we noticed {{company_name}} at {{city}}! Retainer is {{deal_value}}.",
            },
            headers=headers,
        )
        assert preview_res.status_code == 200
        preview_data = preview_res.json()["data"]
        assert preview_data["total_count"] > 0
        samples = preview_data["sample_recipients"]
        assert len(samples) > 0
        assert "Hello " in samples[0]["rendered_message"]
        assert "https://api.whatsapp.com/send" in samples[0]["whatsapp_url"]

        # 2. Dispatch Campaign
        dispatch_res = await ac.post(
            "/api/v1/crm/bulk-messaging/dispatch",
            json={
                "title": "Q4 Performance Outreach",
                "target_audience": "ALL_LEADS",
                "channel": "WHATSAPP",
                "message_template": "Hey {{contact_name}}! Exclusive proposal ready for {{company_name}}.",
                "auto_dispatch_simulation": True,
            },
            headers=headers,
        )
        assert dispatch_res.status_code == 200
        camp = dispatch_res.json()["data"]
        assert camp["title"] == "Q4 Performance Outreach"
        assert camp["status"] == "COMPLETED"
        assert camp["sent_count"] > 0

        # 3. List Past Campaigns
        history_res = await ac.get("/api/v1/crm/bulk-messaging/campaigns", headers=headers)
        assert history_res.status_code == 200
        campaigns = history_res.json()["data"]
        assert len(campaigns) >= 1
        assert campaigns[0]["title"] == "Q4 Performance Outreach"
