import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.models import Client, User
from app.models.enums import UserRole, ClientStatus, DealStage
from app.schemas.schemas import (
    ApiResponse,
    ClientCreate,
    ClientUpdate,
    ClientOut,
    DealConvertToClientRequest,
    GenerateProposalRequest,
)
from app.services.onboarding import onboarding_engine
from app.services.proposal_generator import proposal_service
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/crm", tags=["CRM & Autonomous Sales Pipeline"])


@router.get("/deals", response_model=ApiResponse[List[dict]])
async def list_deals(
    stage: Optional[DealStage] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Client).where(Client.deleted_at.is_(None))
    if stage:
        query = query.where(Client.deal_stage == stage)

    query = query.order_by(Client.last_activity_at.desc())
    res = await db.execute(query)
    clients = res.scalars().all()

    now = datetime.utcnow()
    decay_threshold = now - timedelta(hours=48)

    deals = []
    for c in clients:
        is_decaying = (c.deal_stage not in [DealStage.WON, DealStage.LOST]) and (c.last_activity_at <= decay_threshold)
        deals.append({
            "id": str(c.id),
            "company_name": c.company_name,
            "industry": c.industry,
            "primary_contact_name": c.primary_contact_name,
            "contact_email": c.contact_email,
            "contact_phone": c.contact_phone,
            "deal_stage": c.deal_stage.value if c.deal_stage else None,
            "deal_value": c.deal_value,
            "retainer_amount": c.retainer_amount,
            "status": c.status.value,
            "health_score": c.health_score,
            "last_activity_at": c.last_activity_at.isoformat(),
            "is_decaying": is_decaying,
            "account_manager_id": str(c.account_manager_id) if c.account_manager_id else None,
        })

    return ApiResponse(data=deals)


@router.post("/deals", response_model=ApiResponse[ClientOut])
async def create_deal(
    data: ClientCreate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER])),
    db: AsyncSession = Depends(get_db),
):
    client = Client(
        company_name=data.company_name,
        industry=data.industry,
        primary_contact_name=data.primary_contact_name,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone,
        retainer_amount=data.retainer_amount,
        billing_cycle_day=data.billing_cycle_day,
        gst_tax_id=data.gst_tax_id,
        deal_stage=data.deal_stage or DealStage.LEAD_CAPTURED,
        deal_value=data.deal_value,
        status=ClientStatus.LEAD,
        account_manager_id=data.account_manager_id or current_user.id,
        last_activity_at=datetime.utcnow(),
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return ApiResponse(data=ClientOut.model_validate(client))


@router.patch("/deals/{id}", response_model=ApiResponse[ClientOut])
async def update_deal(
    id: uuid.UUID,
    data: ClientUpdate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER])),
    db: AsyncSession = Depends(get_db),
):
    query = select(Client).where(Client.id == id, Client.deleted_at.is_(None))
    res = await db.execute(query)
    client = res.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Deal not found")

    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(client, key, value)

    client.last_activity_at = datetime.utcnow()
    await db.commit()
    await db.refresh(client)
    return ApiResponse(data=ClientOut.model_validate(client))


@router.post("/deals/{id}/convert-to-client", response_model=ApiResponse[dict])
async def convert_deal_to_client(
    id: uuid.UUID,
    data: DealConvertToClientRequest,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER])),
    db: AsyncSession = Depends(get_db),
):
    """
    CRUCIAL AUTOMATION:
    Moving deal to WON executes the 5-step autonomous zero-touch onboarding pipeline.
    """
    result = await onboarding_engine.onboard_won_deal(
        db=db,
        client_id=id,
        service_blueprint_ids=data.service_blueprint_ids,
        initial_retainer=data.initial_retainer,
        billing_cycle_day=data.billing_cycle_day,
        generate_deposit_invoice=data.generate_deposit_invoice,
    )
    return ApiResponse(data=result)


@router.post("/deals/{id}/generate-proposal", response_model=ApiResponse[dict])
async def generate_proposal(
    id: uuid.UUID,
    data: GenerateProposalRequest,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER])),
    db: AsyncSession = Depends(get_db),
):
    query = select(Client).where(Client.id == id, Client.deleted_at.is_(None))
    res = await db.execute(query)
    client = res.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Deal not found")

    proposal_data = await proposal_service.generate_proposal_data(
        client=client,
        objective=data.objective,
        platforms=data.target_platforms,
        custom_notes=data.custom_notes,
    )
    return ApiResponse(data=proposal_data)


@router.get("/deals/{id}/proposal-pdf")
async def download_proposal_pdf(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    query = select(Client).where(Client.id == id, Client.deleted_at.is_(None))
    res = await db.execute(query)
    client = res.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Deal not found")

    proposal_data = await proposal_service.generate_proposal_data(client=client)
    pdf_bytes = proposal_service.generate_proposal_pdf(proposal_data)

    safe_name = client.company_name.lower().replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=proposal_{safe_name}.pdf",
        },
    )


@router.post("/deals/{id}/send-proposal", response_model=ApiResponse[dict])
async def send_proposal_to_client(
    id: uuid.UUID,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER])),
    db: AsyncSession = Depends(get_db),
):
    query = select(Client).where(Client.id == id, Client.deleted_at.is_(None))
    res = await db.execute(query)
    client = res.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Deal not found")

    client.deal_stage = DealStage.PROPOSAL_SENT
    client.last_activity_at = datetime.utcnow()
    await db.commit()
    await db.refresh(client)

    await ws_manager.broadcast({
        "type": "PROPOSAL_SENT",
        "payload": {
            "deal_id": str(client.id),
            "company_name": client.company_name,
            "deal_stage": client.deal_stage.value,
            "sender": current_user.full_name,
        },
    })

    return ApiResponse(
        data={
            "status": "PROPOSAL_SENT",
            "deal_id": str(client.id),
            "deal_stage": client.deal_stage.value,
            "last_activity_at": client.last_activity_at.isoformat(),
        }
    )


@router.get("/clients", response_model=ApiResponse[List[ClientOut]])
async def list_clients(
    status_filter: Optional[ClientStatus] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Client).where(Client.deleted_at.is_(None))
    if current_user.role == UserRole.CLIENT:
        query = query.where(Client.contact_email == current_user.email)
    elif status_filter:
        query = query.where(Client.status == status_filter)

    query = query.order_by(Client.company_name.asc())
    res = await db.execute(query)
    clients = res.scalars().all()
    return ApiResponse(data=[ClientOut.model_validate(c) for c in clients])


@router.get("/clients/{id}", response_model=ApiResponse[ClientOut])
async def get_client_by_id(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Client).where(Client.id == id, Client.deleted_at.is_(None))
    res = await db.execute(query)
    client = res.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if current_user.role == UserRole.CLIENT and client.contact_email != current_user.email:
        raise HTTPException(status_code=403, detail="Forbidden access to this client profile")

    return ApiResponse(data=ClientOut.model_validate(client))

