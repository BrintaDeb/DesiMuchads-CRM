import uuid
from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.responses import Response as RawResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.models import Invoice, Client, User, AutomationAuditLog
from app.models.enums import UserRole, InvoiceStatus, ClientStatus
from app.schemas.schemas import ApiResponse, InvoiceCreate, InvoiceOut
from app.core.config import settings
from app.services.pdf_generator import pdf_invoice_generator

router = APIRouter(prefix="/billing", tags=["Automated Recurring Billing & GST Ledger"])


@router.get("/invoices", response_model=ApiResponse[List[InvoiceOut]])
async def list_invoices(
    client_id: Optional[uuid.UUID] = None,
    status_filter: Optional[InvoiceStatus] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Invoice).options(selectinload(Invoice.client))

    if current_user.role == UserRole.CLIENT:
        query = query.join(Client).where(Client.contact_email == current_user.email)
    elif client_id:
        query = query.where(Invoice.client_id == client_id)

    if status_filter:
        query = query.where(Invoice.status == status_filter)

    query = query.order_by(Invoice.created_at.desc())
    res = await db.execute(query)
    invoices = res.scalars().all()
    return ApiResponse(data=[InvoiceOut.model_validate(inv) for inv in invoices])


@router.post("/invoices", response_model=ApiResponse[InvoiceOut])
async def create_invoice(
    data: InvoiceCreate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER])),
    db: AsyncSession = Depends(get_db),
):
    c_query = select(Client).where(Client.id == data.client_id, Client.deleted_at.is_(None))
    c_res = await db.execute(c_query)
    client = c_res.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    subtotal = data.subtotal
    tax_amount = round(subtotal * (data.tax_percentage / 100.0), 2)
    total_amount = round(subtotal + tax_amount, 2)

    today = date.today()
    inv_count_res = await db.execute(select(Invoice))
    inv_count = len(inv_count_res.scalars().all()) + 1
    invoice_number = f"INV-{today.strftime('%Y%m')}-{inv_count:04d}"

    invoice = Invoice(
        invoice_number=invoice_number,
        client_id=client.id,
        subtotal=subtotal,
        tax_amount=tax_amount,
        total_amount=total_amount,
        currency=data.currency,
        status=InvoiceStatus.SENT,
        due_date=data.due_date,
    )
    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)
    return ApiResponse(data=InvoiceOut.model_validate(invoice))


@router.post("/invoices/{id}/mark-paid", response_model=ApiResponse[InvoiceOut])
async def mark_invoice_paid(
    id: uuid.UUID,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNT_MANAGER])),
    db: AsyncSession = Depends(get_db),
):
    query = select(Invoice).where(Invoice.id == id)
    res = await db.execute(query)
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.status = InvoiceStatus.PAID
    invoice.paid_at = datetime.utcnow()
    await db.commit()
    await db.refresh(invoice)
    return ApiResponse(data=InvoiceOut.model_validate(invoice))


@router.get("/invoices/{id}/pdf")
async def download_invoice_pdf(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Invoice).options(selectinload(Invoice.client)).where(Invoice.id == id)
    res = await db.execute(query)
    invoice = res.scalar_one_or_none()
    if not invoice or not invoice.client:
        raise HTTPException(status_code=404, detail="Invoice or client record not found")

    if current_user.role == UserRole.CLIENT and invoice.client.contact_email != current_user.email:
        raise HTTPException(status_code=403, detail="Forbidden")

    pdf_bytes = pdf_invoice_generator.generate_invoice_pdf(invoice, invoice.client)
    filename = f"{invoice.invoice_number}.pdf"

    return RawResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/webhook/stripe", tags=["Payment Webhooks"])
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = data.get("type", "")

    if event_type in ["payment_intent.succeeded", "invoice.payment_succeeded"]:
        payment_intent = data.get("data", {}).get("object", {})
        intent_id = payment_intent.get("id")
        inv_number = payment_intent.get("metadata", {}).get("invoice_number")

        query = select(Invoice).options(selectinload(Invoice.client))
        if inv_number:
            query = query.where(Invoice.invoice_number == inv_number)
        elif intent_id:
            query = query.where(Invoice.stripe_payment_intent_id == intent_id)

        res = await db.execute(query)
        invoice = res.scalar_one_or_none()

        if invoice:
            invoice.status = InvoiceStatus.PAID
            invoice.paid_at = datetime.utcnow()
            invoice.stripe_payment_intent_id = intent_id

            # Unpause client if previously gated by Rule 4
            if invoice.client and invoice.client.status == ClientStatus.PAUSED:
                invoice.client.status = ClientStatus.ACTIVE

            audit = AutomationAuditLog(
                trigger_event="STRIPE_PAYMENT_SETTLED",
                entity_type="Invoice",
                entity_id=invoice.id,
                action_taken=f"Stripe Webhook settled invoice {invoice.invoice_number} ({invoice.currency} {invoice.total_amount:,.2f})",
                status="SUCCESS",
            )
            db.add(audit)
            await db.commit()

    return {"received": True}

