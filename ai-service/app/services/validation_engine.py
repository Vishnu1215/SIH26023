import os
import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from app.core.config import settings
from app.services.validation_rules import (
    validate_missing_fields,
    validate_numeric_values,
    validate_units,
    validate_dates,
    validate_financial_year,
    validate_percentage,
    validate_duplicate_document,
    validate_logical_production,
    validate_ocr_confidence,
    validate_structured_richness
)
from app.services.validation_storage import save_validation_report

logger = logging.getLogger("ai_service.validation_engine")

# Trace log file path
VALIDATION_LOG_FILE = os.path.join(settings.LOGS_STORAGE_DIR, "validation.log")


def _append_trace_log(document_id: str, rule_id: str, rule_name: str, result: str, elapsed_ms: float, messages: List[Dict[str, Any]]):
    """
    Requirement 11: Validation Rule Traceability & Debug Logging.
    Appends lightweight per-rule trace logs to storage/logs/validation.log.
    """
    try:
        os.makedirs(settings.LOGS_STORAGE_DIR, exist_ok=True)
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        msg_summary = "; ".join([m.get("message", "") for m in messages]) if messages else "None"
        log_line = (
            f"[{ts}] doc={document_id} | rule={rule_id} ({rule_name}) | "
            f"executed=Yes | result={result} | time={elapsed_ms:.2f}ms | msgs={msg_summary}\n"
        )
        with open(VALIDATION_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(log_line)
    except Exception as log_err:
        logger.debug(f"Could not append validation trace log: {log_err}")


def validate_document(
    document_id: str,
    structured_data: Optional[Dict[str, Any]] = None,
    confidence: Optional[float] = None,
    filename: str = "",
    file_hash: Optional[str] = None,
    existing_documents: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Phase 6 Validation Engine & Discrepancy Detection:
    Runs all 10 deterministic validation rules with:
    - Context-aware mandatory field checking (Issue 2)
    - Lightweight per-rule debug traceability (Requirement 11)
    - Message deduplication (Issue 9)
    - Strict prioritization & sorting (Errors -> Warnings -> Info) (Issue 4)
    - Multi-line structured validation summary (Issue 3)
    - Execution time tracking and history preservation (Issue 7)
    """
    start_time = time.time()
    record = structured_data or {}

    raw_messages: List[Dict[str, Any]] = []

    # 10 Deterministic validation rules pipeline
    rules_pipeline = [
        ("VAL001", "Missing Mandatory Fields", lambda: validate_missing_fields(record)),
        ("VAL002", "Invalid Numeric Values", lambda: validate_numeric_values(record)),
        ("VAL003", "Unit Validation", lambda: validate_units(record)),
        ("VAL004", "Date Validation", lambda: validate_dates(record)),
        ("VAL005", "Financial Year Format", lambda: validate_financial_year(record)),
        ("VAL006", "Percentage Achievement", lambda: validate_percentage(record)),
        ("VAL007", "Duplicate Document", lambda: validate_duplicate_document(
            document_id=document_id,
            filename=filename,
            file_hash=file_hash,
            existing_documents=existing_documents
        )),
        ("VAL008", "Logical Production", lambda: validate_logical_production(record)),
        ("VAL009", "OCR Confidence", lambda: validate_ocr_confidence(confidence)),
        ("VAL010", "Structured Richness", lambda: validate_structured_richness(record)),
    ]

    # Execute rules with timing and trace logging (Requirement 11)
    for rule_id, rule_name, rule_fn in rules_pipeline:
        r_start = time.time()
        try:
            rule_msgs = rule_fn()
        except Exception as r_err:
            logger.error(f"Rule {rule_id} encountered execution error: {r_err}", exc_info=True)
            rule_msgs = [{
                "ruleId": rule_id,
                "rule": rule_id,
                "field": "validationEngine",
                "severity": "Warning",
                "message": f"Rule execution anomaly: {str(r_err)}"
            }]

        r_elapsed_ms = (time.time() - r_start) * 1000.0
        result_str = "Passed" if len(rule_msgs) == 0 else f"Failed ({len(rule_msgs)} issue(s))"

        # Requirement 11: Per-rule debug logging
        logger.debug(
            f"[RuleTrace] doc={document_id} rule={rule_id} ({rule_name}) "
            f"executed=Yes result={result_str} time={r_elapsed_ms:.2f}ms issues={len(rule_msgs)}"
        )
        _append_trace_log(document_id, rule_id, rule_name, result_str, r_elapsed_ms, rule_msgs)

        raw_messages.extend(rule_msgs)

    # Issue 9: Prevent Duplicate Messages
    seen_signatures = set()
    deduped_messages: List[Dict[str, Any]] = []
    for msg in raw_messages:
        rule_key = msg.get("ruleId") or msg.get("rule") or "VAL000"
        # Ensure both rule and ruleId are always present
        msg["ruleId"] = rule_key
        msg["rule"] = rule_key
        field_key = str(msg.get("field") or "").strip().lower()
        msg_text = str(msg.get("message") or "").strip()

        # Deduplication signature based on rule, field, and message
        sig = (rule_key, field_key, msg_text)
        if sig in seen_signatures:
            continue
        seen_signatures.add(sig)
        deduped_messages.append(msg)

    # Issue 4: Validation Message Ordering (Errors -> Warnings -> Info, sorted by Rule ID)
    severity_order = {"error": 0, "warning": 1, "info": 2}
    sorted_messages = sorted(
        deduped_messages,
        key=lambda m: (
            severity_order.get(str(m.get("severity") or "").lower(), 3),
            str(m.get("ruleId") or m.get("rule") or "")
        )
    )

    # Compute discrepancy counts
    error_count = sum(1 for m in sorted_messages if m.get("severity") == "Error")
    warning_count = sum(1 for m in sorted_messages if m.get("severity") == "Warning")
    info_count = sum(1 for m in sorted_messages if m.get("severity") == "Info")

    # Compute unique rule IDs triggered
    rules_triggered = sorted(list({m.get("ruleId") for m in sorted_messages if m.get("ruleId")}))

    # Issue 5: Scoring Formula (Base 100, -20 per Error, -5 per Warning)
    score = 100 - (error_count * 20) - (warning_count * 5)
    score = max(0, min(100, score))

    # Overall Status Classification
    if error_count > 0:
        status = "Error"
    elif warning_count > 0:
        status = "Warning"
    else:
        status = "Valid"

    # Execution time
    validation_time = round(time.time() - start_time, 4)

    # Issue 3: Structured Deterministic Validation Summary
    if status == "Valid":
        summary = (
            "Validation completed successfully.\n\n"
            f"Status: Valid (Score: {score}/100)\n\n"
            "All integrity, formatting, and consistency checks passed."
        )
    elif status == "Error":
        primary_err = next(
            (m.get("message") for m in sorted_messages if m.get("severity") == "Error"),
            "Integrity discrepancy detected."
        )
        warning_bullets = [m.get("message") for m in sorted_messages if m.get("severity") == "Warning"]
        
        summary_lines = [
            "Validation completed.",
            "",
            f"Status: Error (Score: {score}/100)",
            "",
            "Primary Issue:",
            primary_err
        ]
        if warning_bullets:
            summary_lines.append("")
            summary_lines.append("Warnings:")
            for wb in warning_bullets[:5]:
                summary_lines.append(f"• {wb}")
        summary = "\n".join(summary_lines)
    else:
        warning_bullets = [m.get("message") for m in sorted_messages if m.get("severity") == "Warning"]
        summary_lines = [
            "Validation completed with warnings.",
            "",
            f"Status: Warning (Score: {score}/100)",
            "",
            "Warnings:"
        ]
        for wb in warning_bullets[:5]:
            summary_lines.append(f"• {wb}")
        summary = "\n".join(summary_lines)

    report = {
        "documentId": document_id,
        "validationStatus": status,
        "validationScore": score,
        "validationSummary": summary,
        "validationMessages": sorted_messages,
        "messages": sorted_messages,  # Backward compatible alias
        "rulesTriggered": rules_triggered,
        "errorCount": error_count,
        "warningCount": warning_count,
        "infoCount": info_count,
        "validationTime": validation_time,
        "validatedAt": datetime.now(timezone.utc).isoformat()
    }

    # Persist report to storage/validation/{documentId}.json
    try:
        save_validation_report(document_id, report)
    except Exception as save_err:
        logger.warning(f"Could not persist validation report for {document_id}: {save_err}")

    return report
