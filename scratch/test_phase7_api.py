import os
import sys
import asyncio

AI_SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ai-service"))
if AI_SERVICE_DIR not in sys.path:
    sys.path.insert(0, AI_SERVICE_DIR)

from app.api.analytics import (
    get_analytics_dashboard,
    get_subsidiary_analytics,
    get_state_analytics,
    get_financial_years_analytics,
    get_quality_analytics,
    recompute_analytics,
    RecomputeRequest
)

async def test_api_handlers():
    print("Testing Phase 7 API Handlers directly...")

    # 1. recompute_analytics
    req = RecomputeRequest()
    recomp_res = await recompute_analytics(req)
    assert recomp_res.status == "success"
    assert recomp_res.analyticsGenerated is True
    print("  [OK] recompute_analytics executed successfully")

    # 2. get_analytics_dashboard
    dash = await get_analytics_dashboard()
    assert dash["status"] == "success"
    assert "production" in dash
    assert "validation" in dash
    assert "subsidiaries" in dash
    assert "states" in dash
    assert "financialYears" in dash
    assert "rankings" in dash
    assert "quality" in dash
    print("  [OK] get_analytics_dashboard returned full dashboard")

    # 3. get_subsidiary_analytics
    subs = await get_subsidiary_analytics()
    assert subs["status"] == "success"
    assert "subsidiaries" in subs
    print("  [OK] get_subsidiary_analytics returned subsidiaries list")

    # 4. get_state_analytics
    states = await get_state_analytics()
    assert states["status"] == "success"
    assert "states" in states
    print("  [OK] get_state_analytics returned states list")

    # 5. get_financial_years_analytics
    fys = await get_financial_years_analytics()
    assert fys["status"] == "success"
    assert "financialYears" in fys
    print("  [OK] get_financial_years_analytics returned FY trends")

    # 6. get_quality_analytics
    qual = await get_quality_analytics()
    assert qual["status"] == "success"
    assert "quality" in qual
    print("  [OK] get_quality_analytics returned quality indicators")

    print("ALL PHASE 7 API ROUTE HANDLERS PASSED SUCCESSFULLY!")
    return True

if __name__ == "__main__":
    success = asyncio.run(test_api_handlers())
    sys.exit(0 if success else 1)
