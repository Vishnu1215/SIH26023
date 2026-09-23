import os
import sys
import json
import shutil
import tempfile

# Add ai-service to path
AI_SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ai-service"))
if AI_SERVICE_DIR not in sys.path:
    sys.path.insert(0, AI_SERVICE_DIR)

from app.services.analytics_engine import generate_dashboard_summary
from app.services import analytics_storage

def run_tests():
    print("==================================================================")
    print("RUNNING PHASE 7 ANALYTICS ENGINE TEST SUITE")
    print("==================================================================")

    # 1. Prepare sample structured records and validation results
    mock_records = [
        {
            "documentId": "doc-001",
            "fileName": "SECL_Q1_2023.pdf",
            "fileType": "pdf",
            "category": "Production Report",
            "fileHash": "hash111",
            "confidence": 94.5,
            "status": "Completed",
            "structuredData": {
                "subsidiary": "SECL",
                "mineName": "Dipka OCP",
                "state": "Chhattisgarh",
                "financialYear": "2023-24",
                "coalProduction": 150.5,
                "targetProduction": 140.0,
                "overburdenRemoval": 85.0
            },
            "validation": {
                "status": "Valid",
                "score": 95,
                "errors": [],
                "warnings": ["VAL006"]
            }
        },
        {
            "documentId": "doc-002",
            "fileName": "MCL_Annual_2023.xlsx",
            "fileType": "xlsx",
            "category": "Annual Performance",
            "fileHash": "hash222",
            "confidence": 98.0,
            "status": "Completed",
            "structuredData": {
                "subsidiary": "MCL",
                "mineName": "Lakhanpur",
                "state": "Odisha",
                "financialYear": "2023-24",
                "coalProduction": 180.0,
                "targetProduction": 170.0,
                "overburdenRemoval": 95.0
            },
            "validation": {
                "status": "Valid",
                "score": 100,
                "errors": [],
                "warnings": []
            }
        },
        {
            "documentId": "doc-003",
            "fileName": "ECL_Report_2022.docx",
            "fileType": "docx",
            "category": "Monthly Report",
            "fileHash": "hash333",
            "confidence": 91.0,
            "status": "Completed",
            "structuredData": {
                "subsidiary": "ECL",
                "mineName": "Rajmahal",
                "state": "Jharkhand",
                "financialYear": "2022-23",
                "coalProduction": 80.0,
                "targetProduction": 90.0,
                "overburdenRemoval": 40.0
            },
            "validation": {
                "status": "Warning",
                "score": 75,
                "errors": [],
                "warnings": ["VAL006", "VAL008"]
            }
        },
        {
            "documentId": "doc-004",
            "fileName": "NCL_Audit_2022.pdf",
            "fileType": "pdf",
            "category": "Audit Report",
            "fileHash": "hash444",
            "confidence": 65.0,
            "status": "Completed",
            "structuredData": {
                "subsidiary": "NCL",
                "mineName": "Jayant",
                "state": "Madhya Pradesh",
                "financialYear": "2022-23",
                "coalProduction": 120.0,
                "targetProduction": 120.0,
                "overburdenRemoval": 60.0
            },
            "validation": {
                "status": "Error",
                "score": 40,
                "errors": ["VAL001"],
                "warnings": ["VAL009"]
            }
        }
    ]

    # Temporary directory for isolated testing
    temp_dir = tempfile.mkdtemp()
    temp_structured = os.path.join(temp_dir, "structured_data")
    temp_validation = os.path.join(temp_dir, "validation")
    temp_analytics = os.path.join(temp_dir, "analytics")
    os.makedirs(temp_structured)
    os.makedirs(temp_validation)
    os.makedirs(temp_analytics)

    # Save mock files
    for doc in mock_records:
        did = doc["documentId"]
        if doc["structuredData"]:
            with open(os.path.join(temp_structured, f"{did}.json"), "w", encoding="utf-8") as f:
                json.dump({
                    "documentId": did,
                    "fileName": doc["fileName"],
                    "fileType": doc["fileType"],
                    "category": doc["category"],
                    "status": doc["status"],
                    "confidence": doc["confidence"],
                    "fileHash": doc["fileHash"],
                    "data": doc["structuredData"]
                }, f)

        if doc["validation"]:
            with open(os.path.join(temp_validation, f"{did}.json"), "w", encoding="utf-8") as f:
                json.dump({
                    "documentId": did,
                    "validationStatus": doc["validation"]["status"],
                    "validationScore": doc["validation"]["score"],
                    "errorCount": len(doc["validation"]["errors"]),
                    "warningCount": len(doc["validation"]["warnings"]),
                    "validationMessages": [{"rule": r, "severity": "Warning"} for r in doc["validation"]["warnings"]] +
                                         [{"rule": r, "severity": "Error"} for r in doc["validation"]["errors"]],
                    "validationTime": 0.012
                }, f)

    try:
        # Generate dashboard summary
        dashboard = generate_dashboard_summary(
            structured_dir=temp_structured,
            validation_dir=temp_validation,
            save=True,
            storage_dir=temp_analytics
        )

        print("[OK] 1. Dashboard summary generated successfully!")
        
        # Test Top-level Metadata
        assert dashboard["analyticsVersion"] == 1, "analyticsVersion should be 1"
        assert dashboard["documentsProcessed"] == 4, f"Expected 4 processed docs, got {dashboard['documentsProcessed']}"
        assert "generatedAt" in dashboard, "Missing generatedAt timestamp"
        print("  [OK] Metadata and timestamp verified")

        # Test Module 1: Production Analytics
        prod = dashboard["production"]
        assert prod["totalCoalProduction"] == 530.5, f"Expected 530.5, got {prod['totalCoalProduction']}"
        assert prod["totalTargetProduction"] == 520.0, f"Expected 520.0, got {prod['totalTargetProduction']}"
        assert prod["highestProduction"] == 180.0, f"Expected 180.0, got {prod['highestProduction']}"
        assert prod["lowestProduction"] == 80.0, f"Expected 80.0, got {prod['lowestProduction']}"
        assert prod["averageProduction"] == 132.62, f"Expected 132.62, got {prod['averageProduction']}"
        expected_achieve = round((530.5 / 520.0) * 100, 1)
        assert prod["productionAchievementPct"] == expected_achieve, f"Expected {expected_achieve}, got {prod['productionAchievementPct']}"
        print(f"  [OK] Module 1 Production Analytics verified (Total: {prod['totalCoalProduction']} MT, Achievement: {prod['productionAchievementPct']}%)")

        # Test Module 2: Subsidiary Analytics & Leaderboard
        sub_list = dashboard["subsidiaries"]
        assert len(sub_list) == 4, f"Expected 4 subsidiaries, got {len(sub_list)}"
        # Check rank ordering (MCL highest production 180, SECL 150.5, NCL 120, ECL 80)
        assert sub_list[0]["subsidiary"] == "MCL" and sub_list[0]["rank"] == 1, "MCL should be rank 1"
        assert sub_list[1]["subsidiary"] == "SECL" and sub_list[1]["rank"] == 2, "SECL should be rank 2"
        assert sub_list[2]["subsidiary"] == "NCL" and sub_list[2]["rank"] == 3, "NCL should be rank 3"
        assert sub_list[3]["subsidiary"] == "ECL" and sub_list[3]["rank"] == 4, "ECL should be rank 4"
        print("  [OK] Module 2 Subsidiary Analytics & Deterministic Ranking verified")

        # Test Module 3: State Analytics
        state_list = dashboard["states"]
        assert len(state_list) == 4, f"Expected 4 states, got {len(state_list)}"
        assert state_list[0]["state"] == "Odisha" and state_list[0]["rank"] == 1, "Odisha should be rank 1 (180 MT)"
        print("  [OK] Module 3 State Analytics verified")

        # Test Module 4: Financial Year Analytics
        fy_list = dashboard["financialYears"]
        assert len(fy_list) == 2, f"Expected 2 FYs, got {len(fy_list)}"
        assert fy_list[0]["financialYear"] == "2022-23", "2022-23 should be sorted first"
        assert fy_list[1]["financialYear"] == "2023-24", "2023-24 should be sorted second"
        assert fy_list[0]["production"] == 200.0, f"Expected 200.0 for 22-23, got {fy_list[0]['production']}"
        assert fy_list[1]["production"] == 330.5, f"Expected 330.5 for 23-24, got {fy_list[1]['production']}"
        print("  [OK] Module 4 Financial Year Chronological Analytics verified")

        # Test Module 5: Validation Analytics
        val = dashboard["validation"]
        assert val["totalValidated"] == 4, f"Expected 4 validated, got {val['totalValidated']}"
        assert val["validDocuments"] == 2, f"Expected 2 valid, got {val['validDocuments']}"
        assert val["warningDocuments"] == 1, f"Expected 1 warning, got {val['warningDocuments']}"
        assert val["errorDocuments"] == 1, f"Expected 1 error, got {val['errorDocuments']}"
        assert val["validationAccuracy"] == 50.0, f"Expected 50.0% valid, got {val['validationAccuracy']}"
        assert val["averageValidationScore"] == 77.5, f"Expected 77.5 average score, got {val['averageValidationScore']}"
        print("  [OK] Module 5 Validation Health Analytics verified")

        # Test Module 6: Document Analytics
        doc_stats = dashboard["documents"]
        assert doc_stats["documentsUploaded"] == 4, f"Expected 4 docs, got {doc_stats['documentsUploaded']}"
        assert doc_stats["fileTypes"]["pdf"] == 2
        assert doc_stats["fileTypes"]["xlsx"] == 1
        assert doc_stats["fileTypes"]["docx"] == 1
        print("  [OK] Module 6 Document Type Distribution verified")

        # Test Module 7: Top Performers Ranking
        top = dashboard["rankings"]
        assert top["topSubsidiaries"][0]["subsidiary"] == "MCL"
        assert top["topMines"][0]["mineName"] == "Lakhanpur"
        assert top["topMines"][0]["production"] == 180.0
        print("  [OK] Module 7 Top Performers verified")

        # Test Module 8: Data Quality Analytics
        dq = dashboard["quality"]
        assert dq["failedValidationPercentage"] == 25.0, "Expected 25% failed validation"
        print("  [OK] Module 8 Data Quality Analytics verified")

        # Test Storage (Single Source of Truth)
        saved_file = os.path.join(temp_analytics, "dashboard.json")
        assert os.path.exists(saved_file), "dashboard.json was not persisted"
        loaded = analytics_storage.load_dashboard(storage_dir=temp_analytics)
        assert loaded["analyticsVersion"] == 1
        assert loaded["production"]["totalCoalProduction"] == 530.5
        print("  [OK] Persistent dashboard.json single-source-of-truth loading verified")

        # Test Ready-to-plot chart arrays
        assert "charts" in dashboard
        assert len(dashboard["charts"]["productionTrend"]) == 2
        assert len(dashboard["charts"]["subsidiaryDistribution"]) == 4
        print("  [OK] Future-proof Chart arrays verified")

        print("==================================================================")
        print("ALL PHASE 7 TESTS PASSED SUCCESSFULLY!")
        print("==================================================================")
        return True
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
