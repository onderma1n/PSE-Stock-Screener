import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
ANNUAL_DATA_PATH = DATA_DIR / "MASTER_ANNUAL_CLEANED.csv"
QUARTERLY_DATA_PATH = DATA_DIR / "MASTER_QUARTERLY.csv"

# Kiểm tra file tồn tại ngay khi import
if not DATA_DIR.exists():
    raise FileNotFoundError(f"Thư mục data không tồn tại: {DATA_DIR}")