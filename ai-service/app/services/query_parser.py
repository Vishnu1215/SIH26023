"""
Phase 10 - Module 1: Query Parser, Module 2: Intent Detection, Module 3: Filter Engine.
Converts Natural Language questions into deterministic filters and intents
without any external LLM, OpenAI, Gemini, or Vector DBs.
100% Rule-based, explainable, and government compliant.
"""

import re
from typing import Dict, Any, Optional, List, Tuple

# Canonical Subsidiary mapping
SUBSIDIARY_MAP = {
    "secl": "SECL",
    "south eastern coalfields": "SECL",
    "mcl": "MCL",
    "mahanadi coalfields": "MCL",
    "bccl": "BCCL",
    "bharat coking coal": "BCCL",
    "ccl": "CCL",
    "central coalfields": "CCL",
    "wcl": "WCL",
    "western coalfields": "WCL",
    "ncl": "NCL",
    "northern coalfields": "NCL",
    "ecl": "ECL",
    "eastern coalfields": "ECL",
    "sccl": "SCCL",
    "singareni": "SCCL",
    "cmpdi": "CMPDI",
    "cmpdil": "CMPDI",
    "cil": "CIL",
    "coal india": "CIL"
}

# Canonical State mapping
STATES_LIST = [
    "Jharkhand", "Odisha", "Chhattisgarh", "Madhya Pradesh",
    "West Bengal", "Maharashtra", "Telangana", "Assam", "Bihar",
    "Uttar Pradesh", "Andhra Pradesh"
]

# Canonical Mines list
MINES_LIST = [
    "Gevra", "Kusmunda", "Dipka", "Talcher", "Jharia", "Bokaro",
    "Singrauli", "Korba", "Jharia Open Cast", "Ib Valley", "Lakhanpur",
    "Manikpur", "Dudhichua", "Jayant", "Nigahi", "Amlohri", "Khadia",
    "Piprawar", "Ashoka", "Rajmahal", "North Tisra"
]

# Canonical Categories mapping
CATEGORY_KEYWORDS = {
    "Annual Report": ["annual report", "annual reports", "annual return", "annual statement", "varshik"],
    "Production Report": ["production report", "production reports", "monthly production", "offtake report", "output report"],
    "Geological Report": ["geological report", "geological", "exploration report", "drilling report", "lithology"],
    "Mine Report": ["mine report", "mining report", "mine plan", "colliery report"],
    "Safety Report": ["safety report", "safety inspection", "accident report", "safety audit", "dgms"],
    "Environmental Report": ["environmental report", "environmental clearance", "ec clearance", "pollution report", "forestry"],
    "Financial Report": ["financial report", "financial statement", "balance sheet", "p&l report", "capex report"],
    "Circular": ["circular", "notification", "tender", "policy", "gazette"]
}

# Canonical Topic mapping
TOPIC_KEYWORDS = {
    "Coal Production": ["coal production", "raw coal", "production target", "extraction", "coking coal"],
    "Mine Safety": ["mine safety", "safety audit", "accident", "incident", "hazard", "ventilation", "gas monitoring"],
    "Environment": ["environment", "environmental clearance", "pollution", "afforestation", "air quality", "green belt"],
    "Dispatch": ["coal dispatch", "dispatch", "offtake", "railway siding", "rake", "wagon", "mgr"],
    "Coal Quality": ["coal quality", "gcv", "calorific value", "ash content", "moisture", "grade"],
    "Overburden": ["overburden", "overburden removal", "obr", "stripping ratio", "waste removal"],
    "CSR": ["csr", "corporate social responsibility", "community development", "drinking water", "peripheral development"],
    "Mine Expansion": ["mine expansion", "capacity expansion", "expansion plan", "lease enhancement"],
    "Financial Performance": ["financial performance", "revenue", "ebitda", "turnover", "expenditure", "capex"],
    "Land Acquisition": ["land acquisition", "cba act", "compensation", "rehabilitation", "resettlement", "r&r"],
    "Exploration": ["exploration", "geological exploration", "drilling", "borehole", "coring", "proved reserve"],
    "Infrastructure": ["infrastructure", "chp", "coal handling plant", "silo", "rapid loading system", "washery"]
}


def normalize_fy(text: str) -> Optional[str]:
    """Extract and normalize Financial Year like 'FY 2023-24' or '2023–2024' -> '2023-24'."""
    # Pattern: 2023-24, 2023-2024, FY 2023-24, FY23-24
    m_full = re.search(r"(?:fy\s*)?(\d{4})\s*[-–/]\s*(\d{4})", text, re.IGNORECASE)
    if m_full:
        y1 = m_full.group(1)
        y2 = m_full.group(2)[-2:]
        return f"{y1}-{y2}"
    m_short = re.search(r"(?:fy\s*)?(\d{4})\s*[-–/]\s*(\d{2})", text, re.IGNORECASE)
    if m_short:
        return f"{m_short.group(1)}-{m_short.group(2)}"
    return None


def extract_production_threshold(text: str) -> Tuple[Optional[float], Optional[float]]:
    """
    Extracts min/max production thresholds from text:
    e.g. 'greater than 100 MT' -> (100.0, None)
    'less than 50 MT' -> (None, 50.0)
    """
    lower = text.lower()
    min_prod = None
    max_prod = None

    # Greater than / more than / above / >
    gt_match = re.search(r"(?:greater than|more than|above|exceeding|>|>=)\s*(\d+(?:\.\d+)?)\s*(?:mt|million tonnes)?", lower)
    if gt_match:
        try:
            min_prod = float(gt_match.group(1))
        except ValueError:
            pass

    # Less than / under / below / <
    lt_match = re.search(r"(?:less than|under|below|<|<=)\s*(\d+(?:\.\d+)?)\s*(?:mt|million tonnes)?", lower)
    if lt_match:
        try:
            max_prod = float(lt_match.group(1))
        except ValueError:
            pass

    return min_prod, max_prod


def extract_validation_status(text: str) -> Optional[str]:
    """Detects validation status filters in natural language."""
    lower = text.lower()
    if any(k in lower for k in ["failed validation", "validation failure", "validation failures", "invalid", "error documents", "failed", "errors"]):
        return "Error"
    if any(k in lower for k in ["warning", "warnings", "warning documents"]):
        return "Warning"
    if any(k in lower for k in ["passed validation", "valid documents", "successful validation", "valid"]):
        return "Valid"
    return None


def detect_intent(text: str, document_id: Optional[str] = None) -> str:
    """
    Module 2: Deterministically classify query intent into one of 11 standardized intents.
    """
    lower = text.lower().strip()

    # Document details if doc ID provided or specific phrasing
    if document_id or re.search(r"\b(this document|the document|document [a-f0-9-]+)\b", lower):
        if any(w in lower for w in ["validation", "score", "error", "warning", "valid", "accuracy"]):
            return "document_details"
        if any(w in lower for w in ["summary", "entities", "topics", "related", "details"]):
            return "document_details"

    # Analytics queries: Superlatives or aggregate calculations across entire dataset
    if any(w in lower for w in ["highest production", "lowest production", "top subsidiary", "top producer",
                                "most coal", "highest coal", "average production", "avg production",
                                "total coal production", "overall production", "total production",
                                "production achievement", "achievement percentage", "achievement %",
                                "target variance", "top states", "financial trends", "yearly trends",
                                "which subsidiary produced the highest", "which subsidiary has the highest",
                                "validation accuracy", "overall quality score", "quality rating", "data quality"]):
        return "analytics_lookup"

    # Validation failure queries across platform
    if any(w in lower for w in ["failed validation", "validation failures", "invalid records",
                                "which documents failed", "error documents"]):
        return "validation_lookup"

    # Mine lookup
    if re.search(r"\b(list mines|show mines|which mines|mines in|mines under)\b", lower):
        return "mine_lookup"

    # Subsidiary lookup
    if re.search(r"\b(list subsidiaries|which subsidiaries|subsidiaries in|subsidiaries under)\b", lower):
        return "subsidiary_lookup"

    # Report lookup by category
    if re.search(r"\b(annual reports?|production reports?|geological reports?|safety reports?|environmental reports?|financial reports?|circulars?)\b", lower):
        return "report_lookup"

    # Dashboard overview metrics
    if any(w in lower for w in ["dashboard metrics", "overview kpi", "platform health", "kpi summary", "system summary"]):
        return "dashboard_metrics"

    # Topic search
    if any(w in lower for w in ["related to", "topic", "subject of", "centered on", "about safety", "about environment", "about overburden"]):
        return "topic_search"

    # Keyword search
    if any(w in lower for w in ["mentioning", "containing", "keyword", "search for"]):
        return "keyword_search"

    # Generic search documents if query contains entities or filters
    return "search_documents"


def parse_query(raw_query: str, document_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Module 1 & 3: Parse natural language question into structured filters and deterministic intent.
    Returns:
    {
        "rawQuery": "Show production reports of SECL for FY 2023-24",
        "intent": "search_documents",
        "filters": {
            "category": "Production Report",
            "subsidiary": "SECL",
            "financialYear": "2023-24",
            "state": None,
            "mine": None,
            "district": None,
            "topic": None,
            "keyword": None,
            "validationStatus": None,
            "minProduction": None,
            "maxProduction": None
        },
        "searchKeyword": "..."
    }
    """
    query = (raw_query or "").strip()
    lower = query.lower()

    # 1. Intent Detection
    intent = detect_intent(query, document_id=document_id)

    # 2. Extract Subsidiary
    extracted_subsidiary = None
    for token, canon in SUBSIDIARY_MAP.items():
        # Word boundary match
        pattern = r"\b" + re.escape(token) + r"\b"
        if re.search(pattern, lower):
            extracted_subsidiary = canon
            break

    # 3. Extract State
    extracted_state = None
    for state_name in STATES_LIST:
        pattern = r"\b" + re.escape(state_name.lower()) + r"\b"
        if re.search(pattern, lower):
            extracted_state = state_name
            break

    # 4. Extract Mine
    extracted_mine = None
    for mine_name in MINES_LIST:
        pattern = r"\b" + re.escape(mine_name.lower()) + r"\b"
        if re.search(pattern, lower):
            extracted_mine = mine_name
            break

    # 5. Extract Category
    extracted_category = None
    for cat_name, kw_list in CATEGORY_KEYWORDS.items():
        for kw in kw_list:
            pattern = r"\b" + re.escape(kw) + r"\b"
            if re.search(pattern, lower):
                extracted_category = cat_name
                break
        if extracted_category:
            break

    # 6. Extract Financial Year
    extracted_fy = normalize_fy(query)

    # 7. Extract Topic
    extracted_topic = None
    for top_name, kw_list in TOPIC_KEYWORDS.items():
        for kw in kw_list:
            pattern = r"\b" + re.escape(kw) + r"\b"
            if re.search(pattern, lower):
                extracted_topic = top_name
                break
        if extracted_topic:
            break

    # 8. Extract Validation Status
    extracted_status = extract_validation_status(query)

    # 9. Extract Production Thresholds
    min_prod, max_prod = extract_production_threshold(query)

    # 10. Extract Keyword (e.g. "mentioning Gevra Mine" -> "Gevra Mine")
    extracted_kw = None
    kw_match = re.search(r"(?:mentioning|containing|keyword)\s+([A-Za-z0-9_\s-]+?)(?:\s+(?:in|for|of|with|belonging|from)|$)", query, re.IGNORECASE)
    if kw_match:
        extracted_kw = kw_match.group(1).strip()
    elif extracted_mine:
        extracted_kw = extracted_mine

    filters = {
        "category": extracted_category,
        "subsidiary": extracted_subsidiary,
        "state": extracted_state,
        "mine": extracted_mine,
        "financialYear": extracted_fy,
        "topic": extracted_topic,
        "validationStatus": extracted_status,
        "minProduction": min_prod,
        "maxProduction": max_prod,
        "keyword": extracted_kw
    }

    # Clean active filters (omit None)
    active_filters = {k: v for k, v in filters.items() if v is not None}

    return {
        "rawQuery": query,
        "intent": intent,
        "documentId": document_id,
        "filters": active_filters,
        "allFilters": filters
    }
