from pydantic import BaseModel, Field
from typing import Optional, List

# Bộ lọc chung áp dụng cho tất cả trường phái.
class CommonFilters(BaseModel):
    """Bộ lọc chung áp dụng cho tất cả trường phái."""
    sectors: Optional[List[str]] = Field(default=[], description="Danh sách ngành cần lọc. Rỗng = tất cả.")
    only_psei: bool = Field(default=False, description="Chỉ lọc cổ phiếu trong rổ PSEi 30")
    exclude_high_debt: bool = Field(default=False, description="Loại trừ D/E > 3.0")
    exclude_negative_equity: bool = Field(default=True, description="Loại trừ vốn chủ sở hữu âm")
    exclude_loss_making: bool = Field(default=False, description="Loại trừ công ty thua lỗ")
    only_with_dividend: bool = Field(default=False, description="Chỉ hiện công ty có cổ tức")
    only_positive_fcf: bool = Field(default=False, description="Chỉ hiện công ty có FCF dương")
# Schema cho Trường phái Giá trị (Value Investing)
class ValueStrategyInput(BaseModel):
    max_debt_to_current_asset: float = Field(default=1.10, ge=0)
    min_current_ratio: float = Field(default=1.50, ge=0)
    req_eps_growth_5y: bool = Field(default=True)
    max_pe_ratio: float = Field(default=9.0, ge=0)
    max_pb_ratio: float = Field(default=1.20, ge=0)
    req_dividend: bool = Field(default=True)
    common_filters: Optional[CommonFilters] = Field(default_factory=CommonFilters)

# Schema cho Trường phái Tăng trưởng (Growth Investing)
class GrowthStrategyInput(BaseModel):
    min_rev_growth_cagr_3y: float = Field(default=20, ge=0)
    min_eps_growth_yoy: float = Field(default=25, ge=0)
    min_roe: float = Field(default=15, ge=0)
    min_net_profit_margin: float = Field(default=10, ge=0)
    max_peg_ratio: float = Field(default=1.5, ge=0)
    req_high_retention: bool = Field(default=False)
    common_filters: Optional[CommonFilters] = Field(default_factory=CommonFilters)

# Schema cho Trường phái Cổ tức (Dividend Investing)
class DividendStrategyInput(BaseModel):
    min_dividend_yield: float = Field(default=3.0, ge=0)
    max_payout_ratio: float = Field(default=60, ge=0)
    min_div_years_consecutive: int = Field(default=3, ge=0)
    req_div_growing: bool = Field(default=True)
    req_fcf_positive: bool = Field(default=True)
    max_debt_equity_ratio: float = Field(default=1.0, ge=0)
    common_filters: Optional[CommonFilters] = Field(default_factory=CommonFilters)

# Schema cho Trường phái Chất lượng (Quality Investing)
class QualityStrategyInput(BaseModel):
    min_roe: float = Field(default=15, ge=0)
    max_debt_equity_ratio: float = Field(default=2.0, ge=0)
    min_gross_profit_margin: float = Field(default=15, ge=0)
    min_earnings_quality_ratio: float = Field(default=0.8, ge=0)
    req_profit_stable_5y: bool = Field(default=True)
    min_interest_coverage: float = Field(default=4.0, ge=0)
    common_filters: Optional[CommonFilters] = Field(default_factory=CommonFilters)

# Schema cho Trường phái Phòng thủ (Defensive Investing)
class DefensiveStrategyInput(BaseModel):
    min_market_cap: float = Field(default=10, ge=0)
    min_current_ratio: float = Field(default=2.0, ge=0)
    min_profit_years_consecutive: int = Field(default=5, ge=0)
    min_div_years_consecutive: int = Field(default=5, ge=0)
    min_eps_growth_total_5y: float = Field(default=33, ge=0)
    max_graham_multiplier: float = Field(default=22.5, ge=0)
    common_filters: Optional[CommonFilters] = Field(default_factory=CommonFilters)

# Schema cho Trường phái GARP (Growth at Reasonable Price)
class GarpStrategyInput(BaseModel):
    max_peg_ratio: float = Field(default=1.0, ge=0)
    min_eps_growth_cagr_3y: float = Field(default=10, ge=0)
    max_eps_growth_cagr_3y: float = Field(default=50, ge=0)
    max_pe_ratio: float = Field(default=20, ge=0)
    min_roe: float = Field(default=15, ge=0)
    req_eps_growth_yoy_positive: bool = Field(default=True)
    min_current_ratio: float = Field(default=1.5, ge=0)
    common_filters: Optional[CommonFilters] = Field(default_factory=CommonFilters)

