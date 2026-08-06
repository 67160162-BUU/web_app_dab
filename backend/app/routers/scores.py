from typing import List, Optional, Union
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Score, User, UserRole
from app.auth import get_current_user, get_password_hash, verify_password

router = APIRouter()

class ScoreCreateRequest(BaseModel):
    display_name: str
    username: Optional[str] = None
    email: Optional[str] = None
    score: Union[int, float]
    count: int
    pose_key: Optional[str] = "dab"
    pose_accuracy_details: Optional[dict] = None
    password: Optional[str] = None

class ScoreResponse(BaseModel):
    id: int
    user_id: int
    display_name: str
    pose_key: str
    score: Union[int, float]
    count: int
    created_at: str

    class Config:
        from_attributes = True

from sqlalchemy import desc, func

@router.get("/top")
def get_top_scores(
    limit: int = 20,
    pose_key: Optional[str] = None,
    sort_by: str = "score",
    db: Session = Depends(get_db)
):
    """ดึงอันดับคะแนนสูงสุด (High Score 1 คนต่อ 1 ช่องอันดับ)"""
    try:
        if sort_by == "count":
            subq = db.query(
                Score.user_id,
                func.max(Score.count).label("max_count"),
                func.max(Score.score).label("max_score")
            )
            if pose_key:
                subq = subq.filter(Score.pose_key == pose_key)
            subq = subq.group_by(Score.user_id).subquery()

            query = db.query(
                subq.c.user_id,
                User.display_name,
                subq.c.max_score,
                subq.c.max_count
            ).join(User, subq.c.user_id == User.id)\
             .order_by(desc(subq.c.max_count), desc(subq.c.max_score))
        else:
            subq = db.query(
                Score.user_id,
                func.max(Score.score).label("max_score"),
                func.max(Score.count).label("max_count")
            )
            if pose_key:
                subq = subq.filter(Score.pose_key == pose_key)
            subq = subq.group_by(Score.user_id).subquery()

            query = db.query(
                subq.c.user_id,
                User.display_name,
                subq.c.max_score,
                subq.c.max_count
            ).join(User, subq.c.user_id == User.id)\
             .order_by(desc(subq.c.max_score), desc(subq.c.max_count))

        results = query.limit(limit).all()

        output = []
        for uid, display_name, score_val, count_val in results:
            output.append({
                "id": uid,
                "user_id": uid,
                "nickname": display_name,
                "pose_key": pose_key or "dab",
                "score": score_val,
                "dab_count": count_val,
                "count": count_val,
                "created_at": ""
            })

        return output
    except Exception as e:
        print("Error fetching top scores:", e)
        return []

@router.get("/leaderboards")
def get_all_leaderboards(limit: int = 10, db: Session = Depends(get_db)):
    """ดึงทั้ง 4 กระดานผู้นำพร้อมกัน ( High Score 1 คนต่อ 1 ช่องอันดับ)"""
    def fetch_board(pose_filter=None, sort_field="score"):
        try:
            if sort_field == "count":
                subq = db.query(
                    Score.user_id,
                    func.max(Score.count).label("max_count"),
                    func.max(Score.score).label("max_score")
                )
                if pose_filter:
                    subq = subq.filter(Score.pose_key == pose_filter)
                subq = subq.group_by(Score.user_id).subquery()

                q = db.query(
                    subq.c.user_id,
                    User.display_name,
                    subq.c.max_score,
                    subq.c.max_count
                ).join(User, subq.c.user_id == User.id)\
                 .order_by(desc(subq.c.max_count), desc(subq.c.max_score))
            else:
                subq = db.query(
                    Score.user_id,
                    func.max(Score.score).label("max_score"),
                    func.max(Score.count).label("max_count")
                )
                if pose_filter:
                    subq = subq.filter(Score.pose_key == pose_filter)
                subq = subq.group_by(Score.user_id).subquery()

                q = db.query(
                    subq.c.user_id,
                    User.display_name,
                    subq.c.max_score,
                    subq.c.max_count
                ).join(User, subq.c.user_id == User.id)\
                 .order_by(desc(subq.c.max_score), desc(subq.c.max_count))

            res = q.limit(limit).all()
            return [
                {
                    "id": uid,
                    "user_id": uid,
                    "nickname": name,
                    "pose_key": pose_filter or "dab",
                    "score": score_val,
                    "count": count_val,
                    "dab_count": count_val,
                    "created_at": ""
                }
                for uid, name, score_val, count_val in res
            ]
        except Exception as e:
            print("Error fetching board:", e)
            return []

    return {
        "overall": fetch_board(pose_filter=None, sort_field="score"),
        "dab": fetch_board(pose_filter="dab", sort_field="count"),
        "six_seven": fetch_board(pose_filter="six_seven", sort_field="count"),
        "scuba": fetch_board(pose_filter="scuba", sort_field="count"),
    }

@router.post("/", response_model=ScoreResponse)
def submit_score(
    req: ScoreCreateRequest,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """บันทึกคะแนนจากการเล่นเกม (แยก Username ที่เปลี่ยนไม่ได้ และ Display Name ที่เปลี่ยนได้เสมอ)"""
    user = current_user
    name_clean = req.display_name.strip()
    provided_username = req.username.strip().lower() if req.username else None
    clean_email = req.email.strip() if req.email else None

    if not user and provided_username:
        user = db.query(User).filter(User.username == provided_username).first()

    if not user:
        existing_user = db.query(User).filter(User.display_name == name_clean).first()
        if existing_user and existing_user.password_hash and req.password:
            if not verify_password(req.password, existing_user.password_hash):
                raise HTTPException(status_code=400, detail="รหัสผ่านไม่ถูกต้อง")
            user = existing_user
        else:
            user = existing_user or User(
                username=provided_username,
                display_name=name_clean,
                email=clean_email,
                password_hash=get_password_hash(req.password) if req.password else None,
                role="player",
                is_guest=not bool(req.password)
            )
            if not existing_user:
                db.add(user)
                db.commit()
                db.refresh(user)

    if user:
        if name_clean and user.display_name != name_clean:
            user.display_name = name_clean
        if clean_email and user.email != clean_email:
            user.email = clean_email
        db.commit()

    pose_key_val = req.pose_key or "dab"
    accuracy_details = req.pose_accuracy_details or {
        "avg_accuracy": round(req.score / req.count, 1) if req.count > 0 else 0
    }

    new_score = Score(
        user_id=user.id,
        pose_key=pose_key_val,
        score=int(round(req.score)),
        count=req.count,
        pose_accuracy_details=accuracy_details
    )
    db.add(new_score)
    db.commit()
    db.refresh(new_score)

    return ScoreResponse(
        id=new_score.id,
        user_id=user.id,
        display_name=user.display_name,
        pose_key=new_score.pose_key,
        score=new_score.score,
        count=new_score.count,
        created_at=new_score.created_at.strftime("%Y-%m-%d %H:%M:%S")
    )
