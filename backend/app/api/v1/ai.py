from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Client, Task, AttendanceLog
from app.models.enums import AttendanceStatus, TaskPriority
from app.schemas.schemas import (
    ApiResponse,
    CampaignBriefRequest,
    ContentIdeationRequest,
    StandupDigestRequest,
)
from app.services.gemini_ai import gemini_service

router = APIRouter(prefix="/ai", tags=["Google Gemini AI Automation Layer"])


@router.post("/campaign-brief", response_model=ApiResponse[dict])
async def generate_campaign_brief(
    data: CampaignBriefRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c_query = select(Client).where(Client.id == data.client_id)
    c_res = await db.execute(c_query)
    client = c_res.scalar_one_or_none()
    company_name = client.company_name if client else "Partner Client"

    result = await gemini_service.generate_campaign_brief(
        company_name=company_name,
        objective=data.campaign_objective,
        target_audience=data.target_audience,
        budget=data.budget,
        platforms=data.platforms,
    )
    return ApiResponse(data=result)


@router.post("/content-ideation", response_model=ApiResponse[list])
async def generate_content_ideation(
    data: ContentIdeationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c_query = select(Client).where(Client.id == data.client_id)
    c_res = await db.execute(c_query)
    client = c_res.scalar_one_or_none()
    company_name = client.company_name if client else "Agency Client"

    result = await gemini_service.generate_content_ideation(
        company_name=company_name,
        industry=data.industry,
        pillar=data.pillar,
        month=data.month,
    )
    return ApiResponse(data=result)


@router.post("/standup-digest", response_model=ApiResponse[dict])
async def generate_standup_digest(
    data: StandupDigestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Fetch live telemetry
    att_res = await db.execute(select(AttendanceLog).where(AttendanceLog.status == AttendanceStatus.ACTIVE))
    clocked_in = len(att_res.scalars().all())

    task_res = await db.execute(select(Task).where(Task.status == "IN_PROGRESS"))
    in_progress = len(task_res.scalars().all())

    blocked_res = await db.execute(select(Task).where(Task.status == "BLOCKED"))
    blocked = len(blocked_res.scalars().all())

    critical_res = await db.execute(select(Task).where(Task.priority == TaskPriority.CRITICAL))
    critical = len(critical_res.scalars().all())

    digest = await gemini_service.generate_standup_digest(
        total_clocked_in=clocked_in,
        active_tasks_count=in_progress,
        blocked_tasks_count=blocked,
        critical_slas_count=critical,
    )
    return ApiResponse(data=digest)


class CreativeHooksRequest(BaseModel):
    brand_name: str = "The Desi Muchads"
    topic: str = "Winter Festive Collection"
    format_type: str = "REEL"


@router.post("/creative-hooks", response_model=ApiResponse[dict])
async def generate_creative_hooks(
    data: CreativeHooksRequest,
    current_user: User = Depends(get_current_user),
):
    result = await gemini_service.generate_creative_hooks(
        brand_name=data.brand_name,
        topic=data.topic,
        format_type=data.format_type,
    )
    return ApiResponse(data=result)


