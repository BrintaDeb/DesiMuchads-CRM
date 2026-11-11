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


@pytest.mark.asyncio
async def test_admin_password_verify_and_credential_management():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": "Bearer demo_token_super_admin"}

        # 1. Correct master admin password verification
        v_res = await ac.post("/api/v1/users/verify-admin-password", json={"password": "DesiMuchads@admin98"}, headers=headers)
        assert v_res.status_code == 200
        assert v_res.json()["data"]["verified"] is True

        # 2. Incorrect master admin password verification
        bad_v = await ac.post("/api/v1/users/verify-admin-password", json={"password": "wrong_password"}, headers=headers)
        assert bad_v.status_code == 401

        # 3. Create employee with custom or auto-generated employee_id
        new_emp = await ac.post(
            "/api/v1/users",
            json={
                "email": "employee.test@desimuchads.com",
                "password": "EmpTempPassword123!",
                "full_name": "Test Agency Employee",
                "role": "SPECIALIST",
                "department": "Video Production",
                "employee_id": "DM-EMP-555",
                "permissions": ["projects:read", "content:write"]
            },
            headers=headers
        )
        assert new_emp.status_code == 201
        emp_data = new_emp.json()["data"]
        assert emp_data["employee_id"] == "DM-EMP-555"
        created_id = emp_data["id"]

        # 4. Super Admin reset credentials (password & employee_id)
        reset_res = await ac.put(
            f"/api/v1/users/{created_id}/credentials",
            json={
                "new_password": "NewSecretPassword999!",
                "employee_id": "DM-EMP-777"
            },
            headers=headers
        )
        assert reset_res.status_code == 200
        assert reset_res.json()["data"]["employee_id"] == "DM-EMP-777"
