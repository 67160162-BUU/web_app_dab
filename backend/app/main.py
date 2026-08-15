"""จุดเริ่มแอป: สร้าง FastAPI, เปิด API routers, แล้ว mount frontend เป็น static files"""
import os
import time
import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.database import engine, Base
import app.models
from app.routers import scores, auth, admin, share, users

logger = logging.getLogger("dance_detector")

# Auto-create tables & seed data with retry mechanism (waits for database container readiness)
for attempt in range(1, 15):
    try:
        Base.metadata.create_all(bind=engine)
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE scores ADD COLUMN pose_key VARCHAR(50) NOT NULL DEFAULT 'dab';"))
                conn.commit()
            except Exception:
                pass

        # Auto-seed initial admin and demo players if empty or fix invalid hashes
        from app.models import User, Score
        from app.database import SessionLocal
        from app.auth import verify_password
        with SessionLocal() as db:
            admin_user = db.query(User).filter(User.username == "admin").first()
            valid_hash = "$2b$12$tpR6hHLGOhWzpNmPixNoMey2KaHpgcRJnFUvzr6DiGhO1O/fxPi8a" # adminpassword123
            
            if not admin_user:
                admin_user = User(
                    username="admin",
                    email="admin@dancedetector.com",
                    password_hash=valid_hash,
                    display_name="Admin Manager",
                    role="admin",
                    is_guest=False
                )
                player1 = User(
                    username="player1",
                    email="player1@gmail.com",
                    password_hash=valid_hash,
                    display_name="ProDabber99",
                    role="player",
                    is_guest=False
                )
                guest1 = User(display_name="TestDabPro", role="player", is_guest=True)
                guest2 = User(display_name="TestSixSevenStar", role="player", is_guest=True)
                guest3 = User(display_name="TestScubaChamp", role="player", is_guest=True)

                db.add_all([admin_user, player1, guest1, guest2, guest3])
                db.commit()

                db.refresh(player1)
                db.refresh(guest1)
                db.refresh(guest2)
                db.refresh(guest3)

                score1 = Score(user_id=player1.id, pose_key="dab", score=850, count=9, pose_accuracy_details={"avg_accuracy": 94.4})
                score2 = Score(user_id=guest1.id, pose_key="dab", score=1650, count=22, pose_accuracy_details={"avg_accuracy": 98.5})
                score3 = Score(user_id=guest2.id, pose_key="six_seven", score=1820, count=25, pose_accuracy_details={"avg_accuracy": 99.1})
                score4 = Score(user_id=guest3.id, pose_key="scuba", score=2100, count=28, pose_accuracy_details={"avg_accuracy": 99.6})

                db.add_all([score1, score2, score3, score4])
                db.commit()
            else:
                # If admin exists with broken or outdated password hash, auto-repair it
                if not verify_password("adminpassword123", admin_user.password_hash or ""):
                    admin_user.password_hash = valid_hash
                    admin_user.role = "admin"
                    db.commit()

                player1 = db.query(User).filter(User.username == "player1").first()
                if player1 and not verify_password("adminpassword123", player1.password_hash or ""):
                    player1.password_hash = valid_hash
                    db.commit()

        break
    except Exception as e:
        if attempt < 14:
            time.sleep(1.5)
        else:
            logger.warning(f"Database initialization warning (will retry on incoming requests): {e}")


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


# ค้นหาโฟลเดอร์ frontend (รองรับทั้งการรัน Local, Docker Volume, และ Docker Image Standalone)
candidate_frontend_paths = [
    Path("/frontend"),
    Path(__file__).resolve().parent.parent.parent / "frontend",
    Path(__file__).resolve().parent.parent / "frontend",
    Path("/app/frontend"),
    Path.cwd() / "frontend",
]

FRONTEND_DIR = next((p for p in candidate_frontend_paths if p.exists() and p.is_dir()), None)
if FRONTEND_DIR:
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")

