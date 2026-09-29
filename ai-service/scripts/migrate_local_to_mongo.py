"""
Data Migration Script: Migrate from local JSON / text storage to MongoDB Atlas.
Populates:
- documents
- ocr_results
- structured_records
- validation_results
- analytics
- rag_chunks
- chat_history
"""

import os
import sys
import json
import glob
import re
from datetime import datetime, timezone

# Add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(os.path.join(parent_dir, ".env"))

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "coal_portal")

if not MONGODB_URI:
    print("ERROR: MONGODB_URI not set in environment!")
    sys.exit(1)

print(f"Connecting to MongoDB Atlas (DB: {DATABASE_NAME})...")
client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=15000)
db = client[DATABASE_NAME]

# Ping check
db.command("ping")
print("Connected successfully to MongoDB Atlas!")

STORAGE_DIR = os.path.join(parent_dir, "storage")
BASE_DIR = os.path.dirname(parent_dir)
SAMPLE_DATA_DIR = os.path.join(BASE_DIR, "sample-data")

def generate_embedding(text, dim=128):
    if not text:
        return [0.0] * dim
    vec = [0.0] * dim
    words = re.findall(r'\b\w+\b', text.lower())
    if not words:
        return [0.0] * dim
    for w in words:
        h = 0
        for char in w:
            h = (h * 31 + ord(char)) % 1000000007
        vec[h % dim] += 1.0
    import math
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [round(x / norm, 6) for x in vec]
    return vec

# 1. Migrate Structured Data & Linked Documents
structured_files = glob.glob(os.path.join(STORAGE_DIR, "structured_data", "*.json"))
print(f"Found {len(structured_files)} structured data files to migrate.")

for s_path in structured_files:
    fname = os.path.basename(s_path)
    if fname.startswith("."):
        continue
    doc_id = os.path.splitext(fname)[0]

    with open(s_path, "r", encoding="utf-8") as f:
        s_data = json.load(f)

    meta = s_data.get("metadata", {})
    filename = s_data.get("fileName") or meta.get("fileName") or f"{doc_id}.pdf"
    subsidiary = meta.get("subsidiary") or s_data.get("subsidiary") or "CIL"
    fy = meta.get("financialYear") or s_data.get("financialYear") or "FY 2023-24"
    mine = meta.get("mine") or meta.get("mineName") or s_data.get("mineName")
    category = meta.get("category") or s_data.get("category") or "01_production"
    topics = s_data.get("topics") or s_data.get("extractedTopics") or []
    summary = s_data.get("summary") or meta.get("summary") or ""

    # Upsert structured_records
    db["structured_records"].update_one(
        {"documentId": doc_id},
        {"$set": {
            "documentId": doc_id,
            "normalizedJson": s_data.get("normalizedJson") or s_data.get("tables") or {},
            "entities": s_data.get("entities") or meta.get("entities") or {},
            "extractedTopics": topics,
            "metadata": meta,
            "summary": summary,
            "extractedAt": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )

    # 2. OCR text
    text_path = os.path.join(STORAGE_DIR, "extracted_text", f"{doc_id}.txt")
    extracted_text = ""
    if os.path.exists(text_path):
        with open(text_path, "r", encoding="utf-8") as tf:
            extracted_text = tf.read()

    db["ocr_results"].update_one(
        {"documentId": doc_id},
        {"$set": {
            "documentId": doc_id,
            "pages": meta.get("pageCount", 1),
            "extractedText": extracted_text,
            "language": meta.get("language", "eng"),
            "processingTime": meta.get("processingTime", 1.2),
            "ocrEngine": "PyMuPDF + Tesseract OCR",
            "extractedAt": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )

    # 3. Validation results
    val_path = os.path.join(STORAGE_DIR, "validation", f"{doc_id}.json")
    val_data = {}
    if os.path.exists(val_path):
        with open(val_path, "r", encoding="utf-8") as vf:
            val_data = json.load(vf)

    db["validation_results"].update_one(
        {"documentId": doc_id},
        {"$set": {
            "documentId": doc_id,
            "score": val_data.get("validationScore", 100),
            "status": val_data.get("validationStatus", "Valid"),
            "errors": val_data.get("errorCount", 0),
            "warnings": val_data.get("warningCount", 0),
            "validationMessages": val_data.get("validationMessages", []),
            "executedRules": val_data.get("rulesTriggered", []),
            "timestamp": val_data.get("validatedAt") or datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )

    # 4. Insert or update into documents collection
    db["documents"].update_one(
        {"documentId": doc_id},
        {"$set": {
            "documentId": doc_id,
            "fileName": filename,
            "originalName": filename,
            "storedName": filename,
            "uploadTime": meta.get("uploadedAt") or datetime.now(timezone.utc).isoformat(),
            "reportType": meta.get("reportType", "Production Report"),
            "financialYear": fy,
            "issuingOrganization": meta.get("issuingOrganization", "Ministry of Coal"),
            "subsidiary": subsidiary,
            "mineName": mine,
            "mineType": meta.get("mineType", "Open Cast / Mixed"),
            "state": meta.get("state", "National"),
            "district": meta.get("district"),
            "category": category,
            "status": "Validated",
            "filePath": meta.get("filePath"),
            "sha256": meta.get("fileHash"),
            "uploadStatus": "Success",
            "validationScore": val_data.get("validationScore", 100),
            "validationStatus": val_data.get("validationStatus", "Valid")
        }},
        upsert=True
    )

    # 5. Create RAG Chunks
    chunks = []
    # Summary chunk
    if summary:
        chunks.append({
            "documentId": doc_id,
            "chunkNumber": 1,
            "text": summary,
            "embedding": generate_embedding(summary),
            "metadata": {"subsidiary": subsidiary, "section": "Executive Summary", "mine": mine, "category": category},
            "createdAt": datetime.now(timezone.utc).isoformat()
        })
    # Text snippet chunks
    if extracted_text:
        text_snippets = [extracted_text[i:i+800] for i in range(0, min(len(extracted_text), 4000), 700)]
        for c_idx, snip in enumerate(text_snippets):
            chunks.append({
                "documentId": doc_id,
                "chunkNumber": len(chunks) + 1,
                "text": snip,
                "embedding": generate_embedding(snip),
                "metadata": {"subsidiary": subsidiary, "section": f"Content Part {c_idx+1}", "mine": mine, "category": category},
                "createdAt": datetime.now(timezone.utc).isoformat()
            })

    db["rag_chunks"].delete_many({"documentId": doc_id})
    if chunks:
        db["rag_chunks"].insert_many(chunks)

print("Document and extraction migration completed.")

# 6. Migrate Analytics Dashboard
dash_path = os.path.join(STORAGE_DIR, "analytics", "dashboard.json")
if os.path.exists(dash_path):
    with open(dash_path, "r", encoding="utf-8") as df:
        dash_data = json.load(df)
    dash_data["documentId"] = "consolidated_dashboard"
    dash_data["type"] = "consolidated"
    dash_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    db["analytics"].update_one(
        {"documentId": "consolidated_dashboard", "type": "consolidated"},
        {"$set": dash_data},
        upsert=True
    )
    print("Consolidated analytics dashboard migrated to MongoDB.")

# 7. Migrate QA Chat History
qa_path = os.path.join(STORAGE_DIR, "qa_history.json")
if os.path.exists(qa_path):
    with open(qa_path, "r", encoding="utf-8") as qf:
        qa_data = json.load(qf)
    if isinstance(qa_data, list) and qa_data:
        for item in qa_data:
            item.pop("_id", None)
            db["chat_history"].update_one(
                {"question": item.get("question"), "timestamp": item.get("timestamp")},
                {"$set": item},
                upsert=True
            )
        print(f"Migrated {len(qa_data)} chat history records.")

# 8. Register sample-data files if not yet registered
if os.path.exists(SAMPLE_DATA_DIR):
    import uuid
    for root, dirs, files in os.walk(SAMPLE_DATA_DIR):
        for f in files:
            if f.endswith(('.pdf', '.docx', '.xlsx', '.csv')):
                f_path = os.path.join(root, f)
                parent_folder = os.path.basename(root).lower()
                existing = db["documents"].find_one({"fileName": f})
                if not existing:
                    new_id = str(uuid.uuid4())
                    db["documents"].insert_one({
                        "documentId": new_id,
                        "fileName": f,
                        "originalName": f,
                        "storedName": f,
                        "uploadTime": datetime.now(timezone.utc).isoformat(),
                        "reportType": "Statutory Sample Document",
                        "financialYear": "FY 2023-24",
                        "issuingOrganization": "Ministry of Coal",
                        "subsidiary": "CIL",
                        "mineName": "Sample Asset",
                        "mineType": "Mixed",
                        "state": "National",
                        "district": None,
                        "category": parent_folder,
                        "status": "Uploaded",
                        "filePath": f_path,
                        "uploadStatus": "Success",
                        "validationScore": 100,
                        "validationStatus": "Pending"
                    })

print("\n--- MongoDB Collection Summary ---")
for coll in ["documents", "ocr_results", "structured_records", "validation_results", "analytics", "rag_chunks", "chat_history", "report_reviews"]:
    cnt = db[coll].count_documents({})
    print(f"Collection '{coll}': {cnt} documents")

print("\nMigration finished successfully!")
client.close()
