from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.models import Notification, AutomationAuditLog, User
from app.models.enums import UserRole
from app.schemas.schemas import ApiResponse, NotificationOut, AutomationAuditLogOut

router = APIRouter(prefix="/notifications", tags=["Notification Center & Audit Logs"])


@router.get("/", response_model=ApiResponse[List[NotificationOut]])
async def get_my_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Notification).where(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(50)
    res = await db.execute(query)
    notifs = res.scalars().all()
    return ApiResponse(data=[NotificationOut.model_validate(n) for n in notifs])


@router.patch("/read-all", response_model=ApiResponse[dict])
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = update(Notification).where(Notification.user_id == current_user.id, Notification.is_read == False).values(is_read=True)
    await db.execute(stmt)
    await db.commit()
    return ApiResponse(data={"message": "All notifications marked as read"})


@router.get("/audit-logs", response_model=ApiResponse[List[AutomationAuditLogOut]])
async def get_audit_logs(
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER])),
    db: AsyncSession = Depends(get_db),
):
    query = select(AutomationAuditLog).order_by(AutomationAuditLog.executed_at.desc()).limit(100)
    res = await db.execute(query)
    logs = res.scalars().all()
    return ApiResponse(data=[AutomationAuditLogOut.model_validate(l) for l in logs])

