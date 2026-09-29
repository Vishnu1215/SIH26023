import os
import sys
import json
import glob

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from app.database import get_sync_db

db = get_sync_db()
files = glob.glob(os.path.join(parent_dir, "storage", "document_intelligence", "*.json"))
updated = 0

for f in files:
    try:
        with open(f, "r", encoding="utf-8") as jf:
            data = json.load(jf)
        doc_id = data.get("documentId")
        topics = [t["topic"] for t in data.get("topics", []) if "topic" in t]
        summary = data.get("summary", "")
        entities = data.get("entities", {})
        if doc_id:
            db["structured_records"].update_one(
                {"documentId": doc_id},
                {"$set": {
                    "extractedTopics": topics,
                    "summary": summary,
                    "entities": entities
                }}
            )
            db["documents"].update_one(
                {"documentId": doc_id},
                {"$set": {
                    "summary": summary
                }}
            )
            if summary:
                db["rag_chunks"].update_one(
                    {"documentId": doc_id, "chunkNumber": 1},
                    {"$set": {"text": summary}},
                    upsert=True
                )
            updated += 1
    except Exception as e:
        print("Error processing", f, e)

print(f"Synchronized {updated} document intelligence records into MongoDB Atlas!")
