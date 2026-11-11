import pytest
import uuid
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.database import Base, get_db
from app.main import app
from app.models.models import User, Client
from app.models.enums import UserRole, ClientStatus, DealStage
from app.core.security import hash_password
from app.core.permissions import ALL_PERMISSION_IDS
from app.core.rate_limiter import auth_rate_limiter

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
            spec = User(
                id=uuid.uuid4(),
                email="designer@desimuchads.com",
                password_hash=hash_password("spec123456"),
                full_name="Rohit Creative",
                role=UserRole.SPECIALIST,
                department="Creative",
                permissions=["projects:read", "content:read"],
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
            session.add_all([admin, spec, lead])
            await session.commit()

    asyncio.run(_init())
    yield

    async def _teardown():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await test_engine.dispose()

    asyncio.run(_teardown())


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    with auth_rate_limiter._lock:
        auth_rate_limiter._failures.clear()
