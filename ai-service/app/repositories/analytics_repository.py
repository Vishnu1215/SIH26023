from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_db

class AnalyticsRepository:
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self._db = db

    @property
    def db(self) -> AsyncIOMotorDatabase:
        return self._db if self._db is not None else get_db()

    @property
    def collection(self):
        return self.db["analytics"]

    async def upsert_document_analytics(
        self,
        document_id: str,
        production_summary: Optional[Dict[str, Any]] = None,
        compliance: Optional[Dict[str, Any]] = None,
        quality_score: Optional[float] = None,
        dashboard_metrics: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Insert or update single document analytics record."""
        payload = {
            "documentId": document_id,
            "type": "document",
            "productionSummary": production_summary or {},
            "compliance": compliance or {},
            "qualityScore": quality_score if quality_score is not None else 100.0,
            "dashboardMetrics": dashboard_metrics or {},
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
        await self.collection.update_one(
            {"documentId": document_id, "type": "document"},
            {"$set": payload},
            upsert=True
        )
        return payload

    async def upsert_consolidated_dashboard(self, dashboard_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save aggregated platform-wide dashboard cache in MongoDB."""
        clean = dict(dashboard_data)
        clean["documentId"] = "consolidated_dashboard"
        clean["type"] = "consolidated"
        clean["updatedAt"] = datetime.now(timezone.utc).isoformat()

        await self.collection.update_one(
            {"documentId": "consolidated_dashboard", "type": "consolidated"},
            {"$set": clean},
            upsert=True
        )
        return clean

    async def get_consolidated_dashboard(self) -> Optional[Dict[str, Any]]:
        """Retrieve aggregated platform dashboard from MongoDB."""
        return await self.collection.find_one(
            {"documentId": "consolidated_dashboard", "type": "consolidated"},
            {"_id": 0}
        )

    async def get_document_analytics(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve analytics for a specific document."""
        return await self.collection.find_one(
            {"documentId": document_id, "type": "document"},
            {"_id": 0}
        )

    async def calculate_dynamic_metrics(self) -> Dict[str, Any]:
        """
        Dynamically calculates dashboard metrics directly from MongoDB collections:
        - Total Documents
        - Average Validation Score
        - Average Processing Time
        - Valid / Warning / Error Records
        - Documents by Category
        - Documents by Subsidiary
        - Documents by State
        - Topic Distribution
        - Report Types
        - Recent Uploads
        """
        docs_col = self.db["documents"]
        val_col = self.db["validation_results"]
        struct_col = self.db["structured_records"]
        ocr_col = self.db["ocr_results"]

        # 1. Total Documents
        total_docs = await docs_col.count_documents({})

        # 2. Validation aggregates
        val_pipeline = [
            {
                "$group": {
                    "_id": None,
                    "avgScore": {"$avg": "$score"},
                    "validCount": {"$sum": {"$cond": [{"$eq": ["$status", "Valid"]}, 1, 0]}},
                    "warningCount": {"$sum": {"$cond": [{"$eq": ["$status", "Warning"]}, 1, 0]}},
                    "errorCount": {"$sum": {"$cond": [{"$eq": ["$status", "Error"]}, 1, 0]}}
                }
            }
        ]
        val_agg = await val_col.aggregate(val_pipeline).to_list(1)
        avg_score = round(val_agg[0]["avgScore"], 1) if val_agg and val_agg[0].get("avgScore") is not None else 100.0
        valid_records = val_agg[0]["validCount"] if val_agg else 0
        warning_records = val_agg[0]["warningCount"] if val_agg else 0
        error_records = val_agg[0]["errorCount"] if val_agg else 0

        # 3. Average processing time
        ocr_pipeline = [
            {"$group": {"_id": None, "avgProcessingTime": {"$avg": "$processingTime"}}}
        ]
        ocr_agg = await ocr_col.aggregate(ocr_pipeline).to_list(1)
        avg_proc_time = round(ocr_agg[0]["avgProcessingTime"], 2) if ocr_agg and ocr_agg[0].get("avgProcessingTime") is not None else 0.0

        # 4. Documents by Subsidiary
        sub_pipeline = [
            {"$match": {"subsidiary": {"$ne": None, "$ne": ""}}},
            {"$group": {"_id": "$subsidiary", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        subsidiary_list = await docs_col.aggregate(sub_pipeline).to_list(20)
        docs_by_subsidiary = {item["_id"]: item["count"] for item in subsidiary_list}

        # 5. Documents by Category
        cat_pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        cat_list = await docs_col.aggregate(cat_pipeline).to_list(20)
        docs_by_category = {item["_id"]: item["count"] for item in cat_list}

        # 6. Documents by State
        state_pipeline = [
            {"$match": {"state": {"$ne": None, "$ne": ""}}},
            {"$group": {"_id": "$state", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        state_list = await docs_col.aggregate(state_pipeline).to_list(20)
        docs_by_state = {item["_id"]: item["count"] for item in state_list}

        # 7. Recent Uploads (newest 10)
        recent_cursor = docs_col.find({}, {"_id": 0}).sort("uploadTime", -1).limit(10)
        recent_uploads = await recent_cursor.to_list(10)

        # 8. Topic distribution from structured records
        topic_pipeline = [
            {"$unwind": "$extractedTopics"},
            {"$group": {"_id": "$extractedTopics", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 15}
        ]
        topic_list = await struct_col.aggregate(topic_pipeline).to_list(15)
        topic_distribution = {item["_id"]: item["count"] for item in topic_list}

        return {
            "totalDocuments": total_docs,
            "averageValidationScore": avg_score,
            "averageProcessingTime": avg_proc_time,
            "validRecords": valid_records,
            "warningRecords": warning_records,
            "errorRecords": error_records,
            "documentsBySubsidiary": docs_by_subsidiary,
            "documentsByCategory": docs_by_category,
            "documentsByState": docs_by_state,
            "topicDistribution": topic_distribution,
            "recentUploads": recent_uploads,
            "calculatedAt": datetime.now(timezone.utc).isoformat()
        }


def get_analytics_repository() -> AnalyticsRepository:
    return AnalyticsRepository()
