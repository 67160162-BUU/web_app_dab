# DANCE DETECTOR — Viral Pose & Dance Challenge

เว็บเกมตรวจจับท่าเต้นและท่ามีมไวรัลด้วยกล้อง ใช้ Google MediaPipe Pose Landmarker ประมวลผลโครงสร้างร่างกาย 33 จุดแบบเรียลไทม์บนเบราว์เซอร์ พร้อมระบบสะสมคะแนน กระดานผู้นำ (Leaderboard) และระบบสมาชิก (User Session & Authentication)

> **ความเป็นส่วนตัว 100%:** ภาพจากกล้องประมวลผลบนเครื่องของผู้ใช้เท่านั้น ไม่มีบันทึกหรือส่งวิดีโอออกจากเบราว์เซอร์ (สามารถตรวจสอบผ่าน Network Tab ได้)

---

## ฟีเจอร์หลัก (Features)

### 1. ท่าเต้นที่รองรับ (3 Viral Poses)
- **Dab Challenge (`dab`):** ซุกหน้าเข้าข้อศอก แขนอีกข้างเหยียดตรงขึ้นฟ้า
- **Six-Seven Dance (`six_seven`):** ยกมือทำท่า 6-7 สลับมือตามจังหวะ
- **Scuba Diver (`scuba`):** ยกมือแนบศีรษะทำท่าดำน้ำ ดำดิ่งอย่างเป๊ะปัง

### 2. ระบบคำนวณคะแนน & กันโกง (Accuracy Engine)
- **ไม่ขึ้นกับระยะกล้อง:** ระยะทางทุกเกณฑ์หารด้วยความกว้างไหล่ (`Shoulder Width`) ก่อนเสมอ ยืนใกล้หรือไกลได้คะแนนมาตรฐานเท่ากัน
- **State Machine กันสแปม:** ค้างท่าไว้เฉยๆ ไม่นับครั้ง ต้องผ่อนท่ากลับปกติก่อนจึงจะนับครั้งถัดไปได้
- **Feedback สีโครงกระดูกสด:** สีโครงกระดูกเปลี่ยนสีตามคะแนนความเป๊ะ (แดง -> เหลือง -> เขียว)

### 3. ระบบสมาชิก & ล็อกอิน (User Session & Auth)
- **แยก Username & Display Name:** 
  - `Username`: ไอดีสำหรับเข้าสู่ระบบ (ภาษาอังกฤษ/ตัวเลข ตั้งแล้วเปลี่ยนไม่ได้)
  - `Display Name`: ชื่อฉายาที่โชว์บน Leaderboard (เปลี่ยนได้ตลอดเวลา)
- **ระบบ Login Modal:** แถบเข้าสู่ระบบมุมขวาบน ล็อกอินด้วย Username & Password รหัสผ่านเข้ารหัสแบบ Bcrypt Hashing
- **จำ Session อัตโนมัติ:** บันทึก Session ลง `LocalStorage` (`dd_user_session` + JWT Bearer Token)
- **บันทึกคะแนนอัตโนมัติ:** เมื่อล็อกอินอยู่ เล่นเกมจบระบบจะดึงชื่อ Display Name และไอดีผู้ใช้มาบันทึกคะแนนเข้าสู่ระบบให้อัตโนมัติทันทีโดยไม่ต้องพิมพ์รหัสผ่านซ้ำ

### 4. กระดานผู้นำ High Score (1 คนต่อ 1 อันดับ)
- **High Score per User:** จัดกลุ่มคะแนนสูงสุด (`GROUP BY user_id`) แสดงผลผลงานที่ดีที่สุด 1 อันดับต่อ 1 ผู้เล่น ป้องกันผู้เล่นสแปมติดอันดับซ้ำเต็มตาราง
- **4 ตารางอันดับ:**
  1. คะแนนรวมสูงสุด (Overall Top Scores)
  2. ท่า Dab Challenge (นับจำนวนครั้งสูงสุด)
  3. ท่า Six-Seven Dance (นับจำนวนครั้งสูงสุด)
  4. ท่า Scuba Diver (นับจำนวนครั้งสูงสุด)

### 5. ระบบสำรองเมื่อไม่มี DB (Offline / Local Storage Fallback)
- หากเปิดเล่นแบบไม่มี Backend / DB รันอยู่ ตัวเกมจะสลับไปใช้ LocalStorage Fallback ใน [api.js](file:///Applications/XAMPP/xamppfiles/htdocs/web_app_dab/frontend/js/api.js) อัตโนมัติ เล่นเกมและบันทึกคะแนนบนเบราว์เซอร์ได้โดยไม่ขึ้น Error หน้าว่าง

---

## วิธีการติดตั้งและใช้งาน (Installation & Setup)

### วิธีที่ 1: รันด้วย Docker Compose (แนะนำที่สุด)

รันคำสั่งเดียว ระบบจะสร้างทั้ง MySQL 8.0 Database (พร้อมสคริปต์ตารางและ Seed data) + FastAPI Backend Server:

```bash
docker compose up --build -d
```

เข้าใช้งานเว็บเกมที่:
```
http://localhost:8000
```

---

### วิธีที่ 2: รันแบบพัฒนาในเครื่อง (Local Development)

#### 1. เปิดเซิร์ฟเวอร์ Backend (FastAPI + MySQL)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # บน Windows: venv\Scripts\activate
pip install -r requirements.txt

# รัน FastAPI Server
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. เปิดเซิร์ฟเวอร์ Frontend
สามารถใช้ XAMPP วางใน `htdocs/` หรือใช้ Python HTTP Server:
```bash
cd frontend
python3 -m http.server 3000
```
แล้วเปิดเข้าใช้งานที่ `http://localhost:3000`

---

## โครงสร้างโปรเจกต์ (Project Structure)

```
web_app_dab/
├── docker-compose.yml          # ไฟล์ตั้งค่า Docker (MySQL 8.0 + FastAPI Server)
├── README.md                   # เอกสารอธิบายโปรเจกต์
├── backend/                    # Python FastAPI Backend Services
│   ├── Dockerfile              # Dockerfile สำหรับสร้าง Backend Image
│   ├── requirements.txt        # Python dependencies
│   ├── app/
│   │   ├── main.py             # FastAPI entrypoint & CORS middleware
│   │   ├── config.py           # DB Environment settings
│   │   ├── database.py         # SQLAlchemy engine & session maker
│   │   ├── models.py           # SQLAlchemy User & Score Models
│   │   ├── auth.py             # Bcrypt hashing & JWT Token Manager
│   │   └── routers/
│   │       ├── auth.py         # API Endpoints: /api/auth/login, /api/auth/register
│   │       └── scores.py       # API Endpoints: /api/scores/top, /api/scores/leaderboards
│   └── database/
│       ├── schema.sql          # โครงสร้างตาราง MySQL Database
│       └── seed.sql            # ข้อมูลทดสอบเริ่มต้น
└── frontend/                   # HTML/CSS/JavaScript Web Client
    ├── index.html              # หน้าแรก + Preload AI + Top 5 Leaderboards
    ├── css/style.css           # Modern Dark-Mode Design System
    ├── js/
    │   ├── config.js           # ค่าคงที่และเกณฑ์คะแนนท่าเต้น
    │   ├── pose.js             # MediaPipe Pose Landmarker Wrapper & Canvas Skeleton
    │   ├── dab.js              # คณิตศาสตร์คำนวณมุมกระดูกและความเป๊ะ
    │   ├── poses.js            # Pose Evaluator & Counter สำหรับ 3 ท่าทาง
    │   ├── api.js              # API Client + LocalStorage Fallback + Session Manager
    │   └── leaderboard.js      # JS แสดงผลตารางผู้นำทุกโหมด
    └── pages/
        ├── play.html           # หน้าเล่นเกม (กล้องเรียลไทม์ + เลือกท่า + สรุปผลคะแนน)
        └── leaderboard.html    # หน้าตารางผู้นำฉบับเต็ม
```

---

## เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend:** HTML5, CSS3 (Vanilla Dark-Mode Glassmorphism), Modern JavaScript (ES Modules), Google MediaPipe Pose Landmarker (`@mediapipe/tasks-vision`)
- **Backend:** Python 3.11+, FastAPI, SQLAlchemy, PyMySQL, Bcrypt, Python-Jose (JWT)
- **Database:** MySQL 8.0 Database Server
- **DevOps & Containerization:** Docker, Docker Compose
