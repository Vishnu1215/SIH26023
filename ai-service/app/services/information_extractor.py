import re
import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from app.core.config import settings
from app.services.normalizer import (
    normalize_date,
    normalize_financial_year,
    normalize_number,
    normalize_unit,
    normalize_whitespace,
)
from app.services.json_storage import save_structured_data

logger = logging.getLogger("ai_service.information_extractor")

# Coal India Subsidiaries and Organizations (operating subsidiaries prioritized)
SUBSIDIARY_PATTERNS = {
    r"\b(?:BCCL|Bharat\s+Coking\s+Coal\s*(?:Limited)?)\b": ("BCCL", "Bharat Coking Coal Limited"),
    r"\b(?:CCL|Central\s+Coalfields\s*(?:Limited)?)\b": ("CCL", "Central Coalfields Limited"),
    r"\b(?:ECL|Eastern\s+Coalfields\s*(?:Limited)?)\b": ("ECL", "Eastern Coalfields Limited"),
    r"\b(?:WCL|Western\s+Coalfields\s*(?:Limited)?)\b": ("WCL", "Western Coalfields Limited"),
    r"\b(?:SECL|South\s+Eastern\s+Coalfields\s*(?:Limited)?)\b": ("SECL", "South Eastern Coalfields Limited"),
    r"\b(?:MCL|Mahanadi\s+Coalfields\s*(?:Limited)?)\b": ("MCL", "Mahanadi Coalfields Limited"),
    r"\b(?:NCL|Northern\s+Coalfields\s*(?:Limited)?)\b": ("NCL", "Northern Coalfields Limited"),
    r"\b(?:SCCL|Singareni\s+Collieries(?:\s+Company\s+Limited)?)\b": ("SCCL", "Singareni Collieries Company Limited"),
    r"\b(?:NEC|North\s+Eastern\s+Coalfields)\b": ("NEC", "North Eastern Coalfields"),
    r"\b(?:CMPDIL|CMPDI|Central\s+Mine\s+Planning\s*(?:&|and)\s*Design\s+Institute(?:\s+Limited)?)\b": ("CMPDIL", "Central Mine Planning & Design Institute Limited"),
    r"\b(?:CIL|Coal\s+India\s*(?:Limited)?)\b": ("CIL", "Coal India Limited"),
    r"\b(?:Ministry\s+of\s+Coal|MOC)\b": ("Ministry of Coal", "Ministry of Coal"),
    r"\b(?:CCO|Coal\s+Controller(?:'s)?\s+Organization)\b": ("CCO", "Coal Controller's Organization"),
}

# Known Major Mines in India
KNOWN_MINES = [
    ("Gevra", "Opencast"), ("Kusmunda", "Opencast"), ("Dipka", "Opencast"),
    ("Jayant", "Opencast"), ("Dudhichua", "Opencast"), ("Nigahi", "Opencast"),
    ("Amlohri", "Opencast"), ("Bina", "Opencast"), ("Khadia", "Opencast"),
    ("Jhingurdah", "Opencast"), ("Block B", "Opencast"), ("Rajmahal", "Opencast"),
    ("Piparwar", "Opencast"), ("Ashoka", "Opencast"), ("Magadh", "Opencast"),
    ("Amrapali", "Opencast"), ("Bhubaneswari", "Opencast"), ("Lakhanpur", "Opencast"),
    ("Samaleswari", "Opencast"), ("Belpahar", "Opencast"), ("Kulda", "Opencast"),
    ("Kaniha", "Opencast"), ("Ananta", "Opencast"), ("Lingaraj", "Opencast"),
    ("Bharatpur", "Opencast"), ("Hingula", "Opencast"), ("Jagannath", "Opencast"),
    ("Sonepur Bazari", "Opencast"), ("Rajrappa", "Opencast"), ("Kathara", "Opencast"),
    ("Dhori", "Opencast"), ("Bokaro", "Opencast"), ("Kargali", "Opencast"),
    ("Chirimiri", "Underground"), ("Hasdeo", "Underground"), ("Churcha", "Underground"),
    ("Moonidih", "Underground"), ("Jharia", "Underground"), ("Raniganj", "Underground")
]

# District to State Mapping for Mining Regions
DISTRICT_STATE_MAP = {
    "korba": ("Korba", "Chhattisgarh"),
    "raigarh": ("Raigarh", "Chhattisgarh"),
    "bilaspur": ("Bilaspur", "Chhattisgarh"),
    "surguja": ("Surguja", "Chhattisgarh"),
    "surajpur": ("Surajpur", "Chhattisgarh"),
    "korea": ("Korea", "Chhattisgarh"),
    "dhanbad": ("Dhanbad", "Jharkhand"),
    "bokaro": ("Bokaro", "Jharkhand"),
    "ranchi": ("Ranchi", "Jharkhand"),
    "ramgarh": ("Ramgarh", "Jharkhand"),
    "hazaribagh": ("Hazaribagh", "Jharkhand"),
    "chatra": ("Chatra", "Jharkhand"),
    "godda": ("Godda", "Jharkhand"),
    "palamu": ("Palamu", "Jharkhand"),
    "angul": ("Angul", "Odisha"),
    "jharsuguda": ("Jharsuguda", "Odisha"),
    "sundargarh": ("Sundargarh", "Odisha"),
    "sundergarh": ("Sundargarh", "Odisha"),
    "sambalpur": ("Sambalpur", "Odisha"),
    "paschim bardhaman": ("Paschim Bardhaman", "West Bengal"),
    "purba bardhaman": ("Purba Bardhaman", "West Bengal"),
    "asansol": ("Paschim Bardhaman", "West Bengal"),
    "birbhum": ("Birbhum", "West Bengal"),
    "singrauli": ("Singrauli", "Madhya Pradesh"),
    "sidhi": ("Sidhi", "Madhya Pradesh"),
    "umaria": ("Umaria", "Madhya Pradesh"),
    "shahdol": ("Shahdol", "Madhya Pradesh"),
    "betul": ("Betul", "Madhya Pradesh"),
    "chhindwara": ("Chhindwara", "Madhya Pradesh"),
    "chandrapur": ("Chandrapur", "Maharashtra"),
    "nagpur": ("Nagpur", "Maharashtra"),
    "yavatmal": ("Yavatmal", "Maharashtra"),
    "khammam": ("Khammam", "Telangana"),
    "bhadradri kothagudem": ("Bhadradri Kothagudem", "Telangana"),
    "mancherial": ("Mancherial", "Telangana"),
    "peddapalli": ("Peddapalli", "Telangana")
}

INDIAN_STATES = [
    "Chhattisgarh", "Jharkhand", "Odisha", "West Bengal", "Madhya Pradesh",
    "Maharashtra", "Telangana", "Assam", "Meghalaya", "Uttar Pradesh", "Bihar"
]

REPORT_TYPES = [
    ("Annual Report", r"\bannual\s+report\b"),
    ("Monthly Production Report", r"\b(?:monthly\s+production|month\s+wise\s+production)\b"),
    ("Geological Exploration Report", r"\b(?:geological\s+report|geological\s+resources?|exploration\s+report|borehole\s+log)\b"),
    ("Parliamentary Q&A", r"\b(?:lok\s+sabha|rajya\s+sabha|parliamentary\s+question|starred\s+question|unstarred\s+question)\b"),
    ("Ministry Report", r"\b(?:ministry\s+of\s+coal|standing\s+committee|coal\s+directory)\b"),
    ("Coal Quality Report", r"\b(?:coal\s+quality|grade\s+wise|gcv|sampling\s+analysis)\b"),
    ("Mine Master Statistics", r"\b(?:mine\s+master|mine\s+statistics|coalfield\s+data)\b"),
]


def extract_report_metadata(text: str, filename: str = "") -> Dict[str, Any]:
    """Extract report title, report type, issuing organization, financial year, and date."""
    metadata = {
        "reportTitle": None,
        "reportType": "General Mining Document",
        "financialYear": None,
        "reportDate": None,
        "issuingOrganization": None
    }

    # 1. Report Type
    for rtype, pattern in REPORT_TYPES:
        if re.search(pattern, text, re.IGNORECASE) or re.search(pattern, filename, re.IGNORECASE):
            metadata["reportType"] = rtype
            break

    # 2. Report Title
    # Look for explicit titles in the first 1000 characters or derive from filename
    first_chunk = text[:1200]
    title_match = re.search(
        r"(?:Report\s+Title|Document\s+Title|Title|Subject)[:\s\-]+([^\n\r]{6,80})",
        first_chunk,
        re.IGNORECASE
    )
    if title_match:
        metadata["reportTitle"] = title_match.group(1).strip()
    elif filename:
        clean_name = os.path.splitext(filename)[0].replace("_", " ").replace("-", " ")
        metadata["reportTitle"] = clean_name.title()
    elif metadata["reportType"] != "General Mining Document":
        metadata["reportTitle"] = f"{metadata['reportType']}"

    # 3. Issuing Organization
    for pattern, (abbr, full_name) in SUBSIDIARY_PATTERNS.items():
        if re.search(pattern, first_chunk, re.IGNORECASE):
            metadata["issuingOrganization"] = abbr
            break
    if not metadata["issuingOrganization"] and "coal" in text.lower():
        metadata["issuingOrganization"] = "Coal India Limited"

    # 4. Financial Year
    # Search for FY patterns
    fy_match = re.search(
        r"\b(?:FY|Financial\s+Year|Year)?\s*(20\d{2}[-/]\d{2,4})\b",
        first_chunk,
        re.IGNORECASE
    )
    if fy_match:
        metadata["financialYear"] = normalize_financial_year(fy_match.group(1))

    # 5. Report Date
    # Look for explicit Date: patterns
    date_match = re.search(
        r"(?:Date|Dated|As\s+on|Period\s+Ended)[:\s\-]+([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+[0-9]{4}|[A-Za-z]+\s+[0-9]{1,2},?\s+[0-9]{4})",
        first_chunk,
        re.IGNORECASE
    )
    if date_match:
        metadata["reportDate"] = normalize_date(date_match.group(1))
    else:
        # Fallback date search
        generic_date = re.search(
            r"\b([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4}|[0-9]{4}[-/][0-9]{2}[-/][0-9]{2})\b",
            first_chunk
        )
        if generic_date:
            metadata["reportDate"] = normalize_date(generic_date.group(1))

    return metadata


def extract_location_and_mine(text: str) -> Dict[str, Any]:
    """Identify subsidiary, mineName, mineType, district, state, and region."""
    loc_data = {
        "subsidiary": None,
        "mineName": None,
        "mineType": None,
        "district": None,
        "state": None,
        "region": None
    }

    # 1. Subsidiary
    # First check explicit subsidiary label
    explicit_sub = re.search(r"(?:Subsidiary|Company)[:\s\-]+([A-Za-z\s&()]+)", text, re.IGNORECASE)
    if explicit_sub:
        sub_chunk = explicit_sub.group(1)
        for pattern, (abbr, full_name) in SUBSIDIARY_PATTERNS.items():
            if abbr in ("Ministry of Coal", "CCO"):
                continue
            if re.search(pattern, sub_chunk, re.IGNORECASE):
                loc_data["subsidiary"] = abbr
                break

    if not loc_data["subsidiary"]:
        for pattern, (abbr, full_name) in SUBSIDIARY_PATTERNS.items():
            if abbr in ("Ministry of Coal", "CCO"):
                continue
            if re.search(pattern, text, re.IGNORECASE):
                loc_data["subsidiary"] = abbr
                break

    # 2. Mine Name & Mine Type
    for mine, default_mtype in KNOWN_MINES:
        mine_pat = r"\b" + re.escape(mine) + r"(?:\s+(?:OCP?|Open\s*Cast|Underground|UG|Colliery|Mine))?\b"
        match = re.search(mine_pat, text, re.IGNORECASE)
        if match:
            matched_str = match.group(0).strip()
            loc_data["mineName"] = matched_str
            # Detect mine type
            if re.search(r"\b(?:OCP?|Open\s*Cast|Opencast)\b", matched_str, re.IGNORECASE):
                loc_data["mineType"] = "Opencast"
            elif re.search(r"\b(?:UG|Underground|Under\s*Ground)\b", matched_str, re.IGNORECASE):
                loc_data["mineType"] = "Underground"
            else:
                loc_data["mineType"] = default_mtype
            break

    if not loc_data["mineType"]:
        if re.search(r"\b(?:opencast|open\s+cast|ocp)\b", text, re.IGNORECASE):
            loc_data["mineType"] = "Opencast"
        elif re.search(r"\b(?:underground|under\s+ground|ug\s+mine)\b", text, re.IGNORECASE):
            loc_data["mineType"] = "Underground"

    # 3. District & State
    for dist_key, (dist_name, state_name) in DISTRICT_STATE_MAP.items():
        if re.search(r"\b" + re.escape(dist_key) + r"\b", text, re.IGNORECASE):
            loc_data["district"] = dist_name
            loc_data["state"] = state_name
            break

    # If state not found from district, scan directly
    if not loc_data["state"]:
        for st in INDIAN_STATES:
            if re.search(r"\b" + re.escape(st) + r"\b", text, re.IGNORECASE):
                loc_data["state"] = st
                break

    # Region / Coalfield
    coalfield_match = re.search(
        r"\b([A-Za-z]+)\s+Coalfield\b",
        text,
        re.IGNORECASE
    )
    if coalfield_match:
        loc_data["region"] = f"{coalfield_match.group(1).title()} Coalfield"

    return loc_data


def extract_production_figures(text: str) -> Dict[str, Any]:
    """
    Identify and normalize production figures:
    - coalProduction
    - overburdenRemoval
    - targetProduction
    - achievedProduction
    - percentageAchievement
    - productionUnit
    """
    prod_data = {
        "coalProduction": None,
        "overburdenRemoval": None,
        "targetProduction": None,
        "achievedProduction": None,
        "percentageAchievement": None,
        "productionUnit": "MT"
    }

    # 1. Production Unit in document
    unit_match = re.search(
        r"\b(Million\s+Tonnes?|Million\s+Tonne|MT|Mt|Tonnes?|Tonne|Lakh\s+Tonnes?|LT)\b",
        text,
        re.IGNORECASE
    )
    if unit_match:
        prod_data["productionUnit"] = normalize_unit(unit_match.group(1)) or "MT"

    # 2. Target Production
    target_match = re.search(
        r"(?:Target\s*(?:Production)?|Annual\s*Target)[:\s\-]+([0-9,.]+)",
        text,
        re.IGNORECASE
    )
    if target_match:
        prod_data["targetProduction"] = normalize_number(target_match.group(1))

    # 3. Achieved Production
    achieved_match = re.search(
        r"(?:Achieved\s*(?:Production)?|Actual\s*Production|Actual)[:\s\-]+([0-9,.]+)",
        text,
        re.IGNORECASE
    )
    if achieved_match:
        prod_data["achievedProduction"] = normalize_number(achieved_match.group(1))

    # 4. Coal Production
    if prod_data["achievedProduction"]:
        prod_data["coalProduction"] = prod_data["achievedProduction"]
    else:
        coal_prod_match = re.search(
            r"(?<!Target\s)(?:Coal\s+Production(?:\s+Achieved)?|Raw\s+Coal\s+Production|Production\s+of\s+Raw\s+Coal|Total\s+Coal\s+Production|Total\s+Production)[:\s\-]+([0-9,.]+)",
            text,
            re.IGNORECASE
        )
        if coal_prod_match:
            prod_data["coalProduction"] = normalize_number(coal_prod_match.group(1))

    # 5. Overburden Removal (OBR)
    obr_match = re.search(
        r"(?:Overburden\s*(?:Removal)?|OBR)[:\s\-]+([0-9,.]+)",
        text,
        re.IGNORECASE
    )
    if obr_match:
        prod_data["overburdenRemoval"] = normalize_number(obr_match.group(1))

    # 6. Percentage Achievement
    pct_match = re.search(
        r"(?:Percentage\s+Achievement|%\s*Achievement|Achievement\s*(?:%|\(%\)))[:\s\-]+([0-9,.]+)\s*%?",
        text,
        re.IGNORECASE
    )
    if pct_match:
        prod_data["percentageAchievement"] = normalize_number(pct_match.group(1))
    elif prod_data["targetProduction"] and prod_data["coalProduction"] and prod_data["targetProduction"] > 0:
        pct = round((prod_data["coalProduction"] / prod_data["targetProduction"]) * 100, 2)
        prod_data["percentageAchievement"] = pct

    # Tabular / CSV scanning fallback if explicit key-value pairs were not detected
    if prod_data["coalProduction"] is None:
        # Search for lines like '2024-25 | 773.6 | ...' or 'CIL | 703.2'
        tab_match = re.search(
            r"\|\s*([0-9]{1,4}(?:\.[0-9]{1,3})?)\s*\|\s*([0-9]{1,4}(?:\.[0-9]{1,3})?)",
            text
        )
        if tab_match:
            val = normalize_number(tab_match.group(1))
            if val and val > 0:
                prod_data["coalProduction"] = val

    return prod_data


def extract_structured_information(document_id: str, text: str, filename: str = "", category: str = "") -> Dict[str, Any]:
    """
    Main Phase 5 Information Extraction & Normalization Pipeline:
    1. Parses clean extracted text.
    2. Identifies and extracts metadata, mining entities, and production metrics.
    3. Normalizes all dates, units, numbers, and strings.
    4. Compiles structured JSON record.
    5. Saves JSON to storage/structured_data/{documentId}.json.
    """
    clean_text = normalize_whitespace(text)

    # 1. Document metadata
    meta = extract_report_metadata(clean_text, filename)
    if not meta["reportType"] and category:
        meta["reportType"] = category

    # 2. Location & Mine Entities
    loc = extract_location_and_mine(clean_text)

    # 3. Production Figures
    prod = extract_production_figures(clean_text)

    # Compile structured record
    structured_record = {
        "documentId": document_id,
        "reportTitle": meta["reportTitle"] or "Mining Document",
        "reportType": meta["reportType"],
        "financialYear": meta["financialYear"],
        "reportDate": meta["reportDate"],
        "issuingOrganization": meta["issuingOrganization"],
        "subsidiary": loc["subsidiary"],
        "mineName": loc["mineName"],
        "mineType": loc["mineType"],
        "region": loc["region"],
        "district": loc["district"],
        "state": loc["state"],
        "coalProduction": prod["coalProduction"],
        "overburdenRemoval": prod["overburdenRemoval"],
        "targetProduction": prod["targetProduction"],
        "achievedProduction": prod["achievedProduction"],
        "percentageAchievement": prod["percentageAchievement"],
        "productionUnit": prod["productionUnit"],
        "extractedFieldsCount": 0,
        "extractedAt": datetime.now(timezone.utc).isoformat()
    }

    # Count non-null extracted fields
    non_null_fields = [k for k, v in structured_record.items() if v is not None and k not in ("documentId", "extractedFieldsCount", "extractedAt")]
    structured_record["extractedFieldsCount"] = len(non_null_fields)

    # Save to storage/structured_data/{documentId}.json
    save_structured_data(document_id, structured_record)

    return structured_record
