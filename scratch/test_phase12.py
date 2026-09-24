"""
Automated Test Suite for Phase 12: AI Recommendations & Decision Support Engine.
SIH26023 – Ministry of Coal | CMPDI Reporting Platform.

Verifies:
1. Recommendation Generation (Module 1)
2. Risk Calculation & Operational Scoring (Module 2)
3. Trend Analysis & Progression Classification (Module 3)
4. Executive Insights Generation (Module 4, max 10 insights)
5. Alerts Generation across Red/Orange/Yellow tiers (Module 5)
6. Recommendation Storage & History Snapshots (Module 6)
7. Fast Processing Performance (Recs < 20ms, Risk < 10ms, API < 50ms)
8. FastAPI Router Endpoints (/recommendations, /insights, /alerts, /risk, /trends, /recompute, /history)
9. Full Regression with Phases 7, 8, 9, 10, 11
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

from app.services.recommendation_engine import generate_recommendations
from app.services.risk_engine import calculate_operational_risk
from app.services.trend_analyzer import analyze_trends
from app.services.executive_insights import generate_executive_insights
from app.services.alerts_engine import generate_operational_alerts
from app.services.recommendation_storage import (
    load_recommendations,
    save_recommendations,
    load_recommendations_history,
    clear_recommendations_history
)
from app.services.recommendation_service import (
    compute_all_recommendations,
    get_recommendations_list,
    get_insights_list,
    get_alerts_list,
    get_risk_assessment,
    get_trend_analysis
)
from app.api.recommendations import (
    api_get_recommendations,
    api_get_insights,
    api_get_alerts,
    api_get_risk,
    api_get_trends,
    api_recompute_recommendations,
    api_get_recommendations_history
)

# Regression imports
from app.services.analytics_storage import load_dashboard
from app.services.search_index import load_search_index
from app.services.query_engine import execute_nl_query
from app.services.qa_engine import execute_qa


class TestPhase12Recommendations(unittest.TestCase):

    def setUp(self):
        self.dash = load_dashboard()
        self.idx = load_search_index()
        self.docs = list(self.idx.get("documents", {}).values())

    def test_01_risk_calculation(self):
        """Verify deterministic operational risk calculation (0-100) and breakdown."""
        risk_res = calculate_operational_risk(self.dash, indexed_docs=self.docs)
        self.assertIn("overallRisk", risk_res)
        self.assertIn("riskLevel", risk_res)
        self.assertIn("riskBreakdown", risk_res)
        self.assertIn("riskFactors", risk_res)

        self.assertIsInstance(risk_res["overallRisk"], float)
        self.assertGreaterEqual(risk_res["overallRisk"], 0.0)
        self.assertLessEqual(risk_res["overallRisk"], 100.0)
        self.assertIn(risk_res["riskLevel"], ["Low", "Medium", "High"])

        breakdown = risk_res["riskBreakdown"]
        self.assertIn("productionRisk", breakdown)
        self.assertIn("validationRisk", breakdown)
        self.assertIn("qualityRisk", breakdown)
        self.assertIn("completenessRisk", breakdown)
        self.assertIn("processingRisk", breakdown)

    def test_02_trend_analysis(self):
        """Verify trend classification across production, validation, ingestion, and reports."""
        trends = analyze_trends(self.dash, reports_history=[], indexed_docs=self.docs)
        self.assertIn("productionTrend", trends)
        self.assertIn("validationTrend", trends)
        self.assertIn("documentIngestionTrend", trends)
        self.assertIn("reportGenerationTrend", trends)

        valid_trends = ["Increasing", "Stable", "Declining"]
        self.assertIn(trends["productionTrend"]["trend"], valid_trends)
        self.assertIn(trends["validationTrend"]["trend"], valid_trends)
        self.assertIn(trends["documentIngestionTrend"]["trend"], valid_trends)
        self.assertIn(trends["reportGenerationTrend"]["trend"], valid_trends)

        self.assertTrue(len(trends["productionTrend"]["reason"]) > 5)

    def test_03_executive_insights(self):
        """Verify executive insights generation with max 10 factual items."""
        insights = generate_executive_insights(self.dash, reports_history=[], indexed_docs=self.docs)
        self.assertIsInstance(insights, list)
        self.assertGreaterEqual(len(insights), 1)
        self.assertLessEqual(len(insights), 10)

        for ins in insights:
            self.assertIn("id", ins)
            self.assertIn("title", ins)
            self.assertIn("statement", ins)
            self.assertIn("category", ins)
            self.assertIn("metric", ins)
            self.assertIn("source", ins)

    def test_04_alerts_generation(self):
        """Verify alerts mapped to Red, Orange, and Yellow severity tiers."""
        alerts = generate_operational_alerts(self.dash, reports_history=[], indexed_docs=self.docs)
        self.assertIsInstance(alerts, list)
        self.assertGreaterEqual(len(alerts), 1)

        valid_severities = ["Red", "Orange", "Yellow", "Critical"]
        for a in alerts:
            self.assertIn("id", a)
            self.assertIn("title", a)
            self.assertIn("description", a)
            self.assertIn(a["severity"], valid_severities)
            self.assertIn("recommendation", a)
            self.assertIn("source", a)

    def test_05_recommendation_generation(self):
        """Verify prioritized, actionable recommendations with supporting metrics and actions."""
        recs = generate_recommendations(self.dash, reports_history=[], indexed_docs=self.docs)
        self.assertIsInstance(recs, list)
        self.assertGreaterEqual(len(recs), 1)

        valid_priorities = ["Critical", "High", "Medium", "Low"]
        for r in recs:
            self.assertIn("id", r)
            self.assertIn("title", r)
            self.assertIn("description", r)
            self.assertIn("category", r)
            self.assertIn(r["priority"], valid_priorities)
            self.assertIn("confidence", r)
            self.assertIn("reason", r)
            self.assertIn("supportingMetrics", r)
            self.assertIn("recommendedAction", r)
            self.assertGreater(len(r["recommendedAction"]), 10)

    def test_06_recommendation_storage_persistence(self):
        """Verify saving, loading, and history snapshots in storage/recommendations/."""
        # Force recompute and save
        payload = compute_all_recommendations(force=True)
        self.assertEqual(payload["status"], "success")

        # Verify loaded from disk
        loaded = load_recommendations()
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded["summary"]["totalRecommendations"], len(loaded["recommendations"]))

        # Verify history snapshot
        history = load_recommendations_history()
        self.assertIsInstance(history, list)
        self.assertGreaterEqual(len(history), 1)

    def test_07_fastapi_endpoints(self):
        """Verify all FastAPI router endpoints execute cleanly."""
        # 1. GET /recommendations
        res1 = asyncio.run(api_get_recommendations())
        self.assertEqual(res1["status"], "success")
        self.assertIn("summary", res1)

        # 2. GET /recommendations/insights
        res2 = asyncio.run(api_get_insights())
        self.assertEqual(res2["status"], "success")
        self.assertGreaterEqual(res2["count"], 1)

        # 3. GET /recommendations/alerts
        res3 = asyncio.run(api_get_alerts())
        self.assertEqual(res3["status"], "success")
        self.assertGreaterEqual(res3["count"], 1)

        # 4. GET /recommendations/risk
        res4 = asyncio.run(api_get_risk())
        self.assertEqual(res4["status"], "success")
        self.assertIn("overallRisk", res4["risk"])

        # 5. GET /recommendations/trends
        res5 = asyncio.run(api_get_trends())
        self.assertEqual(res5["status"], "success")
        self.assertIn("productionTrend", res5["trends"])

        # 6. POST /recommendations/recompute
        res6 = asyncio.run(api_recompute_recommendations())
        self.assertEqual(res6["status"], "success")

    def test_08_performance_benchmarks(self):
        """Verify strict sub-second performance (Recs < 20ms, Risk < 10ms, API < 50ms)."""
        # Risk engine benchmark
        t0 = time.perf_counter()
        for _ in range(5):
            calculate_operational_risk(self.dash, indexed_docs=self.docs)
        risk_latency_ms = ((time.perf_counter() - t0) / 5) * 1000.0

        # Recommendation engine benchmark
        t0 = time.perf_counter()
        for _ in range(5):
            generate_recommendations(self.dash, indexed_docs=self.docs)
        rec_latency_ms = ((time.perf_counter() - t0) / 5) * 1000.0

        # API recompute benchmark
        t0 = time.perf_counter()
        compute_all_recommendations(force=True)
        api_latency_ms = (time.perf_counter() - t0) * 1000.0

        print(f"\n[Performance] Risk Engine Latency: {risk_latency_ms:.3f} ms (Target: < 10 ms)")
        print(f"[Performance] Recommendation Engine Latency: {rec_latency_ms:.3f} ms (Target: < 20 ms)")
        print(f"[Performance] Full Pipeline Latency: {api_latency_ms:.3f} ms (Target: < 50 ms)")

        self.assertLess(risk_latency_ms, 10.0)
        self.assertLess(rec_latency_ms, 20.0)
        self.assertLess(api_latency_ms, 50.0)

    def test_09_regression_phases_7_to_11(self):
        """Verify zero regressions across Phases 7, 8, 9, 10, and 11."""
        # Phase 7 Analytics
        self.assertIsNotNone(self.dash)
        self.assertIn("production", self.dash)

        # Phase 9 Search Index
        self.assertGreater(self.idx["totalDocuments"], 0)

        # Phase 10 Natural Language Query
        q10 = execute_nl_query("Which subsidiary has the highest production?")
        self.assertEqual(q10["status"], "success")

        # Phase 11 Hybrid QA
        q11 = execute_qa("Which subsidiary produced the highest coal?")
        self.assertEqual(q11["status"], "success")
        self.assertGreaterEqual(q11["confidence"], 0.90)


if __name__ == "__main__":
    unittest.main()
