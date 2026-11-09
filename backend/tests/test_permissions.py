import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from app.core.database import Base, get_db
from app.main import app
from app.models.models import User
from app.models.enums import UserRole
from app.core.security import hash_password
from app.core.permissions import ALL_PERMISSION_IDS, ALL_MODULES, PERMISSION_PRESETS

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
                email="admin@desimuchads.com",
                password_hash=hash_password("admin123456"),
                full_name="Muchad Founder (Super Admin)",
                role=UserRole.SUPER_ADMIN,
                department="Leadership",
                permissions=ALL_PERMISSION_IDS,
            )
            spec = User(
                email="designer@desimuchads.com",
                password_hash=hash_password("spec123456"),
                full_name="Rohit Creative",
                role=UserRole.SPECIALIST,
                department="Creative",
                permissions=["projects:read", "content:read"],
            )
            session.add_all([admin, spec])
            await session.commit()

    asyncio.run(_init())
    yield
    async def _teardown():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await test_engine.dispose()
    asyncio.run(_teardown())


@pytest.mark.asyncio
async def test_permissions_matrix_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/users/permissions/matrix",
            headers={"Authorization": "Bearer demo_token_super_admin"},
        )
        assert response.status_code == 200
        payload = response.json()
        assert "data" in payload
        data = payload["data"]
        assert len(data["modules"]) == len(ALL_MODULES)
        assert len(data["presets"]) == len(PERMISSION_PRESETS)
        assert set(data["all_permissions"]) == set(ALL_PERMISSION_IDS)


@pytest.mark.asyncio
async def test_assign_user_permissions():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Fetch user roster
        users_res = await ac.get(
            "/api/v1/users",
            headers={"Authorization": "Bearer demo_token_super_admin"},
        )
        assert users_res.status_code == 200
        users = users_res.json()["data"]
        assert len(users) > 0

        target_user = next((u for u in users if u["role"] != "SUPER_ADMIN"), users[0])
        user_id = target_user["id"]

        # 2. Assign granular permissions (Sales Hunter set)
        new_grants = ["crm:read", "crm:write", "leads:read", "leads:write", "attendance:read"]
        perm_res = await ac.put(
            f"/api/v1/users/{user_id}/permissions",
            json={"permissions": new_grants},
            headers={"Authorization": "Bearer demo_token_super_admin"},
        )
        assert perm_res.status_code == 200
        updated = perm_res.json()["data"]
        assert set(updated["permissions"]) == set(new_grants)

        # 3. Verify detail endpoint returns updated permissions
        detail_res = await ac.get(
            f"/api/v1/users/{user_id}",
            headers={"Authorization": "Bearer demo_token_super_admin"},
        )
        assert detail_res.status_code == 200
        assert set(detail_res.json()["data"]["permissions"]) == set(new_grants)
