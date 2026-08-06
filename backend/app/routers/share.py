from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from PIL import Image, ImageDraw, ImageFont

from app.database import get_db
from app.models import Score, User

router = APIRouter()

@router.get("/{score_id}/card")
def generate_score_card(score_id: int, db: Session = Depends(get_db)):
    """สร้างรูปภาพ Score Card สำหรับแชร์คะแนน"""
    score_obj = db.query(Score).filter(Score.id == score_id).first()
    if not score_obj:
        raise HTTPException(status_code=404, detail="Score not found")

    user = db.query(User).filter(User.id == score_obj.user_id).first()
    display_name = user.display_name if user else "Player"

    # สร้างรูปภาพขนาด 600x350 px (สไตล์ Dark Arcade Neon)
    img = Image.new("RGB", (600, 350), color=(11, 10, 18))
    draw = ImageDraw.Draw(img)

    # วาดเส้นขอบสีทอง Accent
    draw.rectangle([(15, 15), (585, 335)], outline=(255, 214, 10), width=3)
    draw.rectangle([(25, 25), (575, 325)], outline=(0, 245, 212), width=1)

    # วาดข้อความ (ใช้ default font ของ PIL หากไม่มี font พิเศษ)
    try:
        font_title = ImageFont.load_default()
    except Exception:
        font_title = None

    draw.text((40, 40), "DANCE DETECTOR — DAB SCORE CARD", fill=(0, 245, 212), font=font_title)
    draw.text((40, 90), f"PLAYER: {display_name.upper()}", fill=(255, 255, 255), font=font_title)
    draw.text((40, 140), f"SCORE: {score_obj.score} PTS", fill=(255, 214, 10), font=font_title)
    draw.text((40, 190), f"TOTAL DABS: {score_obj.count} TIMES", fill=(255, 255, 255), font=font_title)
    draw.text((40, 270), "CAN YOU BEAT MY SCORE? JOIN AT DAB-DETECTOR.COM", fill=(160, 158, 181), font=font_title)

    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return StreamingResponse(buffer, media_type="image/png")
