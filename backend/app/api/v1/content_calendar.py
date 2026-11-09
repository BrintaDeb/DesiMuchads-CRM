import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.models import ContentCalendarItem, Client, User
from app.models.enums import UserRole, ContentApprovalStatus
from app.schemas.schemas import (
    ApiResponse,
    ContentItemCreate,
    ContentItemUpdate,
    ContentItemOut,
    SubmitForApprovalRequest,
    ClientDecisionRequest,
)
from app.services.content_service import content_pipeline
from app.services.automation_bus import automation_bus
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/content-calendar", tags=["Content Calendar & Two-Tier Approval Pipeline"])


@router.get("/", response_model=ApiResponse[List[ContentItemOut]])
async def list_content_items(
    client_id: Optional[uuid.UUID] = None,
    approval_status: Optional[ContentApprovalStatus] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(ContentCalendarItem).options(selectinload(ContentCalendarItem.client))

    if current_user.role == UserRole.CLIENT:
        # Client only sees items in CLIENT_REVIEW, APPROVED, or PUBLISHED
        query = query.join(Client).where(
            Client.contact_email == current_user.email,
            ContentCalendarItem.approval_status.in_([
                ContentApprovalStatus.CLIENT_REVIEW,
                ContentApprovalStatus.APPROVED,
                ContentApprovalStatus.REVISION_REQUESTED,
                ContentApprovalStatus.PUBLISHED,
            ])
        )
    elif client_id:
        query = query.where(ContentCalendarItem.client_id == client_id)

    if approval_status:
        query = query.where(ContentCalendarItem.approval_status == approval_status)

    query = query.order_by(ContentCalendarItem.scheduled_for.asc())
    res = await db.execute(query)
    items = res.scalars().all()
    return ApiResponse(data=[ContentItemOut.model_validate(i) for i in items])


@router.post("/", response_model=ApiResponse[ContentItemOut])
async def create_content_item(
    data: ContentItemCreate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.SPECIALIST])),
    db: AsyncSession = Depends(get_db),
):
    item = ContentCalendarItem(
        client_id=data.client_id,
        project_id=data.project_id,
        task_id=data.task_id,
        platform=data.platform,
        content_type=data.content_type,
        title=data.title,
        caption_copy=data.caption_copy,
        media_urls=data.media_urls,
        scheduled_for=data.scheduled_for,
        approval_status=ContentApprovalStatus.DRAFTING,
        version_number=1,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return ApiResponse(data=ContentItemOut.model_validate(item))


@router.post("/{id}/submit-for-approval", response_model=ApiResponse[ContentItemOut])
async def submit_for_approval(
    id: uuid.UUID,
    data: SubmitForApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(ContentCalendarItem).options(selectinload(ContentCalendarItem.client)).where(ContentCalendarItem.id == id)
    res = await db.execute(query)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")

    if data.target_tier.upper() == "INTERNAL_QA":
        # Tier 1 submission
        updated_item = await content_pipeline.submit_for_internal_qa(db, item, current_user)
    elif data.target_tier.upper() == "CLIENT_REVIEW":
        # Tier 2 submission (requires manager)
        if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER]:
            raise HTTPException(status_code=403, detail="Only Account Managers can forward to Client Review.")
        updated_item = await content_pipeline.forward_to_client_review(db, item, current_user)
        # Fire Rule 2 automation
        await automation_bus.on_content_moved_to_client_review(db, updated_item)
    else:
        raise HTTPException(status_code=400, detail="Invalid target tier.")

    # Re-fetch with loaded relationship for response serialization
    res_fresh = await db.execute(select(ContentCalendarItem).options(selectinload(ContentCalendarItem.client)).where(ContentCalendarItem.id == item.id))
    fresh_item = res_fresh.scalar_one()

    await ws_manager.broadcast({
        "type": "CONTENT_STATUS_CHANGED",
        "item_id": str(fresh_item.id),
        "title": fresh_item.title,
        "status": fresh_item.approval_status.value,
    })

    return ApiResponse(data=ContentItemOut.model_validate(fresh_item))


@router.post("/{id}/client-decision", response_model=ApiResponse[ContentItemOut])
async def client_decision(
    id: uuid.UUID,
    data: ClientDecisionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(ContentCalendarItem).options(selectinload(ContentCalendarItem.client)).where(ContentCalendarItem.id == id)
    res = await db.execute(query)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")

    updated_item = await content_pipeline.process_client_decision(
        db=db,
        item=item,
        decision=data.decision,
        feedback=data.feedback,
    )

    res_fresh = await db.execute(select(ContentCalendarItem).options(selectinload(ContentCalendarItem.client)).where(ContentCalendarItem.id == item.id))
    fresh_item = res_fresh.scalar_one()

    await ws_manager.broadcast({
        "type": "CLIENT_DECISION_SUBMITTED",
        "item_id": str(fresh_item.id),
        "title": fresh_item.title,
        "status": fresh_item.approval_status.value,
        "feedback": data.feedback,
    })

    return ApiResponse(data=ContentItemOut.model_validate(fresh_item))
