"""
Phase 9 - Module 1: Deterministic Document Classifier.
Classifies mining, geological, and administrative documents into standardized categories
using metadata, title tokens, filenames, headers, and structured extraction fields.
Strictly deterministic with reproducible scoring and reasons. Zero ML/LLM.
"""

import re
from typing import Dict, Any, Tuple

CATEGORIES = [
    "Annual Report",
    "Production Report",
    "Geological Report",
    "Mine Report",
    "Safety Report",
    "Environmental Report",
    "Financial Report",
    "Circular",
    "Notification",
    "Tender",
    "Policy",
    "Unknown"
]

# Classification rule keywords and their weighted evidence scores
CATEGORY_RULES = {
    "Annual Report": {
        "title_keywords": ["annual report", "annual return", "annual statement", "integrated report", "varshik prativedan"],
        "content_keywords": ["board of directors", "chairman's statement", "audited financial", "shareholders", "annual general meeting"],
        "weight": 35
    },
    "Production Report": {
        "title_keywords": ["production", "dispatch", "offtake", "output", "coal production", "monthly performance", "quarterly performance"],
        "content_keywords": ["overburden", "target production", "achieved production", "percentage achievement", "million tonnes", "mt", "coking coal", "non-coking"],
        "weight": 30
    },
    "Geological Report": {
        "title_keywords": ["geological", "survey", "borehole", "seam", "exploration", "drilling", "coalfield", "lithology"],
        "content_keywords": ["reserve estimation", "strata", "proximate analysis", "calorific value", "grade", "ash content", "moisture content", "depth of seam"],
        "weight": 30
    },
    "Mine Report": {
        "title_keywords": ["mine plan", "mining lease", "opencast", "underground", "ocp", "colliery", "mine closure", "mine development"],
        "content_keywords": ["stripping ratio", "bench height", "dragline", "shovel", "dumper", "hemm", "face advance", "mine working"],
        "weight": 25
    },
    "Safety Report": {
        "title_keywords": ["safety", "accident", "dgms", "hazard", "incident", "mine safety", "fatality", "inspection"],
        "content_keywords": ["dgms circular", "injuries", "safety committee", "gas monitoring", "ventilation", "first aid", "vocational training"],
        "weight": 30
    },
    "Environmental Report": {
        "title_keywords": ["environmental", "environment", "ec clearance", "pollution", "air quality", "forest clearance", "afforestation"],
        "content_keywords": ["pm10", "pm2.5", "effluent", "tree plantation", "reclamation", "green belt", "spcb", "cpcb", "water sprinkling"],
        "weight": 30
    },
    "Financial Report": {
        "title_keywords": ["financial", "balance sheet", "profit and loss", "revenue", "capex", "opex", "turnover", "audit report"],
        "content_keywords": ["ebitda", "capital expenditure", "operational expenditure", "net profit", "gross margin", "chartered accountant"],
        "weight": 30
    },
    "Circular": {
        "title_keywords": ["circular", "office memorandum", "om", "advisory", "directive"],
        "content_keywords": ["competent authority", "hereby circulated", "with immediate effect", "copy to", "all subsidiary cmd"],
        "weight": 30
    },
    "Notification": {
        "title_keywords": ["notification", "gazette", "statutory notification", "order", "decree", "s.o."],
        "content_keywords": ["hereby notified", "statutory order", "in exercise of powers", "published in the gazette"],
        "weight": 30
    },
    "Tender": {
        "title_keywords": ["tender", "nit", "notice inviting tender", "rfp", "bid", "procurement", "e-tender"],
        "content_keywords": ["earnest money", "emd", "submission deadline", "technical bid", "financial bid", "commercial terms", "reverse auction"],
        "weight": 35
    },
    "Policy": {
        "title_keywords": ["policy", "guidelines", "framework", "scheme", "standard operating procedure", "sop", "act", "rules"],
        "content_keywords": ["pursuant to section", "effective from", "statutory requirement", "compliance guideline", "national policy"],
        "weight": 30
    }
}


def classify_document(
    filename: str = "",
    report_title: str = "",
    extracted_text: str = "",
    structured_data: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Classify a document deterministically based on available evidence:
    - filename
    - reportTitle from extraction
    - structured fields (e.g. coalProduction, mineType, mineName, etc.)
    - OCR / extracted text tokens
    
    Returns:
    {
        "documentCategory": str,
        "classificationConfidence": int (0-100),
        "classificationReason": str
    }
    """
    structured_data = structured_data or {}
    report_type_field = (structured_data.get("reportType") or "").strip()
    
    # Combined search corpus
    title_corpus = f"{filename} {report_title} {report_type_field}".lower()
    text_sample = (extracted_text or "")[:15000].lower()

    scores: Dict[str, float] = {cat: 0.0 for cat in CATEGORIES if cat != "Unknown"}
    reasons: Dict[str, list] = {cat: [] for cat in CATEGORIES if cat != "Unknown"}

    # 1. Check title and filename matches
    for cat, rules in CATEGORY_RULES.items():
        for kw in rules["title_keywords"]:
            if kw in title_corpus:
                scores[cat] += rules["weight"]
                reasons[cat].append(f"Title/filename contains '{kw}'")

    # 2. Check structured field cues
    has_prod = structured_data.get("coalProduction") is not None and structured_data.get("coalProduction") != 0
    has_target = structured_data.get("targetProduction") is not None
    has_obr = structured_data.get("overburdenRemoval") is not None
    has_mine = bool(structured_data.get("mineName") and structured_data.get("mineName") != "N/A")
    has_mine_type = bool(structured_data.get("mineType") and structured_data.get("mineType") != "N/A")

    if has_prod or has_target or has_obr:
        scores["Production Report"] += 25
        reasons["Production Report"].append("Extracted quantitative production fields (Coal/Target/OBR)")

    if has_mine or has_mine_type:
        scores["Mine Report"] += 20
        reasons["Mine Report"].append("Identified specific colliery/mine name or mine type")

    # 3. Check OCR content keywords
    if text_sample:
        for cat, rules in CATEGORY_RULES.items():
            for kw in rules["content_keywords"]:
                if re.search(r'\b' + re.escape(kw) + r'\b', text_sample):
                    scores[cat] += 6
                    reasons[cat].append(f"Content mentions '{kw}'")

    # 4. If structured reportType explicitly matches one of our categories
    for cat in CATEGORIES:
        if report_type_field.lower() == cat.lower():
            scores[cat] += 40
            reasons[cat].append(f"Structured metadata explicitly declared '{cat}'")

    # Rank categories by score
    sorted_cats = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    best_cat, best_score = sorted_cats[0]

    if best_score <= 10:
        return {
            "documentCategory": "Unknown",
            "classificationConfidence": 30,
            "classificationReason": "Insufficient conclusive keywords or structured fields to determine category."
        }

    # Normalize confidence into 50 - 99 scale
    confidence = min(99, int(50 + (best_score * 0.5)))
    reason_str = "; ".join(reasons[best_cat][:3]) if reasons[best_cat] else f"Pattern match with high score ({best_score:.0f})"

    return {
        "documentCategory": best_cat,
        "classificationConfidence": confidence,
        "classificationReason": reason_str
    }
