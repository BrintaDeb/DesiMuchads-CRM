import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
import logging

from app.core.database import get_db
from app.core.security import get_current_user, hash_password, verify_password
from app.core.rate_limiter import (
    check_clearance_rate_limit,
    record_clearance_failure,
    record_clearance_success,
)
from app.core.permissions import (
    ALL_MODULES,
    PERMISSION_PRESETS,
    ALL_PERMISSION_IDS,
    get_default_permissions_for_role,
)
from app.models.models import User
from app.models.enums import UserRole
from app.schemas.schemas import (
    ApiResponse,
    UserOut,
    UserCreate,
    UserUpdate,
    UserPermissionsUpdate,
    PermissionMatrixResponse,
    AdminPasswordVerifyRequest,
    AdminResetPasswordRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["Users & Team Management"])


@router.get("/permissions/matrix", response_model=ApiResponse[PermissionMatrixResponse])
async def get_permissions_matrix(
    current_user: User = Depends(get_current_user),
):
    """
    Returns the comprehensive canonical permissions matrix, modules, and 1-click role presets.
    """
    return ApiResponse(
        data=PermissionMatrixResponse(
            modules=ALL_MODULES,
            presets=PERMISSION_PRESETS,
            all_permissions=ALL_PERMISSION_IDS,
        )
    )


@router.get("", response_model=ApiResponse[List[UserOut]])
async def list_users(
    role: Optional[UserRole] = None,
    department: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all team members with optional filtering by role, department, active status, or keyword search.
    """
    query = select(User).where(User.deleted_at.is_(None))

    if role:
        query = query.where(User.role == role)
    if department:
        query = query.where(User.department.ilike(f"%{department}%"))
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    if search:
        search_filter = or_(
            User.full_name.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%"),
            User.department.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    query = query.order_by(User.full_name.asc())
    result = await db.execute(query)
    users = list(result.scalars().all())

    # Populate fallback permissions for roster display if user.permissions is empty
    for u in users:
        if not u.permissions:
            u.permissions = get_default_permissions_for_role(
                role=u.role,
                can_manage_automations=u.can_manage_automations,
                can_edit_projects=u.can_edit_projects,
                can_manage_billing=u.can_manage_billing,
            )

    return ApiResponse(
        data=[UserOut.model_validate(u) for u in users],
        meta={"total_count": len(users), "timestamp": datetime.utcnow()},
    )


@router.post("", response_model=ApiResponse[UserOut], status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Provision a new team member with immediate login capability.
    Allows assigning role, department, hourly rate, and granular software module permissions.
    """
    # Permission check: Super Admin or Account Manager with user management rights
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admins and Account Managers can provision new team members.",
        )

    # Check for duplicate email
    existing_query = select(User).where(User.email == user_in.email.lower(), User.deleted_at.is_(None))
    existing_res = await db.execute(existing_query)
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A user with email '{user_in.email}' already exists in the system.",
        )

    # Hash password securely
    hashed_pwd = hash_password(user_in.password)

    # Compute final permissions list
    final_permissions = user_in.permissions
    if not final_permissions:
        final_permissions = get_default_permissions_for_role(
            role=user_in.role,
            can_manage_automations=user_in.can_manage_automations,
            can_edit_projects=user_in.can_edit_projects,
            can_manage_billing=user_in.can_manage_billing,
        )

    # Generate employee_id if omitted
    emp_id = user_in.employee_id
    if not emp_id:
        count_query = select(func.count(User.id))
        count_res = await db.execute(count_query)
        total_existing = count_res.scalar_one() or 0
        emp_id = f"DM-EMP-{100 + total_existing + 1}"

    new_user = User(
        employee_id=emp_id,
        email=user_in.email.lower().strip(),
        password_hash=hashed_pwd,
        full_name=user_in.full_name.strip(),
        role=user_in.role,
        department=user_in.department.strip(),
        hourly_cost=user_in.hourly_cost,
        weekly_capacity_hours=user_in.weekly_capacity_hours,
        can_manage_automations=user_in.can_manage_automations or ("automations:write" in final_permissions),
        can_edit_projects=user_in.can_edit_projects or ("projects:write" in final_permissions),
        can_manage_billing=user_in.can_manage_billing or ("billing:write" in final_permissions),
        permissions=final_permissions,
        is_active=user_in.is_active,
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    logger.info(f"User created: {new_user.email} (Role: {new_user.role.value}, Permissions count: {len(new_user.permissions or [])}) by {current_user.email}")
    return ApiResponse(data=UserOut.model_validate(new_user))


@router.post("/verify-admin-password", response_model=ApiResponse[dict])
async def verify_admin_password(
    req: AdminPasswordVerifyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    Verifies that the current user has SUPER_ADMIN role and provided valid admin password.
    Enforces brute-force rate limiting to protect administrative actions.
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required.",
        )

    check_clearance_rate_limit(request, str(current_user.id))

    if not verify_password(req.password, current_user.password_hash):
        fail_count = record_clearance_failure(request, str(current_user.id))
        remaining = max(0, 5 - fail_count)
        if remaining == 0:
            check_clearance_rate_limit(request, str(current_user.id))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Incorrect admin master password. {remaining} attempt(s) remaining.",
        )

    record_clearance_success(request, str(current_user.id))
    return ApiResponse(data={"verified": True, "message": "Admin authorization granted."})


@router.get("/{user_id}", response_model=ApiResponse[UserOut])
async def get_user_detail(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve single user details by ID.
    """
    query = select(User).where(User.id == user_id, User.deleted_at.is_(None))
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not user.permissions:
        user.permissions = get_default_permissions_for_role(
            role=user.role,
            can_manage_automations=user.can_manage_automations,
            can_edit_projects=user.can_edit_projects,
            can_manage_billing=user.can_manage_billing,
        )

    return ApiResponse(data=UserOut.model_validate(user))


@router.put("/{user_id}", response_model=ApiResponse[UserOut])
async def update_user(
    user_id: uuid.UUID,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update user profile, credentials, role, and granular module permissions.
    """
    # Permission check: Only SUPER_ADMIN can alter other users' permissions and roles
    if current_user.role != UserRole.SUPER_ADMIN and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Agency Super Admins can modify team member permissions and roles.",
        )

    query = select(User).where(User.id == user_id, User.deleted_at.is_(None))
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Update basic fields if provided
    if user_update.employee_id is not None:
        user.employee_id = user_update.employee_id.strip()
    if user_update.full_name is not None:
        user.full_name = user_update.full_name.strip()
    if user_update.department is not None:
        user.department = user_update.department.strip()
    if user_update.hourly_cost is not None:
        user.hourly_cost = user_update.hourly_cost
    if user_update.weekly_capacity_hours is not None:
        user.weekly_capacity_hours = user_update.weekly_capacity_hours

    # Privilege & Permission updates (Super Admin only)
    if current_user.role == UserRole.SUPER_ADMIN:
        if user_update.role is not None:
            user.role = user_update.role
        if user_update.permissions is not None:
            cleaned_perms = list(set(user_update.permissions))
            user.permissions = cleaned_perms
            user.can_manage_automations = "automations:write" in cleaned_perms or "automations:*" in cleaned_perms
            user.can_manage_billing = "billing:write" in cleaned_perms or "billing:*" in cleaned_perms
            user.can_edit_projects = "projects:write" in cleaned_perms or "projects:*" in cleaned_perms
        else:
            if user_update.can_manage_automations is not None:
                user.can_manage_automations = user_update.can_manage_automations
            if user_update.can_edit_projects is not None:
                user.can_edit_projects = user_update.can_edit_projects
            if user_update.can_manage_billing is not None:
                user.can_manage_billing = user_update.can_manage_billing
        if user_update.is_active is not None:
            user.is_active = user_update.is_active

    # Password update if requested
    if user_update.password:
        user.password_hash = hash_password(user_update.password)

    await db.commit()
    await db.refresh(user)

    if not user.permissions:
        user.permissions = get_default_permissions_for_role(
            role=user.role,
            can_manage_automations=user.can_manage_automations,
            can_edit_projects=user.can_edit_projects,
            can_manage_billing=user.can_manage_billing,
        )

    logger.info(f"User updated: {user.email} by {current_user.email}")
    return ApiResponse(data=UserOut.model_validate(user))


@router.put("/{user_id}/permissions", response_model=ApiResponse[UserOut])
async def update_user_permissions(
    user_id: uuid.UUID,
    perms_update: UserPermissionsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Dedicated Super Admin endpoint to assign and grant module permissions to a team member with ease.
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Agency Super Admins have clearance to assign software permissions.",
        )

    query = select(User).where(User.id == user_id, User.deleted_at.is_(None))
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    cleaned_perms = list(set(perms_update.permissions))
    user.permissions = cleaned_perms

    # Sync backward-compatible flags
    user.can_manage_automations = "automations:write" in cleaned_perms or "automations:*" in cleaned_perms
    user.can_manage_billing = "billing:write" in cleaned_perms or "billing:*" in cleaned_perms
    user.can_edit_projects = "projects:write" in cleaned_perms or "projects:*" in cleaned_perms

    await db.commit()
    await db.refresh(user)

    logger.info(f"Permissions updated for user {user.email}: {len(cleaned_perms)} grants assigned by Super Admin {current_user.email}")
    return ApiResponse(data=UserOut.model_validate(user))


@router.put("/{user_id}/credentials", response_model=ApiResponse[UserOut])
async def admin_reset_user_credentials(
    user_id: uuid.UUID,
    creds: AdminResetPasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Super Admin endpoint to directly reset an employee's password and/or assign a new Employee ID.
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Agency Super Admins can reset team member credentials.",
        )

    query = select(User).where(User.id == user_id, User.deleted_at.is_(None))
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = hash_password(creds.new_password)
    if creds.employee_id:
        user.employee_id = creds.employee_id.strip()

    await db.commit()
    await db.refresh(user)

    if not user.permissions:
        user.permissions = get_default_permissions_for_role(
            role=user.role,
            can_manage_automations=user.can_manage_automations,
            can_edit_projects=user.can_edit_projects,
            can_manage_billing=user.can_manage_billing,
        )

    logger.info(f"Super Admin {current_user.email} updated credentials for {user.email} (Emp ID: {user.employee_id})")
    return ApiResponse(data=UserOut.model_validate(user))


@router.delete("/{user_id}", response_model=ApiResponse[dict])
async def deactivate_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Deactivates or soft-deletes a team member.
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Agency Super Admins can deactivate team members.",
        )

    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own Super Admin account.",
        )

    query = select(User).where(User.id == user_id, User.deleted_at.is_(None))
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = False
    user.deleted_at = datetime.utcnow()
    await db.commit()

    return ApiResponse(data={"message": f"User {user.email} has been deactivated."})

