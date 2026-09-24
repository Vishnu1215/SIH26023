"""
Comprehensive Automated Test Suite for Phase 10:
Natural Language Query & Decision Support (PRD-Aligned Implementation).

Verifies:
1. Query Parser & Entity Extraction (PRD queries)
2. Intent Detection across 11 standardized intents
3. Filter Extraction (Category, Subsidiary, Mine, State, FY, Topic, Production Thresholds, Status)
4. Analytics Lookup Engine (Highest/Lowest/Avg Production, Leader, Top States, Validation Accuracy)
5. Document Search & Filter Execution over Phase 9 inverted index
6. Document-Specific Inquiries ("Ask about this document")
7. Query Suggestions (Deterministic PRD queries)
8. Query History Persistence & Clearing (storage/query_history.json)
9. FastAPI Query Endpoints (POST /query, GET /query/history, etc.)
10. Latency Benchmark (<50ms target)
"""

import os
import sys
import json
import time
import asyncio
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AI_SERVICE_DIR = os.path.join(BASE_DIR, "ai-service")
if AI_SERVICE_DIR not in sys.path:
    sys.path.insert(0, AI_SERVICE_DIR)

from app.services.query_parser import (
    parse_query,
    detect_intent,
    extract_production_threshold,
    extract_validation_status,
    normalize_fy
)
from app.services.query_engine import (
    execute_nl_query,
    load_query_history,
    save_to_history,
    clear_query_history,
    get_query_suggestions
)
from app.api.query import (
    api_execute_query,
    api_get_query_history,
    api_clear_query_history,
    api_get_query_suggestions,
    QueryRequest
)


class TestPhase10NaturalLanguageQuery(unittest.TestCase):

    def test_01_query_parser_prd_questions(self):
        """Verify parsing across all 12 PRD sample questions."""
        # 1. Show production reports for SECL
        p1 = parse_query("Show production reports for SECL")
        self.assertEqual(p1["filters"].get("subsidiary"), "SECL")
        self.assertEqual(p1["filters"].get("category"), "Production Report")

        # 2. Which documents belong to FY 2023-24?
        p2 = parse_query("Which documents belong to FY 2023-24?")
        self.assertEqual(p2["filters"].get("financialYear"), "2023-24")

        # 3. Show reports from Odisha
        p3 = parse_query("Show reports from Odisha")
        self.assertEqual(p3["filters"].get("state"), "Odisha")

        # 4. List mines in Chhattisgarh
        p4 = parse_query("List mines in Chhattisgarh")
        self.assertEqual(p4["filters"].get("state"), "Chhattisgarh")
        self.assertEqual(p4["intent"], "mine_lookup")

        # 5. Which documents failed validation?
        p5 = parse_query("Which documents failed validation?")
        self.assertEqual(p5["filters"].get("validationStatus"), "Error")
        self.assertEqual(p5["intent"], "validation_lookup")

        # 6. Show annual reports
        p6 = parse_query("Show annual reports")
        self.assertEqual(p6["filters"].get("category"), "Annual Report")

        # 7. Find documents mentioning Gevra Mine
        p7 = parse_query("Find documents mentioning Gevra Mine")
        self.assertEqual(p7["filters"].get("mine"), "Gevra")

        # 8. Show documents with production greater than 100 MT
        p8 = parse_query("Show documents with production greater than 100 MT")
        self.assertEqual(p8["filters"].get("minProduction"), 100.0)

        # 9. Show reports related to mine safety
        p9 = parse_query("Show reports related to mine safety")
        self.assertEqual(p9["filters"].get("topic"), "Mine Safety")

        # 10. Which subsidiary has the highest production?
        p10 = parse_query("Which subsidiary has the highest production?")
        self.assertEqual(p10["intent"], "analytics_lookup")

        # 11. What is the validation score for this document?
        p11 = parse_query("What is the validation score for this document?", document_id="doc-123")
        self.assertEqual(p11["intent"], "document_details")

        # 12. Which reports belong to CMPDI?
        p12 = parse_query("Which reports belong to CMPDI?")
        self.assertEqual(p12["filters"].get("subsidiary"), "CMPDI")

    def test_02_production_threshold_extraction(self):
        """Verify extraction of production comparison operators."""
        min1, max1 = extract_production_threshold("output greater than 150.5 MT")
        self.assertEqual(min1, 150.5)
        self.assertIsNone(max1)

        min2, max2 = extract_production_threshold("production less than 50 MT")
        self.assertIsNone(min2)
        self.assertEqual(max2, 50.0)

        min3, max3 = extract_production_threshold("> 200")
        self.assertEqual(min3, 200.0)

    def test_03_intent_classification(self):
        """Verify intent detection rules."""
        self.assertEqual(detect_intent("average production across subsidiaries"), "analytics_lookup")
        self.assertEqual(detect_intent("which documents failed validation?"), "validation_lookup")
        self.assertEqual(detect_intent("list mines in Odisha"), "mine_lookup")
        self.assertEqual(detect_intent("show geological reports"), "report_lookup")
        self.assertEqual(detect_intent("overview kpi dashboard metrics"), "dashboard_metrics")
        self.assertEqual(detect_intent("reports related to overburden removal"), "topic_search")
        self.assertEqual(detect_intent("validation score for this document", document_id="x"), "document_details")

    def test_04_analytics_lookup_engine(self):
        """Verify analytics questions retrieve directly from dashboard.json without recomputing."""
        # 1. Highest production query
        res1 = execute_nl_query("Which subsidiary has the highest production?")
        self.assertEqual(res1["status"], "success")
        self.assertIn("dashboard.json", res1["source"])
        self.assertTrue(len(res1["answer"]) > 0)
        self.assertIn("Rank #1", res1["reason"])

        # 2. Total production
        res2 = execute_nl_query("What is the total coal production?")
        self.assertEqual(res2["status"], "success")
        self.assertIn("dashboard.json", res2["source"])
        self.assertIn("Total coal production", res2["answer"])

        # 3. Validation accuracy
        res3 = execute_nl_query("What is the platform validation accuracy?")
        self.assertEqual(res3["status"], "success")
        self.assertIn("dashboard.json", res3["source"])
        self.assertIn("validation accuracy", res3["answer"].lower())

    def test_05_document_search_execution(self):
        """Verify document filtering queries return supporting records and explainable reasons."""
        # 1. FY 2023-24 query
        res = execute_nl_query("Which documents belong to FY 2023-24?")
        self.assertEqual(res["status"], "success")
        self.assertIn("search_index.json", res["source"])
        self.assertIsInstance(res["supportingRecords"], list)

        # 2. Production greater than 100 MT
        res_prod = execute_nl_query("Show documents with production greater than 100 MT")
        self.assertEqual(res_prod["status"], "success")
        for rec in res_prod["supportingRecords"]:
            self.assertGreaterEqual(float(rec.get("coalProduction", 0)), 100.0)

    def test_06_mine_lookup(self):
        """Verify mine lookup extracts distinct mine entities."""
        res = execute_nl_query("List mines in Chhattisgarh")
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["intent"], "mine_lookup")
        self.assertIn("Chhattisgarh", res["answer"])
        self.assertIsInstance(res["data"].get("mines"), list)

    def test_07_document_specific_inquiries(self):
        """Verify 'Ask about this document' returns metadata from storage/document_intelligence/."""
        doc_id = "1e77a47e-dafb-4ed9-966c-5fa47e75c19b"
        # Validation score inquiry
        res_val = execute_nl_query("What is the validation score for this document?", document_id=doc_id)
        self.assertEqual(res_val["status"], "success")
        self.assertIn("100/100", res_val["answer"])
        self.assertIn("document_intelligence", res_val["source"])

        # Summary inquiry
        res_sum = execute_nl_query("Show summary of this document", document_id=doc_id)
        self.assertEqual(res_sum["status"], "success")
        self.assertTrue(len(res_sum["answer"]) > 10)

    def test_08_query_suggestions(self):
        """Verify deterministic suggestions list format."""
        suggs = get_query_suggestions()
        self.assertIsInstance(suggs, list)
        self.assertGreaterEqual(len(suggs), 8)
        for s in suggs:
            self.assertIn("title", s)
            self.assertIn("query", s)
            self.assertIn("category", s)

    def test_09_query_history_persistence(self):
        """Verify query history persistence, retrieval, and clearing."""
        # Save a test entry
        save_to_history("Test query for history", "test_intent", 5, {"test": "val"})
        history = load_query_history()
        self.assertIsInstance(history, list)
        self.assertTrue(any(h.get("query") == "Test query for history" for h in history))

        # Clear history
        cleared = clear_query_history()
        self.assertTrue(cleared)
        history_after = load_query_history()
        self.assertEqual(len(history_after), 0)

    def test_10_fastapi_endpoints(self):
        """Verify FastAPI router functions execute cleanly."""
        # POST /query
        req = QueryRequest(query="Which subsidiary has the highest production?")
        post_res = asyncio.run(api_execute_query(req))
        self.assertEqual(post_res["status"], "success")
        self.assertIn("dashboard.json", post_res["source"])

        # GET /query/suggestions
        sugg_res = asyncio.run(api_get_query_suggestions())
        self.assertEqual(sugg_res["status"], "success")
        self.assertGreater(sugg_res["count"], 0)

        # GET /query/history
        hist_res = asyncio.run(api_get_query_history())
        self.assertEqual(hist_res["status"], "success")

    def test_11_latency_benchmark(self):
        """Verify average query latency is under 50 ms."""
        # Warm up
        execute_nl_query("Show production reports for SECL")

        start = time.perf_counter()
        res = execute_nl_query("Which subsidiary has the highest production?")
        elapsed_ms = (time.perf_counter() - start) * 1000
        print(f"\n[Performance] NL Query execution latency: {elapsed_ms:.2f} ms")
        self.assertLess(elapsed_ms, 50.0, "Execution should be <50ms")


if __name__ == "__main__":
    unittest.main(verbosity=2)
