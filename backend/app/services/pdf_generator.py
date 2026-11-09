import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from app.models.models import Invoice, Client


class PDFInvoiceGenerator:
    @staticmethod
    def generate_invoice_pdf(invoice: Invoice, client: Client) -> bytes:
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

        # Custom styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#09090B"),
        )
        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#6366F1"),
        )
        regular_style = ParagraphStyle(
            "DocRegular",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#27272A"),
        )
        bold_style = ParagraphStyle(
            "DocBold",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#09090B"),
        )

        story = []

        # 1. Header: Agency Brand & Tax Invoice Label
        header_data = [
            [
                Paragraph("<b>THE DESI MUCHADS</b><br/><font color='#6366F1'>ENTERPRISE AGENCY OS</font>", title_style),
                Paragraph(
                    f"<b>TAX INVOICE</b><br/><font size='8' color='#52525B'>Invoice #: {invoice.invoice_number}<br/>Date: {invoice.created_at.strftime('%d-%b-%Y')}<br/>Due Date: {invoice.due_date.strftime('%d-%b-%Y')}</font>",
                    regular_style,
                ),
            ]
        ]
        header_table = Table(header_data, colWidths=[320, 220])
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 15))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E4E4E7"), spaceBefore=0, spaceAfter=15))

        # 2. Supplier vs Buyer Table
        supplier_info = """
        <b>ISSUED BY:</b><br/>
        <b>The Desi Muchads Media LLP</b><br/>
        402, High-Street Trade Tower, BKC<br/>
        Mumbai, Maharashtra, India - 400051<br/>
        <b>GSTIN:</b> 27AAHCD9988M1Z3<br/>
        <b>PAN:</b> AAHCD9988M<br/>
        <b>State:</b> Maharashtra (Code: 27)
        """

        client_gst = client.gst_tax_id or "Unregistered (B2C / SEZ)"
        buyer_info = f"""
        <b>BILLED TO (CLIENT):</b><br/>
        <b>{client.company_name}</b><br/>
        Attn: {client.primary_contact_name}<br/>
        Email: {client.contact_email}<br/>
        Phone: {client.contact_phone or 'N/A'}<br/>
        <b>GSTIN:</b> {client_gst}<br/>
        <b>Industry:</b> {client.industry}
        """

        parties_data = [
            [
                Paragraph(supplier_info, regular_style),
                Paragraph(buyer_info, regular_style),
            ]
        ]
        parties_table = Table(parties_data, colWidths=[270, 270])
        parties_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("PADDING", (0, 0), (-1, -1), 8),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ]))
        story.append(parties_table)
        story.append(Spacer(1, 20))

        # 3. Itemized Services Table with SAC Code (998311 - Advertising / Digital Services)
        cgst_rate = "9%"
        sgst_rate = "9%"
        cgst_amount = round(invoice.subtotal * 0.09, 2)
        sgst_amount = round(invoice.subtotal * 0.09, 2)

        items_data = [
            [
                Paragraph("<b>Item Description</b>", bold_style),
                Paragraph("<b>SAC Code</b>", bold_style),
                Paragraph("<b>Qty</b>", bold_style),
                Paragraph("<b>Rate</b>", bold_style),
                Paragraph("<b>Amount (INR)</b>", bold_style),
            ],
            [
                Paragraph(
                    "<b>Retainer Scope: Digital Marketing & Creative OS Execution</b><br/>"
                    "<font size='7.5' color='#64748B'>Full-funnel campaign strategy, high-velocity Reels, DAG task workflow execution & autonomous ad management.</font>",
                    regular_style,
                ),
                Paragraph("998311", regular_style),
                Paragraph("1 Month", regular_style),
                Paragraph(f"₹{invoice.subtotal:,.2f}", regular_style),
                Paragraph(f"₹{invoice.subtotal:,.2f}", regular_style),
            ],
        ]

        items_table = Table(items_data, colWidths=[240, 65, 50, 95, 90])
        items_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
            ("TOPPADDING", (0, 0), (-1, 0), 6),
            ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("PADDING", (0, 1), (-1, -1), 6),
        ]))
        story.append(items_table)
        story.append(Spacer(1, 15))

        # 4. Tax Breakdown & Totals Table
        totals_data = [
            ["Subtotal (Taxable Value):", f"INR {invoice.subtotal:,.2f}"],
            ["Central GST (CGST @ 9%):", f"INR {cgst_amount:,.2f}"],
            ["State GST (SGST @ 9%):", f"INR {sgst_amount:,.2f}"],
            ["Total Tax (18% GST):", f"INR {invoice.tax_amount:,.2f}"],
            ["<b>Grand Total Due:</b>", f"<b>INR {invoice.total_amount:,.2f}</b>"],
        ]
        totals_table = Table(totals_data, colWidths=[380, 160])
        totals_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
            ("PADDING", (0, 0), (-1, -1), 3),
            ("LINEABOVE", (0, 4), (-1, 4), 1, colors.HexColor("#09090B")),
            ("LINEBELOW", (0, 4), (-1, 4), 1.5, colors.HexColor("#09090B")),
        ]))
        story.append(totals_table)
        story.append(Spacer(1, 20))

        # 5. Payment Details & Remittance
        status_color = "#10B981" if invoice.status.value == "PAID" else "#F59E0B"
        payment_info = f"""
        <b>INVOICE STATUS:</b> <font color='{status_color}'><b>{invoice.status.value}</b></font><br/>
        <b>Payment Mode:</b> Bank Wire (NEFT/RTGS/IMPS) / Stripe Direct Checkout<br/>
        <b>Bank Name:</b> HDFC Bank Limited (BKC Mumbai Branch)<br/>
        <b>Account Name:</b> The Desi Muchads Media LLP<br/>
        <b>Account Number:</b> 50200088992211<br/>
        <b>IFSC Code:</b> HDFC0000060<br/>
        <i>Note: This is a system-generated electronic tax invoice authorized by The Desi Muchads Agency OS.</i>
        """
        story.append(Paragraph(payment_info, regular_style))

        # Build document
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes


pdf_invoice_generator = PDFInvoiceGenerator()

