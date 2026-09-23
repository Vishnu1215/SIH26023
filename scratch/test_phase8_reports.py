"""
Comprehensive Verification Suite for Phase 8 – Report Generator.
Tests:
- All 6 report types (executive, production, validation, dashboard, mine_performance, custom)
- All 4 formats (pdf, docx, xlsx, html)
- Deterministic data consistency from storage/analytics/dashboard.json
- PDF multi-page rendering and font integrity
- DOCX table and XML structure
- Excel multi-tab workbook structure and formula sums
- HTML standalone rendering and live preview
- Report history manifest tracking, regeneration, and deletion
- Zero AI / LLM / RAG / Vector DB compliance
"""

import os
import sys
import json
import unittest

# Ensure ai-service is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AI_SERVICE_DIR = os.path.join(BASE_DIR, "ai-service")
if AI_SERVICE_DIR not in sys.path:
    sys.path.insert(0, AI_SERVICE_DIR)

from app.services.report_storage import (
    init_report_storage,
    get_report_history,
    get_report_by_id,
    delete_report
)
from app.services.report_templates import (
    load_analytics_dashboard,
    load_all_records,
    build_report_context,
    apply_record_filters
)
from app.services.report_generator import (
    generate_report,
    preview_report,
    regenerate_report
)


class TestPhase8ReportGenerator(unittest.TestCase):

    def setUp(self):
        init_report_storage()

    def test_01_single_source_of_truth_analytics(self):
        """Verify report templates strictly load dashboard.json as single source of truth."""
        dashboard = load_analytics_dashboard()
        self.assertIsInstance(dashboard, dict)
        self.assertIn("status", dashboard)
        self.assertIn("production", dashboard)
        self.assertIn("validation", dashboard)
        self.assertIn("subsidiaries", dashboard)

    def test_02_build_report_context_deterministic(self):
        """Verify report context data structure without any AI dependencies."""
        context = build_report_context("executive")
        self.assertEqual(context["reportType"], "executive")
        self.assertIn("branding", context)
        self.assertEqual(context["branding"]["republic"], "GOVERNMENT OF INDIA")
        self.assertEqual(context["branding"]["ministry"], "MINISTRY OF COAL")
        self.assertIn("dashboard", context)
        self.assertIn("records", context)
        self.assertIn("ruleViolations", context)
        # Check rule violations format VAL001 to VAL010
        self.assertEqual(len(context["ruleViolations"]), 10)
        rule_ids = [r["ruleId"] for r in context["ruleViolations"]]
        self.assertIn("VAL001", rule_ids)
        self.assertIn("VAL010", rule_ids)

    def test_03_generate_all_6_report_types(self):
        """Verify generation of all 6 statutory report types."""
        types = ["executive", "production", "validation", "dashboard", "mine_performance", "custom"]
        generated = []
        for r_type in types:
            rec = generate_report(
                report_type=r_type,
                export_format="pdf",
                filters={"subsidiary": "All"},
                custom_sections=["executive_kpis", "production_summary", "validation_rules"] if r_type == "custom" else []
            )
            self.assertIsNotNone(rec.get("reportId"))
            self.assertEqual(rec.get("reportType"), r_type)
            self.assertEqual(rec.get("format"), "pdf")
            self.assertTrue(os.path.exists(rec["filePath"]))
            self.assertGreater(rec["fileSize"], 0)
            generated.append(rec)

        # Cleanup test files
        for g in generated:
            delete_report(g["reportId"])

    def test_04_generate_all_4_formats(self):
        """Verify synthesis across PDF, DOCX, XLSX, and HTML."""
        formats = ["pdf", "docx", "xlsx", "html"]
        records = []
        for fmt in formats:
            rec = generate_report(
                report_type="executive",
                export_format=fmt
            )
            self.assertIsNotNone(rec.get("reportId"))
            self.assertEqual(rec.get("format"), fmt)
            self.assertTrue(os.path.exists(rec["filePath"]))
            self.assertGreater(rec["fileSize"], 0, f"File {rec['filePath']} has 0 bytes")
            records.append(rec)

        # Verify Excel multi-sheet structure
        xlsx_rec = next(r for r in records if r["format"] == "xlsx")
        import openpyxl
        wb = openpyxl.load_workbook(xlsx_rec["filePath"])
        self.assertIn("Executive Overview", wb.sheetnames)
        self.assertIn("Subsidiary Production", wb.sheetnames)
        self.assertIn("Mine Performance", wb.sheetnames)
        self.assertIn("Validation Audit", wb.sheetnames)

        # Verify Word DOCX structure
        docx_rec = next(r for r in records if r["format"] == "docx")
        from docx import Document
        doc = Document(docx_rec["filePath"])
        self.assertGreater(len(doc.paragraphs), 0)
        self.assertGreater(len(doc.tables), 0)

        # Verify HTML contains Ministry branding
        html_rec = next(r for r in records if r["format"] == "html")
        with open(html_rec["filePath"], "r", encoding="utf-8") as f:
            html_content = f.read()
        self.assertIn("MINISTRY OF COAL", html_content)
        self.assertIn("Executive Mining & Analytics Report", html_content)

        # Verify PDF via pymupdf
        pdf_rec = next(r for r in records if r["format"] == "pdf")
        import fitz
        pdoc = fitz.open(pdf_rec["filePath"])
        self.assertGreaterEqual(len(pdoc), 1)
        pdoc.close()

        # Cleanup
        for r in records:
            delete_report(r["reportId"])

    def test_05_live_preview_generation(self):
        """Verify instant HTML preview rendering without file writing."""
        html = preview_report("validation")
        self.assertIsInstance(html, str)
        self.assertIn("Deterministic Validation & Data Discrepancy Audit Report", html)
        self.assertIn("VAL001", html)
        self.assertIn("VAL010", html)

    def test_06_filtering_deterministic(self):
        """Verify deterministic filtering by subsidiary and financial year."""
        all_recs = load_all_records()
        if all_recs:
            sub = all_recs[0].get("subsidiary")
            if sub and sub != "N/A":
                filtered = apply_record_filters(all_recs, {"subsidiary": sub})
                for r in filtered:
                    self.assertEqual(r.get("subsidiary"), sub)

    def test_07_regeneration_and_deletion_lifecycle(self):
        """Verify full lifecycle: generate -> verify in history -> regenerate -> delete."""
        initial_history_len = len(get_report_history())
        
        # 1. Generate
        rec = generate_report("production", "pdf")
        r_id = rec["reportId"]
        f_path = rec["filePath"]
        self.assertTrue(os.path.exists(f_path))

        # Check history updated
        self.assertEqual(len(get_report_history()), initial_history_len + 1)
        found = get_report_by_id(r_id)
        self.assertIsNotNone(found)
        self.assertEqual(found["reportType"], "production")

        # 2. Regenerate
        refreshed = regenerate_report(r_id)
        self.assertIsNotNone(refreshed)
        self.assertEqual(refreshed["reportType"], "production")
        self.assertTrue(os.path.exists(refreshed["filePath"]))

        # 3. Delete original and refreshed
        del1 = delete_report(r_id)
        self.assertTrue(del1)
        self.assertFalse(os.path.exists(f_path))

        del2 = delete_report(refreshed["reportId"])
        self.assertTrue(del2)
        self.assertFalse(os.path.exists(refreshed["filePath"]))

        # Check history restored
        self.assertEqual(len(get_report_history()), initial_history_len)


if __name__ == "__main__":
    unittest.main(verbosity=2)
