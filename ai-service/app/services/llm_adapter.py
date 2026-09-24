"""
Phase 11 - Hybrid AI Question Answering: LLM Adapter Abstraction Layer.

Provides a decoupled interface for future Large Language Model integrations:
- OpenAI (GPT-4o / GPT-4o-mini)
- Google Gemini (Gemini 1.5 Pro / Flash)
- Anthropic Claude (Claude 3.5 Sonnet)
- Local LLaMA (llama.cpp server)
- Ollama (local on-premise execution)

Initially, enabled = False by default.
Zero external API calls are made unless explicitly enabled and configured.
All prompt templates require strict evidence-grounding with zero hallucination.
"""

import os
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Supported LLM Providers
SUPPORTED_PROVIDERS = ["deterministic", "openai", "gemini", "claude", "local_llama", "ollama"]

class LLMAdapter:
    def __init__(self):
        # Default state: Strictly deterministic, no external LLM
        self.enabled: bool = os.getenv("ENABLE_LLM_ADAPTER", "false").lower() in ("true", "1", "yes")
        self.provider: str = os.getenv("LLM_PROVIDER", "deterministic").lower()
        self.model_name: str = os.getenv("LLM_MODEL_NAME", "llama-3-8b-instruct")
        self.api_key: Optional[str] = os.getenv("LLM_API_KEY", None)
        self.endpoint_url: str = os.getenv("LLM_ENDPOINT_URL", "http://localhost:11434/api/generate") # Ollama default
        self.temperature: float = 0.0 # Deterministic temperature

    def is_enabled(self) -> bool:
        """Returns True only if LLM adapter is explicitly turned on."""
        return self.enabled

    def get_provider(self) -> str:
        """Returns active LLM provider name."""
        return self.provider if self.enabled else "deterministic"

    def get_status(self) -> Dict[str, Any]:
        """Returns LLM adapter status metadata for UI badges and API info."""
        return {
            "enabled": self.enabled,
            "provider": self.provider if self.enabled else "deterministic",
            "model": self.model_name if self.enabled else "deterministic-engine-v1",
            "supportedProviders": SUPPORTED_PROVIDERS,
            "deterministicFallback": True,
            "readyForIntegration": True
        }

    def set_config(self, enabled: bool, provider: Optional[str] = None, model_name: Optional[str] = None) -> Dict[str, Any]:
        """Dynamically configure LLM adapter for testing or future deployment."""
        self.enabled = enabled
        if provider and provider.lower() in SUPPORTED_PROVIDERS:
            self.provider = provider.lower()
        if model_name:
            self.model_name = model_name
        return self.get_status()

    def generate_narrative(
        self,
        context: Dict[str, Any],
        question: str,
        prompt_template: Optional[str] = None
    ) -> Optional[str]:
        """
        Synthesizes a natural language narrative grounded STRICTLY in the provided context.
        If LLM is disabled or unavailable, returns None to trigger deterministic composer.
        """
        if not self.enabled or self.provider == "deterministic":
            return None

        # Guard: In government deployments, prompt must enforce strict evidence citations
        system_instruction = (
            "You are an AI statutory reporting assistant for the Ministry of Coal and CMPDI. "
            "You must answer questions strictly and solely based on the provided verified evidence. "
            "Never invent figures, dates, or mine names. If the answer is not in the evidence, "
            "state: 'No supporting evidence found.'"
        )

        try:
            # Future provider routing (pluggable without changing business logic)
            if self.provider == "ollama":
                return self._call_ollama(system_instruction, question, context)
            elif self.provider == "local_llama":
                return self._call_local_llama(system_instruction, question, context)
            elif self.provider == "gemini":
                return self._call_gemini(system_instruction, question, context)
            elif self.provider == "openai":
                return self._call_openai(system_instruction, question, context)
            elif self.provider == "claude":
                return self._call_claude(system_instruction, question, context)
            else:
                return None
        except Exception as e:
            logger.warning(f"[LLMAdapter] Provider {self.provider} failed: {e}. Falling back to deterministic engine.")
            return None

    def _call_ollama(self, system: str, question: str, context: Dict[str, Any]) -> Optional[str]:
        """Placeholder for Ollama local HTTP endpoint (e.g. POST http://localhost:11434/api/generate)."""
        # When Ollama is installed locally:
        # payload = {"model": self.model_name, "prompt": f"{system}\nContext: {context}\nQuestion: {question}", "stream": False}
        return None

    def _call_local_llama(self, system: str, question: str, context: Dict[str, Any]) -> Optional[str]:
        """Placeholder for llama.cpp server endpoint (e.g. POST http://localhost:8080/completion)."""
        return None

    def _call_gemini(self, system: str, question: str, context: Dict[str, Any]) -> Optional[str]:
        """Placeholder for Google Gemini API."""
        return None

    def _call_openai(self, system: str, question: str, context: Dict[str, Any]) -> Optional[str]:
        """Placeholder for OpenAI API."""
        return None

    def _call_claude(self, system: str, question: str, context: Dict[str, Any]) -> Optional[str]:
        """Placeholder for Anthropic Claude API."""
        return None


# Global singleton instance
llm_adapter = LLMAdapter()
