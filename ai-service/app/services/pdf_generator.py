"""
PDF Report Generator for Phase 8 using ReportLab.
Produces official, publication-quality Government of India PDF documents.
Includes running headers, footers with 'Page X of Y', structured tables, and KPI summaries.
"""

import os
from typing import Dict, Any, List
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
from reportlab.pdfgen import canvas

from app.services.report_utils import BRANDING, format_number, format_pct, format_datetime, clean_text


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print 'Page X of Y',
    official running headers, and security classifications.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Running Top Bar (for pages > 1)
        if self._pageNumber > 1:
            self.drawString(36, A4[1] - 28, "MINISTRY OF COAL | CMPDI REPORTING PLATFORM")
            self.drawRightString(A4[0] - 36, A4[1] - 28, "OFFICIAL USE ONLY")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(36, A4[1] - 32, A4[0] - 36, A4[1] - 32)

        # Running Bottom Footer (all pages)
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 36, A4[0] - 36, 36)

        footer_text = f"CMPDI AI-Powered Analytics Solution (Phase 8 Deterministic Engine) | Confidential"
        self.drawString(36, 24, footer_text)
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 36, 24, page_str)

        self.restoreState()


def generate_pdf_report(context: Dict[str, Any], output_path: str) -> str:
    """Generate official PDF report and save to output_path."""
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=4
    )
    
    ministry_style = ParagraphStyle(
        'MinistryHeader',
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#1e3a8a"),
        textTransform='uppercase'
    )
    
    republic_style = ParagraphStyle(
        'RepublicHeader',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#64748b"),
        textTransform='uppercase'
    )
    
    section_heading = ParagraphStyle(
        'SectionHeading',
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#1e3a8a"),
        spaceBefore=12,
        spaceAfter=6,
        textTransform='uppercase'
    )
    
    cell_style = ParagraphStyle(
        'TableCell',
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1e293b")
    )
    
    cell_bold = ParagraphStyle(
        'TableCellBold',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a")
    )
    
    cell_right = ParagraphStyle(
        'TableCellRight',
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        alignment=2,
        textColor=colors.HexColor("#1e293b")
    )
    
    th_style = ParagraphStyle(
        'TableHead',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a"),
        textTransform='uppercase'
    )

    story = []

    # Title & Header
    report_type = context.get("reportType", "executive").lower().replace(" ", "_").replace("-", "_")
    type_titles = {
        "executive": "Executive Mining & Analytics Report",
        "production": "National Coal Production & Performance Report",
        "validation": "Deterministic Validation & Discrepancy Audit",
        "dashboard": "Executive Dashboard Comprehensive Snapshot",
        "mine_performance": "Mine Performance & Extraction Register",
        "custom": "Custom Analytical & Compliance Report"
    }
    title = type_titles.get(report_type, "Ministry of Coal Statutory Report")

    # Header Banner
    header_data = [
        [
            Paragraph(f"<b>{BRANDING['republic']}</b><br/><b>{BRANDING['ministry']}</b><br/>{BRANDING['institution']}", cell_style),
            Paragraph(f"<b>CLASSIFICATION:</b> OFFICIAL USE<br/><b>Generated:</b> {context['formattedDate']}<br/><b>Records:</b> {context['totalRecordsCount']}", cell_right)
        ]
    ]
    header_table = Table(header_data, colWidths=[320, 200])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e3a8a"), spaceAfter=10))

    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 6))

    # Dashboard data
    dashboard = context.get("dashboard", {})
    prod = dashboard.get("production", {})
    val = dashboard.get("validation", {})
    docs = dashboard.get("documents", {})
    subs = dashboard.get("subsidiaries", [])
    states = dashboard.get("states", [])
    fys = dashboard.get("financialYears", [])
    mines = context.get("minesList", [])
    rule_violations = context.get("ruleViolations", [])

    # KPI Summary Cards (as a table)
    story.append(Paragraph("Executive Overview & Production Highlights", section_heading))
    kpi_data = [
        [
            Paragraph("<b>Total Coal Production</b>", cell_style),
            Paragraph("<b>Target Production</b>", cell_style),
            Paragraph("<b>Achievement %</b>", cell_style),
            Paragraph("<b>Validation Quality</b>", cell_style)
        ],
        [
            Paragraph(f"<b>{format_number(prod.get('totalCoalProduction', 0.0))} MT</b>", title_style),
            Paragraph(f"<b>{format_number(prod.get('totalTargetProduction', 0.0))} MT</b>", title_style),
            Paragraph(f"<b>{format_pct(prod.get('productionAchievementPct', prod.get('productionAchievement', 0.0)))}</b>", title_style),
            Paragraph(f"<b>{format_number(val.get('averageValidationScore', 0.0), 1)}/100</b>", title_style)
        ],
        [
            Paragraph(f"Docs: {format_number(docs.get('totalDocuments', 0), 0)}", cell_style),
            Paragraph(f"Variance: {format_number(prod.get('targetVariance', 0.0))} MT", cell_style),
            Paragraph(f"Valid: {val.get('validDocuments', 0)} | Warn: {val.get('warningDocuments', 0)}", cell_style),
            Paragraph(f"Rating: {val.get('qualityRating', 'Good')}", cell_style)
        ]
    ]
    kpi_table = Table(kpi_data, colWidths=[130, 130, 130, 130])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 12))

    # Subsidiary Leaderboard
    if subs:
        story.append(Paragraph("Subsidiary Performance Leaderboard", section_heading))
        sub_rows = [
            [
                Paragraph("<b>Rank</b>", th_style),
                Paragraph("<b>Subsidiary</b>", th_style),
                Paragraph("<b>Documents</b>", th_style),
                Paragraph("<b>Total Prod (MT)</b>", th_style),
                Paragraph("<b>Avg / Record (MT)</b>", th_style),
                Paragraph("<b>National Share %</b>", th_style)
            ]
        ]
        for s in subs[:10]:
            sub_rows.append([
                Paragraph(f"#{s.get('rank', '-')}", cell_bold),
                Paragraph(str(s.get('subsidiary', 'N/A')), cell_bold),
                Paragraph(str(s.get('documents', 0)), cell_style),
                Paragraph(format_number(s.get('production', 0.0)), cell_bold),
                Paragraph(format_number(s.get('averageProduction', 0.0)), cell_style),
                Paragraph(format_pct(s.get('contributionPct', 0.0)), cell_style)
            ])
        sub_table = Table(sub_rows, colWidths=[40, 120, 70, 100, 100, 90])
        sub_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(sub_table)
        story.append(Spacer(1, 10))

    # Rule Violations (VAL001 - VAL010)
    if report_type in ["validation", "executive", "custom"]:
        story.append(Paragraph("Validation Rule Audit (VAL001 - VAL010)", section_heading))
        val_rows = [
            [
                Paragraph("<b>Rule ID</b>", th_style),
                Paragraph("<b>Validation Check</b>", th_style),
                Paragraph("<b>Severity</b>", th_style),
                Paragraph("<b>Violations Detected</b>", th_style)
            ]
        ]
        for r in rule_violations:
            sev_color = colors.HexColor("#dc2626") if r["severity"] == "Error" else colors.HexColor("#d97706")
            val_rows.append([
                Paragraph(f"<b>{r['ruleId']}</b>", cell_bold),
                Paragraph(f"<b>{r['name']}</b><br/>{r['description']}", cell_style),
                Paragraph(f"<font color='{sev_color.hexval()}'><b>{r['severity']}</b></font>", cell_style),
                Paragraph(f"<b>{r['occurrences']}</b>", cell_bold)
            ])
        val_table = Table(val_rows, colWidths=[65, 275, 80, 100])
        val_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(val_table)
        story.append(Spacer(1, 10))

    # Mine performance table
    if report_type in ["mine_performance", "production", "executive"] and mines:
        story.append(Paragraph("Mine Performance & Extraction Register", section_heading))
        mine_rows = [
            [
                Paragraph("<b>Mine Name</b>", th_style),
                Paragraph("<b>Subsidiary</b>", th_style),
                Paragraph("<b>District / State</b>", th_style),
                Paragraph("<b>Type</b>", th_style),
                Paragraph("<b>Production (MT)</b>", th_style),
                Paragraph("<b>Status</b>", th_style)
            ]
        ]
        for m in mines[:15]:
            status = m.get("validationStatus", "Valid")
            s_color = colors.HexColor("#16a34a") if status == "Valid" else (colors.HexColor("#d97706") if status == "Warning" else colors.HexColor("#dc2626"))
            mine_rows.append([
                Paragraph(f"<b>{m.get('mineName', 'N/A')}</b>", cell_bold),
                Paragraph(str(m.get('subsidiary', 'N/A')), cell_style),
                Paragraph(f"{m.get('district', 'N/A')}, {m.get('state', 'N/A')}", cell_style),
                Paragraph(str(m.get('mineType', 'N/A')), cell_style),
                Paragraph(format_number(m.get('coalProduction', 0.0)), cell_bold),
                Paragraph(f"<font color='{s_color.hexval()}'><b>{status}</b></font>", cell_style)
            ])
        mine_table = Table(mine_rows, colWidths=[120, 60, 150, 70, 70, 50])
        mine_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(mine_table)

    # Build document
    doc.build(story, canvasmaker=NumberedCanvas)
    return output_path
