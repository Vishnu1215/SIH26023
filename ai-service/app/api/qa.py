"""
FastAPI Router for Phase 11: Hybrid AI Question Answering (RAG + Text-to-SQL Ready Architecture).
Exposes endpoints for Hybrid QA, History, Suggestions, and Explainability.
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.qa_engine import (
    execute_qa,
    explain_qa_query,
    get_dynamic_qa_suggestions
)
from app.services.qa_storage import (
    load_qa_history,
    clear_qa_history
)
from app.services.llm_adapter import llm_adapter
from app.services.rag_adapter import rag_adapter

router = APIRouter(prefix="/qa", tags=["Hybrid AI Question Answering"])


class QAQueryRequest(BaseModel):
    question: str = Field(..., description="Natural language question")
    useLLM: bool = Field(default=False, description="Whether to invoke LLM adapter (if enabled)")
    documentId: Optional[str] = Field(default=None, description="Optional document ID for document-specific grounding")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Optional search facet filters")


class QAExplainRequest(BaseModel):
    question: str = Field(..., description="Natural language question to explain")
    documentId: Optional[str] = Field(default=None, description="Optional document ID context")


@router.post("/query", summary="Execute Hybrid AI Question Answering")
async def api_qa_query(req: QAQueryRequest):
    """
    Executes hybrid question answering:
    Routes query -> builds minimal context -> resolves via SQL/RAG/Analytics -> composes citation-backed answer.
    """
    try:
        q_str = (req.question or "").strip()
        if not q_str:
            raise HTTPException(status_code=400, detail="Question cannot be empty.")

        response = execute_qa(
            question=q_str,
            use_llm=req.useLLM,
            document_id=req.documentId,
            filters=req.filters
        )
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"QA execution failed: {str(e)}")


@router.get("/history", summary="Get recent QA chat history")
async def api_get_qa_history():
    """Retrieve recent QA interactions (up to 50, LIFO)."""
    try:
        history = load_qa_history()
        return {
            "status": "success",
            "count": len(history),
            "history": history
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load QA history: {str(e)}")


@router.delete("/history", summary="Clear QA chat history")
async def api_clear_qa_history():
    """Clear stored QA conversation history."""
    try:
        success = clear_qa_history()
        return {
            "status": "success",
            "message": "QA history cleared successfully.",
            "cleared": success
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear QA history: {str(e)}")


@router.get("/suggestions", summary="Get dynamic QA suggestions")
async def api_get_qa_suggestions():
    """Returns context-aware questions derived from active dashboard, documents, and reports."""
    try:
        suggestions = get_dynamic_qa_suggestions()
        return {
            "status": "success",
            "count": len(suggestions),
            "suggestions": suggestions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve suggestions: {str(e)}")


@router.post("/explain", summary="Explain QA rationale and data sources")
async def api_explain_qa(req: QAExplainRequest):
    """
    Returns reasoning, evidence, and data sources used to answer the question
    without exposing chain-of-thought or internal prompts.
    """
    try:
        q_str = (req.question or "").strip()
        if not q_str:
            raise HTTPException(status_code=400, detail="Question cannot be empty.")

        explanation = explain_qa_query(question=q_str, document_id=req.documentId)
        return explanation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"QA explain failed: {str(e)}")


@router.get("/status", summary="Get QA engine and adapter readiness status")
async def api_get_qa_status():
    """Returns runtime readiness of LLM, RAG, and SQL adapters."""
    return {
        "status": "online",
        "engine": "Hybrid AI Question Answering (Phase 11)",
        "deterministic": True,
        "llmAdapter": llm_adapter.get_status(),
        "ragAdapter": rag_adapter.get_status()
    }
