import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from app.core.database import Base, get_db
from app.main import app
from app.models.models import User
from app.models.enums import UserRole
from app.core.security import create_access_token, hash_password

TEST_DB_URL = "sqlite+aiosqlite:///./test_muchadcrm.db"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestingSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
async def super_admin_auth():
    admin_id = uuid.uuid4()
    async with TestingSessionLocal() as session:
        user = User(
            id=admin_id,
            email=f"admin_{admin_id.hex[:6]}@desimuchads.com",
            password_hash=hash_password("admin_pass_123"),
            full_name="Lead Gen Admin",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
            can_manage_automations=True,
        )
        session.add(user)
        await session.commit()

    token = create_access_token(data={"sub": str(admin_id), "role": UserRole.SUPER_ADMIN.value})
    return {"token": token, "user_id": admin_id}


@pytest.mark.asyncio
async def test_lead_generator_presets(super_admin_auth):
    auth = super_admin_auth
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get(
            "/api/v1/crm/lead-generator/presets",
            headers={"Authorization": f"Bearer {auth['token']}"},
        )
        assert res.status_code == 200
        data = res.json()["data"]
        assert "regions" in data
        assert "niches" in data
        assert any(r["city"] == "Mumbai" for r in data["regions"])
        assert any(r["city"] == "Bengaluru" for r in data["regions"])


@pytest.mark.asyncio
async def test_lead_discovery_and_pitch_generation(super_admin_auth):
    auth = super_admin_auth
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Discover Leads in South Mumbai
        disc_res = await ac.post(
            "/api/v1/crm/lead-generator/discover",
            headers={"Authorization": f"Bearer {auth['token']}"},
            json={
                "city": "Mumbai",
                "area": "South Mumbai (Nariman Point & Fort)",
                "niche": "D2C Brands & Consumer Goods",
                "target_count": 4,
                "min_deal_value": 75000.0,
            },
        )
        assert disc_res.status_code == 200
        leads = disc_res.json()["data"]
        assert len(leads) == 4
        assert leads[0]["city"] == "Mumbai"
        assert "South Mumbai" in leads[0]["area"]
        assert leads[0]["deal_value"] >= 75000.0
        assert "https://api.whatsapp.com/send" in leads[0]["whatsapp_click_url"]
        assert len(leads[0]["audit_findings"]) > 0

        # 2. Custom Pitch Generation
        pitch_res = await ac.post(
            "/api/v1/crm/lead-generator/generate-pitch",
            headers={"Authorization": f"Bearer {auth['token']}"},
            json={
                "company_name": leads[0]["company_name"],
                "founder_name": leads[0]["founder_name"],
                "niche": leads[0]["niche"],
                "city": leads[0]["city"],
                "area": leads[0]["area"],
                "primary_pain_point": "Meta Ad ROAS collapsed to 1.4x",
            },
        )
        assert pitch_res.status_code == 200
        pitch_data = pitch_res.json()["data"]
        assert "subject" in pitch_data
        assert "email_body" in pitch_data
        assert "whatsapp_text" in pitch_data
        assert "Meta Ad ROAS" in pitch_data["email_body"]

        # 3. Inject batch into CRM pipeline
        inject_res = await ac.post(
            "/api/v1/crm/lead-generator/inject-batch",
            headers={"Authorization": f"Bearer {auth['token']}"},
            json={
                "leads": leads[:2],
                "stage": "LEAD_CAPTURED",
                "auto_dispatch_first_touch": False,
            },
        )
        assert inject_res.status_code == 200
        inject_data = inject_res.json()["data"]
        assert inject_data["injected_count"] >= 1

        # 4. Dispatch cold outreach
        dispatch_res = await ac.post(
            "/api/v1/crm/lead-generator/dispatch-outreach",
            headers={"Authorization": f"Bearer {auth['token']}"},
            json={
                "leads": leads[:2],
                "channel": "ALL",
            },
        )
        assert dispatch_res.status_code == 200
        assert dispatch_res.json()["data"]["dispatched_count"] == 2


@pytest.mark.asyncio
async def test_custom_and_arbitrary_place_lead_generation(super_admin_auth):
    auth = super_admin_auth
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Test custom place: Ahmedabad - Sindhu Bhavan Road
        res1 = await ac.post(
            "/api/v1/crm/lead-generator/discover",
            headers={"Authorization": f"Bearer {auth['token']}"},
            json={
                "city": "Ahmedabad",
                "area": "Sindhu Bhavan Road (SBR)",
                "niche": "Fine Dining, Cafes & Luxury Hospitality",
                "target_count": 3,
            },
        )
        assert res1.status_code == 200
        leads1 = res1.json()["data"]
        assert len(leads1) == 3
        assert "Sindhu Bhavan" in leads1[0]["public_landmark"] or "Ahmedabad" in leads1[0]["public_landmark"]
        assert "https://www.google.com/maps/search/" in leads1[0]["google_maps_url"]

        # Test arbitrary custom region: Surat - Vesu
        res2 = await ac.post(
            "/api/v1/crm/lead-generator/discover",
            headers={"Authorization": f"Bearer {auth['token']}"},
            json={
                "city": "Surat",
                "area": "Vesu",
                "niche": "Real Estate & Luxury Living",
                "target_count": 3,
            },
        )
        assert res2.status_code == 200
        leads2 = res2.json()["data"]
        assert len(leads2) == 3
        assert "Vesu" in leads2[0]["locality"]
        assert "Surat" in leads2[0]["locality"]
        assert "https://www.google.com/maps/search/" in leads2[0]["google_maps_url"]


@pytest.mark.asyncio
async def test_specialized_genres_graphic_design_web_seo(super_admin_auth):
    auth = super_admin_auth
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        genres = [
            ("Graphic Designing & Brand Identity", "Mumbai", "Bandra West & Pali Hill"),
            ("Website Development & Web Apps", "Bengaluru", "Indiranagar (100ft Rd & 12th Main)"),
            ("Search Engine Optimization (SEO) & Google 3-Pack", "Delhi NCR", "CyberHub & Golf Course Rd (Gurugram)"),
        ]

        for genre, city, area in genres:
            res = await ac.post(
                "/api/v1/crm/lead-generator/discover",
                headers={"Authorization": f"Bearer {auth['token']}"},
                json={
                    "city": city,
                    "area": area,
                    "niche": genre,
                    "target_count": 2,
                },
            )
            assert res.status_code == 200
            leads = res.json()["data"]
            assert len(leads) == 2
            assert leads[0]["niche"] == genre
            assert len(leads[0]["audit_findings"]) > 0
            assert "https://api.whatsapp.com/send" in leads[0]["whatsapp_click_url"]
            assert "https://www.google.com/maps/search/" in leads[0]["google_maps_url"]


@pytest.mark.asyncio
async def test_lead_engine_permissions_and_role_access():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        spec_id = uuid.uuid4()
        async with TestingSessionLocal() as session:
            spec_user = User(
                id=spec_id,
                email=f"specialist_{spec_id.hex[:6]}@desimuchads.com",
                password_hash=hash_password("spec_pass_123"),
                full_name="Creative Specialist",
                role=UserRole.SPECIALIST,
                is_active=True,
                permissions=["projects:read", "content:read"],
            )
            session.add(spec_user)
            await session.commit()

        spec_token = create_access_token(data={"sub": str(spec_id), "role": UserRole.SPECIALIST.value})

        # Specialist without leads:write should get 403 on inject-batch
        inject_denied = await ac.post(
            "/api/v1/crm/lead-generator/inject-batch",
            headers={"Authorization": f"Bearer {spec_token}"},
            json={
                "leads": [{
                    "temp_id": "test_1",
                    "company_name": "Test Denied Corp",
                    "founder_name": "John Doe",
                    "title": "CEO",
                    "email": "john@test.com",
                    "phone": "+91 98000 00000",
                    "city": "Mumbai",
                    "area": "Bandra",
                    "locality": "Bandra",
                    "niche": "Tech Startups, SaaS & AI Ventures",
                    "deal_value": 80000.0,
                    "intent_score": 90,
                    "audit_findings": ["Test finding"],
                    "recommended_service": "Tech ABM",
                    "cold_email_subject": "Test",
                    "cold_email_body": "Test",
                    "cold_whatsapp_text": "Test",
                    "whatsapp_click_url": "https://api.whatsapp.com",
                }],
                "stage": "LEAD_CAPTURED",
            },
        )
        assert inject_denied.status_code == 403

        # Grant leads:write to this specialist
        async with TestingSessionLocal() as session:
            stmt = select(User).where(User.id == spec_id)
            res = await session.execute(stmt)
            u = res.scalar_one()
            u.permissions = ["projects:read", "content:read", "leads:read", "leads:write"]
            await session.commit()

        # Specialist WITH leads:write should succeed
        inject_allowed = await ac.post(
            "/api/v1/crm/lead-generator/inject-batch",
            headers={"Authorization": f"Bearer {spec_token}"},
            json={
                "leads": [{
                    "temp_id": "test_2",
                    "company_name": "Test Allowed Corp",
                    "founder_name": "Jane Doe",
                    "title": "Founder",
                    "email": "jane@test.com",
                    "phone": "+91 98000 11111",
                    "city": "Mumbai",
                    "area": "Bandra",
                    "locality": "Bandra",
                    "niche": "Tech Startups, SaaS & AI Ventures",
                    "deal_value": 90000.0,
                    "intent_score": 95,
                    "audit_findings": ["Test finding 2"],
                    "recommended_service": "Tech ABM",
                    "cold_email_subject": "Test 2",
                    "cold_email_body": "Test 2",
                    "cold_whatsapp_text": "Test 2",
                    "whatsapp_click_url": "https://api.whatsapp.com",
                }],
                "stage": "LEAD_CAPTURED",
            },
        )
        assert inject_allowed.status_code == 200
        assert inject_allowed.json()["data"]["injected_count"] == 1



