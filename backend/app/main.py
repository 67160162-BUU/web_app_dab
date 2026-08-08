"""จุดเริ่มแอป: สร้าง FastAPI, เปิด API routers, แล้ว mount frontend เป็น static files"""
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from sqlalchemy import text
from app.database import engine, Base
import app.models
from app.routers import scores, auth, admin, share, users

# Auto-create tables if missing
try:
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE scores ADD COLUMN pose_key VARCHAR(50) NOT NULL DEFAULT 'dab';"))
            conn.commit()
        except Exception:
            pass
except Exception:
    pass

app = FastAPI(title="DANCE DETECTOR API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(scores.router, prefix="/api/scores", tags=["scores"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(share.router, prefix="/api/share", tags=["share"])


@app.get("/api/health")
def health():
    return {"status": "ok"}


# หาโฟลเดอร์ frontend
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
