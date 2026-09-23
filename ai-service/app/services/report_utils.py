"""
Utility functions, styling constants, and branding standards for Phase 8 Report Generator.
All reports strictly adhere to Government of India / Ministry of Coal / CMPDI branding.
"""

from datetime import datetime, timezone
from typing import Any, Optional

# Official Ministry of Coal / CMPDI Branding
BRANDING = {
    "republic": "GOVERNMENT OF INDIA",
    "ministry": "MINISTRY OF COAL",
    "institution": "Central Mine Planning & Design Institute Limited (CMPDI)",
    "system_name": "AI-Powered Geological, Mining & Reporting Analytics Platform",
    "slogan": "Autonomous Data Extraction, Validation & Deterministic Executive Analytics",
    "classification": "OFFICIAL / FOR STATUTORY & ADMINISTRATIVE USE ONLY",
    "footer_notice": "Generated deterministically by SIH26023 Reporting Engine (Phase 8). Source: CMPDI Analytics."
}

# Theme Colors
COLORS = {
    "primary": "#0f172a",       # Slate 900
    "primary_light": "#1e293b", # Slate 800
    "secondary": "#1e3a8a",     # Navy Blue
    "accent": "#d97706",        # Amber Gold
    "text": "#0f172a",          # Dark Slate
    "text_muted": "#64748b",    # Slate 500
    "bg_light": "#f8fafc",      # Slate 50
    "bg_alt": "#f1f5f9",        # Slate 100
    "border": "#cbd5e1",        # Slate 300
    "success": "#16a34a",       # Green 600
    "warning": "#d97706",       # Amber 600
    "danger": "#dc2626",        # Red 600
    "white": "#ffffff"
}

# Validation Rule Master Catalog (VAL001 - VAL010)
VALIDATION_RULES = {
    "VAL001": {"name": "Missing Mandatory Fields", "severity": "Error", "description": "Verification that mandatory fields (Title, Organization, Production) are present."},
    "VAL002": {"name": "Invalid Numeric Values", "severity": "Error", "description": "Detects negative, non-numeric, or corrupt numeric quantities."},
    "VAL003": {"name": "Unknown Measurement Units", "severity": "Warning", "description": "Verifies unit normalization to standardized units (MT, Tonnes, CuM)."},
    "VAL004": {"name": "Invalid Date Formats", "severity": "Warning", "description": "Ensures dates match ISO 8601 YYYY-MM-DD standard format."},
    "VAL005": {"name": "Financial Year Format Mismatch", "severity": "Warning", "description": "Validates Indian financial year format (e.g. 2024-25 or 2024–25)."},
    "VAL006": {"name": "Percentage Calculation Mismatch", "severity": "Warning", "description": "Verifies achievement % = (Achieved / Target) * 100 within tolerance."},
    "VAL007": {"name": "Duplicate Document Detection", "severity": "Error", "description": "Identifies exact hash, duplicate filename, or duplicate title collisions."},
    "VAL008": {"name": "Production Inconsistency & Outliers", "severity": "Warning", "description": "Flags production values exceeding statutory limits or negative variance."},
    "VAL009": {"name": "Low OCR Confidence", "severity": "Warning", "description": "Flags scanned records with average OCR confidence below threshold (80%)."},
    "VAL010": {"name": "Low Information Document", "severity": "Warning", "description": "Identifies records extracting fewer than 3 standard mining fields."}
}


def format_number(val: Any, decimals: int = 2) -> str:
    """Format any numeric value into standard Indian/International formatted string."""
    if val is None or val == "":
        return "0.00" if decimals > 0 else "0"
    try:
        f = float(val)
        if decimals == 0:
            return f"{int(round(f)):,}"
        return f"{f:,.{decimals}f}"
    except (ValueError, TypeError):
        return str(val)


def format_pct(val: Any) -> str:
    """Format value as percentage string."""
    if val is None or val == "":
        return "0.0%"
    try:
        f = float(val)
        return f"{f:.1f}%"
    except (ValueError, TypeError):
        return "0.0%"


def format_datetime(iso_str: Optional[str]) -> str:
    """Format ISO timestamp to readable date-time string."""
    if not iso_str:
        return datetime.now(timezone.utc).strftime("%d-%b-%Y %H:%M:%S UTC")
    try:
        # Handles 2026-09-23T08:27:38.822729+00:00
        clean_str = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        return dt.strftime("%d-%b-%Y %H:%M:%S UTC")
    except Exception:
        return str(iso_str)


def format_date(iso_str: Optional[str]) -> str:
    """Format ISO timestamp or date string to readable DD-MMM-YYYY."""
    if not iso_str:
        return "N/A"
    try:
        clean_str = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        return dt.strftime("%d-%b-%Y")
    except Exception:
        return str(iso_str)


def clean_text(val: Any, fallback: str = "N/A") -> str:
    """Clean text representation for PDF/DOCX/HTML outputs."""
    if val is None:
        return fallback
    s = str(val).strip()
    return s if s else fallback
