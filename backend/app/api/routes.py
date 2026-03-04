from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
import numpy as np
import json

from app.models.schemas import ValueStrategyInput, GrowthStrategyInput, DividendStrategyInput, QualityStrategyInput, GarpStrategyInput, DefensiveStrategyInput
from app.data_engine.loader import get_df
from app.strategies.filter_engine import filter_value_stocks, filter_growth_stocks, filter_dividend_stocks, filter_quality_stocks, filter_defensive_stocks, filter_garp_stocks
from app.strategies.scoring_engine import get_scoring_explanation

router = APIRouter()

# ============================================
# CỘT CHUNG cho tất cả trường phái
# ============================================
BASE_COLS = ['Ticker', 'sector', 'sub_sector', 'price_close', 'market_cap']
SCORE_COLS = ['score', 'score_breakdown']

def safe_columns(df, display_cols):
    """Chỉ giữ các cột thực sự tồn tại trong DataFrame."""
    return [c for c in display_cols if c in df.columns]

def safe_response(df, display_cols, period):
    """Helper: chuyển DataFrame thành JSON-safe dict, thay NaN/Inf thành None"""
    # Gộp BASE_COLS + score + display_cols, loại trùng, giữ thứ tự
    all_cols = list(dict.fromkeys(BASE_COLS + ['score'] + display_cols))
    valid_cols = safe_columns(df, all_cols)
    result = df[valid_cols].replace({np.nan: None, np.inf: None, -np.inf: None})
    records = result.to_dict(orient="records")
    return {"total_found": len(records), "period": period, "data": records}


# ============================================
# 1. VALUE INVESTING
# ============================================
@router.post("/screen/value")
def screen_value_strategy(
    criteria: ValueStrategyInput,
    period: str = Query("annual", description="Chọn 'annual' hoặc 'quarterly'")
):
    df = get_df(period)
    if df is None:
        raise HTTPException(status_code=500, detail=f"Dữ liệu {period} chưa sẵn sàng.")
    
    result_df = filter_value_stocks(df, criteria)
    display_cols = [
        'pe_ratio', 'pb_ratio', 'graham_multiplier',
        'current_ratio', 'debt_to_current_asset', 'debt_equity_ratio',
        'bvps', 'eps_growth_yoy', 'dividend_yield',
    ]
    return safe_response(result_df, display_cols, period)


# ============================================
# 2. GROWTH INVESTING
# ============================================
@router.post("/screen/growth")
def screen_growth_strategy(
    criteria: GrowthStrategyInput,
    period: str = Query("annual", description="Chọn 'annual' hoặc 'quarterly'")
):
    df = get_df(period)
    if df is None:
        raise HTTPException(status_code=500, detail=f"Dữ liệu {period} chưa sẵn sàng.")
    
    result_df = filter_growth_stocks(df, criteria)
    display_cols = [
        'eps_growth_yoy', 'rev_growth_cagr_3y', 'eps_growth_cagr_3y',
        'roe', 'peg_ratio', 'pe_ratio',
        'net_profit_margin', 'gross_profit_margin',
    ]
    return safe_response(result_df, display_cols, period)


# ============================================
# 3. DIVIDEND INVESTING
# ============================================
@router.post("/screen/dividend")
def screen_dividend_strategy(
    criteria: DividendStrategyInput,
    period: str = Query("annual", description="Chọn 'annual' hoặc 'quarterly'")
):
    df = get_df(period)
    if df is None:
        raise HTTPException(status_code=500, detail="Data error")
    
    result_df = filter_dividend_stocks(df, criteria)
    display_cols = [
        'dividend_yield', 'payout_ratio', 'div_streak_years',
        'dividend_per_share', 'is_div_growing',
        'debt_equity_ratio', 'roe', 'free_cash_flow',
    ]
    return safe_response(result_df, display_cols, period)


# ============================================
# 4. QUALITY INVESTING
# ============================================
@router.post("/screen/quality")
def screen_quality_strategy(
    criteria: QualityStrategyInput,
    period: str = Query("annual", description="Chọn 'annual' hoặc 'quarterly'")
):
    df = get_df(period)
    if df is None:
        raise HTTPException(status_code=500, detail="Data error")
    
    result_df = filter_quality_stocks(df, criteria)
    display_cols = [
        'roe', 'gross_profit_margin', 'net_profit_margin',
        'earnings_quality_ratio', 'interest_coverage',
        'debt_equity_ratio', 'pe_ratio',
    ]
    return safe_response(result_df, display_cols, period)


# ============================================
# 5. DEFENSIVE INVESTING
# ============================================
@router.post("/screen/defensive")
def screen_defensive_strategy(criteria: DefensiveStrategyInput, period: str = Query("annual")):
    df = get_df(period)
    if df is None:
        raise HTTPException(status_code=500, detail="Data error")
    
    result_df = filter_defensive_stocks(df, criteria)
    display_cols = [
        'graham_multiplier', 'pe_ratio', 'pb_ratio',
        'eps_growth_total_5y', 'current_ratio', 'debt_equity_ratio',
        'profit_streak_years', 'div_streak_years',
        'dividend_yield',
    ]
    return safe_response(result_df, display_cols, period)


# ============================================
# 6. GARP INVESTING
# ============================================
@router.post("/screen/garp")
def screen_garp_strategy(criteria: GarpStrategyInput, period: str = Query("annual")):
    df = get_df(period)
    if df is None:
        raise HTTPException(status_code=500, detail="Data error")
    
    result_df = filter_garp_stocks(df, criteria)
    display_cols = [
        'peg_ratio', 'eps_growth_cagr_3y', 'eps_growth_yoy',
        'pe_ratio', 'roe', 'net_profit_margin',
        'rev_growth_cagr_3y', 'debt_equity_ratio',
    ]
    return safe_response(result_df, display_cols, period)


# ============================================
# 7. SCORING EXPLANATION API
# ============================================
@router.get("/scoring-explanation/{strategy}")
def scoring_explanation(strategy: str):
    """Trả về giải thích cách chấm điểm cho frontend tooltip."""
    valid = ['value', 'growth', 'dividend', 'quality', 'defensive', 'garp']
    if strategy not in valid:
        raise HTTPException(status_code=400, detail=f"Strategy phải là: {', '.join(valid)}")
    return get_scoring_explanation(strategy)