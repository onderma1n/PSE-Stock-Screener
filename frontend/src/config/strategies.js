// ============================================
// COMMON FILTERS - Dùng chung cho tất cả trường phái
// ============================================
export const COMMON_FILTERS = {
  // --- MULTI-SELECT: Chọn nhiều ngành ---
  sector: {
    id: 'sectors',
    label: 'Ngành (Sector)',
    type: 'multi-select',
    tooltip: 'Chọn một hoặc nhiều ngành để lọc. Bỏ trống = tất cả ngành.',
    options: [
      { value: 'Financials', label: '🏦 Tài chính (Financials)' },
      { value: 'Industrials', label: '🏭 Công nghiệp (Industrials)' },
      { value: 'Real Estate', label: '🏗️ Bất động sản (Real Estate)' },
      { value: 'Consumer Discretionary', label: '🛍️ Hàng tiêu dùng không thiết yếu' },
      { value: 'Consumer Staples', label: '🛒 Hàng tiêu dùng thiết yếu' },
      { value: 'Energy', label: '⚡ Năng lượng (Energy)' },
      { value: 'Materials', label: '🧱 Vật liệu (Materials)' },
      { value: 'Utilities', label: '💡 Tiện ích (Utilities)' },
      { value: 'Information Technology', label: '💻 Công nghệ thông tin' },
      { value: 'Communication Services', label: '📡 Dịch vụ truyền thông' },
      { value: 'Health Care', label: '🏥 Y tế (Health Care)' },
    ],
    default: []  // Mặc định: tất cả ngành
  },

  // --- CHECKBOX: Tính năng phụ ---
  checkboxes: [
    {
      id: 'only_psei',
      label: 'Chỉ hiện cổ phiếu trong rổ PSEi 30',
      type: 'checkbox',
      default: false,
      tooltip: 'Chỉ lọc trong 30 cổ phiếu thuộc chỉ số PSEi (Philippine Stock Exchange Index). Đây là các cổ phiếu blue-chip, thanh khoản cao nhất thị trường.'
    },
    {
      id: 'exclude_high_debt',
      label: 'Loại trừ nợ vay cao',
      type: 'checkbox',
      default: false,
      tooltip: 'Loại bỏ các công ty có tỷ lệ Nợ/Vốn chủ sở hữu (D/E) > 3.0. Giúp tránh các doanh nghiệp có rủi ro tài chính cao.'
    },
    {
      id: 'exclude_negative_equity',
      label: 'Loại trừ vốn chủ sở hữu âm',
      type: 'checkbox',
      default: true,
      tooltip: 'Loại bỏ các công ty có vốn chủ sở hữu âm (nợ nhiều hơn tài sản). Đây thường là dấu hiệu doanh nghiệp đang gặp khó khăn nghiêm trọng.'
    },
    {
      id: 'exclude_loss_making',
      label: 'Loại trừ công ty đang thua lỗ',
      type: 'checkbox',
      default: false,
      tooltip: 'Loại bỏ các công ty có lợi nhuận ròng (Net Income) âm trong năm gần nhất.'
    },
    {
      id: 'only_with_dividend',
      label: 'Chỉ hiện công ty có trả cổ tức',
      type: 'checkbox',
      default: false,
      tooltip: 'Chỉ giữ lại các công ty có trả cổ tức tiền mặt trong năm gần nhất (Dividend per Share > 0).'
    },
    {
      id: 'only_positive_fcf',
      label: 'Chỉ hiện công ty có FCF dương',
      type: 'checkbox',
      default: false,
      tooltip: 'Chỉ giữ lại các công ty có dòng tiền tự do (Free Cash Flow) dương. FCF = Operating Cash Flow - Capital Expenditures.'
    }
  ]
};

export const STRATEGIES = {
  value: {
    id: 'value',
    name: 'Đầu tư Giá trị (Value)',
    description: 'Chiến lược mua cổ phiếu đang bị thị trường định giá thấp so với giá trị nội tại, tập trung vào nền tảng tài chính vững chắc và biên an toàn cao. Nguồn gốc: Benjamin Graham & David Dodd.',
    endpoint: '/api/screen/value',
    color: '#6366f1',
    controls: [
      { id: 'max_debt_to_current_asset', label: 'Tỷ lệ Nợ/TSNH', type: 'slider', min: 0, max: 5, step: 0.05, default: 1.10, tooltip: 'Đo lường rủi ro thanh toán ngắn hạn. Theo Graham, tổng nợ không nên vượt quá 1.10 lần tài sản ngắn hạn.' },
      { id: 'min_current_ratio', label: 'Thanh khoản hiện hành (Current Ratio)', type: 'slider', min: 0, max: 10, step: 0.1, default: 1.50, tooltip: 'Khả năng trả nợ ngắn hạn. Mức lý tưởng: > 1.5 (Tài sản lưu động gấp 1.5 lần Nợ ngắn hạn).' },
      { id: 'req_eps_growth_5y', label: 'Tăng trưởng EPS (5 năm)', type: 'checkbox', default: true, tooltip: 'Đảm bảo lợi nhuận ổn định dài hạn. Lợi nhuận hiện tại phải cao hơn 5 năm trước (không chấp nhận suy giảm).' },
      { id: 'max_pe_ratio', label: 'Hệ số định giá P/E', type: 'slider', min: 0, max: 25, step: 0.1, default: 9.0, tooltip: 'Phản ánh mức định giá so với lợi nhuận. Graham ưu tiên P/E thấp (< 9.0) hoặc thấp hơn trung bình ngành.' },
      { id: 'max_pb_ratio', label: 'Hệ số định giá P/B', type: 'slider', min: 0, max: 5, step: 0.05, default: 1.20, tooltip: 'So sánh giá thị trường với giá trị sổ sách. Vùng giá trị: P/B < 1.2.' },
      { id: 'req_dividend', label: 'Trả cổ tức (Dividend)', type: 'checkbox', default: true, tooltip: 'Chỉ chọn doanh nghiệp đang trả cổ tức tiền mặt nhằm tạo thu nhập trong thời gian chờ giá điều chỉnh.' },
    ]
  },
  growth: {
    id: 'growth',
    name: 'Đầu tư Tăng trưởng (Growth)',
    description: 'Chiến lược đầu tư vào doanh nghiệp có tiềm năng tăng trưởng lợi nhuận mạnh trong tương lai. Nhà đầu tư chấp nhận mua giá cao hôm nay để đổi lấy tăng trưởng nhanh sau này. Nguồn gốc: Thomas Rowe Price Jr. & Philip Fisher.',
    endpoint: '/api/screen/growth',
    color: '#f59e0b',
    controls: [
      { id: 'min_rev_growth_cagr_3y', label: 'Tăng trưởng doanh thu (3 năm)', type: 'slider', min: 0, max: 100, step: 1, default: 20, tooltip: 'Đo tốc độ mở rộng doanh thu dài hạn. Chỉ chọn doanh nghiệp có tốc độ tăng trưởng trung bình > 20%/năm.' },
      { id: 'min_eps_growth_yoy', label: 'Tăng trưởng EPS (YoY)', type: 'slider', min: 0, max: 200, step: 1, default: 25, tooltip: 'Lợi nhuận quý/năm gần nhất phải tăng trưởng mạnh so với cùng kỳ. Mức lý tưởng là > 25%.' },
      { id: 'min_roe', label: 'Hiệu quả vốn (ROE)', type: 'slider', min: 0, max: 50, step: 1, default: 15, tooltip: 'Đo lường khả năng sinh lời trên vốn chủ sở hữu. ROE cao cho thấy doanh nghiệp tăng trưởng hiệu quả.' },
      { id: 'min_net_profit_margin', label: 'Biên lợi nhuận ròng', type: 'slider', min: 0, max: 50, step: 0.5, default: 10, tooltip: 'Tỷ lệ lợi nhuận ròng trên doanh thu. Biên lãi cao thể hiện lợi thế cạnh tranh mạnh.' },
      { id: 'max_peg_ratio', label: 'Định giá PEG', type: 'slider', min: 0, max: 3.0, step: 0.1, default: 1.5, tooltip: 'Định giá cổ phiếu tăng trưởng bằng cách so sánh P/E với tốc độ tăng EPS. PEG < 1.5 được xem là hợp lý.' },
      { id: 'req_high_retention', label: 'Tái đầu tư (Retention Ratio)', type: 'checkbox', default: false, tooltip: 'Tùy chọn lọc các công ty giữ lại hầu hết lợi nhuận (>80%) để tái đầu tư mở rộng quy mô, thay vì trả cổ tức.' },
    ]
  },
  dividend: {
    id: 'dividend',
    name: 'Đầu tư Cổ tức (Dividend)',
    description: 'Chiến lược tập trung vào cổ phiếu có chính sách trả cổ tức đều đặn và ổn định, hướng đến tạo dòng thu nhập thụ động và bảo toàn vốn dài hạn. Nguồn gốc: John Burr Williams với mô hình DDM (1938).',
    endpoint: '/api/screen/dividend',
    color: '#ec4899',
    controls: [
      { id: 'min_dividend_yield', label: 'Tỷ suất cổ tức (Yield)', type: 'slider', min: 0, max: 20, step: 0.1, default: 3.0, tooltip: 'Tỷ lệ cổ tức tiền mặt so với giá cổ phiếu. Yield > 3% cho thấy thu nhập cổ tức hấp dẫn.' },
      { id: 'max_payout_ratio', label: 'Tỷ lệ chi trả (Payout Ratio)', type: 'slider', min: 0, max: 100, step: 5, default: 60, tooltip: 'Tỷ lệ lợi nhuận dùng để trả cổ tức. Mức an toàn thường < 60% (hoặc tối đa 80%). Tỷ lệ quá cao (trên 100%) là rủi ro.' },
      { id: 'min_div_years_consecutive', label: 'Lịch sử trả cổ tức (Năm)', type: 'slider', min: 0, max: 20, step: 1, default: 3, tooltip: 'Số năm trả cổ tức liên tiếp. Lịch sử càng dài (> 5-10 năm), độ ổn định càng cao.' },
      { id: 'req_div_growing', label: 'Tăng trưởng cổ tức', type: 'checkbox', default: true, tooltip: 'Cổ tức năm nay phải bằng hoặc cao hơn năm ngoại. Loại bỏ các công ty đang gặp khó khăn phải cắt giảm cổ tức.' },
      { id: 'req_fcf_positive', label: 'Dòng tiền tự do (FCF)', type: 'checkbox', default: true, tooltip: 'Doanh nghiệp cần FCF dương để đảm bảo cổ tức được chi trả từ hoạt động kinh doanh thực. FCF = Operating Cash Flow - Capital Expenditures.' },
      { id: 'max_debt_equity_ratio', label: 'Sức khỏe tài chính', type: 'slider', min: 0, max: 3.0, step: 0.1, default: 1.0, tooltip: 'Mức độ sử dụng đòn bẩy tài chính. Nợ thấp giúp duy trì cổ tức ổn định dài hạn.' },
    ]
  },
  quality: {
    id: 'quality',
    name: 'Đầu tư Chất lượng (Quality)',
    description: 'Chiến lược đầu tư vào doanh nghiệp có nền tảng tài chính vững mạnh, lợi nhuận và dòng tiền ổn định, nợ thấp và lợi thế cạnh tranh bền vững. Nguồn gốc: Benjamin Graham (phân loại quality - low quality), phát triển mạnh bởi Warren Buffett & Charlie Munger.',
    endpoint: '/api/screen/quality',
    color: '#14b8a6',
    controls: [
      { id: 'min_roe', label: 'Hiệu quả vốn (ROE)', type: 'slider', min: 0, max: 50, step: 1, default: 15, tooltip: 'Đo lường khả năng tạo lợi nhuận trên vốn cổ đông. Doanh nghiệp chất lượng cần ROE cao và duy trì ổn định (thường > 15%).' },
      { id: 'max_debt_equity_ratio', label: 'Nợ / VCSH', type: 'slider', min: 0, max: 10, step: 0.1, default: 2.0, tooltip: 'Chất lượng cao nghĩa là ít phụ thuộc vào nợ vay. Ưu tiên đòn bẩy tài chính thấp.' },
      { id: 'min_gross_profit_margin', label: 'Biên lợi nhuận gộp', type: 'slider', min: 0, max: 100, step: 1, default: 15, tooltip: 'Biên lãi gộp cao chứng tỏ công ty có quyền định giá bán cao, khó bị cạnh tranh.' },
      { id: 'min_earnings_quality_ratio', label: 'Chất lượng lợi nhuận', type: 'slider', min: 0, max: 3.0, step: 0.1, default: 0.8, tooltip: 'Đánh giá mức độ "tiền thật" của lợi nhuận. Tỷ lệ gần 1 là lành mạnh; >1 là rất tốt (tiền về nhiều hơn lãi ghi sổ); <0.5 là rủi ro (lãi ảo, tiền chưa về).' },
      { id: 'req_profit_stable_5y', label: 'Ổn định lợi nhuận (5 năm)', type: 'checkbox', default: true, tooltip: 'Doanh nghiệp phải kinh doanh ổn định. Yêu cầu có lãi liên tiếp trong 5 năm gần nhất, không năm nào bị lỗ.' },
      { id: 'min_interest_coverage', label: 'Khả năng trả lãi vay', type: 'slider', min: 0, max: 50, step: 0.5, default: 4.0, tooltip: 'Lợi nhuận làm ra phải đủ sức trả lãi ngân hàng. Mức an toàn là gấp 4 lần chi phí lãi vay.' },
    ]
  },
  defensive: {
    id: 'defensive',
    name: 'Phòng thủ (Defensive)',
    description: 'Chiến lược đầu tư bảo thủ, ưu tiên an toàn và ổn định, phù hợp với nhà đầu tư ít theo dõi thị trường và chấp nhận lợi nhuận trung bình. Nguồn gốc: Benjamin Graham.',
    endpoint: '/api/screen/defensive',
    color: '#3b82f6',
    controls: [
      { id: 'min_market_cap', label: 'Quy mô doanh nghiệp', type: 'slider', min: 0, max: 2000, step: 10, default: 10, tooltip: 'Ưu tiên doanh nghiệp vốn hóa lớn để giảm rủi ro biến động giá. Vốn hóa trên 10 tỷ thường ổn định hơn so với công ty nhỏ. Đơn vị: Tỷ VNĐ.' },
      { id: 'min_current_ratio', label: 'Sức mạnh tài chính', type: 'slider', min: 0, max: 10, step: 0.1, default: 2.0, tooltip: 'Đánh giá khả năng thanh toán ngắn hạn. Tỷ lệ trên 2.0 cho thấy doanh nghiệp có biên an toàn tài chính cao.' },
      { id: 'min_profit_years_consecutive', label: 'Ổn định lợi nhuận (Năm)', type: 'slider', min: 0, max: 10, step: 1, default: 5, tooltip: 'Doanh nghiệp phải có lãi liên tục trong nhiều năm (Graham yêu cầu 10 năm). Tại PSE, tối thiểu nên chọn 5 năm không bị lỗ.' },
      { id: 'min_div_years_consecutive', label: 'Lịch sử cổ tức (Năm)', type: 'slider', min: 0, max: 20, step: 1, default: 5, tooltip: 'Doanh nghiệp phòng thủ uy tín phải trả cổ tức tiền mặt đều đặn, không ngắt quãng trong ít nhất 5-10 năm qua.' },
      { id: 'min_eps_growth_total_5y', label: 'Tăng trưởng lợi nhuận', type: 'slider', min: 0, max: 100, step: 1, default: 33, tooltip: 'Lợi nhuận hiện tại nên cao hơn quá khứ tối thiểu 33% để bù lạm phát và duy trì tăng trưởng thực.' },
      { id: 'max_graham_multiplier', label: 'Số nhân Graham', type: 'slider', min: 0, max: 50, step: 0.5, default: 22.5, tooltip: 'Tích của P/E và P/B không được vượt quá 22.5 (Tương đương P/E=15 và P/B=1.5). Giúp mua cổ phiếu giá hợp lý.' },
    ]
  },
  garp: {
    id: 'garp',
    name: 'GARP (Growth at Reasonable Price)',
    description: 'Chiến lược kết hợp giữa tăng trưởng và giá trị, tìm kiếm doanh nghiệp có tăng trưởng lợi nhuận bền vững nhưng được giao dịch ở mức định giá hợp lý, tránh các trường hợp tăng trưởng quá nóng. Nguồn gốc: Peter Lynch.',
    endpoint: '/api/screen/garp',
    color: '#f43f5e',
    controls: [
      { id: 'max_peg_ratio', label: 'Chỉ số PEG', type: 'slider', min: 0, max: 3.0, step: 0.1, default: 1.0, tooltip: 'Chỉ số cốt lõi của GARP. PEG ≈ 1 cho thấy định giá phù hợp với tăng trưởng; PEG < 1 thường phản ánh cổ phiếu đang được định giá hấp dẫn so với tốc độ tăng trưởng lợi nhuận.' },
      { id: 'min_eps_growth_cagr_3y', label: 'Tốc độ tăng trưởng (3 năm)', type: 'slider', min: 0, max: 50, step: 1, default: 10, tooltip: 'GARP tìm mức tăng trưởng bền vững (10-20%) thay vì mức tăng quá lớn (>50%), vốn tiềm ẩn rủi ro và khó duy trì lâu dài.' },
      { id: 'max_eps_growth_cagr_3y', label: 'Giới hạn tăng trưởng (3 năm)', type: 'slider', min: 0, max: 50, step: 1, default: 50, tooltip: 'Giới hạn trên để tránh tăng trưởng bất thường, không bền vững.' },
      { id: 'max_pe_ratio', label: 'Định giá P/E', type: 'slider', min: 0, max: 50, step: 1, default: 20, tooltip: 'Giới hạn định giá để tránh trả giá quá cao cho tăng trưởng. P/E quanh 20 thường được xem là hợp lý với doanh nghiệp tăng trưởng ổn định.' },
      { id: 'min_roe', label: 'Hiệu quả vốn (ROE)', type: 'slider', min: 0, max: 50, step: 1, default: 15, tooltip: 'Tăng trưởng phải đi kèm chất lượng. ROE > 15% (hoặc cao hơn trung bình ngành) chứng tỏ công ty sử dụng vốn hiệu quả.' },
      { id: 'req_eps_growth_yoy_positive', label: 'Tăng trưởng lợi nhuận (Gần nhất)', type: 'checkbox', default: true, tooltip: 'Lợi nhuận năm gần nhất phải tăng trưởng dương so với năm trước. GARP tránh các doanh nghiệp đang suy giảm lợi nhuận.' },
      { id: 'min_current_ratio', label: 'Sức khỏe tài chính', type: 'slider', min: 0, max: 5, step: 0.1, default: 1.5, tooltip: 'Tiêu chí kiểm soát rủi ro. Doanh nghiệp tăng trưởng vẫn cần duy trì khả năng thanh toán hợp lý; mức 1.5 phản ánh nền tảng tài chính ổn định.' },
    ]
  }
};