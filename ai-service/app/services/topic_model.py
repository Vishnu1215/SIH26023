"""
Phase 9 - Module 2: Deterministic Mining Topic Modeling.
Uses domain-specific TF-IDF ontology term scoring to identify and weight
major mining topics without ML models, transformers, or external dependencies.
"""

import re
import math
from typing import List, Dict, Any

# Standard CMPDI / Ministry of Coal Mining Topic Ontology
TOPIC_ONTOLOGY = {
    "Coal Production": [
        "coal production", "raw coal", "target production", "achieved production",
        "million tonnes", "coking coal", "non-coking", "output", "extraction", "run of mine", "rom"
    ],
    "Mine Safety": [
        "safety", "accident", "incident", "dgms", "hazard", "ventilation", "first aid",
        "strata control", "gas monitoring", "methane", "inundation", "safety audit", "rescue"
    ],
    "Environment": [
        "environment", "environmental clearance", "pollution", "tree plantation", "afforestation",
        "air quality", "pm10", "pm2.5", "spcb", "cpcb", "water treatment", "green belt", "reclamation"
    ],
    "Dispatch": [
        "dispatch", "offtake", "rake", "wagon", "railway siding", "power sector",
        "merry-go-round", "mgr", "conveyor", "coal transport", "fsa", "e-auction"
    ],
    "Coal Quality": [
        "gcv", "calorific value", "ash content", "moisture", "volatile matter",
        "grade", "proximate analysis", "sampling", "third party sampling", "coking index"
    ],
    "Overburden": [
        "overburden", "obr", "stripping ratio", "composite stripping ratio", "waste removal",
        "dump", "external dump", "internal dump", "dragline", "shovel dumper"
    ],
    "CSR": [
        "csr", "corporate social responsibility", "community development", "drinking water",
        "healthcare", "education", "skill development", "peripheral development", "tribal"
    ],
    "Mine Expansion": [
        "expansion", "capacity enhancement", "ec expansion", "additional lease",
        "project report", "feasibility report", "pr", "fr", "peak capacity", "incremental"
    ],
    "Financial Performance": [
        "revenue", "profit", "ebitda", "capex", "turnover", "audit", "expenditure",
        "capital investment", "dividend", "net worth", "cost per tonne"
    ],
    "Land Acquisition": [
        "land acquisition", "cb act", "cba act", "rfctlarr", "compensation",
        "r&r", "resettlement", "rehabilitation", "tenancy land", "forest land", "possession"
    ],
    "Exploration": [
        "exploration", "drilling", "borehole", "coring", "geological report",
        "proved reserve", "indicated reserve", "inferred reserve", "seam correlation"
    ],
    "Infrastructure": [
        "chp", "coal handling plant", "silo", "rapid loading system", "rls",
        "workshop", "substation", "road network", "crusher", "washery"
    ]
}


def extract_document_topics(
    text: str = "",
    structured_data: Dict[str, Any] = None,
    max_topics: int = 5
) -> List[Dict[str, Any]]:
    """
    Deterministically score and rank topics present in the document.
    Returns:
    [
        {"topic": "Coal Production", "weight": 0.92},
        {"topic": "Overburden", "weight": 0.74},
        ...
    ]
    """
    structured_data = structured_data or {}
    text_corpus = f"{structured_data.get('reportTitle', '')} {structured_data.get('reportType', '')} {text[:25000]}".lower()

    if not text_corpus.strip():
        return [{"topic": "Coal Production", "weight": 0.50}]

    raw_scores: Dict[str, float] = {}

    for topic, terms in TOPIC_ONTOLOGY.items():
        score = 0.0
        for term in terms:
            # Term Frequency count
            matches = len(re.findall(r'\b' + re.escape(term) + r'\b', text_corpus))
            if matches > 0:
                # Log-scaled frequency boost for multi-word or single-word terms
                weight_multiplier = 2.0 if " " in term else 1.0
                score += weight_multiplier * (1.0 + math.log1p(matches))

        # Structured metadata direct boosts
        if topic == "Coal Production" and structured_data.get("coalProduction"):
            score += 4.0
        if topic == "Overburden" and structured_data.get("overburdenRemoval"):
            score += 4.0
        if topic == "Exploration" and ("geolog" in str(structured_data.get("reportType", "")).lower()):
            score += 4.0

        if score > 0:
            raw_scores[topic] = score

    if not raw_scores:
        # Default topic if text is completely generic
        return [{"topic": "Coal Production", "weight": 0.50}]

    # Normalize weights so the top topic has weight 0.85 - 0.99
    max_score = max(raw_scores.values())
    ranked = sorted(raw_scores.items(), key=lambda x: x[1], reverse=True)

    result = []
    for topic, score in ranked[:max_topics]:
        normalized_weight = round(min(0.98, max(0.20, (score / max_score) * 0.95)), 2)
        result.append({
            "topic": topic,
            "weight": normalized_weight
        })

    return result
