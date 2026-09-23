"""
HTML Report Generator for Phase 8.
Produces standalone, beautifully styled HTML reports adhering to Ministry of Coal / CMPDI branding.
Used for HTML export, offline viewing, printing, and live frontend preview.
"""

from typing import Dict, Any, List
from app.services.report_utils import BRANDING, format_number, format_pct, format_datetime, clean_text


def _render_svg_bar_chart(items: List[Dict[str, Any]], label_key: str, val_key: str, height: int = 180) -> str:
    """Generate inline SVG horizontal bar chart for HTML preview/reports."""
    if not items:
        return "<div style='color: #64748b; font-size: 13px; font-style: italic; padding: 12px 0;'>No distribution data available</div>"
    
    max_val = max([float(x.get(val_key, 0.0)) for x in items] + [1.0])
    svg_bars = []
    y_pos = 20
    row_height = 28
    total_svg_height = max(height, len(items) * row_height + 25)

    for item in items[:6]:
        lbl = str(item.get(label_key, "N/A"))[:18]
        val = float(item.get(val_key, 0.0))
        pct = (val / max_val) * 100 if max_val > 0 else 0
        bar_width = max(int(pct * 2.2), 4)

        svg_bars.append(f"""
            <text x="10" y="{y_pos + 13}" font-family="system-ui, sans-serif" font-size="11" fill="#1e293b" font-weight="500">{lbl}</text>
            <rect x="150" y="{y_pos}" width="{bar_width}" height="16" rx="3" fill="#1e3a8a" opacity="0.85" />
            <text x="{155 + bar_width}" y="{y_pos + 12}" font-family="system-ui, sans-serif" font-size="11" fill="#0f172a" font-weight="600">{format_number(val, 1)}</text>
        """)
        y_pos += row_height

    return f"""
    <div style="overflow-x: auto; margin: 12px 0;">
        <svg width="450" height="{total_svg_height}" viewBox="0 0 450 {total_svg_height}" style="background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
            {''.join(svg_bars)}
        </svg>
    </div>
    """


def generate_html_report(context: Dict[str, Any]) -> str:
    """Compile the complete HTML report document."""
    report_type = context.get("reportType", "executive").lower().replace(" ", "_").replace("-", "_")
    branding = context.get("branding", BRANDING)
    dashboard = context.get("dashboard", {})
    records = context.get("records", [])
    rule_violations = context.get("ruleViolations", [])
    mines = context.get("minesList", [])
    filters = context.get("filters", {})

    # Extract dashboard sections
    prod = dashboard.get("production", {})
    val = dashboard.get("validation", {})
    qual = dashboard.get("quality", {})
    docs = dashboard.get("documents", {})
    subs = dashboard.get("subsidiaries", [])
    states = dashboard.get("states", [])
    fys = dashboard.get("financialYears", [])

    # Title resolution
    type_titles = {
        "executive": "Executive Mining & Analytics Report",
        "production": "National Coal Production & Subsidiary Performance Report",
        "validation": "Deterministic Validation & Data Discrepancy Audit Report",
        "dashboard": "Executive Dashboard Comprehensive Snapshot Report",
        "mine_performance": "Mine Performance, Production & Extraction Field Audit Report",
        "custom": "Custom Analytical & Compliance Report"
    }
    title = type_titles.get(report_type, "Ministry of Coal Statutory Report")

    # Filter chips
    filter_html = ""
    if filters:
        chips = []
        for k, v in filters.items():
            if v and str(v).lower() != "all":
                chips.append(f"<span class='filter-chip'><b>{k}:</b> {v}</span>")
        if chips:
            filter_html = f"<div class='filter-container'><strong>Active Filters:</strong> {''.join(chips)}</div>"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - Ministry of Coal</title>
    <style>
        :root {{
            --primary: #0f172a;
            --secondary: #1e3a8a;
            --accent: #d97706;
            --border: #cbd5e1;
            --bg-light: #f8fafc;
            --text: #0f172a;
            --text-muted: #64748b;
            --success: #16a34a;
            --warning: #d97706;
            --danger: #dc2626;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: var(--text);
            background: #ffffff;
            line-height: 1.5;
            padding: 30px;
        }}
        .report-page {{
            max-width: 1000px;
            margin: 0 auto;
            border: 1px solid var(--border);
            padding: 36px 40px;
            background: #fff;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }}
        .header {{
            border-bottom: 3px double var(--secondary);
            padding-bottom: 20px;
            margin-bottom: 24px;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
        }}
        .header-left {{
            flex: 1;
        }}
        .republic {{
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1.5px;
            color: var(--text-muted);
            text-transform: uppercase;
        }}
        .ministry {{
            font-size: 18px;
            font-weight: 800;
            color: var(--secondary);
            letter-spacing: 0.5px;
            margin-top: 2px;
        }}
        .institution {{
            font-size: 13px;
            font-weight: 600;
            color: var(--primary);
            margin-top: 2px;
        }}
        .report-title {{
            font-size: 20px;
            font-weight: 800;
            color: var(--primary);
            margin-top: 12px;
        }}
        .header-meta {{
            text-align: right;
            font-size: 11px;
            color: var(--text-muted);
            border-left: 1px solid var(--border);
            padding-left: 20px;
            min-width: 220px;
        }}
        .classification-badge {{
            display: inline-block;
            background: #fee2e2;
            color: #991b1b;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 3px;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }}
        .meta-item {{ margin-top: 3px; }}
        .meta-item strong {{ color: var(--text); }}
        
        .filter-container {{
            background: var(--bg-light);
            border: 1px solid var(--border);
            padding: 8px 14px;
            border-radius: 4px;
            font-size: 12px;
            margin-bottom: 24px;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
        }}
        .filter-chip {{
            background: #e2e8f0;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 11px;
        }}

        .section-title {{
            font-size: 14px;
            font-weight: 700;
            color: var(--secondary);
            text-transform: uppercase;
            letter-spacing: 0.75px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 6px;
            margin-top: 28px;
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}

        /* KPI Card Grid */
        .kpi-grid {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
        }}
        .kpi-card {{
            background: var(--bg-light);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 12px 14px;
            border-top: 3px solid var(--secondary);
        }}
        .kpi-label {{
            font-size: 11px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .kpi-value {{
            font-size: 20px;
            font-weight: 700;
            color: var(--primary);
            margin-top: 4px;
        }}
        .kpi-subtext {{
            font-size: 10px;
            color: var(--text-muted);
            margin-top: 2px;
        }}

        /* Tables */
        table.report-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 8px;
            margin-bottom: 18px;
        }}
        table.report-table th {{
            background: #f1f5f9;
            color: var(--primary);
            text-align: left;
            padding: 8px 10px;
            font-weight: 700;
            border: 1px solid var(--border);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        table.report-table td {{
            padding: 7px 10px;
            border: 1px solid var(--border);
            color: var(--text);
        }}
        table.report-table tr:nth-child(even) {{
            background: #f8fafc;
        }}
        table.report-table tr:hover {{
            background: #f1f5f9;
        }}
        .text-right {{ text-align: right; }}
        .text-center {{ text-align: center; }}

        /* Status Badges */
        .badge {{
            display: inline-block;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 3px;
            text-transform: uppercase;
        }}
        .badge-valid {{ background: #dcfce7; color: #15803d; }}
        .badge-warning {{ background: #fef3c7; color: #b45309; }}
        .badge-error {{ background: #fee2e2; color: #b91c1c; }}

        /* Two column layout */
        .grid-2 {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
            margin-bottom: 16px;
        }}

        .footer {{
            border-top: 1px solid var(--border);
            padding-top: 14px;
            margin-top: 36px;
            font-size: 10px;
            color: var(--text-muted);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}

        @media print {{
            body {{ padding: 0; background: #fff; }}
            .report-page {{ border: none; box-shadow: none; padding: 0; max-width: 100%; }}
            .section-title {{ page-break-after: avoid; }}
            table.report-table {{ page-break-inside: auto; }}
            tr {{ page-break-inside: avoid; page-break-after: auto; }}
        }}
    </style>
</head>
<body>
    <div class="report-page">
        <!-- Official Ministry Header -->
        <div class="header">
            <div class="header-left">
                <div class="republic">{branding['republic']}</div>
                <div class="ministry">{branding['ministry']}</div>
                <div class="institution">{branding['institution']}</div>
                <div class="report-title">{title}</div>
            </div>
            <div class="header-meta">
                <div class="classification-badge">OFFICIAL USE ONLY</div>
                <div class="meta-item"><strong>Generated:</strong> {context['formattedDate']}</div>
                <div class="meta-item"><strong>Analytics Ver:</strong> v{context['sourceAnalyticsVersion']}</div>
                <div class="meta-item"><strong>Records Analyzed:</strong> {context['totalRecordsCount']}</div>
                <div class="meta-item"><strong>Engine:</strong> Phase 8 Deterministic</div>
            </div>
        </div>

        {filter_html}
    """

    # Section 1: Executive / Production KPIs
    html += f"""
        <div class="section-title">
            <span>Executive Overview & Key Performance Indicators</span>
            <span style="font-size: 11px; font-weight: normal; color: var(--text-muted);">Deterministic Aggregation</span>
        </div>
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">Total Coal Production</div>
                <div class="kpi-value">{format_number(prod.get('totalCoalProduction', 0.0))} <span style="font-size:12px; font-weight:normal;">MT</span></div>
                <div class="kpi-subtext">Cumulative extracted production</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Target Production</div>
                <div class="kpi-value">{format_number(prod.get('totalTargetProduction', 0.0))} <span style="font-size:12px; font-weight:normal;">MT</span></div>
                <div class="kpi-subtext">Statutory allocation</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Target Variance</div>
                <div class="kpi-value">{format_number(prod.get('targetVariance', 0.0))} <span style="font-size:12px; font-weight:normal;">MT</span></div>
                <div class="kpi-subtext">Production vs Target</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Achievement %</div>
                <div class="kpi-value">{format_pct(prod.get('productionAchievementPct', prod.get('productionAchievement', 0.0)))}</div>
                <div class="kpi-subtext">Target fulfillment rate</div>
            </div>
        </div>

        <div class="kpi-grid">
            <div class="kpi-card" style="border-top-color: var(--accent);">
                <div class="kpi-label">Total Documents</div>
                <div class="kpi-value">{format_number(docs.get('totalDocuments', docs.get('documentsUploaded', 0)), 0)}</div>
                <div class="kpi-subtext">Uploaded & ingested</div>
            </div>
            <div class="kpi-card" style="border-top-color: var(--success);">
                <div class="kpi-label">Valid Documents</div>
                <div class="kpi-value">{format_number(val.get('validDocuments', 0), 0)}</div>
                <div class="kpi-subtext">100% checks passed</div>
            </div>
            <div class="kpi-card" style="border-top-color: var(--warning);">
                <div class="kpi-label">Warning Records</div>
                <div class="kpi-value">{format_number(val.get('warningDocuments', 0), 0)}</div>
                <div class="kpi-subtext">Minor discrepancies</div>
            </div>
            <div class="kpi-card" style="border-top-color: var(--primary);">
                <div class="kpi-label">Quality Score</div>
                <div class="kpi-value">{format_number(val.get('averageValidationScore', 0.0), 1)}<span style="font-size: 13px;">/100</span></div>
                <div class="kpi-subtext">Rating: {val.get('qualityRating', val.get('overallQualityRating', 'Good'))}</div>
            </div>
        </div>
    """

    # Section 2: Subsidiary Leaderboard
    if subs:
        html += """
        <div class="section-title">
            <span>Subsidiary Performance & Production Leaderboard</span>
        </div>
        <table class="report-table">
            <thead>
                <tr>
                    <th style="width: 50px;" class="text-center">Rank</th>
                    <th>Subsidiary Enterprise</th>
                    <th class="text-center">Documents</th>
                    <th class="text-right">Total Production (MT)</th>
                    <th class="text-right">Avg / Record (MT)</th>
                    <th class="text-right">National Share %</th>
                </tr>
            </thead>
            <tbody>
        """
        for s in subs:
            html += f"""
                <tr>
                    <td class="text-center"><b>#{s.get('rank', '-')}</b></td>
                    <td><b>{s.get('subsidiary', 'N/A')}</b></td>
                    <td class="text-center">{s.get('documents', 0)}</td>
                    <td class="text-right"><b>{format_number(s.get('production', 0.0))}</b></td>
                    <td class="text-right">{format_number(s.get('averageProduction', 0.0))}</td>
                    <td class="text-right">{format_pct(s.get('contributionPct', 0.0))}</td>
                </tr>
            """
        html += """
            </tbody>
        </table>
        """

    # Section 3: Financial Years & State Distribution
    html += """
        <div class="grid-2">
            <div>
                <div class="section-title" style="margin-top: 14px;">
                    <span>Financial Year Trends</span>
                </div>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>FY</th>
                            <th class="text-right">Production (MT)</th>
                            <th class="text-center">Records</th>
                            <th class="text-right">Quality</th>
                        </tr>
                    </thead>
                    <tbody>
    """
    if fys:
        for fy in fys:
            html += f"""
                <tr>
                    <td><b>{fy.get('financialYear', 'N/A')}</b></td>
                    <td class="text-right"><b>{format_number(fy.get('production', 0.0))}</b></td>
                    <td class="text-center">{fy.get('documents', 0)}</td>
                    <td class="text-right">{fy.get('qualityRating', 'Good')}</td>
                </tr>
            """
    else:
        html += "<tr><td colspan='4' class='text-center' style='color:#64748b;'>No FY trends logged</td></tr>"

    html += """
                    </tbody>
                </table>
            </div>
            <div>
                <div class="section-title" style="margin-top: 14px;">
                    <span>Geographical / State Breakdown</span>
                </div>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>State</th>
                            <th class="text-right">Production (MT)</th>
                            <th class="text-center">Records</th>
                            <th class="text-right">Share %</th>
                        </tr>
                    </thead>
                    <tbody>
    """
    if states:
        for st in states:
            html += f"""
                <tr>
                    <td><b>{st.get('state', 'N/A')}</b></td>
                    <td class="text-right"><b>{format_number(st.get('production', 0.0))}</b></td>
                    <td class="text-center">{st.get('documents', 0)}</td>
                    <td class="text-right">{format_pct(st.get('contributionPct', 0.0))}</td>
                </tr>
            """
    else:
        html += "<tr><td colspan='4' class='text-center' style='color:#64748b;'>No state data logged</td></tr>"

    html += """
                    </tbody>
                </table>
            </div>
        </div>
    """

    # Section 4: If Validation Report or Executive Report: Show Rule Violations
    if report_type in ["validation", "executive", "custom"]:
        html += """
        <div class="section-title">
            <span>Deterministic Validation Rules Violations (VAL001 - VAL010)</span>
            <span style="font-size: 11px; font-weight: normal; color: var(--text-muted);">10-Rule Audit Matrix</span>
        </div>
        <table class="report-table">
            <thead>
                <tr>
                    <th style="width: 80px;">Rule ID</th>
                    <th>Validation Rule Name</th>
                    <th style="width: 80px;" class="text-center">Severity</th>
                    <th>Rule Specification</th>
                    <th style="width: 90px;" class="text-right">Violations</th>
                </tr>
            </thead>
            <tbody>
        """
        for r in rule_violations:
            sev_class = "badge-error" if r["severity"] == "Error" else "badge-warning"
            count_color = "#dc2626" if r["occurrences"] > 0 and r["severity"] == "Error" else ("#d97706" if r["occurrences"] > 0 else "#64748b")
            html += f"""
                <tr>
                    <td><b>{r['ruleId']}</b></td>
                    <td><b>{r['name']}</b></td>
                    <td class="text-center"><span class="badge {sev_class}">{r['severity']}</span></td>
                    <td style="color: #475569; font-size: 11px;">{r['description']}</td>
                    <td class="text-right" style="color: {count_color}; font-weight: 700;">{r['occurrences']}</td>
                </tr>
            """
        html += """
            </tbody>
        </table>
        """

    # Section 5: Mine Performance Table (if Mine Performance Report, Production Report, or Executive Report)
    if report_type in ["mine_performance", "production", "executive"] and mines:
        html += """
        <div class="section-title">
            <span>Mine Performance & Extraction Register</span>
            <span style="font-size: 11px; font-weight: normal; color: var(--text-muted);">Mine-level deterministic metrics</span>
        </div>
        <table class="report-table">
            <thead>
                <tr>
                    <th>Mine Name</th>
                    <th>Subsidiary</th>
                    <th>District / State</th>
                    <th>Mine Type</th>
                    <th class="text-right">Production (MT)</th>
                    <th class="text-center">Status</th>
                </tr>
            </thead>
            <tbody>
        """
        for m in mines[:20]:
            status = m.get("validationStatus", "Valid")
            s_class = "badge-valid" if status == "Valid" else ("badge-warning" if status == "Warning" else "badge-error")
            html += f"""
                <tr>
                    <td><b>{m.get('mineName', 'N/A')}</b></td>
                    <td>{m.get('subsidiary', 'N/A')}</td>
                    <td>{m.get('district', 'N/A')}, {m.get('state', 'N/A')}</td>
                    <td>{m.get('mineType', 'N/A')}</td>
                    <td class="text-right"><b>{format_number(m.get('coalProduction', 0.0))}</b></td>
                    <td class="text-center"><span class="badge {s_class}">{status}</span></td>
                </tr>
            """
        html += """
            </tbody>
        </table>
        """

    # Footer
    html += f"""
        <div class="footer">
            <div>
                <strong>{branding['institution']}</strong> &bull; {branding['system_name']}
            </div>
            <div>
                {branding['classification']}
            </div>
            <div>
                Page 1 of 1 &bull; {context['formattedDate']}
            </div>
        </div>
    </div>
</body>
</html>
    """
    return html
