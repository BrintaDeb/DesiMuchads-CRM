import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import ContentCalendarItem, Task, CalendarEvent, LeaveRequest, User, Client
from app.models.enums import UserRole, LeaveStatus
from app.schemas.schemas import (
    ApiResponse,
    CalendarEventCreate,
    CalendarEventOut,
    MasterCalendarFeedItem,
)

router = APIRouter(prefix="/calendar", tags=["Unified Master Calendar"])


@router.get("/unified-feed", response_model=ApiResponse[List[MasterCalendarFeedItem]])
async def get_unified_calendar_feed(
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    layers: Optional[str] = Query("CONTENT,DEADLINE,MEETING,LEAVE", description="Comma-separated layers"),
    client_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_dt = start or (datetime.utcnow() - timedelta(days=15))
    end_dt = end or (datetime.utcnow() + timedelta(days=45))
    active_layers = set([l.strip().upper() for l in layers.split(",") if l.strip()])

    feed_items: List[MasterCalendarFeedItem] = []

    # Layer 1: Content Publishing Drops
    if "CONTENT" in active_layers:
        c_query = select(ContentCalendarItem).options(selectinload(ContentCalendarItem.client)).where(
            ContentCalendarItem.scheduled_for >= start_dt,
            ContentCalendarItem.scheduled_for <= end_dt,
        )
        if client_id:
            c_query = c_query.where(ContentCalendarItem.client_id == client_id)
        if current_user.role == UserRole.CLIENT:
            c_query = c_query.join(Client).where(Client.contact_email == current_user.email)

        c_res = await db.execute(c_query)
        for item in c_res.scalars().all():
            feed_items.append(
                MasterCalendarFeedItem(
                    id=f"content_{item.id}",
                    layer="CONTENT",
                    title=f"[{item.platform.value}] {item.title}",
                    start=item.scheduled_for,
                    end=item.scheduled_for + timedelta(hours=1),
                    status=item.approval_status.value,
                    client_name=item.client.company_name if item.client else None,
                    metadata={"platform": item.platform.value, "content_type": item.content_type.value},
                )
            )

    # Layer 2: Task Hard Deadlines & Milestones
    if "DEADLINE" in active_layers:
        t_query = select(Task).options(selectinload(Task.assignee)).where(
            Task.due_at >= start_dt,
            Task.due_at <= end_dt,
            Task.deleted_at.is_(None),
        )
        if current_user.role == UserRole.SPECIALIST:
            t_query = t_query.where(Task.assigned_to_id == current_user.id)

        t_res = await db.execute(t_query)
        for t in t_res.scalars().all():
            feed_items.append(
                MasterCalendarFeedItem(
                    id=f"task_{t.id}",
                    layer="DEADLINE",
                    title=f"⏱️ Deadline: {t.title}",
                    start=t.due_at,
                    end=t.due_at,
                    status=t.status.value,
                    assigned_to_name=t.assignee.full_name if t.assignee else None,
                    metadata={"priority": t.priority.value, "estimated_hours": t.estimated_hours},
                )
            )

    # Layer 3: Client Meetings & Strategy Calls
    if "MEETING" in active_layers:
        m_query = select(CalendarEvent).options(selectinload(CalendarEvent.client)).where(
            CalendarEvent.start_time >= start_dt,
            CalendarEvent.end_time <= end_dt,
        )
        if client_id:
            m_query = m_query.where(CalendarEvent.client_id == client_id)

        m_res = await db.execute(m_query)
        for ev in m_res.scalars().all():
            feed_items.append(
                MasterCalendarFeedItem(
                    id=f"event_{ev.id}",
                    layer="MEETING",
                    title=f"🤝 {ev.title}",
                    start=ev.start_time,
                    end=ev.end_time,
                    client_name=ev.client.company_name if ev.client else None,
                    metadata={"meeting_link": ev.meeting_link, "attendees": ev.attendees},
                )
            )

    # Layer 4: Team Leaves & Availability
    if "LEAVE" in active_layers and current_user.role != UserRole.CLIENT:
        start_date = start_dt.date()
        end_date = end_dt.date()
        l_query = select(LeaveRequest).options(selectinload(LeaveRequest.user)).where(
            LeaveRequest.status == LeaveStatus.APPROVED,
            LeaveRequest.start_date <= end_date,
            LeaveRequest.end_date >= start_date,
        )
        l_res = await db.execute(l_query)
        for l in l_res.scalars().all():
            feed_items.append(
                MasterCalendarFeedItem(
                    id=f"leave_{l.id}",
                    layer="LEAVE",
                    title=f"🌴 {l.user.full_name} ({l.leave_type.value} Leave)",
                    start=datetime.combine(l.start_date, datetime.min.time()),
                    end=datetime.combine(l.end_date, datetime.max.time()),
                    status="APPROVED",
                    assigned_to_name=l.user.full_name,
                    metadata={"reason": l.reason},
                )
            )

    feed_items.sort(key=lambda x: x.start)
    return ApiResponse(data=feed_items)


@router.post("/events", response_model=ApiResponse[CalendarEventOut])
async def create_calendar_event(
    data: CalendarEventCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = CalendarEvent(
        title=data.title,
        event_type=data.event_type,
        start_time=data.start_time,
        end_time=data.end_time,
        client_id=data.client_id,
        created_by_id=current_user.id,
        attendees=data.attendees,
        meeting_link=data.meeting_link,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return ApiResponse(data=CalendarEventOut.model_validate(event))

