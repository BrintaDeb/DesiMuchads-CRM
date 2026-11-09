import uuid
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from fastapi import HTTPException, status
import logging

from app.models.models import AttendanceLog, User, LeaveRequest, Task, Notification
from app.models.enums import AttendanceStatus, WorkMode, LeaveStatus, TaskStatus, UserRole

logger = logging.getLogger(__name__)


class AttendanceService:
    @staticmethod
    async def get_today_active_session(
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> Optional[AttendanceLog]:
        today = date.today()
        query = select(AttendanceLog).where(
            AttendanceLog.user_id == user_id,
            AttendanceLog.date == today,
            AttendanceLog.clock_out_at.is_(None),
        ).order_by(AttendanceLog.clock_in_at.desc())
        res = await db.execute(query)
        return res.scalar_one_or_none()

    @staticmethod
    async def clock_in(
        db: AsyncSession,
        user: User,
        work_mode: WorkMode = WorkMode.IN_OFFICE,
        ip_address: Optional[str] = None,
    ) -> AttendanceLog:
        # Check if already active
        existing = await AttendanceService.get_today_active_session(db, user.id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already clocked in for an active session.",
            )

        now = datetime.utcnow()
        attendance = AttendanceLog(
            user_id=user.id,
            date=date.today(),
            clock_in_at=now,
            work_mode=work_mode,
            ip_address=ip_address,
            status=AttendanceStatus.ACTIVE,
            total_break_seconds=0,
            net_worked_seconds=0,
        )
        db.add(attendance)
        await db.commit()
        await db.refresh(attendance)
        return attendance

    @staticmethod
    async def toggle_break(
        db: AsyncSession,
        user: User,
        action: str,  # 'start' or 'resume'
    ) -> AttendanceLog:
        session = await AttendanceService.get_today_active_session(db, user.id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active attendance session found to toggle break.",
            )

        now = datetime.utcnow()
        if action.lower() == "start":
            if session.status == AttendanceStatus.ON_BREAK:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already on break.")
            session.status = AttendanceStatus.ON_BREAK
            session.break_start_at = now
        elif action.lower() == "resume":
            if session.status != AttendanceStatus.ON_BREAK or not session.break_start_at:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is not currently on break.")
            break_duration = int((now - session.break_start_at).total_seconds())
            session.total_break_seconds += max(0, break_duration)
            session.break_start_at = None
            session.status = AttendanceStatus.ACTIVE
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid break action. Use 'start' or 'resume'.")

        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def clock_out(
        db: AsyncSession,
        user: User,
    ) -> AttendanceLog:
        session = await AttendanceService.get_today_active_session(db, user.id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active attendance session found to clock out.",
            )

        now = datetime.utcnow()
        # If clocked out while still on break, finalize the break seconds
        if session.status == AttendanceStatus.ON_BREAK and session.break_start_at:
            break_duration = int((now - session.break_start_at).total_seconds())
            session.total_break_seconds += max(0, break_duration)
            session.break_start_at = None

        total_elapsed = int((now - session.clock_in_at).total_seconds())
        session.net_worked_seconds = max(0, total_elapsed - session.total_break_seconds)
        session.clock_out_at = now
        session.status = AttendanceStatus.COMPLETED

        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def check_leave_conflicts(
        db: AsyncSession,
        user_id: uuid.UUID,
        start_date: date,
        end_date: date,
    ) -> List[Task]:
        """
        Capacity Guardrail: Detects if any assigned tasks have deadlines falling within the leave window.
        """
        start_dt = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(end_date, datetime.max.time())

        query = select(Task).where(
            Task.assigned_to_id == user_id,
            Task.due_at >= start_dt,
            Task.due_at <= end_dt,
            Task.status != TaskStatus.COMPLETED,
            Task.deleted_at.is_(None),
        )
        res = await db.execute(query)
        conflicting_tasks = list(res.scalars().all())
        return conflicting_tasks

    @staticmethod
    async def regularize_idle_sessions(db: AsyncSession) -> List[str]:
        """
        Idle & Auto-Checkout Protection:
        Detects open attendance sessions exceeding 12 hours without clocking out,
        flags them as REGULARIZATION_NEEDED, and dispatches a notification to the employee.
        """
        now = datetime.utcnow()
        twelve_hours_ago = now - timedelta(hours=12)

        query = select(AttendanceLog).where(
            AttendanceLog.clock_out_at.is_(None),
            AttendanceLog.clock_in_at <= twelve_hours_ago,
            AttendanceLog.status.in_([AttendanceStatus.ACTIVE, AttendanceStatus.ON_BREAK]),
        )
        res = await db.execute(query)
        idle_logs = res.scalars().all()

        logs = []
        for log in idle_logs:
            log.status = AttendanceStatus.REGULARIZATION_NEEDED
            log.clock_out_at = now
            elapsed = int((now - log.clock_in_at).total_seconds())
            log.net_worked_seconds = max(0, elapsed - log.total_break_seconds)

            notif = Notification(
                user_id=log.user_id,
                title="⚠️ Attendance Flagged: Regularization Needed",
                message="Your attendance session exceeded 12 hours without clocking out and has been flagged for regularization.",
                category="SLA_WARNING",
                link="/attendance",
            )
            db.add(notif)
            logs.append(f"Regularized idle session for user {log.user_id}")

        if idle_logs:
            await db.commit()
            logger.info(f"Attendance daemon regularized {len(idle_logs)} idle sessions.")

        return logs


attendance_service = AttendanceService()

