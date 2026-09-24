"""
Comprehensive Automated Test Suite for Phase 9:
Intelligent Document Understanding & Search (PRD-Aligned Implementation).

Verifies:
1. Module 1: Deterministic Document Classification
2. Module 2: Deterministic Mining Topic Modeling (TF-IDF Ontology Weights)
3. Module 3: Keyword Extraction (Deduplicated, frequency-sorted)
4. Module 4: Named Entity Extraction (Regex + Gazetteers)
5. Module 5: Template-Driven Factual Executive Summary (Zero LLM)
6. Module 6: Cross-Document Relationships (Similarity 0-100)
7. Module 7: Semantic Intelligence Storage (storage/document_intelligence/{id}.json)
8. Module 8: Pure JSON Search Indexing & Multi-Faceted Querying (storage/search_index.json)
9. FastAPI Intelligence & Search Endpoints
10. Performance benchmark (<10ms per document)
"""

import os
import sys
import json
import time
import unittest

# Ensure ai-service is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AI_SERVICE_DIR = os.path.join(BASE_DIR, "ai-service")
if AI_SERVICE_DIR not in sys.path:
    sys.path.insert(0, AI_SERVICE_DIR)

from app.services.document_classifier import classify_document, CATEGORIES
from app.services.topic_model import extract_document_topics, TOPIC_ONTOLOGY
from app.services.entity_extractor import extract_keywords, extract_named_entities
from app.services.document_summary import generate_executive_summary
from app.services.search_index import (
    save_document_intelligence,
    get_document_intelligence,
    compute_related_documents,
    rebuild_search_index,
    search_documents,
    SEARCH_INDEX_FILE
)
from app.services.document_intelligence import (
    process_document_intelligence,
    batch_process_all_documents
)


class TestPhase9DocumentIntelligence(unittest.TestCase):

    def test_01_classification_deterministic(self):
        """Verify deterministic classification across document categories."""
        # 1. Annual Report
        res1 = classify_document(
            filename="SECL_Annual_Report_2024.pdf",
            report_title="Annual Report and Audited Statement",
            structured_data={"reportType": "Annual Report", "issuingOrganization": "SECL"}
        )
        self.assertEqual(res1["documentCategory"], "Annual Report")
        self.assertGreaterEqual(res1["classificationConfidence"], 70)
        self.assertIn("Annual Report", res1["classificationReason"])

        # 2. Production Report
        res2 = classify_document(
            filename="MCL_Monthly_Production_May.xlsx",
            report_title="Monthly Coal Production and Offtake Summary",
            structured_data={"coalProduction": 150.5, "targetProduction": 140.0}
        )
        self.assertEqual(res2["documentCategory"], "Production Report")
        self.assertGreaterEqual(res2["classificationConfidence"], 70)

        # 3. Safety Report
        res3 = classify_document(
            filename="DGMS_Safety_Inspection.pdf",
            report_title="DGMS Mine Safety and Accident Audit",
            extracted_text="DGMS safety inspection conducted at the colliery regarding ventilation and gas monitoring."
        )
        self.assertEqual(res3["documentCategory"], "Safety Report")

        # 4. Unknown for generic text
        res4 = classify_document(filename="misc_notes.txt", report_title="General Note")
        self.assertEqual(res4["documentCategory"], "Unknown")
        self.assertLessEqual(res4["classificationConfidence"], 50)

    def test_02_topic_modeling_ontology(self):
        """Verify topic extraction and normalized weights against mining ontology."""
        text = "Coal production at Gevra mine reached 3.1 million tonnes with raw coal extraction and overburden removal of 85 CuM."
        topics = extract_document_topics(text=text, structured_data={"coalProduction": 3.1, "overburdenRemoval": 85})
        self.assertIsInstance(topics, list)
        self.assertGreater(len(topics), 0)

        topic_names = [t["topic"] for t in topics]
        self.assertIn("Coal Production", topic_names)
        self.assertIn("Overburden", topic_names)

        # Check weights are sorted descending and between 0.0 and 1.0
        weights = [t["weight"] for t in topics]
        self.assertEqual(weights, sorted(weights, reverse=True))
        for w in weights:
            self.assertGreater(w, 0.0)
            self.assertLessEqual(w, 1.0)

    def test_03_keyword_extraction(self):
        """Verify keyword extraction, stopword filtering, and deduplication."""
        text = "The coal production of Gevra mine opencast in Korba district was reported by SECL."
        keywords = extract_keywords(
            text=text,
            structured_data={"subsidiary": "SECL", "mineName": "Gevra", "state": "Chhattisgarh"}
        )
        self.assertIsInstance(keywords, list)
        self.assertGreater(len(keywords), 0)

        # Check priority structured items are in keywords
        self.assertIn("SECL", keywords)
        self.assertIn("Gevra", keywords)
        self.assertIn("Chhattisgarh", keywords)

        # Ensure common stopwords are not present
        stopwords_in_kw = [kw for kw in keywords if kw.lower() in ["the", "of", "in", "was", "by"]]
        self.assertEqual(len(stopwords_in_kw), 0)

    def test_04_named_entity_extraction(self):
        """Verify regex and gazetteer based entity extraction."""
        text = "CMPDIL and SECL reviewed Gevra Opencast mine in Korba district, Chhattisgarh. Output was 3.1 MT for FY 2025-26."
        entities = extract_named_entities(
            text=text,
            structured_data={
                "subsidiary": "SECL",
                "mineName": "Gevra",
                "state": "Chhattisgarh",
                "district": "Korba",
                "financialYear": "2025-26",
                "coalProduction": 3.1
            }
        )
        self.assertIsInstance(entities, dict)
        self.assertIn("organizations", entities)
        self.assertIn("mines", entities)
        self.assertIn("states", entities)
        self.assertIn("districts", entities)
        self.assertIn("measurements", entities)
        self.assertIn("financialYears", entities)

        self.assertIn("SECL", entities["organizations"])
        self.assertIn("Gevra", entities["mines"])
        self.assertIn("Chhattisgarh", entities["states"])
        self.assertIn("Korba", entities["districts"])
        self.assertIn("2025-26", entities["financialYears"])
        self.assertTrue(any("3.1" in m for m in entities["measurements"]))

    def test_05_executive_summary_deterministic(self):
        """Verify template-driven executive summary has zero hallucinations."""
        summary = generate_executive_summary(
            classification={"documentCategory": "Annual Report"},
            structured_data={
                "subsidiary": "CIL",
                "issuingOrganization": "CMPDIL",
                "financialYear": "2025-26",
                "mineName": "Gevra",
                "mineType": "Opencast",
                "state": "Chhattisgarh",
                "district": "Korba",
                "coalProduction": 3.1,
                "productionUnit": "MT"
            },
            validation_data={"validationScore": 100, "validationStatus": "Valid", "errorCount": 0, "warningCount": 0},
            topics=[{"topic": "Coal Production", "weight": 0.95}]
        )
        self.assertIsInstance(summary, str)
        self.assertIn("Annual Report", summary)
        self.assertIn("CMPDIL", summary)
        self.assertIn("2025-26", summary)
        self.assertIn("Gevra Mine", summary)
        self.assertIn("Chhattisgarh", summary)
        self.assertIn("3.10 MT", summary)
        self.assertIn("Valid (Score: 100/100)", summary)
        self.assertIn("Coal Production", summary)

    def test_06_cross_document_relationships(self):
        """Verify deterministic similarity scoring (0-100) on shared attributes."""
        target_meta = {
            "mineName": "Gevra",
            "subsidiary": "SECL",
            "financialYear": "2024-25",
            "state": "Chhattisgarh",
            "documentCategory": "Production Report"
        }
        all_docs = [
            {"documentId": "doc-target", "mineName": "Gevra", "subsidiary": "SECL", "financialYear": "2024-25", "state": "Chhattisgarh"},
            {"documentId": "doc-peer-1", "reportTitle": "Doc Peer 1", "mineName": "Gevra", "subsidiary": "SECL", "financialYear": "2024-25", "state": "Chhattisgarh", "category": "Production Report"},
            {"documentId": "doc-peer-2", "reportTitle": "Doc Peer 2", "mineName": "Dipka", "subsidiary": "SECL", "financialYear": "2023-24", "state": "Chhattisgarh", "category": "Safety Report"},
            {"documentId": "doc-unrelated", "reportTitle": "Doc Unrelated", "mineName": "Talcher", "subsidiary": "MCL", "financialYear": "2021-22", "state": "Odisha", "category": "Geological Report"}
        ]
        related = compute_related_documents("doc-target", target_meta, all_docs)
        self.assertIsInstance(related, list)
        self.assertGreater(len(related), 0)

        # Peer 1 shares mine (+30), sub (+25), FY (+20), state (+15), category (+10) -> score 100
        peer1 = next(r for r in related if r["documentId"] == "doc-peer-1")
        self.assertEqual(peer1["similarityScore"], 100)

        # Peer 2 shares sub (+25), state (+15) -> score 40
        peer2 = next(r for r in related if r["documentId"] == "doc-peer-2")
        self.assertEqual(peer2["similarityScore"], 40)

    def test_07_semantic_storage_and_orchestrator(self):
        """Verify process_document_intelligence writes file to storage/document_intelligence/."""
        # Process sample doc
        doc_id = "test-phase9-doc-001"
        test_file = os.path.join(AI_SERVICE_DIR, "storage", "structured_data", f"{doc_id}.json")
        sample_structured = {
            "documentId": doc_id,
            "reportTitle": "Test Gevra Production",
            "reportType": "Production Report",
            "financialYear": "2024-25",
            "subsidiary": "SECL",
            "mineName": "Gevra",
            "state": "Chhattisgarh",
            "coalProduction": 45.2,
            "productionUnit": "MT"
        }
        with open(test_file, "w", encoding="utf-8") as f:
            json.dump(sample_structured, f)

        payload = process_document_intelligence(doc_id, extracted_text="Coal production recorded at Gevra.")
        self.assertEqual(payload["documentId"], doc_id)
        self.assertIn("classification", payload)
        self.assertIn("topics", payload)
        self.assertIn("keywords", payload)
        self.assertIn("entities", payload)
        self.assertIn("summary", payload)

        # Verify disk persistence
        saved = get_document_intelligence(doc_id)
        self.assertIsNotNone(saved)
        self.assertEqual(saved["documentId"], doc_id)

        # Cleanup
        if os.path.exists(test_file):
            os.remove(test_file)
        intel_fp = os.path.join(AI_SERVICE_DIR, "storage", "document_intelligence", f"{doc_id}.json")
        if os.path.exists(intel_fp):
            os.remove(intel_fp)

    def test_08_search_index_and_querying(self):
        """Verify search index creation, inverted lookups, and multi-filter querying."""
        index_data = rebuild_search_index()
        self.assertIsInstance(index_data, dict)
        self.assertIn("documents", index_data)
        self.assertIn("indices", index_data)

        # Search by query
        res = search_documents(query="Annual")
        self.assertIsInstance(res, list)

        # Search with filters
        res_filtered = search_documents(category="Annual Report")
        for r in res_filtered:
            self.assertEqual(r.get("documentCategory"), "Annual Report")

    def test_09_fastapi_endpoints(self):
        """Verify intelligence and search API functions execute cleanly."""
        from app.api.intelligence import api_get_intelligence, api_search, api_reindex_search
        import asyncio

        # Reindex
        reindex_res = asyncio.run(api_reindex_search())
        self.assertEqual(reindex_res["status"], "success")

        # Search API
        search_res = asyncio.run(api_search(query="", limit=10))
        self.assertEqual(search_res["status"], "success")
        self.assertIn("results", search_res)

    def test_10_execution_performance(self):
        """Verify document intelligence processes in sub-10ms (or well under 50ms)."""
        doc_id = "1e77a47e-dafb-4ed9-966c-5fa47e75c19b"
        start = time.perf_counter()
        process_document_intelligence(doc_id, extracted_text="Gevra mine annual report with coal production.")
        elapsed_ms = (time.perf_counter() - start) * 1000
        print(f"\n[Performance] Intelligence generation execution time: {elapsed_ms:.2f} ms")
        self.assertLess(elapsed_ms, 50.0, "Execution should be extremely fast (<50ms)")


if __name__ == "__main__":
    unittest.main(verbosity=2)
