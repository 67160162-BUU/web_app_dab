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

### 5. ระบบ Dual Database & phpMyAdmin
- **รองรับทั้ง PostgreSQL และ MySQL (phpMyAdmin):** สลับใช้งานได้เพียงกำหนดตัวแปร `DB_TYPE=postgres` หรือ `DB_TYPE=mysql`
- **phpMyAdmin Web UI:** เข้าใช้งาน phpMyAdmin บริหารจัดการ MySQL ได้ทันทีที่ `http://localhost:8080`

### 6. ระบบสำรองเมื่อไม่มี DB (Offline / Local Storage Fallback)
- หากเปิดเล่นแบบไม่มี Backend / DB รันอยู่ ตัวเกมจะสลับไปใช้ LocalStorage Fallback ใน [api.js](file:///Applications/XAMPP/xamppfiles/htdocs/web_app_dab/frontend/js/api.js) อัตโนมัติ เล่นเกมและบันทึกคะแนนบนเบราว์เซอร์ได้โดยไม่ขึ้น Error หน้าว่าง

---

## REST API Endpoints Specification

### 1. Authentication (สิทธิ์และการเข้าสู่ระบบ)
- `POST /api/auth/register` — สมัครสมาชิกผู้ใช้งานถาวร
- `POST /api/auth/login` — เข้าสู่ระบบด้วย Username & Password (คืนค่า JWT Access Token)
- `POST /api/auth/logout` — ออกจากระบบ
- `POST /api/auth/change-password` — เปลี่ยนรหัสผ่านผู้ใช้งาน (ต้องการ `old_password` และ `new_password`)
- `GET /api/auth/check-username/{name}` — ตรวจสอบว่า Username นี้ว่างหรือไม่ (`available: true/false`)
- `GET /api/auth/me` — ดึงข้อมูลโปรไฟล์ผู้ใช้งานปัจจุบัน

### 2. User Management (จัดการข้อมูลผู้ใช้)
- `GET /api/users` — ดึงข้อมูลผู้ใช้ทั้งหมดแบบ Pagination (รับพารามิเตอร์ `page`, `limit`, `search`)
- `GET /api/users/{id}` — ดึงข้อมูลผู้ใช้งานตาม ID
- `PUT /api/users/{id}` — แก้ไขข้อมูลผู้ใช้ (`display_name`, `email`, `role`, `password`)
- `DELETE /api/users/{id}` — ลบผู้ใช้งาน

### 3. Scores & Leaderboards
- `GET /api/scores/top` — ดึงคะแนนสูงสุดตามเงื่อนไข
- `GET /api/scores/leaderboards` — ดึงทั้ง 4 ตารางผู้นำพร้อมกัน
- `POST /api/scores/` — บันทึกคะแนนการเล่นเกม

---

## วิธีการติดตั้งและใช้งาน (Installation & Setup)

### วิธีที่ 1: รันด้วย Docker Compose (แนะนำที่สุด)

รันคำสั่งเดียว ระบบจะสร้าง PostgreSQL 15, MySQL 8.0, phpMyAdmin (Port 8080) และ FastAPI Backend Server (Port 8000):

```bash
docker compose up --build -d
```

- เข้าใช้งานเว็บเกมที่: `http://localhost:8000`
- เข้าใช้งานระบบผู้ดูแลระบบ (Admin Dashboard) ที่: `http://localhost:8000/pages/admin.html`
- เข้าใช้งาน phpMyAdmin บริหารจัดการ MySQL ที่: `http://localhost:8080`

---

### 🔑 ข้อมูลบัญชีผู้ใช้สำหรับทดสอบ (Test Accounts)

| ประเภทบัญชี | Username | Email | Password | บทบาท (Role) | การเข้าถึง |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin** (ผู้ดูแลระบบ) | `admin` | `admin@dancedetector.com` | `adminpassword123` | `admin` | จัดการผู้ใช้, แก้ไข Role, ลบคะแนนผิดปกติ |
| **Player** (ผู้เล่นตัวอย่าง) | `player1` | `player1@gmail.com` | `adminpassword123` | `player` | เล่นเกม, สะสมคะแนน, แก้ไขโปรไฟล์ |

> 💡 **หมายเหตุ:** สามารถล็อกอินโดยใช้ `Username` หรือ `Email` ก็ได้ และสามารถกดสมัครสมาชิกใหม่ด้วยตนเองผ่านหน้าเว็บได้ทันที

---

#### การสลับฐานข้อมูลระหว่าง PostgreSQL (ส่งงาน) และ MySQL (phpMyAdmin):

##### วิธีที่ 1: ปรับแก้ในไฟล์ `docker-compose.yml` (แนะนำ)
ในโซน `web:` -> `environment:` ให้ตั้งค่าดังนี้:

**กรณีสลับใช้ PostgreSQL (ส่งงาน):**
```yaml
    environment:
      DB_TYPE: postgres
      DB_HOST: db_postgres
      DB_PORT: 5432
      DB_USER: postgres
      DB_PASSWORD: rootpassword
      DB_NAME: dance_detector
```

**กรณีสลับใช้ MySQL (สำหรับดูตารางผ่าน phpMyAdmin ที่ http://localhost:8080):**
```yaml
    environment:
      DB_TYPE: mysql
      DB_HOST: db_mysql
      DB_PORT: 3306
      DB_USER: root
      DB_PASSWORD: rootpassword
      DB_NAME: dance_detector
```
แล้วรันคำสั่ง `docker compose up -d` ใน Terminal เพื่อให้ Docker อัปเดตฐานข้อมูลใหม่ทันที

##### วิธีที่ 2: รันผ่านคำสั่ง Terminal (ไม่ต้องแก้ไฟล์)
- **สลับเป็น PostgreSQL:**
  ```bash
  DB_TYPE=postgres DB_HOST=db_postgres DB_PORT=5432 DB_USER=postgres docker compose up -d
  ```
- **สลับเป็น MySQL:**
  ```bash
  DB_TYPE=mysql DB_HOST=db_mysql DB_PORT=3306 DB_USER=root docker compose up -d
  ```

---

### วิธีที่ 2: รันแบบพัฒนาในเครื่อง (Local Development)

#### 1. เปิดเซิร์ฟเวอร์ Backend (FastAPI)
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
├── docker-compose.yml          # ไฟล์ตั้งค่า Docker (PostgreSQL 15, MySQL 8.0, phpMyAdmin, FastAPI)
├── README.md                   # เอกสารอธิบายโปรเจกต์
├── backend/                    # Python FastAPI Backend Services
│   ├── Dockerfile              # Dockerfile สำหรับสร้าง Backend Image
│   ├── requirements.txt        # Python dependencies ( FastApi, SQLAlchemy, psycopg2, pymysql )
│   ├── app/
│   │   ├── main.py             # FastAPI entrypoint & CORS middleware
│   │   ├── config.py           # DB Environment settings
│   │   ├── database.py         # Dynamic SQLAlchemy engine for MySQL & PostgreSQL
│   │   ├── models.py           # SQLAlchemy User & Score Models
│   │   ├── auth.py             # Bcrypt hashing & JWT Token Manager
│   │   └── routers/
│   │       ├── auth.py         # APIs: register, login, logout, change-password, check-username, me
│   │       ├── users.py        # APIs: paginated users list, user by ID, update user, delete user
│   │       ├── admin.py        # Admin panel management APIs
│   │       └── scores.py       # APIs: high scores & leaderboards
│   └── database/
│       ├── schema.sql          # โครงสร้างตาราง MySQL Database
│       ├── schema_postgres.sql # โครงสร้างตาราง PostgreSQL Database
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
- **Backend:** Python 3.11+, FastAPI, SQLAlchemy, PyMySQL, Psycopg2, Bcrypt, Python-Jose (JWT)
- **Databases:** PostgreSQL 15, MySQL 8.0 (with phpMyAdmin Web Admin)
- **DevOps & Containerization:** Docker, Docker Compose
