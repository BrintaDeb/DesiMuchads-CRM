import uuid
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.models import User, AttendanceLog, LeaveRequest, Task
from app.models.enums import UserRole, AttendanceStatus, LeaveStatus
from app.schemas.schemas import (
    ApiResponse,
    ClockInRequest,
    BreakToggleRequest,
    ClockOutRequest,
    AttendanceLogOut,
    LiveAttendanceBoardItem,
    LeaveRequestCreate,
    LeaveRequestReview,
    LeaveRequestOut,
)
from app.services.attendance_service import attendance_service
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/attendance", tags=["Workforce Capacity & Live Attendance"])


@router.post("/clock-in", response_model=ApiResponse[AttendanceLogOut])
async def clock_in(
    data: ClockInRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await attendance_service.clock_in(
        db=db,
        user=current_user,
        work_mode=data.work_mode,
        ip_address=data.ip_address,
    )
    # Broadcast live status update via WebSocket
    await ws_manager.broadcast({
        "type": "ATTENDANCE_CHANGED",
        "user_id": str(current_user.id),
        "full_name": current_user.full_name,
        "status": session.status.value,
        "work_mode": session.work_mode.value,
        "clock_in_at": session.clock_in_at.isoformat(),
    })
    return ApiResponse(data=AttendanceLogOut.model_validate(session))


@router.post("/break-toggle", response_model=ApiResponse[AttendanceLogOut])
async def toggle_break(
    data: BreakToggleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await attendance_service.toggle_break(
        db=db,
        user=current_user,
        action=data.action,
    )
    await ws_manager.broadcast({
        "type": "ATTENDANCE_CHANGED",
        "user_id": str(current_user.id),
        "full_name": current_user.full_name,
        "status": session.status.value,
        "total_break_seconds": session.total_break_seconds,
    })
    return ApiResponse(data=AttendanceLogOut.model_validate(session))


@router.post("/clock-out", response_model=ApiResponse[AttendanceLogOut])
async def clock_out(
    data: Optional[ClockOutRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await attendance_service.clock_out(db=db, user=current_user)
    await ws_manager.broadcast({
        "type": "ATTENDANCE_CHANGED",
        "user_id": str(current_user.id),
        "full_name": current_user.full_name,
        "status": session.status.value,
        "net_worked_seconds": session.net_worked_seconds,
    })
    return ApiResponse(data=AttendanceLogOut.model_validate(session))


@router.get("/live-board", response_model=ApiResponse[List[LiveAttendanceBoardItem]])
async def get_live_attendance_board(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Fetch all active internal users
    users_query = select(User).where(
        User.role != UserRole.CLIENT,
        User.is_active == True,
        User.deleted_at.is_(None),
    ).order_by(User.full_name.asc())
    users_res = await db.execute(users_query)
    users = users_res.scalars().all()

    today = date.today()
    board: List[LiveAttendanceBoardItem] = []

    for u in users:
        # Check today's active attendance session
        att_query = select(AttendanceLog).where(
            AttendanceLog.user_id == u.id,
            AttendanceLog.date == today,
        ).order_by(AttendanceLog.clock_in_at.desc())
        att_res = await db.execute(att_query)
        session = att_res.scalar_one_or_none()

        status_val = AttendanceStatus.COMPLETED
        work_mode_val = session.work_mode if session else u.attendance_records and u.attendance_records[0].work_mode
        clock_in_time = None
        break_start = None
        net_seconds = 0

        if session:
            status_val = session.status
            work_mode_val = session.work_mode
            clock_in_time = session.clock_in_at
            break_start = session.break_start_at
            if session.clock_out_at:
                net_seconds = session.net_worked_seconds
            else:
                elapsed = int((datetime.utcnow() - session.clock_in_at).total_seconds())
                current_break = int((datetime.utcnow() - session.break_start_at).total_seconds()) if session.break_start_at else 0
                net_seconds = max(0, elapsed - (session.total_break_seconds + current_break))
        else:
            status_val = AttendanceStatus.COMPLETED  # Not clocked in yet today

        # Fetch currently active task if in progress
        task_query = select(Task.title).where(
            Task.assigned_to_id == u.id,
            Task.status == "IN_PROGRESS",
            Task.deleted_at.is_(None),
        ).limit(1)
        task_res = await db.execute(task_query)
        active_task_title = task_res.scalar_one_or_none()

        board.append(
            LiveAttendanceBoardItem(
                user_id=u.id,
                full_name=u.full_name,
                department=u.department,
                role=u.role,
                attendance_status=status_val,
                work_mode=work_mode_val or "IN_OFFICE",
                clock_in_at=clock_in_time,
                break_start_at=break_start,
                net_worked_seconds=net_seconds,
                active_task_title=active_task_title,
            )
        )

    return ApiResponse(data=board)


@router.get("/my-status", response_model=ApiResponse[Optional[AttendanceLogOut]])
async def get_my_current_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await attendance_service.get_today_active_session(db, current_user.id)
    if not session:
        return ApiResponse(data=None)
    return ApiResponse(data=AttendanceLogOut.model_validate(session))


# Leave Requests & Capacity Guardrail
@router.post("/leave-requests", response_model=ApiResponse[LeaveRequestOut])
async def submit_leave_request(
    data: LeaveRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.end_date < data.start_date:
        raise HTTPException(status_code=400, detail="End date cannot precede start date.")

    leave = LeaveRequest(
        user_id=current_user.id,
        leave_type=data.leave_type,
        start_date=data.start_date,
        end_date=data.end_date,
        reason=data.reason,
        status=LeaveStatus.PENDING,
    )
    db.add(leave)
    await db.commit()
    await db.refresh(leave)
    return ApiResponse(data=LeaveRequestOut.model_validate(leave))


@router.get("/leave-requests", response_model=ApiResponse[List[LeaveRequestOut]])
async def list_leave_requests(
    status_filter: Optional[LeaveStatus] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(LeaveRequest)
    if current_user.role == UserRole.SPECIALIST:
        query = query.where(LeaveRequest.user_id == current_user.id)
    elif status_filter:
        query = query.where(LeaveRequest.status == status_filter)

    query = query.order_by(LeaveRequest.created_at.desc())
    res = await db.execute(query)
    leaves = res.scalars().all()
    return ApiResponse(data=[LeaveRequestOut.model_validate(l) for l in leaves])


@router.patch("/leave-requests/{id}/review", response_model=ApiResponse[dict])
async def review_leave_request(
    id: uuid.UUID,
    data: LeaveRequestReview,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER])),
    db: AsyncSession = Depends(get_db),
):
    query = select(LeaveRequest).where(LeaveRequest.id == id)
    res = await db.execute(query)
    leave = res.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found.")

    leave.status = data.status
    leave.approved_by_id = current_user.id
    leave.reviewed_at = datetime.utcnow()

    conflicts_warn = []
    if data.status == LeaveStatus.APPROVED:
        # Run Capacity Guardrail check for assigned tasks during leave window
        conflicting_tasks = await attendance_service.check_leave_conflicts(
            db, leave.user_id, leave.start_date, leave.end_date
        )
        if conflicting_tasks:
            conflicts_warn = [f"Task '{t.title}' due {t.due_at.strftime('%Y-%m-%d')}" for t in conflicting_tasks]

    await db.commit()
    return ApiResponse(
        data={
            "id": str(leave.id),
            "status": leave.status.value,
            "capacity_guardrail_conflicts": conflicts_warn,
            "message": f"Leave marked {leave.status.value}. {len(conflicts_warn)} task deadline conflicts detected!" if conflicts_warn else f"Leave marked {leave.status.value}.",
        }
    )

