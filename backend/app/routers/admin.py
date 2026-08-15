from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import User, Score, UserRole
from app.auth import require_admin, get_password_hash

router = APIRouter()

class UserAdminResponse(BaseModel):
    id: int
    username: Optional[str]
    email: Optional[str]
    display_name: str
    role: str
    is_guest: bool
    created_at: str

    class Config:
        from_attributes = True

class RoleUpdateRequest(BaseModel):
    role: str

@router.get("/users")
def list_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """(Admin เท่านั้น) ดึงรายชื่อผู้ใช้ทั้งหมดในระบบ"""
    users = db.query(User).order_by(desc(User.created_at)).all()
    output = []
    for u in users:
        output.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "display_name": u.display_name,
            "role": str(u.role.value if hasattr(u.role, 'value') else u.role),
            "is_guest": u.is_guest,
            "created_at": u.created_at.strftime("%Y-%m-%d %H:%M:%S") if u.created_at else ""
        })
    return output

@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    req: RoleUpdateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """(Admin เท่านั้น) เปลี่ยน Role ผู้ใช้งาน (player <-> admin)"""
    if req.role not in ["player", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = req.role
    db.commit()
    return {"message": "Role updated successfully", "user_id": user_id, "new_role": req.role}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """(Admin เท่านั้น) ลบผู้ใช้"""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully", "user_id": user_id}

@router.delete("/scores/{score_id}")
def delete_score(
    score_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """(Admin เท่านั้น) ลบคะแนนที่ไม่เหมาะสม/ต้องสงสัยว่าโกง"""
    score = db.query(Score).filter(Score.id == score_id).first()
    if not score:
        raise HTTPException(status_code=404, detail="Score not found")

    db.delete(score)
    db.commit()
    return {"message": "Score deleted successfully", "score_id": score_id}
