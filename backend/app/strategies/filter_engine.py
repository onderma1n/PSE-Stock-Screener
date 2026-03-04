import pandas as pd
from app.models.schemas import (
    DividendStrategyInput, QualityStrategyInput, ValueStrategyInput,
    GrowthStrategyInput, GarpStrategyInput, DefensiveStrategyInput,
    CommonFilters
)
from app.strategies.scoring_engine import calculate_score

# ============================================
# BỘ LỌC CHUNG - Áp dụng cho tất cả trường phái
# ============================================
PSEI_30 = [
    'AC.PS', 'AEV.PS', 'AGI.PS', 'ALI.PS', 'AP.PS',
    'BDO.PS', 'BLOOM.PS', 'BPI.PS', 'CNVRG.PS', 'DMC.PS',
    'DMCI.PS', 'EMI.PS', 'GLO.PS', 'GTCAP.PS', 'ICT.PS',
    'JFC.PS', 'JGS.PS', 'LTG.PS', 'MBT.PS', 'MEG.PS',
    'MER.PS', 'MPI.PS', 'NIKL.PS', 'PGOLD.PS', 'RLC.PS',
    'SECB.PS', 'SM.PS', 'SMPH.PS', 'TEL.PS', 'URC.PS'
]

def apply_common_filters(df: pd.DataFrame, common: CommonFilters) -> pd.DataFrame:
    """Áp dụng bộ lọc chung TRƯỚC khi lọc theo trường phái."""
    if common is None:
        return df

    result = df.copy()

    # 1. Lọc theo ngành (Multi-select)
    if common.sectors and len(common.sectors) > 0:
        if 'sector' in result.columns:
            result = result[result['sector'].isin(common.sectors)]

    # 2. Chỉ PSEi 30
    if common.only_psei:
        result = result[result['Ticker'].isin(PSEI_30)]

    # 3. Loại trừ nợ vay cao (D/E > 3.0)
    if common.exclude_high_debt:
        if 'debt_equity_ratio' in result.columns:
            result = result[
                (result['debt_equity_ratio'].isna()) |
                (result['debt_equity_ratio'] <= 3.0)
            ]

    # 4. Loại trừ vốn chủ sở hữu âm
    if common.exclude_negative_equity:
        if 'total_equity' in result.columns:
            result = result[result['total_equity'] > 0]

    # 5. Loại trừ công ty thua lỗ
    if common.exclude_loss_making:
        if 'net_income' in result.columns:
            result = result[result['net_income'] > 0]

    # 6. Chỉ hiện công ty có cổ tức
    if common.only_with_dividend:
        if 'dividend_per_share' in result.columns:
            result = result[result['dividend_per_share'] > 0]

    # 7. Chỉ hiện FCF dương
    if common.only_positive_fcf:
        if 'fcf' in result.columns:
            result = result[result['fcf'] > 0]
        elif 'operating_cash_flow' in result.columns and 'capital_expenditures' in result.columns:
            fcf = result['operating_cash_flow'] - result['capital_expenditures'].abs()
            result = result[fcf > 0]

    return result


# ============================================
# BỘ LỌC THEO TỪNG TRƯỜNG PHÁI
# ============================================
def filter_value_stocks(df: pd.DataFrame, criteria: ValueStrategyInput) -> pd.DataFrame:
    df = apply_common_filters(df, criteria.common_filters)

    mask = (
        (df['debt_to_current_asset'] <= criteria.max_debt_to_current_asset) &
        (df['current_ratio'] >= criteria.min_current_ratio) &
        (df['pe_ratio'] <= criteria.max_pe_ratio) &
        (df['pb_ratio'] <= criteria.max_pb_ratio)
    )
    if criteria.req_eps_growth_5y:
        mask = mask & df['is_eps_growth_5y']
    if criteria.req_dividend:
        mask = mask & df['is_paying_dividend']

    result = df[mask]
    result = calculate_score(result, 'value')
    return result

def filter_growth_stocks(df: pd.DataFrame, criteria: GrowthStrategyInput) -> pd.DataFrame:
    df = apply_common_filters(df, criteria.common_filters)

    mask = (
        (df['rev_growth_cagr_3y'] >= criteria.min_rev_growth_cagr_3y) &
        (df['eps_growth_yoy'] >= criteria.min_eps_growth_yoy) &
        (df['roe'] >= criteria.min_roe) &
        (df['net_profit_margin'] >= criteria.min_net_profit_margin) &
        (df['peg_ratio'] <= criteria.max_peg_ratio)
    )
    if criteria.req_high_retention:
        mask = mask & df['is_high_retention']

    result = df[mask]
    result = calculate_score(result, 'growth')
    return result

def filter_dividend_stocks(df: pd.DataFrame, criteria: DividendStrategyInput) -> pd.DataFrame:
    df = apply_common_filters(df, criteria.common_filters)

    mask = (
        (df['dividend_yield'] >= criteria.min_dividend_yield) &
        (df['payout_ratio'] <= criteria.max_payout_ratio) &
        (df['div_streak_years'] >= criteria.min_div_years_consecutive) &
        (df['debt_equity_ratio'] <= criteria.max_debt_equity_ratio)
    )
    if criteria.req_div_growing:
        mask = mask & df['is_div_growing']
    if criteria.req_fcf_positive:
        mask = mask & df['is_fcf_positive']

    result = df[mask]
    result = calculate_score(result, 'dividend')
    return result

def filter_quality_stocks(df: pd.DataFrame, criteria: QualityStrategyInput) -> pd.DataFrame:
    df = apply_common_filters(df, criteria.common_filters)

    mask = (
        (df['roe'] >= criteria.min_roe) &
        (df['debt_equity_ratio'] <= criteria.max_debt_equity_ratio) &
        (df['gross_profit_margin'] >= criteria.min_gross_profit_margin) &
        (df['earnings_quality_ratio'] >= criteria.min_earnings_quality_ratio) &
        (df['interest_coverage'] >= criteria.min_interest_coverage)
    )
    if criteria.req_profit_stable_5y:
        mask = mask & df['is_profit_stable_5y']

    result = df[mask]
    result = calculate_score(result, 'quality')
    return result

def filter_defensive_stocks(df: pd.DataFrame, criteria: DefensiveStrategyInput) -> pd.DataFrame:
    df = apply_common_filters(df, criteria.common_filters)

    mask = (
        (df['market_cap'] >= criteria.min_market_cap) &
        (df['current_ratio'] >= criteria.min_current_ratio) &
        (df['profit_streak_years'] >= criteria.min_profit_years_consecutive) &
        (df['div_streak_years'] >= criteria.min_div_years_consecutive) &
        (df['eps_growth_total_5y'] >= criteria.min_eps_growth_total_5y) &
        (df['graham_multiplier'] <= criteria.max_graham_multiplier)
    )

    result = df[mask]
    result = calculate_score(result, 'defensive')
    return result

def filter_garp_stocks(df: pd.DataFrame, criteria: GarpStrategyInput) -> pd.DataFrame:
    df = apply_common_filters(df, criteria.common_filters)

    mask = (
        (df['peg_ratio'] <= criteria.max_peg_ratio) &
        (df['eps_growth_cagr_3y'] >= criteria.min_eps_growth_cagr_3y) &
        (df['eps_growth_cagr_3y'] <= criteria.max_eps_growth_cagr_3y) &
        (df['pe_ratio'] <= criteria.max_pe_ratio) &
        (df['roe'] >= criteria.min_roe) &
        (df['current_ratio'] >= criteria.min_current_ratio)
    )
    if criteria.req_eps_growth_yoy_positive:
        mask = mask & (df['eps_growth_yoy'] > 0)

    result = df[mask]
    result = calculate_score(result, 'garp')
    return result