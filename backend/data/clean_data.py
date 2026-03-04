import pandas as pd
import os

def clean_csv_decimals(input_file, output_file=None):
    """
    Đọc file CSV có decimal separator là dấu phẩy (,),
    chuyển về dấu chấm (.) chuẩn quốc tế, lưu lại.
    """
    if output_file is None:
        output_file = input_file

    if not os.path.exists(input_file):
        print(f"❌ Không tìm thấy file: {input_file}")
        return None

    print(f"\n📖 Đang đọc file: {input_file}...")
    
    # === BƯỚC 1: Đọc RAW text để xử lý ===
    with open(input_file, 'r', encoding='utf-8') as f:
        raw_content = f.read()
    
    # Đếm số dòng
    total_lines = raw_content.count('\n')
    print(f"   Tổng số dòng: {total_lines}")
    
    # === BƯỚC 2: Đọc CSV với pandas (string mode) ===
    df = pd.read_csv(input_file, dtype=str)  # ĐỌC TẤT CẢ LÀ STRING
    print(f"   Shape: {df.shape[0]} dòng x {df.shape[1]} cột")
    print(f"   Columns: {df.columns.tolist()}")
    
    # === BƯỚC 3: Xử lý từng cột ===
    skip_columns = ['Ticker', 'ticker', 'TICKER', 'year', 'Year', 'YEAR']
    converted = []
    skipped = []
    
    for col in df.columns:
        if col in skip_columns:
            skipped.append(col)
            continue
        
        # Lấy sample giá trị không null
        sample = df[col].dropna().head(100)
        
        if len(sample) == 0:
            skipped.append(col)
            continue
        
        # Kiểm tra xem cột có chứa dấu phẩy thập phân không
        has_decimal_comma = sample.astype(str).str.match(r'^-?"?\d+,\d+"?$').any()
        
        if has_decimal_comma:
            # CÓ dấu phẩy thập phân → thay , bằng . rồi convert
            cleaned = df[col].astype(str).str.strip().str.strip('"')
            cleaned = cleaned.str.replace(',', '.', regex=False)
            df[col] = pd.to_numeric(cleaned, errors='coerce')
            converted.append(col)
            print(f"   ✅ Fixed decimal comma: {col}")
        else:
            # Thử convert bình thường
            numeric_val = pd.to_numeric(df[col], errors='coerce')
            non_null_ratio = numeric_val.notna().sum() / max(len(df), 1)
            
            if non_null_ratio > 0.3:  # >30% là số → cột số
                df[col] = numeric_val
                converted.append(col)
            else:
                skipped.append(col)
    
    # === BƯỚC 4: Lưu file ===
    df.to_csv(output_file, index=False)
    print(f"\n💾 Đã lưu: {output_file}")
    print(f"   Converted: {len(converted)} cột")
    print(f"   Skipped: {len(skipped)} cột ({skipped})")
    
    return df


def verify_data(df, label=""):
    """Kiểm tra nhanh dữ liệu sau khi clean."""
    print(f"\n{'='*60}")
    print(f"🔍 VERIFY: {label}")
    print(f"{'='*60}")
    
    key_columns = ['price_close', 'eps_basic', 'bvps', 'dividend_per_share',
                   'net_income', 'revenue', 'total_assets', 'total_equity',
                   'operating_cash_flow', 'capital_expenditures', 'shares_outstanding']
    
    for col in key_columns:
        if col not in df.columns:
            print(f"   ⏭️ {col:30s} | KHÔNG CÓ TRONG FILE")
            continue
        
        dtype = df[col].dtype
        null_count = df[col].isna().sum()
        null_pct = null_count / len(df) * 100
        
        if pd.api.types.is_numeric_dtype(df[col]):
            min_val = df[col].min()
            max_val = df[col].max()
            print(f"   ✅ {col:30s} | {str(dtype):10s} | "
                  f"null: {null_count:5d} ({null_pct:4.1f}%) | "
                  f"min: {min_val:>15.4f} | max: {max_val:>15.4f}")
        else:
            # CÒN LÀ STRING → CÓ VẤN ĐỀ
            sample = df[col].dropna().head(3).tolist()
            print(f"   ❌ {col:30s} | {str(dtype):10s} | "
                  f"⚠️ VẪN LÀ STRING! Sample: {sample}")
    
    # Spot check giá
    if 'price_close' in df.columns and pd.api.types.is_numeric_dtype(df['price_close']):
        print(f"\n   --- Spot Check price_close ---")
        sample_prices = df[df['price_close'].notna()].head(10)
        if 'Ticker' in df.columns:
            for _, row in sample_prices.iterrows():
                print(f"   {row.get('Ticker','?'):15s} | year: {row.get('year','?')} | price: {row['price_close']:.4f}")
        
        # Cảnh báo giá bất thường
        if df['price_close'].max() > 10000:
            print(f"\n   ⚠️ CẢNH BÁO: price_close max = {df['price_close'].max():.2f} — có thể bị sai scale!")
        if df['price_close'].min() < 0:
            print(f"   ⚠️ CẢNH BÁO: price_close min = {df['price_close'].min():.2f} — giá âm!")
    
    print(f"{'='*60}\n")


if __name__ == '__main__':
    data_dir = os.path.dirname(os.path.abspath(__file__))
    
    print("🚀 BẮT ĐẦU CLEAN DATA...")
    print(f"   Data directory: {data_dir}")
    
    # ========== 1. Clean MASTER_ANNUAL ==========
    annual_input = os.path.join(data_dir, 'MASTER_ANNUAL.csv')
    annual_output = os.path.join(data_dir, 'MASTER_ANNUAL_CLEANED.csv')
    
    df_annual = clean_csv_decimals(annual_input, annual_output)
    if df_annual is not None:
        verify_data(df_annual, "MASTER_ANNUAL")
    
    # ========== 2. Clean MASTER_QUARTERLY ==========
    quarterly_input = os.path.join(data_dir, 'MASTER_QUARTERLY.csv')
    quarterly_output = os.path.join(data_dir, 'MASTER_QUARTERLY_CLEANED.csv')
    
    if os.path.exists(quarterly_input):
        df_quarterly = clean_csv_decimals(quarterly_input, quarterly_output)
        if df_quarterly is not None:
            verify_data(df_quarterly, "MASTER_QUARTERLY")
    else:
        print(f"\n⏭️ Không tìm thấy file Quarterly: {quarterly_input}")
    
    print("\n🎉 HOÀN TẤT!")
    print("=" * 60)
    print("👉 Bước tiếp theo:")
    print("   1. Kiểm tra file *_CLEANED.csv")
    print("   2. Đảm bảo backend đọc file CLEANED")
    print("   3. Restart backend")