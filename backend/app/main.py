from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.data_engine.loader import load_data
from app.strategies.scoring_engine import get_scoring_explanation

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    load_data()
    yield
    # Shutdown (cleanup nếu cần)

app = FastAPI(title="PSE Stock Screener API", version="1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/api/scoring-explanation/{strategy}")
def scoring_explanation(strategy: str):
    """Trả về giải thích cách chấm điểm cho từng trường phái."""
    return get_scoring_explanation(strategy)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)