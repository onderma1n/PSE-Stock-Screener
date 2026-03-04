export const STRATEGY_CHARTS = {
  // ==========================================
  // 1. VALUE INVESTING
  // ==========================================
  value: {
    primary: {
      type: 'scatter',
      id: 'graham_quadrant',
      title: 'Ma trận Graham (P/E × P/B)',
      description: 'Vùng xanh: Graham Multiplier ≤ 22.5 — vùng an toàn theo Benjamin Graham',
      xAxis: { key: 'pe_ratio', label: 'P/E', domain: [0, 25] },
      yAxis: { key: 'pb_ratio', label: 'P/B', domain: [0, 5] },
      bubbleSize: { key: 'market_cap', label: 'Vốn hóa' },
      zones: [
        { name: 'Cực rẻ', condition: 'pe * pb <= 15', color: '#22c55e' },
        { name: 'Hợp lý', condition: 'pe * pb <= 22.5', color: '#eab308' },
        { name: 'Đắt', condition: 'pe * pb > 22.5', color: '#ef4444' },
      ],
      // Đường Graham: P/E × P/B = 22.5 (hyperbola)
      referenceLine: { type: 'hyperbola', value: 22.5, label: 'Graham Limit' }
    },
    secondary: {
      type: 'bar_comparison',
      id: 'margin_of_safety',
      title: 'Biên an toàn (Margin of Safety)',
      description: 'So sánh Giá thị trường vs Giá trị sổ sách',
      bars: [
        { key: 'price_close', label: 'Giá thị trường', color: '#ef4444' },
        { key: 'bvps', label: 'Giá trị sổ sách (BVPS)', color: '#22c55e' },
      ],
      highlight: 'Cổ phiếu tốt: Giá < BVPS (cột đỏ thấp hơn cột xanh)'
    },
    radar: {
      axes: [
        { key: 'pe_score', label: 'P/E thấp', ideal: 'low' },
        { key: 'pb_score', label: 'P/B thấp', ideal: 'low' },
        { key: 'current_ratio_score', label: 'Thanh khoản', ideal: 'high' },
        { key: 'debt_safety_score', label: 'Nợ an toàn', ideal: 'low' },
        { key: 'eps_growth_score', label: 'EPS tăng trưởng', ideal: 'high' },
        { key: 'dividend_score', label: 'Có cổ tức', ideal: 'high' },
      ]
    }
  },

  // ==========================================
  // 2. GROWTH INVESTING
  // ==========================================
  growth: {
    primary: {
      type: 'scatter',
      id: 'peg_efficiency',
      title: 'Hiệu quả PEG (EPS Growth vs P/E)',
      description: 'Dưới đường PEG=1: tăng trưởng cao nhưng giá hợp lý',
      xAxis: { key: 'eps_growth_yoy', label: 'EPS Growth YoY (%)', domain: [0, 100] },
      yAxis: { key: 'pe_ratio', label: 'P/E', domain: [0, 40] },
      bubbleSize: { key: 'rev_growth_cagr_3y', label: 'Revenue CAGR 3Y' },
      referenceLine: { type: 'diagonal', slope: 1, label: 'PEG = 1' },
      zones: [
        { name: 'PEG < 1 (Tốt)', position: 'below_line', color: '#22c55e' },
        { name: 'PEG > 1 (Đắt)', position: 'above_line', color: '#ef4444' },
      ]
    },
    secondary: {
      type: 'grouped_bar',
      id: 'growth_metrics',
      title: 'So sánh tốc độ tăng trưởng',
      description: 'Revenue CAGR 3Y vs EPS Growth YoY vs ROE',
      bars: [
        { key: 'rev_growth_cagr_3y', label: 'DT CAGR 3Y (%)', color: '#6366f1' },
        { key: 'eps_growth_yoy', label: 'EPS YoY (%)', color: '#22c55e' },
        { key: 'roe', label: 'ROE (%)', color: '#f59e0b' },
      ]
    },
    radar: {
      axes: [
        { key: 'rev_growth_score', label: 'Tăng trưởng DT' },
        { key: 'eps_growth_score', label: 'Tăng trưởng EPS' },
        { key: 'roe_score', label: 'ROE cao' },
        { key: 'margin_score', label: 'Biên lợi nhuận' },
        { key: 'peg_score', label: 'PEG thấp' },
        { key: 'retention_score', label: 'Tái đầu tư' },
      ]
    }
  },

  // ==========================================
  // 3. DIVIDEND INVESTING
  // ==========================================
  dividend: {
    primary: {
      type: 'scatter',
      id: 'dividend_sweet_spot',
      title: 'Vùng Cổ tức Lý tưởng (Yield vs Payout)',
      description: 'Góc trên-trái: Yield cao + Payout thấp = bền vững nhất',
      xAxis: { key: 'payout_ratio', label: 'Payout Ratio (%)', domain: [0, 100] },
      yAxis: { key: 'dividend_yield', label: 'Dividend Yield (%)', domain: [0, 15] },
      bubbleSize: { key: 'div_streak_years', label: 'Năm trả liên tục' },
      zones: [
        { name: 'Lý tưởng', area: { x: [0, 50], y: [3, 15] }, color: '#22c55e' },
        { name: 'Rủi ro', area: { x: [70, 100], y: [7, 15] }, color: '#ef4444' },
      ]
    },
    secondary: {
      type: 'horizontal_bar',
      id: 'dividend_streak',
      title: 'Số năm trả cổ tức liên tục',
      description: 'Cổ phiếu trả cổ tức càng nhiều năm liên tục → càng đáng tin cậy',
      key: 'div_streak_years',
      label: 'Năm',
      color: '#22c55e',
      sortBy: 'desc'
    },
    extra: {
      type: 'income_simulation',
      id: 'income_sim',
      title: '💰 Mô phỏng Thu nhập Cổ tức',
      description: 'Nếu đầu tư 100 triệu ₱, mỗi năm nhận bao nhiêu cổ tức?',
      investmentAmount: 100000000,
      key: 'dividend_yield'
    },
    radar: {
      axes: [
        { key: 'yield_score', label: 'Yield cao' },
        { key: 'payout_score', label: 'Payout hợp lý' },
        { key: 'streak_score', label: 'Trả liên tục' },
        { key: 'growth_score', label: 'Cổ tức tăng' },
        { key: 'fcf_score', label: 'FCF dương' },
        { key: 'debt_score', label: 'Nợ thấp' },
      ]
    }
  },

  // ==========================================
  // 4. QUALITY INVESTING
  // ==========================================
  quality: {
    primary: {
      type: 'radar_comparison',
      id: 'quality_score',
      title: 'Điểm Chất lượng Doanh nghiệp',
      description: 'Radar càng rộng → chất lượng càng cao. So sánh top 5 cổ phiếu.',
      axes: [
        { key: 'roe', label: 'ROE', max: 30 },
        { key: 'gross_profit_margin', label: 'Biên LN Gộp', max: 60 },
        { key: 'net_profit_margin', label: 'Biên LN Ròng', max: 30 },
        { key: 'earnings_quality_ratio', label: 'OCF/NI', max: 3 },
        { key: 'interest_coverage', label: 'ICR', max: 20 },
      ],
      showTop: 5
    },
    secondary: {
      type: 'stacked_bar',
      id: 'dupont_decomposition',
      title: 'Phân tích DuPont (Nguồn gốc ROE)',
      description: 'ROE = Net Margin × Asset Turnover × Equity Multiplier. ROE từ margin cao tốt hơn từ đòn bẩy!',
      bars: [
        { key: 'net_profit_margin', label: 'Net Margin (%)', color: '#22c55e' },
        { key: 'asset_turnover', label: 'Asset Turnover', color: '#6366f1' },
        { key: 'equity_multiplier', label: 'Equity Multiplier', color: '#f59e0b' },
      ]
    },
    radar: {
      axes: [
        { key: 'roe_score', label: 'ROE cao' },
        { key: 'debt_score', label: 'Nợ thấp' },
        { key: 'margin_score', label: 'Margin cao' },
        { key: 'ocf_score', label: 'Chất lượng LN' },
        { key: 'stability_score', label: 'Ổn định' },
        { key: 'icr_score', label: 'Khả năng trả lãi' },
      ]
    }
  },

  // ==========================================
  // 5. DEFENSIVE INVESTING
  // ==========================================
  defensive: {
    primary: {
      type: 'scatter',
      id: 'risk_safety_matrix',
      title: 'Ma trận An toàn Tài chính',
      description: 'Góc trên-trái: Current Ratio cao + D/E thấp = an toàn nhất',
      xAxis: { key: 'debt_equity_ratio', label: 'D/E Ratio', domain: [0, 3] },
      yAxis: { key: 'current_ratio', label: 'Current Ratio', domain: [0, 6] },
      bubbleSize: { key: 'market_cap', label: 'Vốn hóa' },
      zones: [
        { name: 'Rất an toàn', area: { x: [0, 1], y: [2, 6] }, color: '#22c55e' },
        { name: 'Rủi ro', area: { x: [2, 3], y: [0, 1.5] }, color: '#ef4444' },
      ]
    },
    secondary: {
      type: 'earnings_consistency',
      id: 'earnings_streak',
      title: 'Tính liên tục của Lợi nhuận (5 năm)',
      description: '🟢 Có lãi  🔴 Thua lỗ — Defensive cần lãi liên tục mọi năm',
      years: 5,
      positiveColor: '#22c55e',
      negativeColor: '#ef4444'
    },
    radar: {
      axes: [
        { key: 'size_score', label: 'Quy mô lớn' },
        { key: 'liquidity_score', label: 'Thanh khoản' },
        { key: 'profit_streak_score', label: 'Lãi liên tục' },
        { key: 'div_streak_score', label: 'Cổ tức liên tục' },
        { key: 'eps_growth_score', label: 'EPS tăng trưởng' },
        { key: 'graham_score', label: 'Graham hợp lý' },
      ]
    }
  },

  // ==========================================
  // 6. GARP INVESTING
  // ==========================================
  garp: {
    primary: {
      type: 'scatter',
      id: 'garp_sweet_spot',
      title: 'Vùng GARP Lý tưởng (Growth vs Value)',
      description: 'Vùng xanh: EPS Growth 10-50% + P/E < 20 + PEG ≤ 1.0',
      xAxis: { key: 'eps_growth_cagr_3y', label: 'EPS CAGR 3Y (%)', domain: [0, 60] },
      yAxis: { key: 'pe_ratio', label: 'P/E', domain: [0, 30] },
      bubbleSize: { key: 'roe', label: 'ROE' },
      referenceLine: { type: 'diagonal', slope: 1, label: 'PEG = 1' },
      zones: [
        { name: 'GARP Zone', area: { x: [10, 50], y: [0, 20] }, color: '#22c55e' },
      ]
    },
    secondary: {
      type: 'balance_bar',
      id: 'growth_value_balance',
      title: 'Cân bằng Growth vs Value',
      description: 'GARP tìm kiếm sự cân bằng — không quá rẻ, không quá tăng trưởng',
      leftBars: [
        { key: 'eps_growth_cagr_3y', label: 'EPS CAGR 3Y', color: '#22c55e' },
        { key: 'roe', label: 'ROE', color: '#6366f1' },
      ],
      rightBars: [
        { key: 'pe_ratio', label: 'P/E (thấp = tốt)', color: '#f59e0b', invert: true },
        { key: 'peg_ratio', label: 'PEG (thấp = tốt)', color: '#ef4444', invert: true },
      ]
    },
    radar: {
      axes: [
        { key: 'peg_score', label: 'PEG thấp' },
        { key: 'growth_score', label: 'EPS tăng' },
        { key: 'pe_score', label: 'P/E hợp lý' },
        { key: 'roe_score', label: 'ROE cao' },
        { key: 'liquidity_score', label: 'Thanh khoản' },
        { key: 'consistency_score', label: 'Tăng trưởng đều' },
      ]
    }
  }
};

// Biểu đồ CHUNG cho tất cả trường phái
export const COMMON_CHARTS = {
  sectorPie: {
    type: 'pie',
    id: 'sector_distribution',
    title: 'Phân bố theo Ngành',
    key: 'sector'
  },
  priceDistribution: {
    type: 'histogram',
    id: 'price_dist',
    title: 'Phân bố Giá cổ phiếu',
    key: 'price_close'
  }
};