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

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """เข้าสู่ระบบด้วย Username & Password"""
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    access_token = create_access_token(data={"sub": user.id, "role": str(user.role)})
    return TokenResponse(access_token=access_token, user=UserResponse.from_orm(user))

@router.get("/me", response_model=UserResponse)
def get_me(current_user: Optional[User] = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return UserResponse.from_orm(current_user)
