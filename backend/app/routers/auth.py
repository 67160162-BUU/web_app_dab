from typing import Optional
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter()

class GuestRegisterRequest(BaseModel):
    display_name: str

class RegisterRequest(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    password: str
    display_name: str

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: Optional[str]
    email: Optional[str]
    display_name: str
    role: str
    is_guest: bool

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.post("/guest", response_model=TokenResponse)
def create_guest_user(req: GuestRegisterRequest, db: Session = Depends(get_db)):
    """สร้าง Guest User สำหรับเริ่มจำ session การเล่น"""
    user = User(
        display_name=req.display_name.strip(),
        role=UserRole.PLAYER,
        is_guest=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": user.id, "role": str(user.role)})
    return TokenResponse(access_token=access_token, user=UserResponse.from_orm(user))

@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """ลงทะเบียนผู้ใช้งานแบบถาวร"""
    clean_uname = req.username.strip().lower().replace(" ", "")
    if db.query(User).filter(User.username == clean_uname).first():
        # ถ้ามีผู้ใช้ชื่อนี้อยู่แล้ว ให้ดึงข้อมูลมาแทน หรือแจ้งเตือน
        existing = db.query(User).filter(User.username == clean_uname).first()
        if existing and existing.password_hash and verify_password(req.password, existing.password_hash):
            token = create_access_token(data={"sub": existing.id, "role": str(existing.role)})
            return TokenResponse(access_token=token, user=UserResponse.from_orm(existing))

    if req.email and db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed_pw = get_password_hash(req.password)
    user = User(
        username=clean_uname,
        email=req.email.strip() if req.email else None,
        password_hash=hashed_pw,
        display_name=req.display_name.strip(),
        role="player",
        is_guest=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": user.id, "role": str(user.role)})
    return TokenResponse(access_token=access_token, user=UserResponse.from_orm(user))

from sqlalchemy import or_

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """เข้าสู่ระบบด้วย Username & Password หรือ Email"""
    clean_username = req.username.strip().lower()
    raw_username = req.username.strip()

    user = db.query(User).filter(
        or_(
            User.username == clean_username,
            User.username == raw_username,
            User.email == clean_username,
            User.email == raw_username
        )
    ).first()

    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    access_token = create_access_token(data={"sub": user.id, "role": str(user.role)})
    return TokenResponse(access_token=access_token, user=UserResponse.from_orm(user))


@router.post("/logout")
def logout(current_user: Optional[User] = Depends(get_current_user)):
    """ออกจากระบบ"""
    return {"message": "Successfully logged out"}

@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """เปลี่ยนรหัสผ่านผู้ใช้งาน"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if not current_user.password_hash or not verify_password(req.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="รหัสผ่านเดิมไม่ถูกต้อง")
    
    if len(req.new_password.strip()) < 6:
        raise HTTPException(status_code=400, detail="รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร")
        
    current_user.password_hash = get_password_hash(req.new_password.strip())
    current_user.is_guest = False
    db.commit()
    return {"message": "Password changed successfully"}

@router.get("/check-username/{name}")
def check_username(name: str, db: Session = Depends(get_db)):
    """ตรวจสอบว่า Username นี้ใช้งานได้หรือไม่ (ว่างหรือไม่)"""
    clean_name = name.strip().lower()
    existing = db.query(User).filter(User.username == clean_name).first()
    available = existing is None
    return {
        "username": clean_name,
        "available": available,
        "message": "Username is available" if available else "Username is already taken"
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: Optional[User] = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return UserResponse.from_orm(current_user)
