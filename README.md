# 📈 PSE Stock Screener

**Philippine Stock Exchange — Sàng lọc Cổ phiếu Chuyên sâu**

Ứng dụng web sàng lọc cổ phiếu trên sàn chứng khoán Philippines (PSE) theo nhiều trường phái đầu tư khác nhau, hỗ trợ nhà đầu tư ra quyết định dựa trên dữ liệu tài chính.

---

## 🎯 Tổng quan

PSE Stock Screener cho phép bạn:

- **Sàng lọc cổ phiếu** theo 6 trường phái đầu tư: Value, Growth, Dividend, Quality, Defensive, GARP
- **Chấm điểm tự động** kết hợp Absolute Score (so ngưỡng chuẩn ngành) + Percentile Ranking (so tương đối)
- **So sánh song song** nhiều mã cổ phiếu với biểu đồ radar 6 chiều
- **Xem hồ sơ chi tiết** từng mã với đầy đủ chỉ số tài chính
- **Quản lý Watchlist** lưu danh sách theo dõi vào localStorage
- **Bộ lọc chung** theo ngành, vốn hóa, thanh khoản, loại trừ penny stock/lỗ/nợ cao

---


```

---

## 🚀 Cài đặt & Chạy

### Yêu cầu

- **Python** 3.10+
- **Node.js** 18+
- **npm** hoặc **yarn**

### 1. Backend

```bash
cd backend

# Tạo virtual environment (khuyến nghị)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Cài dependencies
pip install -r requirements.txt

# Chạy server
uvicorn app.main:app --reload --port 8000
```

Backend sẽ chạy tại: `http://localhost:8000`

API docs tự động: `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend

# Cài dependencies
npm install

# Chạy dev server
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:5173`

---

## 📊 Trường phái đầu tư

### 1. 💎 Value (Giá trị)
> Tìm cổ phiếu bị định giá thấp so với giá trị thực.

| Tiêu chí | Trọng số | Hướng | Ngưỡng xuất sắc |
|-----------|----------|-------|-----------------|
| P/E thấp | 30% | ↓ | ≤ 5 |
| P/B thấp | 25% | ↓ | ≤ 0.5 |
| D/E thấp | 15% | ↓ | ≤ 0.3 |
| Current Ratio cao | 15% | ↑ | ≥ 3.0 |
| Cổ tức Yield cao | 15% | ↑ | ≥ 6% |

### 2. 🚀 Growth (Tăng trưởng)
> Tìm cổ phiếu có tốc độ tăng trưởng lợi nhuận vượt trội.

| Tiêu chí | Trọng số | Hướng | Ngưỡng xuất sắc |
|-----------|----------|-------|-----------------|
| EPS Growth YoY | 30% | ↑ | ≥ 50% |
| Doanh thu CAGR 3Y | 25% | ↑ | ≥ 30% |
| ROE | 20% | ↑ | ≥ 25% |
| PEG | 15% | ↓ | ≤ 0.5 |
| Biên LN Ròng | 10% | ↑ | ≥ 20% |

### 3. 💰 Dividend (Cổ tức)
> Tìm cổ phiếu trả cổ tức cao và bền vững.

| Tiêu chí | Trọng số | Hướng | Ngưỡng xuất sắc |
|-----------|----------|-------|-----------------|
| Cổ tức Yield | 30% | ↑ | ≥ 7% |
| Năm trả liên tục | 25% | ↑ | ≥ 10 năm |
| Payout Ratio | 20% | ⚖ | 30–60% |
| FCF dương | 15% | ↑ | Cao |
| D/E thấp | 10% | ↓ | ≤ 0.3 |

### 4. ⭐ Quality (Chất lượng)
> Tìm doanh nghiệp có hiệu suất vận hành và sinh lời vượt trội.

| Tiêu chí | Trọng số | Hướng | Ngưỡng xuất sắc |
|-----------|----------|-------|-----------------|
| ROE | 30% | ↑ | ≥ 25% |
| Biên LN Gộp | 20% | ↑ | ≥ 50% |
| Biên LN Ròng | 20% | ↑ | ≥ 20% |
| OCF/NI (LN thực) | 15% | ↑ | ≥ 1.5 |
| D/E thấp | 15% | ↓ | ≤ 0.3 |

### 5. 🛡️ Defensive (Phòng thủ)
> Tìm cổ phiếu an toàn theo tiêu chí Benjamin Graham.

| Tiêu chí | Trọng số | Hướng | Ngưỡng xuất sắc |
|-----------|----------|-------|-----------------|
| Graham (PE×PB) | 25% | ↓ | ≤ 5 |
| D/E thấp | 20% | ↓ | ≤ 0.3 |
| Current Ratio | 15% | ↑ | ≥ 3.0 |
| P/E thấp | 15% | ↓ | ≤ 5 |
| Năm có lãi liên tục | 15% | ↑ | ≥ 10 năm |
| Năm trả cổ tức | 10% | ↑ | ≥ 10 năm |

### 6. 📈 GARP (Growth at Reasonable Price)
> Cân bằng giữa tăng trưởng và định giá hợp lý.

| Tiêu chí | Trọng số | Hướng | Ngưỡng xuất sắc |
|-----------|----------|-------|-----------------|
| EPS CAGR 3Y | 25% | ↑ | ≥ 30% |
| ROE | 25% | ↑ | ≥ 25% |
| PEG | 20% | ↓ | ≤ 0.5 |
| P/E | 20% | ↓ | ≤ 8 |
| Current Ratio | 10% | ↑ | ≥ 3.0 |

---

## 📐 Hệ thống chấm điểm

### Cơ chế kết hợp Absolute + Percentile

Hệ thống tự động điều chỉnh phương pháp chấm điểm theo số lượng mã:

| Số mã qua lọc | Absolute Score | Percentile Ranking |
|----------------|----------------|--------------------|
| ≤ 5 mã | **100%** | 0% |
| 6–19 mã | Nội suy tuyến tính | Nội suy tuyến tính |
| ≥ 20 mã | 30% | **70%** |

**Absolute Score** — So sánh chỉ số với ngưỡng chuẩn cố định (excellent / good / fair / poor), nội suy tuyến tính giữa các mức.

**Percentile Ranking** — Xếp hạng tương đối giữa các mã trong cùng bộ lọc.

### Thang điểm

| Điểm | Đánh giá | Ý nghĩa |
|------|----------|---------|
| 🟢 ≥ 80 | Xuất sắc | Vượt trội so với ngưỡng chuẩn và/hoặc các mã khác |
| 🔵 ≥ 60 | Tốt | Trên trung bình, đáng cân nhắc |
| 🟡 ≥ 40 | Trung bình | Cần xem xét thêm |
| 🔴 < 40 | Yếu | Nhiều chỉ số dưới chuẩn |

---

## 🖥️ Tính năng giao diện

### Bảng kết quả
- Sắp xếp theo mọi cột (click header)
- Tìm kiếm nhanh theo mã CK, ngành
- Phân trang
- Màu sắc P/E (xanh = hấp dẫn, đỏ = đắt)

### Hồ sơ chi tiết (Stock Detail)
- Click vào mã → popup với biểu đồ radar 6 chiều (Định giá, Tăng trưởng, Sinh lời, An toàn, Cổ tức, Chất lượng)
- Bảng chỉ số chi tiết đầy đủ
- Tags tự động (P/E hấp dẫn, Cổ tức hấp dẫn, Thanh khoản tốt, ...)

### So sánh song song
- Chọn nhiều mã → button "So sánh" → overlay radar chồng lên nhau
- Bảng so sánh chi tiết từng chỉ số

### Watchlist
- Bookmark mã yêu thích → lưu localStorage
- Hiển thị nhanh từ header

### Dark / Light Mode
- Toggle giữa 2 chế độ giao diện
- Lưu preference vào localStorage

---

## 📡 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/screen/value` | Lọc theo trường phái Value |
| `POST` | `/api/screen/growth` | Lọc theo trường phái Growth |
| `POST` | `/api/screen/dividend` | Lọc theo trường phái Dividend |
| `POST` | `/api/screen/quality` | Lọc theo trường phái Quality |
| `POST` | `/api/screen/defensive` | Lọc theo trường phái Defensive |
| `POST` | `/api/screen/garp` | Lọc theo trường phái GARP |

**Query params:** `?period=annual`

**Request body:** JSON chứa các tham số lọc + `common_filters`

---

## 📦 Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, Recharts, Lucide Icons |
| **Backend** | Python, FastAPI, Pandas, NumPy |
| **Data** | CSV (PSE annual financial data, cập nhật 31/12/2024) |
| **State** | React useState/useMemo, localStorage (watchlist, dark mode) |

---

## 📁 Dữ liệu

- Nguồn: Dữ liệu tài chính các công ty niêm yết trên PSE
- Kỳ báo cáo: **Năm (Annual)**
- Cập nhật gần nhất: **31/12/2024**
- File: `backend/data/pse_annual.csv`

### Các chỉ số có sẵn

| Nhóm | Chỉ số |
|------|--------|
| **Định giá** | P/E, P/B, Graham (PE×PB), PEG |
| **Tăng trưởng** | EPS Growth YoY, EPS CAGR 3Y, Revenue CAGR 3Y |
| **Sinh lời** | ROE, ROA, Gross Margin, Net Margin, OCF/NI |
| **An toàn** | D/E, Current Ratio, Quick Ratio |
| **Cổ tức** | Dividend Yield, Payout Ratio, Năm trả liên tục |
| **Khác** | Vốn hóa, Giá, Volume, Sector, Industry |

---

## 🛡️ Disclaimer

> ⚠️ **Đây là công cụ hỗ trợ phân tích, KHÔNG phải lời khuyên đầu tư.**
> 
> Mọi quyết định đầu tư thuộc về người dùng. Dữ liệu có thể có độ trễ và sai sót. Vui lòng kiểm chứng với nguồn chính thức trước khi giao dịch.

---

## 📄 License

Dự án phục vụ mục đích học tập và nghiên cứu.