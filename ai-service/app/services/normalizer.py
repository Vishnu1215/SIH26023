import re
from datetime import datetime
from typing import Optional, Union


# Unit normalization mapping (ordered by specificity)
UNIT_MAPPINGS = [
    # Volume / Overburden (check first because of 'm' / 'cu m')
    (r"^(?:million\s+cubic\s+metres?|million\s+cubic\s+meters?|million\s+cu\.?\s*m\.?|mcm|m\.?cu\.?m\.?)$", "M.Cu.M"),
    (r"^(?:cubic\s+metres?|cubic\s+meters?|cu\.?\s*m\.?)$", "Cu.M"),
    # Area
    (r"^(?:square\s+kilometres?|square\s+kilometers?|sq\.?\s*km\.?|sqkm)$", "sq km"),
    (r"^(?:hectares?|ha\.?)$", "ha"),
    # Weight / Mass
    (r"^(?:million\s+tonnes?|million\s+tons?|mt|million\s+tonne)$", "MT"),
    (r"^(?:lakh\s+tonnes?|lakh\s+tons?|lt)$", "LT"),
    (r"^(?:tonnes?|tons?|t)$", "T"),
    # Distance
    (r"^(?:kilometres?|kilometers?|km)$", "km"),
    (r"^(?:metres?|meters?|m)$", "m"),
]

# Month name mapping
MONTH_MAP = {
    "january": 1, "jan": 1,
    "february": 2, "feb": 2,
    "march": 3, "mar": 3,
    "april": 4, "apr": 4,
    "may": 5,
    "june": 6, "jun": 6,
    "july": 7, "jul": 7,
    "august": 8, "aug": 8,
    "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10,
    "november": 11, "nov": 11,
    "december": 12, "dec": 12
}


def normalize_whitespace(text: str) -> str:
    """Normalize excess whitespace, tabs, and newlines."""
    if not text:
        return ""
    # Replace non-breaking spaces
    text = text.replace("\xa0", " ")
    # Replace multiple spaces with single space
    text = re.sub(r"[ \t]+", " ", text)
    # Replace multiple consecutive newlines with double newline
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()


def normalize_number(value_str: Union[str, int, float, None]) -> Optional[float]:
    """
    Remove commas and parse numeric value.
    Example: '1,25,000' -> 125000.0, '165.50' -> 165.5
    """
    if value_str is None:
        return None
    if isinstance(value_str, (int, float)):
        return round(float(value_str), 2)

    cleaned = str(value_str).strip().replace(",", "").replace(" ", "")
    # Match standard float/int pattern
    match = re.search(r"[-+]?\d+(?:\.\d+)?", cleaned)
    if match:
        try:
            num = float(match.group(0))
            return int(num) if num.is_integer() else round(num, 2)
        except ValueError:
            return None
    return None


def normalize_unit(unit_str: Optional[str]) -> Optional[str]:
    """
    Normalize unit strings according to CIL/CMPDI standards.
    Example: 'Million Tonnes' -> 'MT', 'Kilometre' -> 'km', 'Hectare' -> 'ha'
    """
    if not unit_str:
        return None

    cleaned = unit_str.strip().lower()
    for pattern, normalized in UNIT_MAPPINGS:
        if re.search(pattern, cleaned, re.IGNORECASE):
            return normalized

    # Substring fallback with boundary
    for pattern, normalized in UNIT_MAPPINGS:
        sub_pat = pattern.strip("^$")
        if re.search(rf"\b{sub_pat}\b", cleaned, re.IGNORECASE):
            return normalized

    return unit_str.strip()


def normalize_date(date_str: Optional[str]) -> Optional[str]:
    """
    Normalize dates into YYYY-MM-DD.
    Handles:
    - 31-03-2025, 31/03/2025
    - 2025-03-31, 2025/03/31
    - 31st March 2025, 31 March, 2025, March 31, 2025
    - 31-Mar-2025
    """
    if not date_str:
        return None

    cleaned = str(date_str).strip()
    # Strip ordinal suffixes: 1st, 2nd, 3rd, 4th
    cleaned = re.sub(r"(\d+)(?:st|nd|rd|th)\b", r"\1", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.replace(",", " ").replace(".", "-").replace("/", "-")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # Pattern 1: YYYY-MM-DD
    m1 = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", cleaned)
    if m1:
        year, month, day = int(m1.group(1)), int(m1.group(2)), int(m1.group(3))
        try:
            return datetime(year, month, day).strftime("%Y-%m-%d")
        except ValueError:
            pass

    # Pattern 2: DD-MM-YYYY
    m2 = re.match(r"^(\d{1,2})-(\d{1,2})-(\d{4})$", cleaned)
    if m2:
        day, month, year = int(m2.group(1)), int(m2.group(2)), int(m2.group(3))
        try:
            return datetime(year, month, day).strftime("%Y-%m-%d")
        except ValueError:
            pass

    # Pattern 3: DD MonthName YYYY (e.g., 31 March 2025)
    m3 = re.match(r"^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$", cleaned)
    if m3:
        day = int(m3.group(1))
        mon_str = m3.group(2).lower()
        year = int(m3.group(3))
        if mon_str in MONTH_MAP:
            try:
                return datetime(year, MONTH_MAP[mon_str], day).strftime("%Y-%m-%d")
            except ValueError:
                pass

    # Pattern 4: MonthName DD YYYY (e.g., March 31 2025)
    m4 = re.match(r"^([a-zA-Z]+)\s+(\d{1,2})\s+(\d{4})$", cleaned)
    if m4:
        mon_str = m4.group(1).lower()
        day = int(m4.group(2))
        year = int(m4.group(3))
        if mon_str in MONTH_MAP:
            try:
                return datetime(year, MONTH_MAP[mon_str], day).strftime("%Y-%m-%d")
            except ValueError:
                pass

    # Pattern 5: DD-Mon-YYYY (e.g., 31-Mar-2025)
    m5 = re.match(r"^(\d{1,2})-([a-zA-Z]+)-(\d{4})$", cleaned)
    if m5:
        day = int(m5.group(1))
        mon_str = m5.group(2).lower()
        year = int(m5.group(3))
        if mon_str in MONTH_MAP:
            try:
                return datetime(year, MONTH_MAP[mon_str], day).strftime("%Y-%m-%d")
            except ValueError:
                pass

    return None


def normalize_financial_year(fy_str: Optional[str]) -> Optional[str]:
    """
    Normalize Financial Year strings into 'YYYY-YY' or 'YYYY-YYYY'.
    Examples:
    - '2024-25', '2024-2025', 'FY 2024-25', 'FY24-25' -> '2024-25'
    """
    if not fy_str:
        return None

    cleaned = str(fy_str).strip()
    # Match standard 2024-25 or 2024-2025
    m = re.search(r"\b(20\d{2})[-/](\d{2,4})\b", cleaned)
    if m:
        start_year = m.group(1)
        end_part = m.group(2)
        if len(end_part) == 4:
            end_part = end_part[2:]
        return f"{start_year}-{end_part}"

    # Match FY24-25
    m2 = re.search(r"FY\s*(\d{2})[-/](\d{2})", cleaned, re.IGNORECASE)
    if m2:
        return f"20{m2.group(1)}-{m2.group(2)}"

    return fy_str.strip()
