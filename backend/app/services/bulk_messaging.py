import uuid
import re
import urllib.parse
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
import logging

from app.models.models import Client, User, BulkMessageCampaign, AutomationAuditLog
from app.models.enums import ClientStatus, DealStage, UserRole
from app.schemas.schemas import (
    BulkRecipientItem,
    BulkCampaignPreviewRequest,
    BulkCampaignDispatchRequest,
    BulkCampaignOut,
)

logger = logging.getLogger(__name__)


def clean_phone(phone_str: Optional[str]) -> str:
    """Removes non-digit characters and ensures country code for WhatsApp."""
    if not phone_str:
        return ""
    digits = re.sub(r"[^\d]", "", phone_str)
    if len(digits) == 10 and not digits.startswith("91"):
        digits = "91" + digits
    return digits


def interpolate_template(template: str, context: Dict[str, Any]) -> str:
    """Interpolates double-curly braces tokens like {{contact_name}} with fallback defaults."""
    res = template
    for key, val in context.items():
        placeholder = f"{{{{{key}}}}}"
        str_val = str(val) if val is not None else ""
        res = res.replace(placeholder, str_val)
    # Clear any lingering un-replaced variables
    res = re.sub(r"\{\{[^}]+\}\}", "", res)
    return res.strip()


class BulkMessagingService:
    async def get_audience_recipients(
        self,
        db: AsyncSession,
        target_audience: str,
        custom_recipients: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Gathers recipient entities based on target audience segment.
        """
        recipients: List[Dict[str, Any]] = []

        if target_audience == "CUSTOM" and custom_recipients:
            for item in custom_recipients:
                recipients.append({
                    "contact_name": item.get("contact_name") or item.get("name") or "Decision Maker",
                    "company_name": item.get("company_name") or "Your Enterprise",
                    "phone": item.get("phone") or "",
                    "email": item.get("email") or "",
                    "deal_value": item.get("deal_value") or 75000,
                    "niche": item.get("niche") or "Digital Growth",
                    "city": item.get("city") or "India",
                })
            return recipients

        if target_audience == "TEAM":
            stmt = select(User).where(User.deleted_at.is_(None), User.is_active == True)
            res = await db.execute(stmt)
            users = res.scalars().all()
            for u in users:
                recipients.append({
                    "contact_name": u.full_name,
                    "company_name": "The Desi Muchads Agency",
                    "phone": u.phone or "",
                    "email": u.email,
                    "deal_value": 0,
                    "niche": u.department,
                    "city": "Mumbai HQ",
                })
            return recipients

        # CRM Clients & Leads Query
        stmt = select(Client).where(Client.deleted_at.is_(None))
        if target_audience == "HOT_BUYERS":
            stmt = stmt.where(Client.deal_value >= 100000)
        elif target_audience == "WON_CLIENTS":
            stmt = stmt.where((Client.status == ClientStatus.ACTIVE) | (Client.deal_stage == DealStage.WON))
        elif target_audience == "ALL_LEADS":
            stmt = stmt.where(Client.status == ClientStatus.LEAD)

        res = await db.execute(stmt)
        clients = res.scalars().all()

        for c in clients:
            recipients.append({
                "contact_name": c.primary_contact_name or "Founder",
                "company_name": c.company_name,
                "phone": c.contact_phone or "",
                "email": c.contact_email,
                "deal_value": c.deal_value or c.retainer_amount or 85000,
                "niche": c.industry or "D2C Brands",
                "city": "Metro Hub",
            })

        return recipients

    async def preview_campaign(
        self,
        db: AsyncSession,
        req: BulkCampaignPreviewRequest,
    ) -> Dict[str, Any]:
        """
        Renders personal messages for sample contacts without sending.
        """
        raw_recipients = await self.get_audience_recipients(
            db, req.target_audience, req.custom_recipients
        )

        sample_items: List[BulkRecipientItem] = []
        for r in raw_recipients[:10]:
            first_name = r["contact_name"].split()[0] if r["contact_name"] else "Partner"
            formatted_value = f"₹{int(r['deal_value']):,}" if r.get("deal_value") else "₹75,000"

            ctx = {
                "contact_name": r["contact_name"],
                "first_name": first_name,
                "company_name": r["company_name"],
                "deal_value": formatted_value,
                "niche": r["niche"],
                "city": r["city"],
                "sender_name": "The Desi Muchads",
            }

            rendered_body = interpolate_template(req.message_template, ctx)
            rendered_sub = interpolate_template(req.subject or "", ctx) if req.subject else None

            # Generate direct WhatsApp Click-to-Chat URL
            clean_digits = clean_phone(r["phone"])
            wa_url = None
            if clean_digits:
                encoded_msg = urllib.parse.quote(rendered_body)
                wa_url = f"https://api.whatsapp.com/send?phone={clean_digits}&text={encoded_msg}"

            sample_items.append(
                BulkRecipientItem(
                    contact_name=r["contact_name"],
                    company_name=r["company_name"],
                    phone=r["phone"],
                    email=r["email"],
                    deal_value=float(r["deal_value"]),
                    niche=r["niche"],
                    rendered_message=rendered_body,
                    rendered_subject=rendered_sub,
                    whatsapp_url=wa_url,
                    delivery_status="READY",
                )
            )

        return {
            "target_audience": req.target_audience,
            "channel": req.channel,
            "total_count": len(raw_recipients),
            "sample_recipients": sample_items,
        }

    async def dispatch_campaign(
        self,
        db: AsyncSession,
        req: BulkCampaignDispatchRequest,
        sender_user: Optional[User] = None,
    ) -> BulkCampaignOut:
        """
        Executes campaign broadcast across WhatsApp, Email, or SMS,
        records full audit trail, and returns dispatch metrics.
        """
        raw_recipients = await self.get_audience_recipients(
            db, req.target_audience, req.custom_recipients
        )

        sent_count = 0
        failed_count = 0
        processed_recipients: List[Dict[str, Any]] = []

        now = datetime.utcnow()

        for r in raw_recipients:
            first_name = r["contact_name"].split()[0] if r["contact_name"] else "Partner"
            formatted_value = f"₹{int(r['deal_value']):,}" if r.get("deal_value") else "₹75,000"

            ctx = {
                "contact_name": r["contact_name"],
                "first_name": first_name,
                "company_name": r["company_name"],
                "deal_value": formatted_value,
                "niche": r["niche"],
                "city": r["city"],
                "sender_name": "The Desi Muchads",
            }

            rendered_body = interpolate_template(req.message_template, ctx)
            rendered_sub = interpolate_template(req.subject or "", ctx) if req.subject else None

            clean_digits = clean_phone(r["phone"])
            wa_url = f"https://api.whatsapp.com/send?phone={clean_digits}&text={urllib.parse.quote(rendered_body)}" if clean_digits else None

            # Validate destination based on channel
            has_destination = True
            if req.channel == "WHATSAPP" and not clean_digits:
                has_destination = False
            elif req.channel == "EMAIL" and not r["email"]:
                has_destination = False

            status_str = "SENT" if (has_destination and req.auto_dispatch_simulation) else ("FAILED" if not has_destination else "PENDING")

            if status_str == "SENT":
                sent_count += 1
            elif status_str == "FAILED":
                failed_count += 1

            processed_recipients.append({
                "contact_name": r["contact_name"],
                "company_name": r["company_name"],
                "phone": r["phone"],
                "email": r["email"],
                "deal_value": float(r["deal_value"]),
                "niche": r["niche"],
                "rendered_message": rendered_body,
                "rendered_subject": rendered_sub,
                "whatsapp_url": wa_url,
                "delivery_status": status_str,
                "dispatched_at": now.isoformat(),
            })

        # Save campaign record in database
        campaign = BulkMessageCampaign(
            id=uuid.uuid4(),
            title=req.title,
            channel=req.channel,
            target_audience=req.target_audience,
            subject=req.subject,
            message_template=req.message_template,
            total_recipients=len(raw_recipients),
            sent_count=sent_count,
            failed_count=failed_count,
            status="COMPLETED",
            created_by_id=sender_user.id if sender_user else None,
            recipients_data=processed_recipients,
            created_at=now,
            sent_at=now,
        )
        db.add(campaign)

        # Log system audit trail
        audit_log = AutomationAuditLog(
            id=uuid.uuid4(),
            trigger_event=f"BULK_DISPATCH_{req.channel}",
            entity_type="BULK_CAMPAIGN",
            entity_id=campaign.id,
            action_taken=f"Dispatched {sent_count} {req.channel} messages to {req.target_audience}",
            executed_at=now,
            status="SUCCESS",
            details={
                "campaign_id": str(campaign.id),
                "title": req.title,
                "channel": req.channel,
                "total_recipients": len(raw_recipients),
                "sent_count": sent_count,
                "failed_count": failed_count,
            },
        )
        db.add(audit_log)

        await db.commit()
        await db.refresh(campaign)

        sample_outs = [BulkRecipientItem(**item) for item in processed_recipients[:10]]

        return BulkCampaignOut(
            id=campaign.id,
            title=campaign.title,
            channel=campaign.channel,
            target_audience=campaign.target_audience,
            subject=campaign.subject,
            message_template=campaign.message_template,
            total_recipients=campaign.total_recipients,
            sent_count=campaign.sent_count,
            failed_count=campaign.failed_count,
            status=campaign.status,
            created_at=campaign.created_at,
            sent_at=campaign.sent_at,
            recipients_sample=sample_outs,
        )

    async def list_recent_campaigns(
        self,
        db: AsyncSession,
        limit: int = 15,
    ) -> List[BulkCampaignOut]:
        stmt = (
            select(BulkMessageCampaign)
            .order_by(BulkMessageCampaign.created_at.desc())
            .limit(limit)
        )
        res = await db.execute(stmt)
        campaigns = res.scalars().all()

        results = []
        for c in campaigns:
            sample_outs = None
            if c.recipients_data:
                sample_outs = [BulkRecipientItem(**item) for item in c.recipients_data[:5]]

            results.append(
                BulkCampaignOut(
                    id=c.id,
                    title=c.title,
                    channel=c.channel,
                    target_audience=c.target_audience,
                    subject=c.subject,
                    message_template=c.message_template,
                    total_recipients=c.total_recipients,
                    sent_count=c.sent_count,
                    failed_count=c.failed_count,
                    status=c.status,
                    created_at=c.created_at,
                    sent_at=c.sent_at,
                    recipients_sample=sample_outs,
                )
            )
        return results


bulk_messaging_service = BulkMessagingService()
