"""
Hệ thống chấm điểm theo trường phái đầu tư.

Nguyên tắc:
  - Mỗi trường phái có bộ tiêu chí + trọng số riêng
  - Sử dụng Percentile Ranking: so sánh tương đối giữa các mã trong kết quả
  - Điểm cuối cùng: 0-100 (càng cao càng tốt)
  - Các chỉ số "thấp = tốt" (P/E, D/E, PEG...) được đảo ngược percentile
"""

import numpy as np
import pandas as pd


# ============================================================
# CẤU HÌNH TRỌNG SỐ THEO TRƯỜNG PHÁI
# ============================================================

SCORING_CONFIG = {
    "value": {
        "name": "Đầu tư Giá trị (Value)",
        "description": "Ưu tiên P/E, P/B thấp, biên an toàn cao, nợ thấp",
        "criteria": [
            {"key": "pe_ratio",       "weight": 0.30, "lower_is_better": True,  "label": "P/E thấp",           "min": 0,   "max": 50,  "invalid": [999, -999]},
            {"key": "pb_ratio",       "weight": 0.25, "lower_is_better": True,  "label": "P/B thấp",           "min": 0,   "max": 10,  "invalid": [999, -999]},
            {"key": "debt_equity_ratio","weight": 0.15,"lower_is_better": True,  "label": "D/E thấp",           "min": 0,   "max": 5,   "invalid": [999, -999]},
            {"key": "current_ratio",  "weight": 0.15, "lower_is_better": False, "label": "Current Ratio cao",  "min": 0,   "max": 10,  "invalid": []},
            {"key": "dividend_yield", "weight": 0.15, "lower_is_better": False, "label": "Cổ tức Yield cao",   "min": 0,   "max": 20,  "invalid": []},
        ],
    },
    "growth": {
        "name": "Đầu tư Tăng trưởng (Growth)",
        "description": "Ưu tiên EPS tăng mạnh, doanh thu bền vững, ROE cao",
        "criteria": [
            {"key": "eps_growth_yoy",   "weight": 0.30, "lower_is_better": False, "label": "EPS Growth YoY cao",  "min": -50, "max": 200, "invalid": []},
            {"key": "rev_growth_cagr_3y","weight": 0.25, "lower_is_better": False, "label": "DT CAGR 3Y cao",     "min": -20, "max": 100, "invalid": []},
            {"key": "roe",              "weight": 0.20, "lower_is_better": False, "label": "ROE cao",             "min": 0,   "max": 50,  "invalid": []},
            {"key": "peg_ratio",        "weight": 0.15, "lower_is_better": True,  "label": "PEG thấp",           "min": 0,   "max": 5,   "invalid": [999, -999]},
            {"key": "net_profit_margin","weight": 0.10, "lower_is_better": False, "label": "Biên LN Ròng cao",   "min": 0,   "max": 50,  "invalid": []},
        ],
    },
    "dividend": {
        "name": "Đầu tư Cổ tức (Dividend)",
        "description": "Ưu tiên Yield cao, trả đều đặn, payout bền vững",
        "criteria": [
            {"key": "dividend_yield",  "weight": 0.30, "lower_is_better": False, "label": "Cổ tức Yield cao",     "min": 0,  "max": 15,  "invalid": []},
            {"key": "div_streak_years","weight": 0.25, "lower_is_better": False, "label": "Năm trả liên tục",     "min": 0,  "max": 15,  "invalid": []},
            {"key": "payout_ratio",    "weight": 0.20, "lower_is_better": None,  "label": "Payout vừa phải (30-60%)", "min": 0, "max": 100, "invalid": [], "optimal_range": [30, 60]},
            {"key": "free_cash_flow",  "weight": 0.15, "lower_is_better": False, "label": "FCF dương & cao",      "min": None,"max": None,"invalid": []},
            {"key": "debt_equity_ratio","weight": 0.10,"lower_is_better": True,  "label": "D/E thấp",             "min": 0,   "max": 5,   "invalid": [999, -999]},
        ],
    },
    "quality": {
        "name": "Đầu tư Chất lượng (Quality)",
        "description": "Ưu tiên ROE cao, biên lợi nhuận rộng, lợi nhuận thực chất",
        "criteria": [
            {"key": "roe",                   "weight": 0.30, "lower_is_better": False, "label": "ROE cao",              "min": 0,   "max": 50,  "invalid": []},
            {"key": "gross_profit_margin",   "weight": 0.20, "lower_is_better": False, "label": "Biên LN Gộp cao",     "min": 0,   "max": 80,  "invalid": []},
            {"key": "net_profit_margin",     "weight": 0.20, "lower_is_better": False, "label": "Biên LN Ròng cao",    "min": 0,   "max": 50,  "invalid": []},
            {"key": "earnings_quality_ratio","weight": 0.15, "lower_is_better": False, "label": "OCF/NI cao (LN thực)", "min": 0,   "max": 5,   "invalid": [-999]},
            {"key": "debt_equity_ratio",     "weight": 0.15, "lower_is_better": True,  "label": "D/E thấp",            "min": 0,   "max": 5,   "invalid": [999, -999]},
        ],
    },
    "defensive": {
        "name": "Phòng thủ (Defensive)",
        "description": "Ưu tiên an toàn tài chính, lãi ổn định, Graham Number tốt",
        "criteria": [
            {"key": "graham_multiplier", "weight": 0.25, "lower_is_better": True,  "label": "Graham (PE×PB) thấp", "min": 0,   "max": 50,  "invalid": [9999]},
            {"key": "debt_equity_ratio", "weight": 0.20, "lower_is_better": True,  "label": "D/E thấp",            "min": 0,   "max": 5,   "invalid": [999, -999]},
            {"key": "current_ratio",     "weight": 0.15, "lower_is_better": False, "label": "Current Ratio cao",   "min": 0,   "max": 10,  "invalid": []},
            {"key": "pe_ratio",          "weight": 0.15, "lower_is_better": True,  "label": "P/E thấp",            "min": 0,   "max": 50,  "invalid": [999, -999]},
            {"key": "profit_streak_years","weight": 0.15,"lower_is_better": False, "label": "Năm có lãi liên tục", "min": 0,   "max": 15,  "invalid": []},
            {"key": "div_streak_years",  "weight": 0.10, "lower_is_better": False, "label": "Năm trả cổ tức",     "min": 0,   "max": 15,  "invalid": []},
        ],
    },
    "garp": {
        "name": "GARP (Growth at Reasonable Price)",
        "description": "Cân bằng tăng trưởng và định giá hợp lý",
        "criteria": [
            {"key": "eps_growth_cagr_3y","weight": 0.25, "lower_is_better": False, "label": "EPS CAGR 3Y cao",    "min": -20, "max": 80,  "invalid": [-999]},
            {"key": "roe",              "weight": 0.25, "lower_is_better": False, "label": "ROE cao",             "min": 0,   "max": 50,  "invalid": []},
            {"key": "peg_ratio",        "weight": 0.20, "lower_is_better": True,  "label": "PEG thấp",           "min": 0,   "max": 5,   "invalid": [999, -999]},
            {"key": "pe_ratio",         "weight": 0.20, "lower_is_better": True,  "label": "P/E hợp lý",         "min": 0,   "max": 50,  "invalid": [999, -999]},
            {"key": "current_ratio",    "weight": 0.10, "lower_is_better": False, "label": "Current Ratio",      "min": 0,   "max": 10,  "invalid": []},
        ],
    },
}


# ============================================================
# HÀM TÍNH ĐIỂM
# ============================================================

def _percentile_score(series: pd.Series, lower_is_better: bool, optimal_range: list = None) -> pd.Series:
    """
    Tính điểm percentile 0-100 cho 1 cột.
    
    - lower_is_better=True:  giá trị thấp nhất → 100 điểm
    - lower_is_better=False: giá trị cao nhất → 100 điểm
    - lower_is_better=None + optimal_range: giá trị trong khoảng tối ưu → 100 điểm
    """
    if series.dropna().nunique() <= 1:
        # Chỉ có 1 giá trị duy nhất → tất cả đều bằng 50
        return pd.Series(50.0, index=series.index)
    
    # Trường hợp đặc biệt: optimal_range (ví dụ Payout Ratio 30-60%)
    if optimal_range is not None:
        lo, hi = optimal_range
        mid = (lo + hi) / 2
        
        def score_optimal(val):
            if pd.isna(val):
                return np.nan
            if lo <= val <= hi:
                # Trong khoảng tối ưu: điểm 70-100 (càng gần mid càng cao)
                distance = abs(val - mid) / ((hi - lo) / 2)
                return 100 - (distance * 30)
            elif val < lo:
                # Dưới khoảng: càng xa càng thấp
                distance = (lo - val) / lo if lo > 0 else 0
                return max(0, 70 - distance * 100)
            else:
                # Trên khoảng: càng xa càng thấp (payout quá cao = rủi ro)
                distance = (val - hi) / (100 - hi) if hi < 100 else 0
                return max(0, 70 - distance * 150)
        
        return series.apply(score_optimal)
    
    # Tính percentile rank (0-1)
    ranked = series.rank(method='average', pct=True, na_option='keep')
    
    if lower_is_better:
        # Đảo: giá trị thấp → percentile cao → điểm cao
        scores = (1 - ranked) * 100
    else:
        scores = ranked * 100
    
    return scores.round(2)


def _clean_column(series: pd.Series, invalid_values: list, min_val=None, max_val=None) -> pd.Series:
    """Chuẩn hóa cột: loại giá trị invalid, clamp trong khoảng hợp lệ."""
    cleaned = series.copy()
    
    # Loại giá trị invalid (999, -999, 9999...)
    for inv in invalid_values:
        cleaned = cleaned.replace(inv, np.nan)
    
    # Clamp
    if min_val is not None:
        cleaned = cleaned.clip(lower=min_val)
    if max_val is not None:
        cleaned = cleaned.clip(upper=max_val)
    
    return cleaned


def calculate_score(df: pd.DataFrame, strategy: str) -> pd.DataFrame:
    """
    Tính điểm tổng hợp cho mỗi cổ phiếu dựa trên trường phái.
    
    Args:
        df: DataFrame đã qua filter
        strategy: 'value' | 'growth' | 'dividend' | 'quality' | 'defensive' | 'garp'
    
    Returns:
        DataFrame với cột 'score' (0-100), sort giảm dần
    """
    config = SCORING_CONFIG.get(strategy)
    if config is None:
        df = df.copy()
        df['score'] = 50.0
        return df
    
    if len(df) == 0:
        df = df.copy()
        df['score'] = pd.Series(dtype=float)
        return df
    
    df = df.copy()
    criteria = config["criteria"]
    
    # Tính điểm từng tiêu chí
    component_scores = {}
    
    for cr in criteria:
        key = cr["key"]
        
        if key not in df.columns:
            # Cột không tồn tại → bỏ qua, phân bổ lại trọng số
            continue
        
        # Chuẩn hóa dữ liệu
        cleaned = _clean_column(
            df[key].astype(float, errors='ignore'),
            invalid_values=cr.get("invalid", []),
            min_val=cr.get("min"),
            max_val=cr.get("max"),
        )
        
        # Tính percentile score
        optimal = cr.get("optimal_range")
        
        if cr["lower_is_better"] is None and optimal:
            scores = _percentile_score(cleaned, lower_is_better=False, optimal_range=optimal)
        else:
            scores = _percentile_score(cleaned, lower_is_better=cr["lower_is_better"])
        
        component_scores[key] = {
            "scores": scores,
            "weight": cr["weight"],
            "label": cr["label"],
        }
    
    # Tính lại trọng số nếu có cột bị thiếu
    total_weight = sum(c["weight"] for c in component_scores.values())
    if total_weight == 0:
        df['score'] = 50.0
        return df
    
    # Normalize trọng số
    for key in component_scores:
        component_scores[key]["normalized_weight"] = component_scores[key]["weight"] / total_weight
    
    # Tính điểm tổng (weighted average)
    final_scores = pd.Series(0.0, index=df.index)
    valid_weight = pd.Series(0.0, index=df.index)
    
    for key, comp in component_scores.items():
        s = comp["scores"]
        w = comp["normalized_weight"]
        
        # Chỉ cộng điểm cho các mã có dữ liệu hợp lệ
        mask = s.notna()
        final_scores.loc[mask] += s.loc[mask] * w
        valid_weight.loc[mask] += w
    
    # Điều chỉnh cho các mã thiếu dữ liệu 1 số tiêu chí
    adjusted = pd.Series(50.0, index=df.index)
    valid_mask = valid_weight > 0
    adjusted.loc[valid_mask] = final_scores.loc[valid_mask] / valid_weight.loc[valid_mask]
    
    # Clamp 0-100 và làm tròn
    df['score'] = adjusted.clip(0, 100).round(1)
    
    # Tạo breakdown chi tiết (JSON string cho frontend tooltip)
    breakdowns = []
    for idx in df.index:
        detail = {}
        for key, comp in component_scores.items():
            s = comp["scores"]
            val = s.loc[idx] if idx in s.index else None
            if val is not None and pd.notna(val):
                detail[key] = {
                    "label": comp["label"],
                    "score": round(float(val), 1),
                    "weight": int(round(comp["normalized_weight"] * 100)),
                }
        breakdowns.append(str(detail).replace("'", '"'))
    
    df['score_breakdown'] = breakdowns
    
    # Sắp xếp theo score giảm dần
    df = df.sort_values('score', ascending=False).reset_index(drop=True)
    
    return df


def get_scoring_explanation(strategy: str) -> dict:
    """Trả về giải thích cách chấm điểm cho frontend tooltip."""
    config = SCORING_CONFIG.get(strategy)
    if config is None:
        return {"name": "Unknown", "criteria": []}
    
    explanation = {
        "name": config["name"],
        "description": config["description"],
        "method": "Percentile Ranking — So sánh tương đối giữa các mã trong kết quả. Mã tốt nhất ở tiêu chí đó = 100 điểm, kém nhất = 0 điểm.",
        "criteria": []
    }
    
    for cr in config["criteria"]:
        direction = ""
        if cr.get("optimal_range"):
            lo, hi = cr["optimal_range"]
            direction = f"Tối ưu: {lo}-{hi}"
        elif cr["lower_is_better"]:
            direction = "Thấp = tốt"
        else:
            direction = "Cao = tốt"
        
        explanation["criteria"].append({
            "key": cr["key"],
            "label": cr["label"],
            "weight": f"{int(cr['weight'] * 100)}%",
            "direction": direction,
        })
    
    return explanation