import uuid
from datetime import datetime
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
import logging

from app.models.models import ContentCalendarItem, User, Notification, AutomationAuditLog
from app.models.enums import ContentApprovalStatus, UserRole

logger = logging.getLogger(__name__)


class ContentPipelineService:
    @staticmethod
    async def submit_for_internal_qa(
        db: AsyncSession,
        item: ContentCalendarItem,
        user: User,
    ) -> ContentCalendarItem:
        if item.approval_status not in [ContentApprovalStatus.DRAFTING, ContentApprovalStatus.REVISION_REQUESTED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot submit for Internal QA from state {item.approval_status.value}",
            )

        item.approval_status = ContentApprovalStatus.INTERNAL_QA
        item.updated_at = datetime.utcnow()

        # Notify account manager or manager
        audit = AutomationAuditLog(
            trigger_event="CONTENT_STATUS_CHANGED",
            entity_type="ContentCalendarItem",
            entity_id=item.id,
            action_taken=f"Content '{item.title}' submitted for Internal QA by {user.full_name}",
            status="SUCCESS",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def forward_to_client_review(
        db: AsyncSession,
        item: ContentCalendarItem,
        manager: User,
    ) -> ContentCalendarItem:
        if item.approval_status != ContentApprovalStatus.INTERNAL_QA:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item must pass Internal QA before forwarding to Client Review.",
            )

        item.approval_status = ContentApprovalStatus.CLIENT_REVIEW
        item.internal_reviewer_id = manager.id
        item.updated_at = datetime.utcnow()

        audit = AutomationAuditLog(
            trigger_event="CONTENT_STATUS_CHANGED",
            entity_type="ContentCalendarItem",
            entity_id=item.id,
            action_taken=f"Content '{item.title}' approved by Manager {manager.full_name} and dispatched to Client Review",
            status="SUCCESS",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def process_client_decision(
        db: AsyncSession,
        item: ContentCalendarItem,
        decision: str,  # 'APPROVED' or 'REVISION_REQUESTED'
        feedback: Optional[str] = None,
    ) -> ContentCalendarItem:
        if item.approval_status != ContentApprovalStatus.CLIENT_REVIEW:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item is not currently awaiting Client Review.",
            )

        now = datetime.utcnow()
        if decision.upper() == "APPROVED":
            item.approval_status = ContentApprovalStatus.APPROVED
            item.client_feedback = feedback or "Approved by client"
            item.updated_at = now
            action_msg = f"Client approved deliverable '{item.title}'."
        elif decision.upper() == "REVISION_REQUESTED":
            item.approval_status = ContentApprovalStatus.REVISION_REQUESTED
            item.client_feedback = feedback or "Revisions requested"
            item.version_number += 1
            item.updated_at = now
            action_msg = f"Client requested revision on '{item.title}': {feedback}"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid client decision. Must be 'APPROVED' or 'REVISION_REQUESTED'.",
            )

        audit = AutomationAuditLog(
            trigger_event="CONTENT_APPROVAL_DECISION",
            entity_type="ContentCalendarItem",
            entity_id=item.id,
            action_taken=action_msg,
            status="SUCCESS",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(item)
        return item


content_pipeline = ContentPipelineService()

