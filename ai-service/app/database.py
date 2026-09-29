"""
MongoDB Atlas Async Database Connector using Motor.
Provides reusable connection pool, dependency injection, and index initialization.
"""

import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from pymongo import MongoClient
from pymongo.database import Database
from app.core.config import settings

logger = logging.getLogger("ai_service.database")

_sync_client: Optional[MongoClient] = None

def get_sync_db() -> Database:
    """Synchronous MongoDB client accessor for synchronous pipeline utilities."""
    global _sync_client
    if _sync_client is None:
        if not settings.MONGODB_URI:
            raise ValueError("MONGODB_URI is not configured.")
        _sync_client = MongoClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=10000,
            maxPoolSize=20
        )
    return _sync_client[settings.DATABASE_NAME]

class MongoManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

mongo_manager = MongoManager()

async def connect_to_mongo() -> AsyncIOMotorDatabase:
    """Initialize MongoDB Atlas async connection pool and create collections & indexes."""
    if not settings.MONGODB_URI:
        raise ValueError("MONGODB_URI environment variable is not configured.")

    logger.info("Connecting to MongoDB Atlas...")
    mongo_manager.client = AsyncIOMotorClient(
        settings.MONGODB_URI,
        serverSelectionTimeoutMS=10000,
        maxPoolSize=50,
        minPoolSize=5
    )
    mongo_manager.db = mongo_manager.client[settings.DATABASE_NAME]

    # Verify connectivity
    try:
        await mongo_manager.client.admin.command('ping')
        logger.info(f"Connected to MongoDB Atlas database: '{settings.DATABASE_NAME}' successfully.")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB Atlas: {e}", exc_info=True)
        raise

    # Create indexes for optimal query and search performance
    try:
        await _ensure_indexes(mongo_manager.db)
    except Exception as idx_err:
        logger.warning(f"Error ensuring indexes: {idx_err}")

    return mongo_manager.db


async def close_mongo_connection():
    """Close MongoDB connection pool."""
    if mongo_manager.client is not None:
        logger.info("Closing MongoDB Atlas connection...")
        mongo_manager.client.close()
        mongo_manager.client = None
        mongo_manager.db = None
        logger.info("MongoDB connection closed.")


async def _ensure_indexes(db: AsyncIOMotorDatabase):
    """Ensure indexes on all collections defined in system specifications."""
    # 1. documents collection
    await db["documents"].create_index("documentId", unique=True)
    await db["documents"].create_index([("subsidiary", 1), ("mineName", 1), ("financialYear", 1)])
    await db["documents"].create_index("uploadTime")
    await db["documents"].create_index("status")
    await db["documents"].create_index("category")

    # 2. ocr_results collection
    await db["ocr_results"].create_index("documentId", unique=True)

    # 3. structured_records collection
    await db["structured_records"].create_index("documentId", unique=True)

    # 4. validation_results collection
    await db["validation_results"].create_index("documentId", unique=True)
    await db["validation_results"].create_index("status")
    await db["validation_results"].create_index("score")

    # 5. analytics collection
    await db["analytics"].create_index("documentId")
    await db["analytics"].create_index("type")

    # 6. rag_chunks collection
    await db["rag_chunks"].create_index([("documentId", 1), ("chunkNumber", 1)])

    # 7. chat_history collection
    await db["chat_history"].create_index([("documentId", 1), ("timestamp", -1)])
    await db["chat_history"].create_index("timestamp")

    # 8. report_reviews collection (for persisting manual reviews & drafts)
    await db["report_reviews"].create_index("reportId", unique=True)

    logger.info("MongoDB collection indexes verified successfully.")


async def get_database() -> AsyncIOMotorDatabase:
    """Dependency injection provider for FastAPI endpoints."""
    if mongo_manager.db is None:
        await connect_to_mongo()
    return mongo_manager.db


def get_db() -> AsyncIOMotorDatabase:
    """Direct accessor for background tasks and services."""
    if mongo_manager.db is None:
        if not settings.MONGODB_URI:
            raise ValueError("MONGODB_URI is not configured.")
        mongo_manager.client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=10000,
            maxPoolSize=50,
            minPoolSize=5
        )
        mongo_manager.db = mongo_manager.client[settings.DATABASE_NAME]
    return mongo_manager.db


def get_collection(name: str) -> AsyncIOMotorCollection:
    """Convenience accessor to get a collection by name."""
    db = get_db()
    return db[name]
