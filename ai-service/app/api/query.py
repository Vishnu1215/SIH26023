"""
FastAPI Router for Phase 10: Natural Language Query & Decision Support.
Exposes endpoints for deterministic NL querying, history, and suggestions.
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.query_engine import (
    execute_nl_query,
    load_query_history,
    clear_query_history,
    get_query_suggestions
)

router = APIRouter(tags=["Natural Language Query"])


class QueryRequest(BaseModel):
    query: str = Field(..., description="Natural language question or filter inquiry")
    documentId: Optional[str] = Field(default=None, description="Optional document ID for document-specific inquiry")


@router.post("/query", summary="Execute deterministic Natural Language query")
async def api_execute_query(req: QueryRequest):
    """
    Parses natural language question, identifies intent & filters,
    and returns deterministic answer with explainable source & reason.
    """
    try:
        query_str = (req.query or "").strip()
        if not query_str:
            raise HTTPException(status_code=400, detail="Query cannot be empty.")

        response = execute_nl_query(query_str=query_str, document_id=req.documentId)
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(e)}")


@router.get("/query/history", summary="Get recent query history")
async def api_get_query_history():
    """Retrieve recent queries executed across the platform."""
    try:
        history = load_query_history()
        return {
            "status": "success",
            "count": len(history),
            "history": history
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load query history: {str(e)}")


@router.delete("/query/history", summary="Clear query history")
async def api_clear_query_history():
    """Clear query history log."""
    try:
        success = clear_query_history()
        return {
            "status": "success",
            "message": "Query history cleared successfully.",
            "cleared": success
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear query history: {str(e)}")


@router.get("/query/suggestions", summary="Get deterministic query suggestions")
async def api_get_query_suggestions():
    """Retrieve list of recommended PRD queries."""
    try:
        suggestions = get_query_suggestions()
        return {
            "status": "success",
            "count": len(suggestions),
            "suggestions": suggestions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve suggestions: {str(e)}")
