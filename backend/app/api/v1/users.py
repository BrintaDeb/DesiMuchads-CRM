import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
import logging

from app.core.database import get_db
from app.core.security import get_current_user, hash_password
from app.models.models import User
from app.models.enums import UserRole
from app.schemas.schemas import ApiResponse, UserOut, UserCreate, UserUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["Users & Team Management"])


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
    Allows assigning role, department, hourly rate, and automation permissions.
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

    new_user = User(
        email=user_in.email.lower().strip(),
        password_hash=hashed_pwd,
        full_name=user_in.full_name.strip(),
        role=user_in.role,
        department=user_in.department.strip(),
        hourly_cost=user_in.hourly_cost,
        weekly_capacity_hours=user_in.weekly_capacity_hours,
        can_manage_automations=user_in.can_manage_automations,
        can_edit_projects=user_in.can_edit_projects,
        can_manage_billing=user_in.can_manage_billing,
        is_active=user_in.is_active,
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    logger.info(f"User created: {new_user.email} (Role: {new_user.role.value}, Automation: {new_user.can_manage_automations}) by {current_user.email}")
    return ApiResponse(data=UserOut.model_validate(new_user))


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

    return ApiResponse(data=UserOut.model_validate(user))


@router.put("/{user_id}", response_model=ApiResponse[UserOut])
async def update_user(
    user_id: uuid.UUID,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update user profile, credentials, role, and automation permissions.
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
    if user_update.full_name is not None:
        user.full_name = user_update.full_name.strip()
    if user_update.department is not None:
        user.department = user_update.department.strip()
    if user_update.hourly_cost is not None:
        user.hourly_cost = user_update.hourly_cost
    if user_update.weekly_capacity_hours is not None:
        user.weekly_capacity_hours = user_update.weekly_capacity_hours

    # Privilege updates (Super Admin only)
    if current_user.role == UserRole.SUPER_ADMIN:
        if user_update.role is not None:
            user.role = user_update.role
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

    logger.info(f"User updated: {user.email} by {current_user.email}")
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

