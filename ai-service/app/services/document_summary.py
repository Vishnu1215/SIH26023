"""
Phase 9 - Module 5: Deterministic Template-Driven Document Summary.
Constructs verified, factual executive summaries directly from structured metadata,
validation engine scores, and classification outputs.
Strictly zero LLM / zero text generation / zero hallucination.
"""

from typing import Dict, Any, List


def generate_executive_summary(
    classification: Dict[str, Any],
    structured_data: Dict[str, Any],
    validation_data: Dict[str, Any] = None,
    topics: List[Dict[str, Any]] = None
) -> str:
    """
    Synthesize factual, deterministic executive summary paragraphs.
    Every sentence directly reflects validated parameters.
    """
    category = classification.get("documentCategory", "Report")
    sub = structured_data.get("subsidiary")
    org = structured_data.get("issuingOrganization") or sub or "Ministry of Coal enterprise"
    fy = structured_data.get("financialYear")
    mine = structured_data.get("mineName")
    mine_type = structured_data.get("mineType")
    state = structured_data.get("state")
    district = structured_data.get("district")
    prod = structured_data.get("coalProduction")
    unit = structured_data.get("productionUnit") or "MT"
    target = structured_data.get("targetProduction")
    achieved = structured_data.get("achievedProduction")
    pct = structured_data.get("percentageAchievement")
    obr = structured_data.get("overburdenRemoval")

    val_score = validation_data.get("validationScore") if validation_data else None
    val_status = validation_data.get("validationStatus") if validation_data else None
    err_count = validation_data.get("errorCount", 0) if validation_data else 0
    warn_count = validation_data.get("warningCount", 0) if validation_data else 0

    sentences = []

    # Sentence 1: Identification & Jurisdiction
    org_ref = f"{org}" if org else "CMPDI"
    if sub and sub != org:
        org_ref = f"{org} ({sub})"

    fy_str = f"during Financial Year {fy}" if (fy and fy != "N/A") else "for standard operational monitoring"
    sentences.append(f"This {category} document records statutory operations for {org_ref} {fy_str}.")

    # Sentence 2: Mining location & colliery
    loc_parts = []
    if mine and mine != "N/A":
        m_desc = f"{mine} Mine"
        if mine_type and mine_type != "N/A":
            m_desc += f" ({mine_type})"
        loc_parts.append(m_desc)
    if district and district != "N/A":
        loc_parts.append(f"in {district} district")
    if state and state != "N/A":
        loc_parts.append(f"{state}")

    if loc_parts:
        sentences.append(f"Operational data pertains to {', '.join(loc_parts)}.")

    # Sentence 3: Quantitative Production & Targets
    prod_parts = []
    if prod is not None and prod != 0:
        prod_parts.append(f"total coal production of {prod:,.2f} {unit}")
    if target is not None and target != 0:
        prod_parts.append(f"target production of {target:,.2f} {unit}")
    if pct is not None and pct != 0:
        prod_parts.append(f"achievement rate of {pct:.1f}%")
    if obr is not None and obr != 0:
        prod_parts.append(f"overburden removal of {obr:,.2f} CuM")

    if prod_parts:
        sentences.append(f"Key physical metrics record {', '.join(prod_parts)}.")

    # Sentence 4: Validation Quality Health
    if val_score is not None:
        status_str = f"{val_status} (Score: {val_score}/100)"
        issues = []
        if err_count > 0:
            issues.append(f"{err_count} statutory error(s)")
        if warn_count > 0:
            issues.append(f"{warn_count} warning(s)")
        issues_str = f" with {', '.join(issues)}" if issues else " with zero discrepancies flagged"
        sentences.append(f"Data integrity audit classifies this record as {status_str}{issues_str}.")

    # Sentence 5: Core Topic Focus
    if topics and len(topics) > 0:
        top_topic_names = [t["topic"] for t in topics[:3]]
        sentences.append(f"Primary analytical subject matter centers on {', '.join(top_topic_names)}.")

    return " ".join(sentences)
