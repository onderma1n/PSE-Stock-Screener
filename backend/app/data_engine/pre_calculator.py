import os
import pandas as pd
import numpy as np

def load_sector_mapping():
    """Load mapping Ticker → Sector."""
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
    sector_file = os.path.join(data_dir, 'ticker_sector.csv')
    if os.path.exists(sector_file):
        return pd.read_csv(sector_file)
    return None

def clean_and_precalculate(df: pd.DataFrame, period_type: str = 'annual') -> pd.DataFrame:
    # Bước 0: Xác định các cột cần giữ nguyên dạng string
    non_numeric_cols = ['Ticker', 'stock', 'sector', 'industry', 'exchange']  # tuỳ file CSV của bạn
    
    # Bước 1: Convert tất cả cột còn lại sang numeric
    numeric_cols = [col for col in df.columns if col not in non_numeric_cols]
    for col in numeric_cols:
        df[col] = pd.to_numeric(
            df[col].astype(str).str.replace(',', '').str.replace('%', '').str.strip(),
            errors='coerce'
        )
    
    if 'sector' not in df.columns:
        sector_df = load_sector_mapping()
        if sector_df is not None:
            df = df.merge(sector_df[['Ticker', 'sector', 'sub_sector']], on='Ticker', how='left')
            print(f"✅ Merged sector: {df['sector'].notna().sum()}/{len(df)} rows")
    
    # 1. Tiền xử lý dấu phẩy thập phân (nếu data lỗi chuẩn Việt Nam)
    cols_to_float = ['eps_basic', 'bvps', 'price_close']
    for col in cols_to_float:
        if col in df.columns and df[col].dtype == object:
            df[col] = df[col].astype(str).str.replace(',', '.').astype(float)
            
    # 2. Sắp xếp dữ liệu chuẩn xác
    if period_type == 'quarterly':
        df = df.sort_values(by=['Ticker', 'year', 'quarter']).reset_index(drop=True)
    else:
        df = df.sort_values(by=['Ticker', 'year']).reset_index(drop=True)
    
    # 3. TÍNH TOÁN THEO CHU KỲ (NĂM vs QUÝ)
    if period_type == 'annual':
        df['eps_prev'] = df.groupby('Ticker')['eps_basic'].shift(1)
        df['div_prev'] = df.groupby('Ticker')['dividend_per_share'].shift(1)
        df['eps_3y_ago'] = df.groupby('Ticker')['eps_basic'].shift(3)
        df['eps_5y_ago'] = df.groupby('Ticker')['eps_basic'].shift(5)
        df['rev_3y_ago'] = df.groupby('Ticker')['revenue'].shift(3)
        df['equity_prev'] = df.groupby('Ticker')['total_equity'].shift(1)
        
        # Biến dùng để tính định giá/hiệu quả
        df['calc_eps'] = df['eps_basic']
        df['calc_ni'] = df['net_income']
        df['calc_div'] = df['dividend_per_share']
        df['calc_ocf'] = df['operating_cash_flow']
        df['calc_capex'] = df['capital_expenditures']
        df['calc_rev'] = df['revenue']
        df['calc_gross'] = df['gross_profit']
        df['calc_ebit'] = df['ebit']
        df['calc_interest'] = df['interest_expense']
        
    elif period_type == 'quarterly':
        # Quý: YoY là so với cùng kỳ năm ngoái -> shift(4)
        df['eps_prev'] = df.groupby('Ticker')['eps_basic'].shift(4)
        df['div_prev'] = df.groupby('Ticker')['dividend_per_share'].shift(4)
        df['eps_3y_ago'] = df.groupby('Ticker')['eps_basic'].shift(12) # 3 năm = 12 quý
        df['eps_5y_ago'] = df.groupby('Ticker')['eps_basic'].shift(20) # 5 năm = 20 quý
        df['rev_3y_ago'] = df.groupby('Ticker')['revenue'].shift(12)
        df['equity_prev'] = df.groupby('Ticker')['total_equity'].shift(4)
        
        # Quý: TÍNH TTM (Trailing Twelve Months - Tổng 4 quý gần nhất)
        df['eps_ttm'] = df.groupby('Ticker')['eps_basic'].transform(lambda x: x.rolling(4).sum())
        df['ni_ttm'] = df.groupby('Ticker')['net_income'].transform(lambda x: x.rolling(4).sum())
        df['div_ttm'] = df.groupby('Ticker')['dividend_per_share'].transform(lambda x: x.rolling(4).sum())
        
        # Gán biến TTM để dùng chung công thức định giá bên dưới
        df['calc_eps'] = df['eps_ttm']
        df['calc_ni'] = df['ni_ttm']
        df['calc_div'] = df['div_ttm']
        df['calc_ocf'] = df.groupby('Ticker')['operating_cash_flow'].transform(lambda x: x.rolling(4).sum())
        df['calc_capex'] = df.groupby('Ticker')['capital_expenditures'].transform(lambda x: x.rolling(4).sum())
        df['calc_rev'] = df.groupby('Ticker')['revenue'].transform(lambda x: x.rolling(4).sum())
        df['calc_gross'] = df.groupby('Ticker')['gross_profit'].transform(lambda x: x.rolling(4).sum())
        df['calc_ebit'] = df.groupby('Ticker')['ebit'].transform(lambda x: x.rolling(4).sum())
        df['calc_interest'] = df.groupby('Ticker')['interest_expense'].transform(lambda x: x.rolling(4).sum())

    # 4. TÍNH CHỈ SỐ CHUNG 
    # Vốn chủ sở hữu trung bình
    df['avg_equity'] = (df['total_equity'] + df['equity_prev']) / 2
    df['avg_equity'] = df['avg_equity'].fillna(df['total_equity'])

    # np.where xử lý lỗi chia cho 0 hoặc NaN
    df['pe_ratio'] = np.where(df['calc_eps'] > 0, df['price_close'] / df['calc_eps'], 999)
    df['pb_ratio'] = np.where(df['bvps'] > 0, df['price_close'] / df['bvps'], 999)
    df['current_ratio'] = np.where(df['current_liabilities'] > 0, df['current_assets'] / df['current_liabilities'], 0)
    df['debt_to_current_asset'] = np.where(df['current_assets'] > 0, df['total_debt'] / df['current_assets'], 999)
    df['debt_equity_ratio'] = np.where(df['total_equity'] > 0, df['total_debt'] / df['total_equity'], 999)
    
    # Tăng trưởng (Growth)
    df['eps_growth_yoy'] = np.where(
        df['eps_prev'].abs() > 0, 
        ((df['eps_basic'] - df['eps_prev']) / df['eps_prev'].abs()) * 100, 
        0
    )
    df['rev_growth_cagr_3y'] = np.where(
        df['rev_3y_ago'] > 0, 
        ((df['revenue'] / df['rev_3y_ago'])**(1/3) - 1) * 100, 
        0
    )
    df['is_eps_growth_5y'] = df['eps_basic'] > df['eps_5y_ago']
    df['peg_ratio'] = np.where(
        (df['eps_growth_yoy'] > 0) & (df['pe_ratio'] != 999), 
        df['pe_ratio'] / df['eps_growth_yoy'], 
        999
    )

    # Hiệu quả hoạt động (Profitability)
    df['roe'] = np.where(df['avg_equity'] > 0, (df['calc_ni'] / df['avg_equity']) * 100, 0)
    df['net_profit_margin'] = np.where(df['revenue'] > 0, (df['calc_ni'] / df['revenue']) * 100, 0)
    df['gross_profit_margin'] = np.where(df['calc_rev'] > 0, (df['calc_gross'] / df['calc_rev']) * 100, 0)
    df['earnings_quality_ratio'] = np.where(df['calc_ni'] > 0, df['calc_ocf'] / df['calc_ni'], -999)
    df['interest_coverage'] = np.where(df['calc_interest'].abs() > 0, df['calc_ebit'] / df['calc_interest'].abs(), 999)
    

    # Tính Chuỗi năm có lãi liên tục (Streak)
    df['is_profit'] = df['net_income'] > 0
    # Mẹo nhóm Pandas: tính số lần True liên tiếp
    streak_multiplier = 1 if period_type == 'annual' else 0.25 # Quý chia 4 ra năm
    df['profit_streak_years'] = df.groupby('Ticker')['is_profit'].transform(lambda x: x.groupby((~x).cumsum()).cumsum()) * streak_multiplier
    df['is_profit_stable_5y'] = df['profit_streak_years'] >= 5


    # Cổ tức (Dividend)
    df['is_paying_dividend'] = df['calc_div'] > 0
    df['dividend_yield'] = (df['calc_div'] / df['price_close']) * 100
    df['payout_ratio'] = np.where(
        df['calc_eps'] > 0, 
        (df['calc_div'] / df['calc_eps']) * 100, 
        0
    )
    df['payout_ratio'] = df['payout_ratio'].fillna(0)
    df['is_high_retention'] = df['payout_ratio'] < 20
    df['is_div_growing'] = df['calc_div'] >= df['div_prev'].fillna(0)

    df['free_cash_flow'] = df['calc_ocf'] - df['calc_capex'].abs()
    df['is_fcf_positive'] = df['free_cash_flow'] > 0
    
    # Tính chuỗi năm trả cổ tức liên tiếp
    df['div_streak_years'] = df.groupby('Ticker')['is_paying_dividend'].transform(lambda x: x.groupby((~x).cumsum()).cumsum()) * streak_multiplier
    
    # ---- CHỈ SỐ CHO PHÒNG THỦ & GARP ----
    
    # 1. Vốn hóa thị trường (Quy đổi ra Tỷ)
    df['market_cap'] = (df['price_close'] * df['shares_outstanding']) / 1_000_000_000
    
    # 2. Tăng trưởng EPS tổng 5 năm (Defensive)
    df['eps_growth_total_5y'] = np.where(
        df['eps_5y_ago'] > 0, 
        ((df['eps_basic'] - df['eps_5y_ago']) / df['eps_5y_ago']) * 100, 
        -999 # Lỗi/Âm thì gán -999 để bộ lọc loại
    )
    
    # 3. Số nhân Graham (P/E * P/B)
    # Chỉ tính khi cả PE và PB đều dương (không lỗ) và hợp lệ
    df['graham_multiplier'] = np.where(
        (df['pe_ratio'] != 999) & (df['pb_ratio'] != 999) & (df['calc_eps'] > 0) & (df['bvps'] > 0),
        df['pe_ratio'] * df['pb_ratio'],
        9999 # Gán số to để không lọt qua bộ lọc max
    )
    
    # 4. Tốc độ tăng trưởng kép EPS 3 năm (GARP)
    df['eps_growth_cagr_3y'] = np.where(
        df['eps_3y_ago'] > 0, 
        ((df['eps_basic'] / df['eps_3y_ago'])**(1/3) - 1) * 100, 
        -999
    )
    return df.round(2)