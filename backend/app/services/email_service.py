import logging
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)


class ResendEmailService:
    """
    Transactional Email Service using Resend API with custom HTML templates
    styled with The Desi Muchads high-contrast Swiss-minimalist aesthetic.
    """

    def __init__(self):
        self.api_key = settings.RESEND_API_KEY
        self.sender = settings.SYSTEM_EMAIL_SENDER
        self.is_configured = bool(self.api_key and "mock" not in self.api_key.lower())

    def _get_base_template(self, title: str, content_html: str, action_url: Optional[str] = None, action_label: Optional[str] = None) -> str:
        button_html = ""
        if action_url and action_label:
            button_html = f"""
            <div style="margin: 28px 0; text-align: left;">
                <a href="{action_url}" style="background-color: #6366F1; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">
                    {action_label} &rarr;
                </a>
            </div>
            """

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{title}</title>
        </head>
        <body style="background-color: #09090B; color: #E4E4E7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px 20px;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #121215; border: 1px solid #27272A; border-radius: 8px; overflow: hidden; padding: 32px;">
                <tr>
                    <td>
                        <!-- Agency Header -->
                        <div style="border-bottom: 1px solid #27272A; padding-bottom: 20px; margin-bottom: 24px;">
                            <span style="font-size: 18px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; display: block;">THE DESI MUCHADS</span>
                            <span style="font-size: 11px; font-family: 'JetBrains Mono', Courier, monospace; color: #6366F1; font-weight: 600; text-transform: uppercase;">Enterprise Agency OS</span>
                        </div>

                        <!-- Content Block -->
                        <h2 style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-top: 0; margin-bottom: 16px;">{title}</h2>
                        
                        <div style="font-size: 13px; line-height: 1.6; color: #A1A1AA;">
                            {content_html}
                        </div>

                        {button_html}

                        <!-- Footer -->
                        <div style="border-top: 1px solid #27272A; padding-top: 20px; margin-top: 32px; font-size: 11px; font-family: 'JetBrains Mono', Courier, monospace; color: #71717A;">
                            The Desi Muchads Media LLP &bull; 402, High-Street Trade Tower, BKC, Mumbai 400051<br/>
                            This is an automated operational notification dispatched by the Agency OS.
                        </div>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

    async def send_email(self, to_email: str, subject: str, html_body: str) -> Dict[str, Any]:
        """
        Sends email via Resend API or logs safely to console in mock/dev mode.
        """
        if not self.is_configured:
            logger.info(f"[EMAIL MOCK] Dispatched to: {to_email} | Subject: '{subject}'")
            return {"status": "MOCK_SENT", "to": to_email, "subject": subject}

        try:
            import resend
            resend.api_key = self.api_key
            params = {
                "from": self.sender,
                "to": [to_email],
                "subject": subject,
                "html": html_body,
            }
            response = resend.Emails.send(params)
            return {"status": "SENT", "id": response.get("id")}
        except Exception as e:
            logger.error(f"Error sending email via Resend: {e}")
            return {"status": "FAILED", "error": str(e)}

    async def send_onboarding_welcome(
        self,
        company_name: str,
        contact_name: str,
        to_email: str,
        portal_url: str = "http://localhost:3000/client-portal",
    ) -> Dict[str, Any]:
        title = f"Welcome to The Desi Muchads: Workspace Provisioned"
        content = f"""
        Dear {contact_name},<br/><br/>
        We are thrilled to welcome <strong>{company_name}</strong> to The Desi Muchads! Your dedicated Client Portal workspace and zero-knowledge AES-256 Credential Vault have been provisioned automatically.<br/><br/>
        Through your portal, you can:
        <ul style="margin: 8px 0; padding-left: 20px;">
            <li>Safely deposit social media & ad account credentials into the encrypted vault</li>
            <li>Review and 1-click approve creative deliverables (Reels, Carousels, Ad copy)</li>
            <li>Monitor live campaign performance KPIs and SLA delivery progress</li>
            <li>Access tax invoices and manage retainer payments</li>
        </ul>
        """
        html = self._get_base_template(
            title=title,
            content_html=content,
            action_url=portal_url,
            action_label="Open Client Portal Workspace",
        )
        return await self.send_email(to_email=to_email, subject=f"Your Client Portal is Ready — {company_name}", html_body=html)

    async def send_proposal_notification(
        self,
        company_name: str,
        contact_name: str,
        to_email: str,
        proposal_id: str,
        total_monthly_investment: float,
        portal_url: str = "http://localhost:3000/crm",
    ) -> Dict[str, Any]:
        title = f"Strategic Growth Proposal: {company_name}"
        content = f"""
        Dear {contact_name},<br/><br/>
        Our growth strategy team has formulated your customized Digital Marketing & Performance Architecture proposal (Ref: <code>{proposal_id}</code>).<br/><br/>
        <strong>Monthly Retainer Investment:</strong> INR {total_monthly_investment:,.2f} (Inclusive of 18% GST).<br/><br/>
        The full scope of work, deliverables cadence, and 4-phase roadmap are ready for your review and digital acceptance.
        """
        html = self._get_base_template(
            title=title,
            content_html=content,
            action_url=portal_url,
            action_label="Review Proposal & Scope",
        )
        return await self.send_email(to_email=to_email, subject=f"Strategic Growth Proposal: {company_name} ({proposal_id})", html_body=html)

    async def send_content_approval_request(
        self,
        company_name: str,
        contact_name: str,
        to_email: str,
        content_title: str,
        platform: str,
        portal_url: str = "http://localhost:3000/client-portal",
    ) -> Dict[str, Any]:
        title = f"New Deliverable Ready for Review: {platform}"
        content = f"""
        Dear {contact_name},<br/><br/>
        Our creative team has finalized the deliverable <strong>&quot;{content_title}&quot;</strong> for <strong>{platform}</strong>.<br/><br/>
        It has passed internal QA inspection and is now pending your sign-off in the Client Portal before scheduled broadcast.
        """
        html = self._get_base_template(
            title=title,
            content_html=content,
            action_url=portal_url,
            action_label="Review & 1-Click Approve",
        )
        return await self.send_email(to_email=to_email, subject=f"Deliverable Review: {content_title} ({platform})", html_body=html)

    async def send_sla_deadline_warning(
        self,
        assignee_name: str,
        to_email: str,
        task_title: str,
        hours_remaining: int,
        due_date_str: str,
    ) -> Dict[str, Any]:
        title = f"CRITICAL SLA ALERT: Task Due in {hours_remaining}h"
        content = f"""
        Hi {assignee_name},<br/><br/>
        The automated SLA daemon has detected that task <strong>&quot;{task_title}&quot;</strong> is due on <strong>{due_date_str}</strong> (in {hours_remaining} hours).<br/><br/>
        Please ensure all upstream blockers are cleared and deliverable assets are submitted to prevent SLA breach.
        """
        html = self._get_base_template(
            title=title,
            content_html=content,
            action_url="http://localhost:3000/tasks",
            action_label="View Active Task",
        )
        return await self.send_email(to_email=to_email, subject=f"SLA Warning: {task_title} (Due in {hours_remaining}h)", html_body=html)


email_service = ResendEmailService()

