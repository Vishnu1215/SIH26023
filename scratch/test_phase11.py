"""
Automated Test Suite for Phase 11: Hybrid AI Question Answering (RAG + Text-to-SQL Ready Architecture).
SIH26023 – Ministry of Coal | CMPDI Reporting Platform.

Verifies:
1. Query Routing across all 10 query types
2. Context Building (minimum required factual slices)
3. Citation Generation (source document, id, page, confidence, supporting fields)
4. Analytics Lookup (dashboard.json Single Source of Truth)
5. Search Index Retrieval (evidence collection)
6. Evidence Generation & Attribution
7. Fast QA Execution Latency (< 50 ms target)
8. QA API Router Endpoints (/qa/query, /qa/history, /qa/suggestions, /qa/explain, /qa/status)
9. QA History Persistence & Clearing
10. Fallback on Unknown Query ("No supporting evidence found.")
11. LLM Adapter & RAG Adapter Readiness Abstractions
12. Full Regression with Phases 7-10
"""

import os
import sys
import unittest
import asyncio
import time

# Ensure ai-service directory is on Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
AI_SERVICE_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", "ai-service"))
if AI_SERVICE_DIR not in sys.path:
    sys.path.insert(0, AI_SERVICE_DIR)

from app.services.qa_router import route_qa_query
from app.services.context_builder import build_qa_context
from app.services.citation_builder import (
    build_citation,
    build_dashboard_citation,
    build_citations_from_records,
    build_report_citation
)
from app.services.sql_adapter import sql_adapter
from app.services.rag_adapter import rag_adapter
from app.services.llm_adapter import llm_adapter
from app.services.answer_composer import compose_qa_response
from app.services.qa_storage import (
    save_qa_record,
    load_qa_history,
    clear_qa_history
)
from app.services.qa_engine import (
    execute_qa,
    explain_qa_query,
    get_dynamic_qa_suggestions
)
from app.api.qa import (
    api_qa_query,
    api_get_qa_history,
    api_clear_qa_history,
    api_get_qa_suggestions,
    api_explain_qa,
    api_get_qa_status,
    QAQueryRequest,
    QAExplainRequest
)

# Regression imports
from app.services.analytics_storage import load_dashboard
from app.services.search_index import load_search_index, search_documents
from app.services.query_engine import execute_nl_query


class TestPhase11HybridQA(unittest.TestCase):

    def test_01_query_routing_classification(self):
        """Verify query router accurately classifies questions into 10 standardized query types."""
        # 1. Subsidiary Question
        r1 = route_qa_query("Which subsidiary produced the highest coal?")
        self.assertEqual(r1["queryType"], "Subsidiary Question")
        self.assertTrue(r1["requiresSQL"])

        # 2. Analytics Question
        r2 = route_qa_query("What is the total coal production across all reporting entities?")
        self.assertEqual(r2["queryType"], "Analytics Question")

        # 3. Validation Question
        r3 = route_qa_query("Which documents failed validation or have errors?")
        self.assertEqual(r3["queryType"], "Validation Question")

        # 4. Production Question (Threshold)
        r4 = route_qa_query("Show documents with coal production greater than 100 MT")
        self.assertEqual(r4["queryType"], "Production Question")
        self.assertEqual(r4["entities"]["threshold"], 100.0)

        # 5. Mine Question
        r5 = route_qa_query("Which mines and collieries are located in Chhattisgarh?")
        self.assertEqual(r5["queryType"], "Mine Question")
        self.assertEqual(r5["entities"]["state"], "Chhattisgarh")

        # 6. Comparison Question
        r6 = route_qa_query("Compare actual production versus target benchmarks")
        self.assertEqual(r6["queryType"], "Comparison Question")

        # 7. Trend Question
        r7 = route_qa_query("What is the historical production trend over time?")
        self.assertEqual(r7["queryType"], "Trend Question")

        # 8. Report Question
        r8 = route_qa_query("Show generated statutory reports for download")
        self.assertEqual(r8["queryType"], "Report Question")

        # 9. Document Question
        r9 = route_qa_query("What is the validation score for this document?", document_id="doc-test-123")
        self.assertEqual(r9["queryType"], "Document Question")
        self.assertEqual(r9["entities"]["documentId"], "doc-test-123")

    def test_02_context_builder_slices(self):
        """Verify context builder extracts minimal slices without data duplication."""
        # Context for Subsidiary query
        route = route_qa_query("Which subsidiary produced the highest coal?")
        ctx = build_qa_context(route["queryType"], route["entities"], "Which subsidiary produced the highest coal?")
        self.assertIn("dashboard.json", ctx["primarySource"])
        self.assertIn("rankings", ctx["analyticsSlice"])
        self.assertGreaterEqual(len(ctx["evidenceItems"]), 1)

    def test_03_citation_builder(self):
        """Verify statutory citation construction with supporting fields and confidence."""
        cit = build_dashboard_citation(
            section_name="Subsidiary Rankings",
            supporting_fields={"subsidiary": "BCCL", "production": 142500.0},
            excerpt="Top producing subsidiary rank 1."
        )
        self.assertEqual(cit["sourceDocument"], "Executive Analytics Master Dashboard")
        self.assertIn("dashboard.json", cit["documentId"])
        self.assertEqual(cit["confidence"], 0.99)
        self.assertIn("subsidiary", cit["supportingFields"])

        # Multiple citations from records
        mock_recs = [
            {"documentId": "doc-01", "fileName": "report1.pdf", "subsidiary": "SECL", "coalProduction": 50.0},
            {"documentId": "doc-02", "fileName": "report2.xlsx", "subsidiary": "MCL", "coalProduction": 80.0}
        ]
        cits = build_citations_from_records(mock_recs)
        self.assertEqual(len(cits), 2)
        self.assertEqual(cits[0]["documentId"], "doc-01")

    def test_04_sql_adapter_readiness(self):
        """Verify Text-to-SQL adapter produces safe relational schemas and queries."""
        schema = sql_adapter.get_schema()
        self.assertEqual(schema["tableName"], "mining_documents")
        self.assertIn("coal_production", schema["columns"])

        sql_meta = sql_adapter.generate_sql_statement(
            "Subsidiary Question",
            {"subsidiary": None}
        )
        self.assertTrue(sql_meta["safe"])
        self.assertIn("SELECT subsidiary", sql_meta["sql"])
        self.assertIn("GROUP BY subsidiary", sql_meta["sql"])

    def test_05_rag_and_llm_adapters(self):
        """Verify RAG chunk retrieval interface and LLM adapter disabled default."""
        # LLM Adapter default state
        self.assertFalse(llm_adapter.is_enabled())
        self.assertEqual(llm_adapter.get_provider(), "deterministic")
        res_narrative = llm_adapter.generate_narrative({}, "test")
        self.assertIsNone(res_narrative)

        # RAG Adapter status and retrieval
        status = rag_adapter.get_status()
        self.assertTrue(status["vectorStoreReady"])
        chunks = rag_adapter.retrieve_relevant_chunks("coal production", top_k=2)
        self.assertIsInstance(chunks, list)

    def test_06_qa_execution_end_to_end(self):
        """Verify full execution of Hybrid QA engine with citations and evidence."""
        # 1. Highest production query
        res1 = execute_qa("Which subsidiary produced the highest coal?")
        self.assertEqual(res1["status"], "success")
        self.assertEqual(res1["queryType"], "Subsidiary Question")
        self.assertTrue(len(res1["answer"]) > 10)
        self.assertGreaterEqual(len(res1["evidence"]), 1)
        self.assertGreaterEqual(len(res1["documentsUsed"]), 1)
        self.assertGreaterEqual(res1["confidence"], 0.90)
        self.assertGreaterEqual(len(res1["followUpQuestions"]), 1)
        self.assertIn("responseTimeMs", res1)

        # 2. National macro KPI query
        res2 = execute_qa("What is the total coal production across all reporting entities?")
        self.assertEqual(res2["status"], "success")
        self.assertIn("Total coal production", res2["answer"])
        self.assertIn("totalCoalProduction", res2["metrics"])

    def test_07_no_supporting_evidence_fallback(self):
        """Verify explicit return of 'No supporting evidence found' when information is unavailable."""
        unk_res = execute_qa("What is the secret alien spacecraft base on Mars?")
        self.assertEqual(unk_res["status"], "success")
        self.assertIn("No supporting evidence found", unk_res["answer"])
        self.assertEqual(unk_res["confidence"], 0.0)

    def test_08_qa_explainability(self):
        """Verify explain QA endpoint returns reasoning and data sources without chain-of-thought."""
        exp = explain_qa_query("What is the overall validation accuracy?")
        self.assertEqual(exp["status"], "success")
        self.assertTrue(len(exp["reasoning"]) > 5)
        self.assertIn("dashboard.json", exp["dataSources"][0])
        self.assertIsInstance(exp["evidence"], list)

    def test_09_qa_dynamic_suggestions(self):
        """Verify dynamic suggestions generation based on active dashboard and reports."""
        suggs = get_dynamic_qa_suggestions()
        self.assertIsInstance(suggs, list)
        self.assertGreaterEqual(len(suggs), 5)
        for s in suggs:
            self.assertIn("title", s)
            self.assertIn("question", s)
            self.assertIn("badge", s)

    def test_10_qa_history_storage(self):
        """Verify storage/qa_history.json logging, retrieval, and clearing."""
        # Save a test record
        rec = save_qa_record(
            question="Automated test question?",
            answer="Automated test answer.",
            query_type="Analytics Question",
            confidence=0.98,
            evidence=[{"source": "test", "detail": "detail"}],
            documents_used=[],
            response_time_ms=12.5,
            use_llm=False
        )
        self.assertIn("id", rec)

        # Retrieve
        hist = load_qa_history()
        self.assertTrue(any(h.get("question") == "Automated test question?" for h in hist))

        # Clear
        cleared = clear_qa_history()
        self.assertTrue(cleared)
        hist_empty = load_qa_history()
        self.assertEqual(len(hist_empty), 0)

    def test_11_fastapi_endpoints(self):
        """Verify FastAPI router functions execute cleanly."""
        # POST /qa/query
        req1 = QAQueryRequest(question="Which subsidiary produced the highest coal?", useLLM=False)
        post_res = asyncio.run(api_qa_query(req1))
        self.assertEqual(post_res["status"], "success")
        self.assertIn("BCCL", post_res["answer"])

        # GET /qa/suggestions
        sugg_res = asyncio.run(api_get_qa_suggestions())
        self.assertEqual(sugg_res["status"], "success")
        self.assertGreaterEqual(sugg_res["count"], 5)

        # POST /qa/explain
        req2 = QAExplainRequest(question="What is the total coal production?")
        exp_res = asyncio.run(api_explain_qa(req2))
        self.assertEqual(exp_res["status"], "success")
        self.assertTrue(len(exp_res["reasoning"]) > 0)

        # GET /qa/status
        status_res = asyncio.run(api_get_qa_status())
        self.assertEqual(status_res["status"], "online")
        self.assertTrue(status_res["deterministic"])

    def test_12_regression_phases_7_to_10(self):
        """Verify strict backward compatibility with Phases 7, 8, 9, and 10."""
        # Phase 7 Single Source of Truth
        dash = load_dashboard()
        self.assertIsNotNone(dash)
        self.assertIn("production", dash)
        self.assertIn("rankings", dash)

        # Phase 9 Search Index
        idx = load_search_index()
        self.assertIn("documents", idx)
        self.assertGreater(idx["totalDocuments"], 0)

        # Phase 10 Natural Language Query Engine
        q10_res = execute_nl_query("Which subsidiary has the highest production?")
        self.assertEqual(q10_res["status"], "success")
        self.assertIn("dashboard.json", q10_res["source"])

    def test_13_latency_benchmark(self):
        """Verify average QA latency is well under 50 ms."""
        times = []
        for _ in range(5):
            t0 = time.perf_counter()
            execute_qa("Which subsidiary produced the highest coal?")
            times.append((time.perf_counter() - t0) * 1000.0)

        avg_latency = sum(times) / len(times)
        print(f"\n[Performance] Hybrid QA execution latency: {avg_latency:.2f} ms")
        self.assertLess(avg_latency, 50.0)


if __name__ == "__main__":
    unittest.main()
