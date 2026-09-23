import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

# Supported mining units
SUPPORTED_UNITS = {
    "MT", "Million Tonnes", "Million Tonne", "Tonnes", "Tonne", "T",
    "Cu.M", "M.Cu.M", "m.cu.m", "mcm", "cu m", "million cubic metres",
    "Hectare", "ha", "LT", "Lakh Tonnes", "sq km", "km", "m"
}

CURRENT_YEAR = datetime.now(timezone.utc).year


def make_message(rule_id: str, field: str, severity: str, message: str) -> Dict[str, Any]:
    """Helper to structure validation messages with both ruleId and rule for full compatibility."""
    return {
        "ruleId": rule_id,
        "rule": rule_id,
        "field": field,
        "severity": severity,  # "Error" | "Warning" | "Info"
        "message": message
    }


def validate_missing_fields(record: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    VAL001: Context-aware missing mandatory field validation.
    Dynamically adapts required fields based on the detected reportType:
    - Annual Report: requires reportTitle, reportType, financialYear, issuingOrganization.
      (mineName, targetProduction, achievedProduction, coalProduction are optional).
    - Production Report: requires financialYear, coalProduction (or achievedProduction),
      targetProduction, productionUnit.
    - Mine Report: requires mineName, district, state.
    - Geological Report: requires reportTitle, reportType, issuingOrganization.
    - Other/General: requires financialYear; productionUnit if production present; warns on missing state/mine.
    """
    messages = []
    
    rtype = str(record.get("reportType") or "").lower().strip()
    rtitle = str(record.get("reportTitle") or "").lower().strip()

    is_production = "production" in rtype or "monthly" in rtype or ("production" in rtitle and not rtype)
    is_annual = "annual" in rtype or ("annual" in rtitle and (not rtype or rtype == "general mining document"))
    is_mine = "mine" in rtype or "master" in rtype or ("mine" in rtitle and not rtype)
    is_geological = "geological" in rtype or "exploration" in rtype or "borehole" in rtype or ("geological" in rtitle and not rtype)

    # --- 1. Production Report (Highest priority for production figures) ---
    if is_production:
        # Required: financialYear, coalProduction, targetProduction, productionUnit
        if not record.get("financialYear"):
            messages.append(make_message("VAL001", "financialYear", "Error", "Mandatory field 'financialYear' is missing."))
        
        has_prod = (
            record.get("coalProduction") is not None or
            record.get("achievedProduction") is not None
        )
        if not has_prod:
            messages.append(make_message("VAL001", "coalProduction", "Error", "Mandatory field 'coalProduction' is missing."))
        
        if record.get("targetProduction") is None:
            messages.append(make_message("VAL001", "targetProduction", "Error", "Mandatory field 'targetProduction' is missing for Production Report."))
            
        if not record.get("productionUnit"):
            messages.append(make_message("VAL001", "productionUnit", "Error", "Mandatory field 'productionUnit' is missing for Production Report."))
            
        # Optional: mineName, state
        if not record.get("mineName"):
            messages.append(make_message("VAL001", "mineName", "Warning", "Mine name unavailable."))
        if not record.get("state"):
            messages.append(make_message("VAL001", "state", "Warning", "State unavailable."))

    # --- 2. Annual Report ---
    elif is_annual:
        # Required: reportTitle, reportType, financialYear, issuingOrganization
        if not record.get("reportTitle"):
            messages.append(make_message("VAL001", "reportTitle", "Error", "Mandatory field 'reportTitle' is missing for Annual Report."))
        if not record.get("reportType") or record.get("reportType") == "General Mining Document":
            messages.append(make_message("VAL001", "reportType", "Error", "Mandatory field 'reportType' is missing or unspecified for Annual Report."))
        if not record.get("financialYear"):
            messages.append(make_message("VAL001", "financialYear", "Error", "Mandatory field 'financialYear' is missing."))
        if not record.get("issuingOrganization"):
            messages.append(make_message("VAL001", "issuingOrganization", "Error", "Mandatory field 'issuingOrganization' is missing for Annual Report."))
        
        # Optional: mineName, targetProduction, achievedProduction, coalProduction
        # (Do not produce errors for mineName or coalProduction in Annual Report)
        if not record.get("mineName"):
            messages.append(make_message("VAL001", "mineName", "Warning", "Mine name unavailable."))
        if not record.get("state"):
            messages.append(make_message("VAL001", "state", "Warning", "State unavailable."))

    # --- 3. Mine Report / Mine Master ---
    elif is_mine:
        # Required: mineName, district, state
        if not record.get("mineName"):
            messages.append(make_message("VAL001", "mineName", "Error", "Mandatory field 'mineName' is missing for Mine Report."))
        if not record.get("district"):
            messages.append(make_message("VAL001", "district", "Error", "Mandatory field 'district' is missing for Mine Report."))
        if not record.get("state"):
            messages.append(make_message("VAL001", "state", "Error", "Mandatory field 'state' is missing for Mine Report."))

    # --- 4. Geological Report ---
    elif is_geological:
        # Required: reportTitle, reportType, issuingOrganization
        if not record.get("reportTitle"):
            messages.append(make_message("VAL001", "reportTitle", "Error", "Mandatory field 'reportTitle' is missing for Geological Report."))
        if not record.get("reportType") or record.get("reportType") == "General Mining Document":
            messages.append(make_message("VAL001", "reportType", "Error", "Mandatory field 'reportType' is missing or unspecified for Geological Report."))
        if not record.get("issuingOrganization"):
            messages.append(make_message("VAL001", "issuingOrganization", "Error", "Mandatory field 'issuingOrganization' is missing for Geological Report."))

    # --- 5. Default / Other Mining Document ---
    else:
        if not record.get("financialYear"):
            messages.append(make_message("VAL001", "financialYear", "Error", "Mandatory field 'financialYear' is missing."))
        has_prod = (
            record.get("coalProduction") is not None or
            record.get("achievedProduction") is not None
        )
        if not has_prod:
            messages.append(make_message("VAL001", "coalProduction", "Error", "Mandatory field 'coalProduction' is missing."))
        if has_prod and not record.get("productionUnit"):
            messages.append(make_message("VAL001", "productionUnit", "Warning", "Production unit missing."))
        if not record.get("mineName"):
            messages.append(make_message("VAL001", "mineName", "Warning", "Mine name unavailable."))
        if not record.get("state"):
            messages.append(make_message("VAL001", "state", "Warning", "State unavailable."))
        if not record.get("reportType") or record.get("reportType") == "General Mining Document":
            messages.append(make_message("VAL001", "reportType", "Warning", "Specific Report Type missing or unspecified."))

    return messages


def validate_numeric_values(record: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    VAL002: Invalid numeric values (negatives or illogical numbers).
    """
    messages = []

    # Production cannot be negative
    coal_prod = record.get("coalProduction")
    if coal_prod is not None and coal_prod < 0:
        messages.append(make_message(
            "VAL002", "coalProduction", "Error",
            f"Production cannot be negative ({coal_prod})."
        ))

    # Target cannot be negative
    target_prod = record.get("targetProduction")
    if target_prod is not None and target_prod < 0:
        messages.append(make_message(
            "VAL002", "targetProduction", "Error",
            f"Target production cannot be negative ({target_prod})."
        ))

    # Achieved cannot be negative
    achieved = record.get("achievedProduction")
    if achieved is not None and achieved < 0:
        messages.append(make_message(
            "VAL002", "achievedProduction", "Error",
            f"Achieved production cannot be negative ({achieved})."
        ))

    # Overburden removal cannot be negative
    obr = record.get("overburdenRemoval")
    if obr is not None and obr < 0:
        messages.append(make_message(
            "VAL002", "overburdenRemoval", "Error",
            f"Overburden removal (OBR) cannot be negative ({obr})."
        ))

    # Percentage achievement cannot be negative
    pct = record.get("percentageAchievement")
    if pct is not None and pct < 0:
        messages.append(make_message(
            "VAL002", "percentageAchievement", "Error",
            f"Achievement percentage cannot be negative ({pct}%)."
        ))

    return messages


def validate_units(record: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    VAL003: Unit validation.
    Checks that the unit matches standard CMPDI / CIL units.
    """
    messages = []
    unit = record.get("productionUnit")
    if unit:
        normalized_unit = str(unit).strip()
        matched = False
        for valid in SUPPORTED_UNITS:
            if normalized_unit.lower() == valid.lower():
                matched = True
                break
        if not matched:
            messages.append(make_message(
                "VAL003", "productionUnit", "Warning",
                f"Unknown production unit: '{unit}'."
            ))

    return messages


def validate_dates(record: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    VAL004: Date validation.
    Verifies calendar validity and flags future dates beyond the current year.
    """
    messages = []
    report_date = record.get("reportDate")
    if not report_date:
        return messages

    # Must match YYYY-MM-DD
    date_str = str(report_date).strip()
    match = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", date_str)
    if not match:
        messages.append(make_message(
            "VAL004", "reportDate", "Error",
            f"Invalid date format: '{date_str}'. Expected YYYY-MM-DD."
        ))
        return messages

    year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
    try:
        parsed_date = datetime(year, month, day)
    except ValueError as val_err:
        messages.append(make_message(
            "VAL004", "reportDate", "Error",
            f"Impossible calendar date: '{date_str}' ({str(val_err)})."
        ))
        return messages

    # Reject future dates beyond current year
    if year > CURRENT_YEAR:
        messages.append(make_message(
            "VAL004", "reportDate", "Error",
            f"Report date '{date_str}' is in the future beyond current year ({CURRENT_YEAR})."
        ))

    return messages


def validate_financial_year(record: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    VAL005: Financial year validation.
    Standard Indian FY format: YYYY-YY (e.g. 2023-24).
    """
    messages = []
    fy = record.get("financialYear")
    if not fy:
        return messages

    fy_str = str(fy).strip()
    m = re.match(r"^(20\d{2})-(\d{2})$", fy_str)
    if not m:
        messages.append(make_message(
            "VAL005", "financialYear", "Error",
            f"Invalid Financial Year format: '{fy_str}'. Expected YYYY-YY (e.g. 2023-24)."
        ))
        return messages

    start_yr = int(m.group(1))
    end_part = int(m.group(2))
    expected_end = (start_yr + 1) % 100
    if end_part != expected_end:
        messages.append(make_message(
            "VAL005", "financialYear", "Error",
            f"Financial Year span mismatch: '{fy_str}'. Year {start_yr} should end in {expected_end:02d}."
        ))

    return messages


def validate_percentage(record: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    VAL006: Percentage mismatch validation.
    If target and achieved exist, compares reported achievement % with calculated ratio.
    """
    messages = []
    target = record.get("targetProduction")
    achieved = record.get("achievedProduction") or record.get("coalProduction")
    reported_pct = record.get("percentageAchievement")

    if target is not None and achieved is not None and target > 0 and reported_pct is not None:
        expected_pct = round((float(achieved) / float(target)) * 100.0, 2)
        diff = abs(float(reported_pct) - expected_pct)
        if diff > 1.0:
            messages.append(make_message(
                "VAL006", "percentageAchievement", "Warning",
                f"Percentage mismatch: reported {reported_pct}% but calculated {expected_pct}% from target {target} and achieved {achieved}."
            ))

    return messages


def validate_duplicate_document(
    document_id: str,
    filename: str = "",
    file_hash: Optional[str] = None,
    existing_documents: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    """
    VAL007: Duplicate document validation.
    Checks for duplicate documentId, identical filename, or matching SHA-256 hash.
    """
    messages = []
    if not existing_documents:
        return messages

    for doc in existing_documents:
        other_id = doc.get("documentId")
        if other_id == document_id:
            continue

        # Check content SHA-256 hash match
        other_hash = doc.get("fileHash")
        if file_hash and other_hash and file_hash == other_hash:
            messages.append(make_message(
                "VAL007", "fileHash", "Error",
                f"Duplicate file content detected (matches document '{other_id}' with SHA-256 hash)."
            ))
            break

        # Check filename duplicate
        other_name = doc.get("originalName") or doc.get("filename")
        if filename and other_name and filename.lower() == other_name.lower():
            messages.append(make_message(
                "VAL007", "filename", "Info",
                f"Duplicate filename detected in repository: '{filename}'."
            ))
            break

    return messages


def validate_logical_production(record: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    VAL008: Logical production inconsistency validation.
    Examples:
    - Target is 0, but positive production is reported.
    - Achieved production differs from coal production when both are reported.
    """
    messages = []
    target = record.get("targetProduction")
    coal_prod = record.get("coalProduction")
    achieved = record.get("achievedProduction")

    if target == 0 and coal_prod and coal_prod > 0:
        messages.append(make_message(
            "VAL008", "targetProduction", "Warning",
            f"Production recorded ({coal_prod}) but target is zero."
        ))

    if coal_prod is not None and achieved is not None:
        if abs(float(coal_prod) - float(achieved)) > 0.01:
            messages.append(make_message(
                "VAL008", "productionInconsistency", "Warning",
                f"Achieved production ({achieved}) differs from reported coal production ({coal_prod})."
            ))

    return messages


def validate_ocr_confidence(confidence: Optional[float]) -> List[Dict[str, Any]]:
    """
    VAL009: OCR confidence validation.
    <50%: Warning (Poor OCR quality)
    50-80%: Info (Moderate quality)
    >80% or None (digital layer): Info (High quality)
    """
    messages = []
    if confidence is not None:
        conf_val = float(confidence)
        if conf_val < 50.0:
            messages.append(make_message(
                "VAL009", "ocrConfidence", "Warning",
                f"Poor OCR quality (confidence: {conf_val}%)."
            ))
        elif conf_val <= 80.0:
            messages.append(make_message(
                "VAL009", "ocrConfidence", "Info",
                f"Moderate OCR recognition quality (confidence: {conf_val}%)."
            ))
        else:
            messages.append(make_message(
                "VAL009", "ocrConfidence", "Info",
                f"High OCR recognition quality (confidence: {conf_val}%)."
            ))
    return messages


def validate_structured_richness(record: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    VAL010: Low information document validation.
    If fewer than 5 structured fields are populated, flags as low information document.
    """
    messages = []
    key_fields = [
        "reportTitle", "reportType", "financialYear", "reportDate",
        "issuingOrganization", "subsidiary", "mineName", "mineType",
        "district", "state", "coalProduction", "targetProduction",
        "achievedProduction", "overburdenRemoval", "percentageAchievement"
    ]

    populated_count = sum(1 for field in key_fields if record.get(field) is not None and record.get(field) != "")

    if populated_count < 5:
        messages.append(make_message(
            "VAL010", "structuredRichness", "Warning",
            f"Low information document (only {populated_count} structured fields detected)."
        ))

    return messages
