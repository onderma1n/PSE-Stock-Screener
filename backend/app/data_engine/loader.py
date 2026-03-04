import pandas as pd
import logging
import numpy as np
from app.core.config import ANNUAL_DATA_PATH, QUARTERLY_DATA_PATH
from app.data_engine.pre_calculator import clean_and_precalculate

logger = logging.getLogger(__name__)

# Biến toàn cục lưu trữ DataFrame
_annual_df = None
_quarterly_df = None

def load_data():
    global _annual_df, _quarterly_df
    
    # 1. LOAD DATA ANNUAL (NĂM)
    try:
        logger.info("Đang nạp dữ liệu Annual...")
        raw_annual = pd.read_csv(ANNUAL_DATA_PATH)
        df_ann = clean_and_precalculate(raw_annual, period_type='annual')
        
        # Chỉ lấy dữ liệu của năm mới nhất
        max_year = df_ann['year'].max()
        _annual_df = df_ann[df_ann['year'] == max_year]
        logger.info(f"Dữ liệu Annual sẵn sàng (Năm {max_year})")
    except Exception as e:
        logger.error(f"Lỗi nạp Annual Data: {e}")

    # 2. LOAD DATA QUARTERLY (QUÝ)
    try:
        logger.info("Đang nạp dữ liệu Quarterly...")
        raw_quarterly = pd.read_csv(QUARTERLY_DATA_PATH)
        df_qtr = clean_and_precalculate(raw_quarterly, period_type='quarterly')
        
        # Lấy quý mới nhất
        max_year_q = df_qtr['year'].max()
        max_quarter = df_qtr[df_qtr['year'] == max_year_q]['quarter'].max()
        _quarterly_df = df_qtr[(df_qtr['year'] == max_year_q) & (df_qtr['quarter'] == max_quarter)]
        logger.info(f"Dữ liệu Quarterly sẵn sàng (Q{max_quarter}/{max_year_q})")
        
    except FileNotFoundError:
        logger.warning("Không tìm thấy MASTER_QUARTERLY.csv. Tạm thời bỏ qua data Quý.")
    except Exception as e:
        logger.error(f"Lỗi nạp Quarterly Data: {e}")

def get_df(period: str = 'annual') -> pd.DataFrame:
    """Hàm trả về bộ dữ liệu tương ứng với lựa chọn của người dùng"""
    global _annual_df, _quarterly_df
    if _annual_df is None:
        load_data()
        
    if period == 'quarterly':
        return _quarterly_df.replace({np.nan: None}) if _quarterly_df is not None else None
    return _annual_df.replace({np.nan: None}) if _annual_df is not None else None