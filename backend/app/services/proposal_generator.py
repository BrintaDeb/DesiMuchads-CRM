import io
from datetime import datetime, date
from typing import Dict, Any, List, Optional
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from app.models.models import Client
from app.services.gemini_ai import gemini_service
import logging

logger = logging.getLogger(__name__)


class ProposalGeneratorService:
    """
    Generates strategic digital marketing proposals with Gemini AI integration
    and exports high-fidelity PDF documents for client presentation and contract closure.
    """

    async def generate_proposal_data(
        self,
        client: Client,
        objective: Optional[str] = None,
        platforms: Optional[List[str]] = None,
        custom_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        target_platforms = platforms or ["Meta (Instagram & Facebook)", "Google Search & Performance Max", "LinkedIn"]
        goal = objective or f"Rapid customer acquisition and brand authority scaling in {client.industry}."

        deal_val = float(client.deal_value or client.retainer_amount or 100000.0)
        gst_rate = 0.18
        gst_amount = round(deal_val * gst_rate, 2)
        total_with_gst = round(deal_val + gst_amount, 2)

        # Call Gemini AI if configured to generate tailored creative strategy
        ai_brief = await gemini_service.generate_campaign_brief(
            company_name=client.company_name,
            objective=goal,
            target_audience=f"High-intent consumers and B2B decision-makers in {client.industry}",
            budget=deal_val,
            platforms=target_platforms,
        )

        headline = ai_brief.get("headline", f"Performance Growth & Content Acceleration: {client.company_name}")
        strategic_angle = ai_brief.get(
            "strategic_angle",
            f"Hyper-targeted performance marketing combined with cultural resonance tailored for {client.industry}."
        )

        proposal_data = {
            "proposal_id": f"PRP-{datetime.utcnow().strftime('%Y%m')}-{str(client.id)[:6].upper()}",
            "generated_date": datetime.utcnow().strftime("%d-%b-%Y"),
            "valid_until": (datetime.utcnow().date().replace(day=28)).strftime("%d-%b-%Y"),
            "client": {
                "id": str(client.id),
                "company_name": client.company_name,
                "industry": client.industry,
                "primary_contact_name": client.primary_contact_name,
                "contact_email": client.contact_email,
                "contact_phone": client.contact_phone or "N/A",
                "gst_tax_id": client.gst_tax_id or "Not Provided / Unregistered",
            },
            "strategy": {
                "headline": headline,
                "objective": goal,
                "strategic_angle": strategic_angle,
                "target_platforms": target_platforms,
                "custom_notes": custom_notes,
            },
            "deliverables": [
                {
                    "item": "Organic & Paid Video Production",
                    "specification": "12x High-converting Reels / Shorts / TikTok format vertical videos monthly",
                    "frequency": "Weekly Cadence",
                },
                {
                    "item": "Design & Carousel Assets",
                    "specification": "8x Multi-slide educational and social-proof carousels with visual branding",
                    "frequency": "Bi-weekly Cadence",
                },
                {
                    "item": "Full-Funnel Ad Campaign Management",
                    "specification": "Setup, audience testing, A/B creative testing, budget optimization across channels",
                    "frequency": "Continuous / 24x7",
                },
                {
                    "item": "Real-Time Telemetry & Client Portal",
                    "specification": "Direct access to Desi Muchads Client Portal for live KPI tracking and asset approvals",
                    "frequency": "Always Active",
                },
                {
                    "item": "Dedicated Account Leadership",
                    "specification": "Weekly strategic sync with dedicated Account Lead and monthly ROI review",
                    "frequency": "Weekly",
                },
            ],
            "roadmap": [
                {
                    "phase": "Phase 1: Discovery & Technical Audit",
                    "timeline": "Days 1 – 7",
                    "milestones": "Brand voice definition, Pixel & CAPI verification, competitor benchmark audit.",
                },
                {
                    "phase": "Phase 2: Creative Engine Deployment",
                    "timeline": "Days 8 – 15",
                    "milestones": "First batch of 6 video hooks, carousel templates, ad copy variants produced & approved.",
                },
                {
                    "phase": "Phase 3: Campaign Launch & Scaling",
                    "timeline": "Days 16 – 30",
                    "milestones": "Paid campaigns live, initial A/B audience learnings gathered, retargeting funnel initiated.",
                },
                {
                    "phase": "Phase 4: Optimization & Retention",
                    "timeline": "Ongoing",
                    "milestones": "Weekly creative refreshes, budget scaling on winning ad sets, monthly ROI presentation.",
                },
            ],
            "commercials": {
                "currency": "INR",
                "subtotal": deal_val,
                "gst_rate_percent": 18.0,
                "gst_amount": gst_amount,
                "total_monthly_investment": total_with_gst,
                "billing_frequency": "Monthly Advance Retainer",
                "payment_terms": "Due within 7 days of invoice generation",
                "sac_code": "998311 (Digital Marketing & Advertising)",
            },
        }

        return proposal_data

    def generate_proposal_pdf(self, proposal: Dict[str, Any]) -> bytes:
        """
        Renders a Swiss-minimalist styled Proposal PDF using ReportLab.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "PropTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#09090B"),
        )
        subtitle_style = ParagraphStyle(
            "PropSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#6366F1"),
        )
        section_style = ParagraphStyle(
            "PropSection",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#09090B"),
        )
        regular_style = ParagraphStyle(
            "PropRegular",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#27272A"),
        )
        bold_style = ParagraphStyle(
            "PropBold",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#09090B"),
        )
        table_header_style = ParagraphStyle(
            "PropTableHeader",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#71717A"),
        )

        story = []

        # 1. Header & Proposal Meta
        header_table = Table(
            [
                [
                    Paragraph(
                        "<b>THE DESI MUCHADS</b><br/><font color='#6366F1'>GROWTH ARCHITECTURE & OS</font>",
                        title_style,
                    ),
                    Paragraph(
                        f"<b>STRATEGIC PROPOSAL</b><br/>"
                        f"<font size='8' color='#52525B'>Proposal #: {proposal['proposal_id']}<br/>"
                        f"Date: {proposal['generated_date']}<br/>"
                        f"Valid Until: {proposal['valid_until']}</font>",
                        regular_style,
                    ),
                ]
            ],
            colWidths=[330, 210],
        )
        header_table.setStyle(
            TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ])
        )
        story.append(header_table)
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E4E4E7"), spaceBefore=0, spaceAfter=10))

        # 2. Client & Agency Info
        client_info = proposal["client"]
        parties_table = Table(
            [
                [
                    Paragraph(
                        "<b>PREPARED FOR:</b><br/>"
                        f"<b>{client_info['company_name']}</b><br/>"
                        f"Attn: {client_info['primary_contact_name']}<br/>"
                        f"Email: {client_info['contact_email']}<br/>"
                        f"Industry: {client_info['industry']}<br/>"
                        f"GSTIN: {client_info['gst_tax_id']}",
                        regular_style,
                    ),
                    Paragraph(
                        "<b>PREPARED BY:</b><br/>"
                        "<b>The Desi Muchads Media LLP</b><br/>"
                        "402, High-Street Trade Tower, BKC<br/>"
                        "Mumbai, Maharashtra 400051<br/>"
                        "GSTIN: 27AAHCD9988M1Z3<br/>"
                        "hello@desimuchads.com | +91 98200 12345",
                        regular_style,
                    ),
                ]
            ],
            colWidths=[270, 270],
        )
        parties_table.setStyle(
            TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#E2E8F0")),
                ("PADDING", (0, 0), (-1, -1), 8),
            ])
        )
        story.append(parties_table)
        story.append(Spacer(1, 12))

        # 3. Strategic Objective & Vision
        strategy = proposal["strategy"]
        story.append(Paragraph("<b>1. STRATEGIC OBJECTIVE & APPROACH</b>", section_style))
        story.append(Spacer(1, 4))
        story.append(
            Paragraph(
                f"<b>Campaign Headline:</b> {strategy['headline']}<br/>"
                f"<b>Target Platforms:</b> {', '.join(strategy['target_platforms'])}<br/>"
                f"<b>Strategic Angle:</b> {strategy['strategic_angle']}",
                regular_style,
            )
        )
        story.append(Spacer(1, 12))

        # 4. Scope & Deliverables Matrix
        story.append(Paragraph("<b>2. SCOPE OF WORK & DELIVERABLES</b>", section_style))
        story.append(Spacer(1, 4))

        deliv_rows = [
            [
                Paragraph("DELIVERABLE", table_header_style),
                Paragraph("SPECIFICATION", table_header_style),
                Paragraph("FREQUENCY", table_header_style),
            ]
        ]
        for d in proposal["deliverables"]:
            deliv_rows.append([
                Paragraph(f"<b>{d['item']}</b>", bold_style),
                Paragraph(d["specification"], regular_style),
                Paragraph(d["frequency"], regular_style),
            ])

        deliv_table = Table(deliv_rows, colWidths=[160, 260, 120])
        deliv_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F4F4F5")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E4E4E7")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("PADDING", (0, 0), (-1, -1), 5),
            ])
        )
        story.append(deliv_table)
        story.append(Spacer(1, 12))

        # 5. Implementation Roadmap
        story.append(Paragraph("<b>3. EXECUTION ROADMAP & MILESTONES</b>", section_style))
        story.append(Spacer(1, 4))

        roadmap_rows = [
            [
                Paragraph("PHASE", table_header_style),
                Paragraph("TIMELINE", table_header_style),
                Paragraph("KEY MILESTONES & OUTPUTS", table_header_style),
            ]
        ]
        for r in proposal["roadmap"]:
            roadmap_rows.append([
                Paragraph(f"<b>{r['phase']}</b>", bold_style),
                Paragraph(r["timeline"], regular_style),
                Paragraph(r["milestones"], regular_style),
            ])

        roadmap_table = Table(roadmap_rows, colWidths=[150, 90, 300])
        roadmap_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F4F4F5")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E4E4E7")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("PADDING", (0, 0), (-1, -1), 5),
            ])
        )
        story.append(roadmap_table)
        story.append(Spacer(1, 12))

        # 6. Commercial Terms & GST Ledger
        commercials = proposal["commercials"]
        story.append(Paragraph("<b>4. COMMERCIAL INVESTMENT & TAX SCHEDULE</b>", section_style))
        story.append(Spacer(1, 4))

        subtotal = commercials["subtotal"]
        gst = commercials["gst_amount"]
        total = commercials["total_monthly_investment"]

        comm_rows = [
            [
                Paragraph("SERVICE / RETAINER", table_header_style),
                Paragraph("SAC CODE", table_header_style),
                Paragraph("TAX RATE", table_header_style),
                Paragraph("AMOUNT (INR)", table_header_style),
            ],
            [
                Paragraph("<b>Monthly Growth & Performance Retainer</b>", bold_style),
                Paragraph(commercials["sac_code"], regular_style),
                Paragraph("18.0% GST", regular_style),
                Paragraph(f"₹ {subtotal:,.2f}", bold_style),
            ],
            [
                Paragraph("<b>Goods & Services Tax (GST 18%)</b>", regular_style),
                Paragraph("CGST 9% + SGST 9% (or IGST 18%)", regular_style),
                Paragraph("18.0%", regular_style),
                Paragraph(f"₹ {gst:,.2f}", regular_style),
            ],
            [
                Paragraph("<b>TOTAL MONTHLY INVESTMENT</b>", bold_style),
                Paragraph("-", regular_style),
                Paragraph("-", regular_style),
                Paragraph(f"<b>₹ {total:,.2f}</b>", bold_style),
            ],
        ]

        comm_table = Table(comm_rows, colWidths=[220, 140, 80, 100])
        comm_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F4F4F5")),
                ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#EEF2FF")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E4E4E7")),
                ("ALIGN", (3, 0), (3, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("PADDING", (0, 0), (-1, -1), 5),
            ])
        )
        story.append(comm_table)
        story.append(Spacer(1, 14))

        # 7. Signature & Acceptance Block
        story.append(
            KeepTogether([
                Paragraph("<b>5. AUTHORIZATION & ACCEPTANCE</b>", section_style),
                Spacer(1, 4),
                Paragraph(
                    "By signing below or approving digitally via the Desi Muchads Client Portal, the client accepts "
                    "the scope, roadmap, and commercial terms outlined above. An onboarding invitation and retainer "
                    "invoice will be generated automatically upon signing.",
                    regular_style,
                ),
                Spacer(1, 15),
                Table(
                    [
                        [
                            Paragraph(
                                "<b>FOR THE DESI MUCHADS:</b><br/><br/><br/>"
                                "__________________________________<br/>"
                                "Authorized Signatory<br/>"
                                "Date: " + proposal["generated_date"],
                                regular_style,
                            ),
                            Paragraph(
                                f"<b>FOR {client_info['company_name'].upper()}:</b><br/><br/><br/>"
                                "__________________________________<br/>"
                                f"{client_info['primary_contact_name']} (Authorized Rep)<br/>"
                                "Date: ________________________",
                                regular_style,
                            ),
                        ]
                    ],
                    colWidths=[270, 270],
                ),
            ])
        )

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()


proposal_service = ProposalGeneratorService()
