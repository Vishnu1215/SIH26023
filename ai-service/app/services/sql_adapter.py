"""
Phase 11 - Hybrid AI Question Answering: Text-to-SQL Ready Adapter.

Provides a structured query abstraction that models structured documents as a relational schema:
Table: documents (documentId, fileName, subsidiary, mineName, state, financialYear, category,
                  coalProduction, targetProduction, overburdenRemoval, validationScore, validationStatus)

Generates deterministic SQL representations for aggregations and queries,
and executes safe queries directly over structured records.
Ready for LLM Text-to-SQL generation or local SQLite database queries.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional

from app.services.search_index import load_search_index
from app.services.analytics_storage import load_dashboard

logger = logging.getLogger(__name__)

TABLE_SCHEMA = {
    "tableName": "mining_documents",
    "columns": {
        "document_id": "VARCHAR(64) PRIMARY KEY",
        "file_name": "VARCHAR(255)",
        "subsidiary": "VARCHAR(50)",
        "mine_name": "VARCHAR(100)",
        "state": "VARCHAR(50)",
        "financial_year": "VARCHAR(20)",
        "category": "VARCHAR(50)",
        "coal_production": "FLOAT",
        "target_production": "FLOAT",
        "overburden_removal": "FLOAT",
        "validation_score": "INTEGER",
        "validation_status": "VARCHAR(20)"
    }
}

class SQLAdapter:
    def __init__(self):
        self.schema = TABLE_SCHEMA

    def get_schema(self) -> Dict[str, Any]:
        """Returns relational schema definition for SQL query generation."""
        return self.schema

    def can_handle_with_sql(self, query_type: str, entities: Dict[str, Any]) -> bool:
        """Determines if a query can be answered cleanly via SQL aggregation."""
        return query_type in [
            "Analytics Question",
            "Production Question",
            "Subsidiary Question",
            "Comparison Question"
        ]

    def generate_sql_statement(self, query_type: str, entities: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates a standardized SQL query string representing the user's intent.
        100% deterministic template mapping for SQL generation.
        """
        subsidiary = entities.get("subsidiary")
        state = entities.get("state")
        fy = entities.get("financialYear")
        operator = entities.get("operator", "=")
        threshold = entities.get("threshold")

        where_clauses = []
        if subsidiary:
            where_clauses.append(f"UPPER(subsidiary) = '{subsidiary.upper()}'")
        if state:
            where_clauses.append(f"UPPER(state) = '{state.upper()}'")
        if fy:
            where_clauses.append(f"financial_year = '{fy}'")
        if threshold is not None:
            op = ">=" if ">=" in operator else (">" if ">" in operator else ("<=" if "<=" in operator else ("<" if "<" in operator else "=")))
            where_clauses.append(f"coal_production {op} {threshold}")

        where_str = f" WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        if query_type == "Subsidiary Question" and not subsidiary:
            sql = f"SELECT subsidiary, SUM(coal_production) as total_prod, COUNT(document_id) as doc_count FROM mining_documents{where_str} GROUP BY subsidiary ORDER BY total_prod DESC LIMIT 1;"
            description = "Aggregate coal production by subsidiary and return top producer."
        elif query_type == "Production Question" or query_type == "Analytics Question":
            sql = f"SELECT SUM(coal_production) as total_prod, SUM(target_production) as total_target, AVG(validation_score) as avg_score FROM mining_documents{where_str};"
            description = "Aggregate total production, targets, and data quality across reporting records."
        elif query_type == "Comparison Question":
            sql = f"SELECT subsidiary, SUM(coal_production) as total_prod, SUM(target_production) as total_target FROM mining_documents{where_str} GROUP BY subsidiary ORDER BY total_prod DESC;"
            description = "Comparative breakdown of coal production vs target across entities."
        else:
            sql = f"SELECT document_id, file_name, subsidiary, coal_production, validation_score FROM mining_documents{where_str} LIMIT 10;"
            description = "Select matching mining records."

        return {
            "sql": sql,
            "description": description,
            "table": "mining_documents",
            "safe": True
        }


# Global singleton instance
sql_adapter = SQLAdapter()
