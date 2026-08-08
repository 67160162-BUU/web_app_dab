from typing import List, Optional
from math import ceil
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.database import get_db
from app.models import User, UserRole
from app.auth import get_current_user, require_admin, get_password_hash

router = APIRouter()

class UserUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    password: Optional[str] = None

class UserDetailResponse(BaseModel):
    id: int
    username: Optional[str]
    email: Optional[str]
    display_name: str
    role: str
    is_guest: bool
    created_at: str

    class Config:
        from_attributes = True

class UserPaginationResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    items: List[dict]

@router.get("", response_model=UserPaginationResponse)
@router.get("/", response_model=UserPaginationResponse)
def list_users_paginated(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by username, display_name or email"),
    db: Session = Depends(get_db)
):
    """ดึงรายชื่อผู้ใช้งานทั้งหมด พร้อมระบบ Pagination และ ค้นหา (search)"""
    query = db.query(User)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.username.ilike(term),
                User.display_name.ilike(term),
                User.email.ilike(term)
            )
        )

    total = query.count()
    total_pages = ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit

    users = query.order_by(desc(User.created_at)).offset(offset).limit(limit).all()

    items = [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "display_name": u.display_name,
            "role": str(u.role.value if hasattr(u.role, 'value') else u.role),
            "is_guest": u.is_guest,
            "created_at": u.created_at.strftime("%Y-%m-%d %H:%M:%S") if u.created_at else ""
        }
        for u in users
    ]

    return UserPaginationResponse(
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        items=items
    )

@router.get("/{user_id}")
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db)
):
    """ดึงข้อมูลผู้ใช้งานตาม ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "display_name": user.display_name,
        "role": str(user.role.value if hasattr(user.role, 'value') else user.role),
        "is_guest": user.is_guest,
        "created_at": user.created_at.strftime("%Y-%m-%d %H:%M:%S") if user.created_at else ""
    }

@router.put("/{user_id}")
def update_user(
    user_id: int,
    req: UserUpdateRequest,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """แก้ไขข้อมูลผู้ใช้งาน (เจ้าของบัญชี หรือ Admin เท่านั้น)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # ตรวจสิทธิ์: ต้องเป็นตัวเอง หรือ เป็น Admin
    is_admin = current_user and (current_user.role == UserRole.ADMIN or str(current_user.role) == "admin")
    is_self = current_user and current_user.id == user_id
    if current_user and not (is_admin or is_self):
        raise HTTPException(status_code=403, detail="Permission denied")

    if req.display_name and req.display_name.strip():
        user.display_name = req.display_name.strip()

    if req.email and req.email.strip():
        clean_email = req.email.strip()
        existing_email = db.query(User).filter(User.email == clean_email, User.id != user_id).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email is already used by another user")
        user.email = clean_email

    if req.role and is_admin:
        if req.role in ["player", "admin"]:
            user.role = UserRole(req.role)

    if req.password and req.password.strip():
        if len(req.password.strip()) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        user.password_hash = get_password_hash(req.password.strip())
        user.is_guest = False

    db.commit()
    db.refresh(user)

    return {
        "message": "User updated successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "display_name": user.display_name,
            "role": str(user.role.value if hasattr(user.role, 'value') else user.role),
            "is_guest": user.is_guest
        }
    }

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """ลบผู้ใช้งาน"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    is_admin = current_user and (current_user.role == UserRole.ADMIN or str(current_user.role) == "admin")
    is_self = current_user and current_user.id == user_id
    if current_user and not (is_admin or is_self):
        raise HTTPException(status_code=403, detail="Permission denied")

    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully", "user_id": user_id}
