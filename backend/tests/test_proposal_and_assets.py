import pytest
import uuid
import io
from datetime import datetime
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.database import Base, get_db
from app.main import app
from app.models.models import User, Client
from app.models.enums import UserRole, ClientStatus, DealStage
from app.core.security import hash_password, create_access_token
from app.services.proposal_generator import proposal_service
from app.services.s3_storage import storage_service

TEST_DB_URL = "sqlite+aiosqlite:///./test_muchadcrm.db"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestingSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db


@pytest.mark.asyncio
async def test_proposal_service_generation_and_pdf():
    client = Client(
        id=uuid.uuid4(),
        company_name="Chai Craft Co.",
        industry="D2C Beverage",
        primary_contact_name="Aarav Varma",
        contact_email="aarav@chaicraft.com",
        contact_phone="+91 99887 66554",
        retainer_amount=150000.0,
        deal_value=150000.0,
        deal_stage=DealStage.DISCOVERY_CALL,
        status=ClientStatus.LEAD,
    )

    data = await proposal_service.generate_proposal_data(
        client=client,
        objective="Scale direct-to-consumer sales to 5,000 monthly subscribers",
        platforms=["Meta Ads", "Instagram Reels", "Google Shopping"],
    )

    assert data["proposal_id"].startswith("PRP-")
    assert data["client"]["company_name"] == "Chai Craft Co."
    assert len(data["deliverables"]) >= 4
    assert len(data["roadmap"]) == 4
    assert data["commercials"]["subtotal"] == 150000.0
    assert data["commercials"]["gst_amount"] == 27000.0  # 18% of 150000
    assert data["commercials"]["total_monthly_investment"] == 177000.0

    pdf_bytes = proposal_service.generate_proposal_pdf(data)
    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF-")
    assert len(pdf_bytes) > 2000


@pytest.mark.asyncio
async def test_crm_proposal_api_endpoints():
    async with TestingSessionLocal() as session:
        admin = User(
            email=f"prop_admin_{uuid.uuid4().hex[:6]}@desimuchads.com",
            password_hash=hash_password("admin123456"),
            full_name="Proposal Admin",
            role=UserRole.SUPER_ADMIN,
        )
        deal = Client(
            company_name=f"Organic Greens {uuid.uuid4().hex[:4]}",
            industry="AgriTech & D2C",
            primary_contact_name="Rohan Joshi",
            contact_email="rohan@organicgreens.in",
            deal_value=80000.0,
            retainer_amount=80000.0,
            deal_stage=DealStage.AUDIT_STRATEGY,
            status=ClientStatus.LEAD,
        )
        session.add_all([admin, deal])
        await session.commit()
        await session.refresh(admin)
        await session.refresh(deal)
        admin_id = admin.id
        deal_id = deal.id

    token = create_access_token(data={"sub": str(admin_id), "role": UserRole.SUPER_ADMIN.value})
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Generate Proposal via API
        resp = await ac.post(
            f"/api/v1/crm/deals/{deal_id}/generate-proposal",
            headers=headers,
            json={
                "objective": "Scale organic reach & boost conversions",
                "target_platforms": ["Instagram", "Meta Ads"],
                "custom_notes": "Client requested high-urgency focus on festive season.",
            },
        )
        assert resp.status_code == 200
        prop_res = resp.json()
        assert prop_res["data"]["client"]["company_name"].startswith("Organic Greens")
        assert prop_res["data"]["commercials"]["subtotal"] == 80000.0

        # 2. Download Proposal PDF
        pdf_resp = await ac.get(f"/api/v1/crm/deals/{deal_id}/proposal-pdf")
        assert pdf_resp.status_code == 200
        assert pdf_resp.headers["content-type"] == "application/pdf"
        assert pdf_resp.content.startswith(b"%PDF-")

        # 3. Transition to Proposal Sent
        send_resp = await ac.post(f"/api/v1/crm/deals/{deal_id}/send-proposal", headers=headers)
        assert send_resp.status_code == 200
        assert send_resp.json()["data"]["deal_stage"] == "PROPOSAL_SENT"


@pytest.mark.asyncio
async def test_s3_and_asset_storage_flow():
    async with TestingSessionLocal() as session:
        user = User(
            email=f"asset_user_{uuid.uuid4().hex[:6]}@desimuchads.com",
            password_hash=hash_password("admin123456"),
            full_name="Asset Manager",
            role=UserRole.SPECIALIST,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        user_id = user.id

    token = create_access_token(data={"sub": str(user_id), "role": UserRole.SPECIALIST.value})
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Get Presigned Upload URL
        presign_resp = await ac.post(
            "/api/v1/assets/presign-upload",
            headers=headers,
            json={
                "filename": "hero_reel_campaign.mp4",
                "content_type": "video/mp4",
                "folder": "reels",
            },
        )
        assert presign_resp.status_code == 200
        presign_data = presign_resp.json()["data"]
        assert "storage_key" in presign_data
        assert "upload_url" in presign_data

        storage_key = presign_data["storage_key"]

        # 2. Upload file content via fallback upload endpoint
        mock_file_content = b"MP4_MOCK_VIDEO_BINARY_DATA_TEST_12345"
        upload_resp = await ac.post(
            f"/api/v1/assets/upload?storage_key={storage_key}",
            files={"file": ("hero_reel_campaign.mp4", mock_file_content, "video/mp4")},
        )
        assert upload_resp.status_code == 200
        assert upload_resp.json()["data"]["size_bytes"] == len(mock_file_content)

        # 3. Retrieve / Serve the uploaded file
        serve_resp = await ac.get(f"/api/v1/assets/files/{storage_key}")
        assert serve_resp.status_code == 200
        assert serve_resp.content == mock_file_content

