"""
Phase 9 - Module 3: Keyword Extraction & Module 4: Named Entity Extraction.
Deterministic regex and dictionary-based extraction for mining terminology,
organizations, locations, measurements, dates, and mine specifications.
Strictly zero NLP model / zero LLM.
"""

import re
from typing import List, Dict, Any, Set

STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "cannot", "could", "did",
    "do", "does", "doing", "down", "during", "each", "few", "for", "from",
    "further", "had", "has", "have", "having", "he", "her", "here", "hers",
    "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is",
    "it", "its", "itself", "let's", "me", "more", "most", "my", "myself", "no",
    "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
    "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should",
    "so", "some", "such", "than", "that", "the", "their", "theirs", "them",
    "themselves", "then", "there", "these", "they", "this", "those", "through",
    "to", "too", "under", "until", "up", "very", "was", "we", "were", "what",
    "when", "where", "which", "while", "who", "whom", "why", "with", "would",
    "you", "your", "yours", "yourself", "yourselves", "page", "table", "report",
    "document", "per", "nil", "na", "total", "sub", "etc", "shall", "may"
}

KNOWN_ORGANIZATIONS = [
    "Coal India Limited", "Coal India", "CIL",
    "Central Mine Planning & Design Institute", "Central Mine Planning and Design Institute", "CMPDI", "CMPDIL",
    "Ministry of Coal", "MoC",
    "South Eastern Coalfields Limited", "South Eastern Coalfields", "SECL",
    "Mahanadi Coalfields Limited", "Mahanadi Coalfields", "MCL",
    "Bharat Coking Coal Limited", "Bharat Coking Coal", "BCCL",
    "Central Coalfields Limited", "Central Coalfields", "CCL",
    "Western Coalfields Limited", "Western Coalfields", "WCL",
    "Northern Coalfields Limited", "Northern Coalfields", "NCL",
    "Eastern Coalfields Limited", "Eastern Coalfields", "ECL",
    "Singareni Collieries Company Limited", "Singareni Collieries", "SCCL",
    "Directorate General of Mines Safety", "DGMS",
    "Ministry of Environment, Forest and Climate Change", "MoEFCC",
    "Central Pollution Control Board", "CPCB",
    "State Pollution Control Board", "SPCB"
]

KNOWN_STATES = [
    "Jharkhand", "Odisha", "Chhattisgarh", "Madhya Pradesh", "West Bengal",
    "Maharashtra", "Telangana", "Assam", "Andhra Pradesh", "Uttar Pradesh", "Bihar"
]

KNOWN_DISTRICTS = [
    "Korba", "Angul", "Dhanbad", "Singrauli", "Chandrapur", "Bilaspur",
    "Ranchi", "Ramgarh", "Bokaro", "Hazaribagh", "Jharsuguda", "Sundargarh",
    "Nagpur", "Yavatmal", "Betul", "Sidhi", "Sonbhadra", "Burdwan", "Purulia",
    "Asansol", "Godavari", "Kothagudem", "Mancherial"
]

KNOWN_MINES = [
    "Gevra", "Kusmunda", "Dipka", "Talcher", "Jharia", "Bokaro", "Singrauli",
    "North Karanpura", "South Karanpura", "Raniganj", "Wardha", "Ib Valley",
    "Manuguru", "Yellandu", "Belampalli", "Mand Raigarh", "Hasdeo Arand",
    "Korba OCP", "Rajmahal", "Samaleswari", "Lakhanpur", "Ananta", "Bhubaneswari"
]


def extract_keywords(
    text: str = "",
    structured_data: Dict[str, Any] = None,
    max_keywords: int = 15
) -> List[str]:
    """
    Extract frequency-ranked, deduplicated domain keywords from text and structured fields.
    """
    structured_data = structured_data or {}
    corpus = f"{structured_data.get('reportTitle', '')} {structured_data.get('subsidiary', '')} {structured_data.get('mineName', '')} {text[:20000]}"
    
    # 1. Clean tokens (words of length 3-30)
    raw_tokens = re.findall(r'\b[A-Za-z][A-Za-z0-9\-]{2,29}\b', corpus)

    freq: Dict[str, int] = {}
    for tok in raw_tokens:
        clean_tok = tok.strip("-")
        lower_tok = clean_tok.lower()
        if lower_tok not in STOP_WORDS and len(clean_tok) > 2:
            freq[clean_tok] = freq.get(clean_tok, 0) + 1

    # Add structured metadata items with high priority
    priority_items = [
        structured_data.get("subsidiary"),
        structured_data.get("mineName"),
        structured_data.get("state"),
        structured_data.get("district"),
        structured_data.get("financialYear"),
        "Coal Production" if structured_data.get("coalProduction") else None,
        structured_data.get("mineType")
    ]
    for p in priority_items:
        if p and p != "N/A" and str(p).lower() not in STOP_WORDS:
            freq[str(p)] = freq.get(str(p), 0) + 50

    # Sort by frequency descending and normalize case
    sorted_terms = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    
    seen_lower = set()
    result = []
    for term, _ in sorted_terms:
        l = term.lower()
        if l not in seen_lower:
            seen_lower.add(l)
            result.append(term)
            if len(result) >= max_keywords:
                break

    return result


def extract_named_entities(
    text: str = "",
    structured_data: Dict[str, Any] = None
) -> Dict[str, List[str]]:
    """
    Deterministic named entity extraction using compiled regex and gazetteers.
    Returns:
    {
        "organizations": [...],
        "subsidiaries": [...],
        "locations": { "states": [...], "districts": [...] },
        "mines": [...],
        "measurements": [...],
        "financialYears": [...],
        "dates": [...],
        "mineTypes": [...]
    }
    """
    structured_data = structured_data or {}
    search_corpus = f"{structured_data.get('reportTitle', '')} {structured_data.get('issuingOrganization', '')} {text[:30000]}"

    entities = {
        "organizations": set(),
        "subsidiaries": set(),
        "states": set(),
        "districts": set(),
        "mines": set(),
        "measurements": set(),
        "financialYears": set(),
        "dates": set(),
        "mineTypes": set()
    }

    # Inject structured data directly
    if structured_data.get("issuingOrganization"):
        entities["organizations"].add(structured_data["issuingOrganization"])
    if structured_data.get("subsidiary") and structured_data["subsidiary"] != "N/A":
        entities["subsidiaries"].add(structured_data["subsidiary"])
        entities["organizations"].add(structured_data["subsidiary"])
    if structured_data.get("state") and structured_data["state"] != "N/A":
        entities["states"].add(structured_data["state"])
    if structured_data.get("district") and structured_data["district"] != "N/A":
        entities["districts"].add(structured_data["district"])
    if structured_data.get("mineName") and structured_data["mineName"] != "N/A":
        entities["mines"].add(structured_data["mineName"])
    if structured_data.get("mineType") and structured_data["mineType"] != "N/A":
        entities["mineTypes"].add(structured_data["mineType"])
    if structured_data.get("financialYear") and structured_data["financialYear"] != "N/A":
        entities["financialYears"].add(structured_data["financialYear"])

    # 1. Organizations & Subsidiaries
    subs_short = ["CIL", "SECL", "MCL", "BCCL", "CCL", "WCL", "NCL", "ECL", "SCCL", "CMPDI", "CMPDIL"]
    for org in KNOWN_ORGANIZATIONS:
        if re.search(r'\b' + re.escape(org) + r'\b', search_corpus, re.IGNORECASE):
            entities["organizations"].add(org)
            if org.upper() in subs_short:
                entities["subsidiaries"].add(org.upper())

    # 2. States
    for st in KNOWN_STATES:
        if re.search(r'\b' + re.escape(st) + r'\b', search_corpus, re.IGNORECASE):
            entities["states"].add(st)

    # 3. Districts
    for dist in KNOWN_DISTRICTS:
        if re.search(r'\b' + re.escape(dist) + r'\b', search_corpus, re.IGNORECASE):
            entities["districts"].add(dist)

    # 4. Mines
    for mine in KNOWN_MINES:
        if re.search(r'\b' + re.escape(mine) + r'\b', search_corpus, re.IGNORECASE):
            entities["mines"].add(mine)

    # 5. Measurements (regex: e.g. 250 MT, 3.1 Million Tonnes, 92%, 145000 tonnes, 85 CuM)
    meas_matches = re.findall(
        r'\b\d+(?:\.\d+)?\s*(?:MT|Million Tonnes|Million Tonne|Tonnes|Tonne|CuM|M\.T\.|%)\b',
        search_corpus,
        re.IGNORECASE
    )
    for m in meas_matches[:8]:
        entities["measurements"].add(m.strip())
    if structured_data.get("coalProduction"):
        unit = structured_data.get("productionUnit") or "MT"
        entities["measurements"].add(f"{structured_data['coalProduction']} {unit}")

    # 6. Financial Years (regex: 2024-25, 2024–25, FY24, FY 2025-26)
    fy_matches = re.findall(r'\b(?:FY\s*)?(?:20\d{2}[\-–/]\d{2,4})\b', search_corpus, re.IGNORECASE)
    for fy in fy_matches[:5]:
        entities["financialYears"].add(fy.strip())

    # 7. Dates (ISO 8601 or standard DD-MM-YYYY)
    date_matches = re.findall(r'\b\d{4}-\d{2}-\d{2}\b|\b\d{2}/\d{2}/\d{4}\b', search_corpus)
    for d in date_matches[:5]:
        entities["dates"].add(d.strip())

    # 8. Mine Types
    for mtype in ["Opencast", "Underground", "Mixed"]:
        if re.search(r'\b' + re.escape(mtype) + r'\b', search_corpus, re.IGNORECASE):
            entities["mineTypes"].add(mtype)

    return {
        "organizations": sorted(list(entities["organizations"])),
        "subsidiaries": sorted(list(entities["subsidiaries"])),
        "states": sorted(list(entities["states"])),
        "districts": sorted(list(entities["districts"])),
        "mines": sorted(list(entities["mines"])),
        "measurements": sorted(list(entities["measurements"])),
        "financialYears": sorted(list(entities["financialYears"])),
        "dates": sorted(list(entities["dates"])),
        "mineTypes": sorted(list(entities["mineTypes"]))
    }
