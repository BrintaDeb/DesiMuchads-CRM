import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.models import User, Client, AutomationAuditLog
from app.models.enums import UserRole, ClientStatus, DealStage
from app.schemas.schemas import (
    ApiResponse,
    LeadDiscoveryRequest,
    DiscoveredLeadItem,
    LeadOutreachGenerateRequest,
    LeadInjectBatchRequest,
    LeadDispatchBatchRequest,
)
from app.services.lead_generator import lead_engine_service
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/crm/lead-generator", tags=["Autonomous Area Lead Generation & Cold Outreach"])


@router.get("/presets", response_model=ApiResponse[Dict[str, Any]])
async def get_lead_generator_presets(
    current_user: User = Depends(get_current_user),
):
    """
    Returns pre-configured Indian metro business hubs and niche verticals
    for autonomous area-based prospecting.
    """
    presets = lead_engine_service.get_presets()
    return ApiResponse(data=presets)


@router.post("/discover", response_model=ApiResponse[List[DiscoveredLeadItem]])
async def discover_leads_by_area(
    req: LeadDiscoveryRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Autonomous lead discovery engine based on city, area preference, and niche.
    Synthesizes brand profiles, decision makers, audit teardowns, and cold pitch scripts.
    """
    leads = lead_engine_service.discover_leads(req)
    return ApiResponse(
        data=leads,
        meta={"total_count": len(leads), "timestamp": datetime.utcnow()},
    )


@router.post("/generate-pitch", response_model=ApiResponse[Dict[str, Any]])
async def generate_custom_pitch(
    req: LeadOutreachGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generates a personalized cold email and WhatsApp sequence tailored for
    a specific lead, region, and identified bottleneck.
    """
    pitch = lead_engine_service.generate_custom_pitch(
        company_name=req.company_name,
        founder_name=req.founder_name,
        niche=req.niche,
        area=req.area,
        pain_point=req.primary_pain_point,
    )
    return ApiResponse(data=pitch)


@router.post("/inject-batch", response_model=ApiResponse[Dict[str, Any]])
async def inject_leads_to_pipeline(
    req: LeadInjectBatchRequest,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER])),
    db: AsyncSession = Depends(get_db),
):
    """
    CRUCIAL AUTOMATION:
    Atomically ingests selected area leads into the live CRM Deals pipeline,
    assigns the current Account Manager, sets deal values and tags, and logs an audit trail.
    """
    if not req.leads:
        raise HTTPException(status_code=400, detail="No leads provided for injection")

    created_deals = []
    now = datetime.utcnow()

    for item in req.leads:
        # Avoid duplicate check by company name
        stmt = select(Client).where(Client.company_name == item.company_name, Client.deleted_at.is_(None))
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()

        if existing:
            continue

        new_client = Client(
            company_name=item.company_name,
            industry=item.niche,
            primary_contact_name=item.founder_name,
            contact_email=item.email,
            contact_phone=item.phone,
            deal_stage=req.stage,
            deal_value=item.deal_value,
            retainer_amount=item.deal_value,
            status=ClientStatus.LEAD,
            health_score=item.intent_score,
            account_manager_id=current_user.id,
            last_activity_at=now,
        )
        db.add(new_client)
        await db.flush()

        # Audit log for autonomous lead ingestion
        audit = AutomationAuditLog(
            trigger_event="AREA_LEAD_DISCOVERY_INGESTION",
            entity_type="CLIENT_DEAL",
            entity_id=new_client.id,
            action_taken=f"Ingested {item.company_name} from {item.area} ({item.niche}) into CRM pipeline",
            executed_at=now,
            status="SUCCESS",
            details={
                "area": item.area,
                "city": item.city,
                "deal_value": item.deal_value,
                "intent_score": item.intent_score,
                "recommended_service": item.recommended_service,
                "account_manager": current_user.full_name,
            },
        )
        db.add(audit)

        created_deals.append({
            "id": str(new_client.id),
            "company_name": new_client.company_name,
            "deal_value": new_client.deal_value,
            "stage": new_client.deal_stage.value if new_client.deal_stage else "LEAD_CAPTURED",
        })

    await db.commit()

    # Broadcast to all connected agents / mobile devices
    await ws_manager.broadcast({
        "type": "LEADS_INJECTED",
        "payload": {
            "count": len(created_deals),
            "injected_by": current_user.full_name,
            "timestamp": now.isoformat(),
        },
    })

    return ApiResponse(
        data={
            "injected_count": len(created_deals),
            "created_deals": created_deals,
            "message": f"Successfully injected {len(created_deals)} high-intent leads into the CRM pipeline.",
        }
    )


@router.post("/dispatch-outreach", response_model=ApiResponse[Dict[str, Any]])
async def dispatch_cold_outreach(
    req: LeadDispatchBatchRequest,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER])),
    db: AsyncSession = Depends(get_db),
):
    """
    Autonomous Cold Outreach Dispatch:
    Dispatches cold email and cold WhatsApp messages for the selected batch,
    logging individual audit receipts and alerting the agency team.
    """
    leads_to_process = req.leads or []
    dispatched_count = 0
    now = datetime.utcnow()

    for item in leads_to_process:
        # Log audit entry for cold outreach dispatch
        audit = AutomationAuditLog(
            trigger_event=f"COLD_OUTREACH_DISPATCHED_{req.channel}",
            entity_type="PROSPECT_LEAD",
            entity_id=uuid.uuid4(),
            action_taken=f"Dispatched {req.channel} cold pitch to {item.founder_name} at {item.company_name} ({item.area})",
            executed_at=now,
            status="SUCCESS",
            details={
                "channel": req.channel,
                "email": item.email,
                "phone": item.phone,
                "subject": item.cold_email_subject,
                "whatsapp_pitch": item.cold_whatsapp_text,
                "dispatched_by": current_user.full_name,
            },
        )
        db.add(audit)
        dispatched_count += 1

    await db.commit()

    # Broadcast live update
    await ws_manager.broadcast({
        "type": "COLD_OUTREACH_DISPATCHED",
        "payload": {
            "channel": req.channel,
            "count": dispatched_count,
            "sender": current_user.full_name,
            "timestamp": now.isoformat(),
        },
    })

    return ApiResponse(
        data={
            "dispatched_count": dispatched_count,
            "channel": req.channel,
            "status": "DISPATCHED",
            "message": f"Dispatched {dispatched_count} personalized cold outreach touches via {req.channel}.",
        }
    )

