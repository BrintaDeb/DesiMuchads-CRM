from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.models import User
from app.models.enums import UserRole
from app.schemas.schemas import (
    ApiResponse,
    BulkCampaignPreviewRequest,
    BulkCampaignDispatchRequest,
    BulkCampaignOut,
)
from app.services.bulk_messaging import bulk_messaging_service

router = APIRouter(prefix="/crm/bulk-messaging", tags=["CRM Bulk Messaging & Broadcast Studio"])

DEFAULT_CAMPAIGN_TEMPLATES = [
    {
        "id": "tpl-whatsapp-lead",
        "name": "High-Converting WhatsApp Lead Outreach",
        "channel": "WHATSAPP",
        "category": "Lead Acquisition",
        "template": "Hey {{first_name}}! 👋 Noticed {{company_name}}'s rapid commercial growth. We analyzed your {{niche}} digital acquisition funnels and uncovered a 40% higher conversion opportunity. Mind if I share our 2-min video teardown?",
    },
    {
        "id": "tpl-whatsapp-followup",
        "name": "Proposal Follow-up & VIP Check-in",
        "channel": "WHATSAPP",
        "category": "Deal Closing",
        "template": "Hi {{first_name}}, following up on our growth blueprint for {{company_name}} (est. {{deal_value}}/mo). We reserved priority onboarding slots for this week. Would Thursday 4 PM work for a brief 10-min alignment call?",
    },
    {
        "id": "tpl-whatsapp-reengagement",
        "name": "Festive / Quarter Milestone Check-in",
        "channel": "WHATSAPP",
        "category": "Retention & Re-engagement",
        "template": "Hey {{first_name}}! Reaching out from The Desi Muchads. We're launching our Q4 Performance Retainer for top {{niche}} brands in {{city}}. We'd love to partner with {{company_name}}—can I send over the executive summary?",
    },
    {
        "id": "tpl-email-audit",
        "name": "Executive Growth Teardown Email",
        "channel": "EMAIL",
        "category": "Cold Email Teardown",
        "subject": "Growth bottleneck teardown for {{company_name}}",
        "template": "Hi {{contact_name}},\n\nOur research desk at The Desi Muchads completed a technical teardown for {{company_name}}'s {{niche}} presence in {{city}}.\n\nWe identified 2 immediate scaling bottlenecks that could unlock ₹2L+ in monthly high-intent pipeline:\n1. Mobile checkout latency & bounce friction\n2. Under-optimized Google 3-Pack and meta creative fatigue\n\nFor reference, we recently generated 4.2x ROAS for a similar brand in your category.\n\nWould you be open to a 10-minute preview call this Thursday or Friday?\n\nBest regards,\nGrowth Team | The Desi Muchads\nthedesimuchads.com",
    },
    {
        "id": "tpl-team-announcement",
        "name": "Internal Team Announcement",
        "channel": "WHATSAPP",
        "category": "Internal Team",
        "template": "Team Update for {{contact_name}} ({{niche}}): All hands briefing scheduled for tomorrow at 10 AM. Please ensure active deliverables and attendance logs are updated.",
    },
]


@router.get("/templates", response_model=ApiResponse[List[Dict[str, Any]]])
async def get_message_templates(
    current_user: User = Depends(get_current_user),
):
    """
    Returns pre-curated high-converting templates for WhatsApp and Email bulk messaging.
    """
    return ApiResponse(data=DEFAULT_CAMPAIGN_TEMPLATES)


@router.get("/audiences", response_model=ApiResponse[Dict[str, Any]])
async def get_audiences_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns recipient counts for each target audience segment.
    """
    leads = await bulk_messaging_service.get_audience_recipients(db, "ALL_LEADS")
    hot_buyers = await bulk_messaging_service.get_audience_recipients(db, "HOT_BUYERS")
    won_clients = await bulk_messaging_service.get_audience_recipients(db, "WON_CLIENTS")
    team = await bulk_messaging_service.get_audience_recipients(db, "TEAM")

    return ApiResponse(
        data={
            "segments": [
                {
                    "key": "ALL_LEADS",
                    "label": "All CRM Leads & Prospects",
                    "count": len(leads),
                    "channels": ["WHATSAPP", "EMAIL", "SMS"],
                },
                {
                    "key": "HOT_BUYERS",
                    "label": "High-Intent Hot Buyers (₹1L+ Deal Value)",
                    "count": len(hot_buyers),
                    "channels": ["WHATSAPP", "EMAIL"],
                },
                {
                    "key": "WON_CLIENTS",
                    "label": "Signed Clients & Active Retainers",
                    "count": len(won_clients),
                    "channels": ["WHATSAPP", "EMAIL"],
                },
                {
                    "key": "TEAM",
                    "label": "Agency Staff & Specialists",
                    "count": len(team),
                    "channels": ["WHATSAPP", "EMAIL"],
                },
                {
                    "key": "CUSTOM",
                    "label": "Custom Contact List (Paste or CSV)",
                    "count": 0,
                    "channels": ["WHATSAPP", "EMAIL", "SMS"],
                },
            ]
        }
    )


@router.post("/preview", response_model=ApiResponse[Dict[str, Any]])
async def preview_bulk_campaign(
    req: BulkCampaignPreviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Interpolates variables in message template and returns rendered sample previews.
    """
    preview = await bulk_messaging_service.preview_campaign(db, req)
    return ApiResponse(data=preview)


@router.post("/dispatch", response_model=ApiResponse[BulkCampaignOut])
async def dispatch_bulk_campaign(
    req: BulkCampaignDispatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER])),
):
    """
    CRITICAL AGENTIC FEATURE:
    Dispatches personalized bulk outreach campaign across WhatsApp, Email, or SMS,
    generates 1-click click-to-chat links, updates delivery telemetry, and logs system audit.
    """
    campaign = await bulk_messaging_service.dispatch_campaign(db, req, sender_user=current_user)
    return ApiResponse(
        data=campaign,
        meta={"timestamp": datetime.utcnow()},
    )


@router.get("/campaigns", response_model=ApiResponse[List[BulkCampaignOut]])
async def list_campaigns(
    limit: int = Query(default=15, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves history of past bulk message broadcasts and performance statistics.
    """
    campaigns = await bulk_messaging_service.list_recent_campaigns(db, limit=limit)
    return ApiResponse(data=campaigns)
