# DAB DETECTOR — เอกสารสถาปัตยกรรม, ลำดับไฟล์ และ Roadmap

> เอกสารเสริมของ `user-journey.md`
> ครอบคลุม 3 เรื่องที่ user journey ยังไม่ได้ลงลึก:
> 1. **Google MediaPipe Pose Landmarker** — ใช้ยังไง ทำงานยังไง ข้อจำกัดอะไรบ้าง
> 2. **ลำดับไฟล์** — โครงสร้างไฟล์ทั้งหมด และลำดับที่ต้องสร้างทีละไฟล์
> 3. **Roadmap** — สถานะจริงของทุกชิ้นงาน frontend + backend (ตอนนี้คือ 0%)
>
> ปิดท้ายด้วยหัวข้อ **Grill Me** — คำถามที่จะพังโปรเจกต์ถ้าไม่ตอบตั้งแต่วันนี้ พร้อมคำตอบที่แนะนำ

**สถานะ ณ วันที่เขียน:** ในโฟลเดอร์โปรเจกต์มีแค่ไฟล์ markdown ยังไม่มีโค้ดใดๆ ทั้ง frontend และ backend

---

## ส่วนที่ 1 — Google MediaPipe Pose Landmarker

### 1.1 มันคืออะไร และทำไมถึงเลือกตัวนี้

MediaPipe Pose Landmarker คือโมเดล Pose Estimation ของ Google ที่รับภาพเข้าไปแล้วคืน **พิกัดข้อต่อร่างกาย 33 จุด** ออกมา ทำงานผ่าน WebAssembly + WebGL บนเบราว์เซอร์โดยตรง

| เหตุผลที่เลือก | รายละเอียด |
|---|---|
| **รันบนเครื่องผู้ใช้ 100%** | ภาพจากกล้องไม่เคยออกจากเบราว์เซอร์ ตอบ Pain Point ของ Persona ("กลัวเว็บแอบอัด") ได้ตรงๆ และพิสูจน์ได้ด้วยแท็บ Network |
| **ไม่ต้องเทรนโมเดลเอง** | ไม่มีเวลาและไม่มี dataset ท่า Dab อยู่แล้ว |
| **ไม่มีค่าใช้จ่าย / ไม่มี API key** | ไม่ต้องจัดการ secret ไม่มี rate limit ไม่มี quota หมดกลางการนำเสนอ |
| **server ไม่ต้องแบก CPU** | ถ้าใช้วิธีส่งภาพขึ้น server ไปประมวลผล 30 fps × ผู้เล่นหลายคน = free tier ตายทันที |
| **โหลดผ่าน CDN เป็น ES Module** | ไม่ต้องมี npm / bundler / build step ตรงกับข้อกำหนดที่ให้ใช้ HTML+CSS+JS ธรรมดา |

### 1.2 ทางเลือกอื่นที่พิจารณาแล้วไม่เลือก

| ทางเลือก | ทำไมไม่เลือก |
|---|---|
| TensorFlow.js MoveNet | เร็วกว่าเล็กน้อย แต่คืน 17 จุด (COCO) ไม่มีจุดที่ละเอียดพอ และ API ยุ่งกว่าสำหรับมือใหม่ |
| ส่งภาพขึ้น backend ให้ OpenCV/MediaPipe Python ประมวลผล | latency สูงมาก, กิน bandwidth, ขัดกับข้อสัญญาเรื่องความเป็นส่วนตัวทันที |
| เขียน heuristic จากภาพเองด้วย canvas pixel | เป็นไปไม่ได้ในกรอบเวลา 6 สัปดาห์ |

### 1.3 ท่อการทำงาน (Pipeline) ทีละขั้น

```
<video> (จาก getUserMedia)
        │  ทุกเฟรม ผ่าน requestAnimationFrame
        ▼
PoseLandmarker.detectForVideo(video, timestampMs)
        │
        ▼
result.landmarks[0]  →  array 33 จุด { x, y, z, visibility }
        │                x,y = 0..1 (สัดส่วนของเฟรม), z = ความลึกโดยประมาณ
        ├──────────────► drawSkeleton() วาดลง <canvas> ทับวิดีโอ
        └──────────────► scoreDab() คำนวณคะแนน 0-100
                                │
                                ▼
                         Smoothing เฉลี่ย 5 เฟรม
                                │
                                ▼
                         State machine นับจำนวนครั้ง
```

### 1.4 การตั้งค่าที่จะใช้ (ล็อกค่าไว้แล้ว อย่าเปลี่ยนโดยไม่มีเหตุผล)

```js
import { FilesetResolver, PoseLandmarker }
  from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.x";

const vision = await FilesetResolver.forVisionTasks(".../wasm");

const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: ".../pose_landmarker_lite.task",
    delegate: "GPU"          // ถ้า error ให้ fallback เป็น "CPU"
  },
  runningMode: "VIDEO",      // ไม่ใช่ IMAGE — สำคัญมาก
  numPoses: 1,               // จับคนเดียว = เร็วขึ้น + ตัดปัญหาคนเดินผ่านหลัง
  minPoseDetectionConfidence: 0.5,
  minPosePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  outputSegmentationMasks: false   // ไม่ใช้ ปิดไว้ประหยัดแรง
});
```

**เหตุผลรายบรรทัด**

- `runningMode: "VIDEO"` — เปิดโหมด tracking ระหว่างเฟรม ทำให้ผลนิ่งกว่าและเร็วกว่าการ detect ใหม่ทุกเฟรม ถ้าตั้งเป็น `IMAGE` แล้วเรียก `detectForVideo()` จะ throw error ทันที
- `numPoses: 1` — แก้ Edge Case ข้อ 4 ตั้งแต่ระดับ config
- `pose_landmarker_lite` — ~3 MB ถ้าใช้ `full` (~9 MB) หรือ `heavy` (~26 MB) จะแม่นขึ้นนิดเดียวแต่มือถือรับไม่ไหว **ท่า Dab เป็นท่าใหญ่ ความแม่นระดับ lite เกินพอ**
- `delegate: "GPU"` — เร็วกว่า CPU 2-3 เท่า แต่บางเครื่อง/บาง driver พัง ต้องมี try/catch fallback

### 1.5 กับดักที่ต้องระวัง (จะเสียเวลาเป็นชั่วโมงถ้าไม่รู้ล่วงหน้า)

| # | กับดัก | ทางแก้ |
|---|---|---|
| 1 | **timestamp ต้องเพิ่มขึ้นเสมอ** — ถ้าส่งค่าซ้ำหรือย้อนหลัง `detectForVideo()` จะ throw | เก็บ `lastVideoTime` ไว้ ถ้า `video.currentTime === lastVideoTime` ให้ข้ามเฟรมนั้นไปเลย |
| 2 | **เรียก detect ก่อนวิดีโอพร้อม** จะได้ผลว่างหรือ error | รอ event `loadeddata` และเช็ค `video.videoWidth > 0` ก่อนเริ่มลูป |
| 3 | **ซ้าย/ขวาสลับกัน** — MediaPipe เรียกตามร่างกายจริงของผู้ใช้ ไม่ใช่ตามที่เห็นบนจอ + เราใส่ mirror อีกชั้น | จำให้ขึ้นใจ: `left_wrist` (15) จะปรากฏ **ทางขวาของจอ** เขียนคอมเมนต์กำกับไว้ในโค้ด |
| 4 | **พิกัดเป็น normalized 0..1** ไม่ใช่พิกเซล | คูณด้วย `canvas.width` / `canvas.height` ก่อนวาดเสมอ |
| 5 | **canvas ต้องขนาดเท่า video จริง** ไม่ใช่ขนาด CSS | ตั้ง `canvas.width = video.videoWidth` แยกจาก CSS ไม่งั้นโครงกระดูกจะเบี้ยว |
| 6 | **โหลดโมเดลใช้เวลา 2-5 วิ** | preload ตั้งแต่หน้า `index.html` + มี loading indicator เสมอ |
| 7 | **`visibility` ต่ำแปลว่าโมเดลเดา ไม่ใช่ว่าไม่มี** | จุดที่ `visibility < 0.5` ให้ถือว่าใช้ไม่ได้ อย่าเอาไปคำนวณคะแนน |
| 8 | **z แกนลึกไม่แม่น** | ใช้แค่ x, y ในการคำนวณคะแนน ห้ามพึ่ง z |

### 1.6 Landmark ที่ใช้จริง (9 จุด จาก 33)

```
 0  nose            ← เกณฑ์ tuck (ซุกหน้าเข้าข้อศอก)
11  left_shoulder   12  right_shoulder   ← ฐานอ้างอิงสัดส่วน + เกณฑ์ raised
13  left_elbow      14  right_elbow      ← เกณฑ์ straight / bend / align
15  left_wrist      16  right_wrist      ← เกณฑ์ raised / tuck
23  left_hip        24  right_hip        ← ตรวจว่าเห็นตัวเต็มพอไหม (calibration)
```

**กฎเหล็ก:** ระยะทางทุกค่าต้องหารด้วย `shoulderWidth = dist(11, 12)` ก่อนเสมอ เพื่อให้คะแนนไม่เปลี่ยนตามระยะห่างจากกล้อง — นี่คือเกณฑ์ Acceptance Criteria ข้อที่วัดยากที่สุด

### 1.7 สูตรคะแนน (ร่างที่ 1 — ตัวเลขต้องจูนจาก Debug Panel)

```
angle(a,b,c) = มุมที่จุด b ระหว่างเวกเตอร์ b→a และ b→c

องค์ประกอบ         สูตร                                    น้ำหนัก
straight   smoothstep(140°, 170°, มุมข้อศอกข้างเหยียด)        25%
raised     smoothstep(0, 0.3, (ไหล่.y − ข้อมือ.y)/shoulderW)  15%
bend       ระฆังคว่ำรอบ 50° กว้าง ±25° ที่ข้อศอกข้างพับ       20%
tuck       1 − smoothstep(0.4, 0.9, dist(ข้อมือพับ, จมูก)/shoulderW) 25%
align      1 − |มุมแขนท่อนบนซ้าย − มุมแขนท่อนบนขวา| / 40°     15%

total = ผลรวมถ่วงน้ำหนัก × 100
คะแนนสุดท้าย = ค่าเฉลี่ยเคลื่อนที่ 5 เฟรมล่าสุด
คะแนนของ Dab = max(คะแนนแบบซ้ายเหยียด, คะแนนแบบขวาเหยียด)
```

**ใช้ smoothstep ไม่ใช่ if/else** เพราะต้องบอกผู้ใช้ได้ว่า "แขนยังเหยียดไม่พอ (70%)" แทนที่จะบอกแค่ผ่าน/ไม่ผ่าน — และทำให้คะแนนไม่กระโดด

### 1.8 State machine นับจำนวนครั้ง (กัน Edge Case ข้อ 5 "ค้างท่าโกงคะแนน")

```
IDLE ──คะแนน ≥ 75 ติดต่อกัน 3 เฟรม──► IN_DAB (นับ +1, บันทึกภาพถ้าเป็น best)
IN_DAB ──คะแนน < 40 ติดต่อกัน 3 เฟรม──► IDLE
```
ค้างท่าไว้เฉยๆ จะได้แค่ 1 ครั้ง เพราะไม่เคยกลับสู่ IDLE

---

## ส่วนที่ 2 — โครงสร้างไฟล์และลำดับการสร้าง

### 2.1 โครงสร้างไฟล์เป้าหมาย

> โครงสร้างนี้ยึดตาม scaffold ในหัวข้อ 3 ของเอกสารอาจารย์ทุกประการ
> (`Dockerfile` และ `requirements.txt` อยู่ใน `backend/` ไม่ใช่ root, และมีโฟลเดอร์ `docs/`)

```
web_app_dab/
├── docker-compose.yml            ระบบทั้งหมด (web + db) คำสั่งเดียวจบ
├── .env.example                  ตัวอย่างตัวแปร ห้าม commit .env จริง
├── .gitignore
├── README.md                     วิธีรัน + URL ที่ deploy + prompt ที่ใช้
│
├── docs/
│   ├── user-journey.md           เอกสารหลัก
│   ├── dab-detector-plan.md      ไฟล์นี้
│   ├── er-diagram.png            ทำสัปดาห์ที่ 2
│   └── api-spec.md               รายการ endpoint ทั้งหมด
│
├── backend/
│   ├── Dockerfile                สร้าง image ของ backend (ใช้ทั้ง dev และ deploy)
│   ├── requirements.txt
│   └── app/
│       ├── main.py               สร้าง FastAPI, mount static, include router
│       ├── database.py           engine + get_session() + create_db_and_tables()
│       ├── models.py             SQLModel: Score
│       ├── schemas.py            ScoreCreate / ScoreRead + validator กันคะแนนปลอม
│       ├── crud.py               ฟังก์ชันอ่าน/เขียนข้อมูลจริง
│       └── routers/
│           └── scores.py         POST /api/scores, GET /top, GET /rank/{score}
│
└── frontend/
    ├── index.html                หน้าแรก + preload โมเดล
    ├── css/
    │   └── style.css             ธีมเดียวทั้งเว็บ + responsive
    ├── js/
    │   ├── config.js             ค่าคงที่ทั้งหมด (เกณฑ์, น้ำหนัก, เวลา)  ← จูนที่นี่ที่เดียว
    │   ├── pose.js               หุ้ม MediaPipe: init / detect / drawSkeleton
    │   ├── dab.js                คณิตศาสตร์ล้วน: angle, dist, scoreDab   ← เทสได้โดยไม่ต้องมีกล้อง
    │   ├── game.js               state machine, จับเวลา, นับครั้ง, ลูปเกม
    │   ├── api.js                fetch ทุกตัวรวมที่นี่ + จัดการ error
    │   └── ui.js                 อัปเดต DOM, loading, ข้อความ error
    └── pages/
        ├── camera-setup.html     ขอกล้อง + calibration + Debug Panel
        ├── game.html             หน้าเล่นเกม
        ├── result.html           ผลคะแนน + ส่งชื่อ + แชร์
        └── leaderboard.html      Top 20
```

**หลักการแยกไฟล์:** `dab.js` ต้องไม่รู้จัก DOM และไม่รู้จัก MediaPipe เลย — รับ array ของ landmark คืนตัวเลข เท่านั้น ทำให้เปิด console ยัดค่าปลอมเข้าไปทดสอบได้โดยไม่ต้องยืนหน้ากล้อง นี่คือสิ่งที่จะช่วยชีวิตตอนจูนคะแนน

### 2.2 ลำดับการสร้างไฟล์ (ทำตามลำดับนี้ อย่าข้าม)

ลำดับนี้เรียงตาม **dependency** และตามหลักการ "เห็นผลเร็วที่สุดก่อน"

| ลำดับ | ไฟล์ | ทำไมต้องอยู่ตรงนี้ | เช็คว่าผ่านยังไง |
|---|---|---|---|
| 1 | `.gitignore`, `README.md` | กัน commit ขยะตั้งแต่ commit แรก | — |
| 2 | `backend/requirements.txt`, `backend/Dockerfile`, `docker-compose.yml` | ทุกคนในกลุ่มต้องรันได้เหมือนกันก่อนเขียนโค้ดจริง | `docker compose up` ไม่ error |
| 3 | `backend/app/main.py` (เปล่าๆ แค่ `/health`) | พิสูจน์ว่า container เสิร์ฟได้จริง | เปิด `localhost:8000/docs` เห็น Swagger |
| 4 | `frontend/index.html` + `css/style.css` | หน้าแรกที่ static mount ทำงาน | เปิด `localhost:8000` เห็นหน้าเว็บ |
| 5 | `backend/app/routers/scores.py` (mock data) | ปลด block ให้ frontend ทำงานคู่ขนานได้ทันที ไม่ต้องรอ DB | `GET /api/scores/top` คืน list |
| 6 | `frontend/js/api.js` | ต่อ frontend กับ backend เส้นแรก | leaderboard ปลอมขึ้นบนหน้าแรก |
| 7 | `frontend/js/config.js` | ค่าคงที่ต้องมีก่อนไฟล์ที่ใช้มัน | — |
| 8 | `frontend/pages/camera-setup.html` | ขอกล้อง + จัดการ error กล้องให้ครบก่อน | กด Block แล้วต้องไม่จอขาว |
| 9 | `frontend/js/pose.js` | โหลดโมเดล + วาดโครงกระดูก | เห็นเส้นโครงกระดูกตัวเองขยับตาม |
| 10 | **Debug Panel** (ใน `camera-setup.html`) | **จุดชี้ขาด** — ต้องเห็นตัวเลขจริงก่อนเขียนสูตร | ยืนทำท่า Dab แล้วจดค่ามุมจริง |
| 11 | `frontend/js/dab.js` | เขียนสูตรจากตัวเลขที่จดมาในขั้น 10 | ท่าถูก >75 / ยกมือเฉยๆ <40 |
| 12 | `frontend/js/game.js` + `pages/game.html` | ประกอบเป็นเกม (นับถอยหลัง, 20 วิ, นับครั้ง) | เล่นจบได้ 1 รอบ |
| 13 | `frontend/pages/result.html` + `js/ui.js` | แสดงผล + ภาพ best shot | เห็นคะแนนแยกรายเกณฑ์ |
| 14 | `backend/app/models.py` + `database.py` | ต่อ PostgreSQL จริง | ตารางถูกสร้างใน db |
| 15 | `backend/app/schemas.py` | validator กันยิง API ปลอม | ส่ง score=999 ต้องได้ 422 |
| 16 | อัปเดต `routers/scores.py` เป็นของจริง | เลิกใช้ mock | คะแนนบันทึกลง db จริง |
| 17 | `frontend/pages/leaderboard.html` | ปิด loop ทั้งระบบ | เล่นจบ → คะแนนขึ้นกระดาน |

> **เหตุผลที่ mock API (ลำดับ 5) มาก่อน database (ลำดับ 14):** งาน frontend คือ 70% ของโปรเจกต์นี้และเสี่ยงที่สุด ถ้าไปนั่งตั้ง PostgreSQL ก่อนจะเสียสัปดาห์แรกไปกับงานที่ไม่มีความเสี่ยง แล้วเหลือเวลาน้อยให้งานที่เสี่ยงจริง

---

## ส่วนที่ 3 — Roadmap (ทุกอย่างยังไม่ได้ทำ)

สถานะปัจจุบัน: **มีแค่เอกสาร ยังไม่มีโค้ดสักบรรทัด** ตารางด้านล่างคือของที่ต้องทำทั้งหมด

### 3.1 Infrastructure

| # | งาน | ไฟล์ | สถานะ | สัปดาห์ |
|---|---|---|---|---|
| I1 | Git repo + .gitignore + branch strategy | — | ⬜ ยังไม่ทำ | 1 |
| I2 | Dockerfile (python:3.11-slim, uvicorn) | `Dockerfile` | ⬜ ยังไม่ทำ | 1 |
| I3 | docker-compose (web + postgres + volume mount) | `docker-compose.yml` | ⬜ ยังไม่ทำ | 1 |
| I4 | Deploy ครั้งแรกขึ้น Render/Railway (ต้องได้ HTTPS) | — | ⬜ ยังไม่ทำ | 1 |

### 3.2 Backend

| # | งาน | ไฟล์ | สถานะ | สัปดาห์ |
|---|---|---|---|---|
| B1 | FastAPI app + `/health` | `main.py` | ⬜ ยังไม่ทำ | 1 |
| B2 | Mount `frontend/` เป็น StaticFiles | `main.py` | ⬜ ยังไม่ทำ | 1 |
| B3 | `GET /api/scores/top` คืน mock data | `routers/scores.py` | ⬜ ยังไม่ทำ | 1 |
| B4 | SQLModel `Score` + connection PostgreSQL | `models.py`, `database.py` | ⬜ ยังไม่ทำ | 2 |
| B5 | `POST /api/scores` บันทึกจริง | `routers/scores.py` | ⬜ ยังไม่ทำ | 2 |
| B6 | `GET /api/scores/rank/{score}` | `routers/scores.py` | ⬜ ยังไม่ทำ | 3 |
| B7 | Validator: score 0-100, dab_count ≤ 40, nickname ≤ 12 | `schemas.py` | ⬜ ยังไม่ทำ | 4 |
| B8 | กรองคำหยาบฝั่ง server (ไม่เชื่อ frontend) | `schemas.py` | ⬜ ยังไม่ทำ | 4 |
| B9 | Rate limit กันยิง API รัวๆ | `main.py` | ⬜ ยังไม่ทำ | 4 |
| B10 | จัดการ leaderboard ว่าง (คืน list ว่างไม่ใช่ error) | `routers/scores.py` | ⬜ ยังไม่ทำ | 3 |

### 3.3 Frontend

| # | งาน | ไฟล์ | สถานะ | สัปดาห์ |
|---|---|---|---|---|
| F1 | Landing page + ปุ่มเดียว + GIF ตัวอย่างท่า | `index.html` | ⬜ ยังไม่ทำ | 1 |
| F2 | ข้อความยืนยันความเป็นส่วนตัว (แสดง**ก่อน**ขอกล้อง) | `index.html` | ⬜ ยังไม่ทำ | 1 |
| F3 | CSS ธีมหลัก + responsive | `css/style.css` | ⬜ ยังไม่ทำ | 1 |
| F4 | Preload โมเดล MediaPipe ตั้งแต่หน้าแรก | `js/pose.js` | ⬜ ยังไม่ทำ | 1 |
| F5 | `getUserMedia()` เรียกหลังกดปุ่มเท่านั้น | `pages/camera-setup.html` | ⬜ ยังไม่ทำ | 1 |
| F6 | จัดการ error กล้องแยกประเภท (NotAllowed/NotFound/NotReadable) | `pages/camera-setup.html` | ⬜ ยังไม่ทำ | 1 |
| F7 | Mirror video+canvas, `playsinline` สำหรับ iOS | `pages/camera-setup.html` | ⬜ ยังไม่ทำ | 1 |
| F8 | วาดโครงกระดูก 33 จุด real-time | `js/pose.js` | ⬜ ยังไม่ทำ | 1 |
| F9 | **Debug Panel** (มุมข้อศอก, ระยะข้อมือ-จมูก, fps) | `pages/camera-setup.html` | ⬜ ยังไม่ทำ | 1 |
| F10 | Calibration: เช็ค visibility ไหล่+สะโพก, เก็บ shoulderWidth | `js/pose.js` | ⬜ ยังไม่ทำ | 2 |
| F11 | ฟังก์ชันคณิต angle / dist / normalize | `js/dab.js` | ⬜ ยังไม่ทำ | 2 |
| F12 | สูตรคะแนน 5 องค์ประกอบ + smoothstep | `js/dab.js` | ⬜ ยังไม่ทำ | 2 |
| F13 | จูนค่าเกณฑ์จริงจาก Debug Panel | `js/config.js` | ⬜ ยังไม่ทำ | 2 |
| F14 | Smoothing เฉลี่ย 5 เฟรม | `js/game.js` | ⬜ ยังไม่ทำ | 2 |
| F15 | State machine นับครั้ง (กันค้างท่า) | `js/game.js` | ⬜ ยังไม่ทำ | 2 |
| F16 | นับถอยหลัง 3-2-1 + เสียง | `js/game.js` | ⬜ ยังไม่ทำ | 3 |
| F17 | จับเวลา 20 วินาที + แสดงเวลาที่เหลือ | `js/game.js` | ⬜ ยังไม่ทำ | 3 |
| F18 | เปลี่ยนสีโครงกระดูกตามคะแนน (feedback สด) | `js/pose.js` | ⬜ ยังไม่ทำ | 3 |
| F19 | Capture best frame จาก canvas | `js/game.js` | ⬜ ยังไม่ทำ | 3 |
| F20 | หน้าผลคะแนน + แยกรายเกณฑ์ | `pages/result.html` | ⬜ ยังไม่ทำ | 3 |
| F21 | ฟอร์มกรอกชื่อเล่น + POST | `js/api.js` | ⬜ ยังไม่ทำ | 3 |
| F22 | หน้า leaderboard + ไฮไลต์อันดับตัวเอง | `pages/leaderboard.html` | ⬜ ยังไม่ทำ | 3 |
| F23 | ปุ่มเล่นซ้ำ (ไม่ขอกล้องใหม่) | `pages/result.html` | ⬜ ยังไม่ทำ | 3 |
| F24 | สร้างภาพผลคะแนนสำหรับแชร์ | `pages/result.html` | ⬜ ยังไม่ทำ | 4 |
| F25 | เตือนแสงน้อย / ยืนไม่เต็มเฟรม | `js/ui.js` | ⬜ ยังไม่ทำ | 4 |
| F26 | ดัก `visibilitychange` → pause เกม | `js/game.js` | ⬜ ยังไม่ทำ | 4 |
| F27 | ตรวจ landmark นิ่งเกินไป (กันถือรูปมาส่อง) | `js/dab.js` | ⬜ ยังไม่ทำ | 4 |
| F28 | ลดความละเอียดอัตโนมัติเมื่อ fps < 15 | `js/pose.js` | ⬜ ยังไม่ทำ | 4 |
| F29 | Loading indicator ทุกจุดที่ต้องรอ | `js/ui.js` | ⬜ ยังไม่ทำ | 1 |
| F30 | ทดสอบ responsive บนมือถือจริง | — | ⬜ ยังไม่ทำ | 4 |

**สรุป: 44 งาน ยังไม่ได้ทำทั้งหมด**

### 3.4 เส้นทางวิกฤต (Critical Path)

งานที่ถ้าช้าแล้วทั้งโปรเจกต์ช้าตาม — ทุ่มคนไปที่เส้นนี้ก่อน

```
I3 docker compose ─► B1 FastAPI ─► F5 ขอกล้อง ─► F8 โครงกระดูก
      ─► F9 Debug Panel ─► F13 จูนค่า ─► F12 สูตรคะแนน ─► F15 นับครั้ง
```

**F9 → F13 คือคอขวดตัวจริง** เพราะเป็นงานเดียวที่ AI ช่วยไม่ได้ ต้องยืนหน้ากล้องทำท่า Dab แล้วจดตัวเลขเอง เผื่อเวลาไว้อย่างน้อย 3-4 ชั่วโมง

งานที่ทำคู่ขนานได้โดยไม่ติดใคร: F1, F2, F3 (หน้าตาเว็บ), B4-B6 (database), F22 (leaderboard ต่อ mock ไปก่อน)

---

## ส่วนที่ 4 — Grill Me: คำถามที่จะพังโปรเจกต์ถ้าไม่ตอบวันนี้

หัวข้อนี้เขียนตามแนวทาง `grill-me` — ซัดคำถามยากใส่แผนตัวเองก่อนที่โค้ดจะซัดกลับ แต่ละข้อมีคำตอบที่แนะนำไว้แล้ว **ถ้าไม่เห็นด้วยกับคำตอบไหน ให้ตัดสินใจใหม่ก่อนเริ่มโค้ด**

### G1 — "20 วินาที กับ 3 โหมด (rush/perfect/hold) จะทำทันจริงเหรอ"

`Score.mode` ใน user journey ระบุ 3 ค่า แต่ journey ทั้งเอกสารอธิบายแค่โหมดเดียว
**คำตอบที่แนะนำ:** สัปดาห์ 1-3 ทำโหมด `rush` อย่างเดียว แต่ **เก็บคอลัมน์ `mode` ไว้ในตารางตั้งแต่แรก** (ใส่ค่า `"rush"` ตายตัว) เพราะเพิ่มคอลัมน์ทีหลังเจ็บกว่าปล่อยว่างไว้ ถ้าสัปดาห์ 5 มีเวลาเหลือค่อยเปิดโหมดอื่น ถ้าไม่มีก็ไม่มีใครรู้

### G2 — "จัดอันดับด้วยอะไร score หรือ dab_count"

สองอันนี้ขัดกัน: ทำเร็วรัวๆ ได้ count เยอะแต่ score เฉลี่ยต่ำ / ทำช้าประณีตได้ score สูงแต่ count น้อย
**คำตอบที่แนะนำ:** เก็บทั้งคู่ แต่จัดอันดับด้วยค่าเดียวคือ `score` = **ผลรวมคะแนนของทุกครั้งที่นับได้ หารด้วย 10** (ปัดให้อยู่ในช่วง 0-100) วิธีนี้ทำเร็วอย่างเดียวไม่ชนะ ทำสวยอย่างเดียวก็ไม่ชนะ — ต้องทั้งเร็วทั้งสวย ตรงกับชื่อเกม
**ผลกระทบ:** ต้องแก้ validator ข้อ B7 ให้สอดคล้อง และเขียนสูตรนี้ลง `config.js`

### G3 — "ไม่มีล็อกอิน แล้วจะไฮไลต์ 'อันดับของฉัน' ในกระดานได้ยังไง"

**คำตอบที่แนะนำ:** ตอน `POST /api/scores` สำเร็จ ให้ backend คืน `id` ของแถวที่เพิ่งสร้างกลับมา เก็บใน `sessionStorage` แล้วหน้า leaderboard ค่อยเทียบ `id` ตอน render ไม่ต้องมี user, ไม่ต้องมี cookie, ไม่ต้องเก็บอะไรที่เป็น PII

### G4 — "เล่นเสร็จแล้วกดส่งคะแนนซ้ำ 10 ครั้งได้ไหม"

**คำตอบที่แนะนำ:** ปิดปุ่มทันทีที่กดครั้งแรก + ล้าง state ผลเกมหลังส่งสำเร็จ ส่วนฝั่ง backend ยอมรับว่า **กันไม่ได้ 100%** ถ้าไม่มีระบบยืนยันตัวตน ให้ทำแค่ rate limit ต่อ IP (B9) แล้ว **เขียนข้อจำกัดนี้ลงสไลด์ตรงๆ** — การรู้ว่าระบบตัวเองมีช่องโหว่ตรงไหนได้คะแนนมากกว่าการแกล้งทำเป็นไม่มี

### G5 — "ผู้ใช้เปิดจากมือถือ ถือโทรศัพท์ด้วยมือ แล้วจะทำท่า Dab สองมือยังไง"

Persona บอกชัดว่า "บิวเปิดลิงก์จากมือถือระหว่างนั่งรอเรียน" แต่ท่า Dab ต้องใช้สองแขน **นี่คือรอยร้าวที่ใหญ่ที่สุดในเอกสาร user journey**
**คำตอบที่แนะนำ:** ยอมรับความจริงว่าบนมือถือต้องพิงโทรศัพท์ไว้แล้วถอยห่าง ดังนั้น
1. บนมือถือให้ใช้ **กล้องหลัง**เป็นค่าเริ่มต้นไม่ได้ (ต้องเห็นตัวเอง) → ใช้กล้องหน้า + ข้อความ "วางมือถือพิงอะไรสักอย่าง แล้วถอยห่าง 2 เมตร"
2. เพิ่ม **นับถอยหลัง 5 วินาที** (ไม่ใช่ 3) บนมือถือ เพื่อให้มีเวลาถอย
3. ถ้าไม่ทัน สัปดาห์ 5 ให้ปรับ Persona ในรายงานเป็น "เปิดจากโน้ตบุ๊ก" แทน — แก้เอกสารง่ายกว่าแก้ฟิสิกส์

### G6 — "จะรู้ได้ยังไงว่าสูตรคะแนนถูก ในเมื่อไม่มี test data"

**คำตอบที่แนะนำ:** ตอนทำ F9 Debug Panel ให้เพิ่มปุ่ม **"บันทึก landmark เป็น JSON"** ยืนทำท่าจริง 10 ท่า (Dab ซ้าย 3, Dab ขวา 3, ยกมือเฉยๆ 2, ยืนเฉยๆ 2) แล้ว export ออกมาเก็บไว้เป็นไฟล์ `test-poses.json` จากนั้นทดสอบสูตรด้วยไฟล์นี้ในคอนโซลได้ทันทีโดยไม่ต้องยืนหน้ากล้องซ้ำๆ — ประหยัดเวลามหาศาลตอนจูนค่าใน F13 **ต้นทุนเพิ่ม 30 นาที ประหยัดได้หลายชั่วโมง**

### G7 — "Docker mount volume ตอน dev แล้วตอน deploy จะเป็นยังไง"

**คำตอบที่แนะนำ:** `Dockerfile` ต้อง `COPY` ไฟล์ทั้งหมดเข้า image เสมอ ส่วน `docker-compose.yml` ค่อย mount ทับตอน dev เท่านั้น ถ้าเผลอพึ่ง volume mount อย่างเดียว ตอน deploy จะได้ image เปล่า **ทดสอบด้วยการรัน `docker build` + `docker run` ตรงๆ โดยไม่ผ่าน compose สักครั้งในสัปดาห์ 1**

### G8 — "PostgreSQL ตอน deploy บน Render/Railway ได้ฟรีไหม"

**คำตอบที่แนะนำ:** free tier ของ Render ให้ PostgreSQL แต่ **หมดอายุใน 90 วัน** และหลับเมื่อไม่มีคนใช้ ให้
1. อ่าน connection string จาก `DATABASE_URL` env var เสมอ ห้าม hardcode
2. เขียนโค้ดให้ fallback เป็น SQLite ได้ถ้าไม่มี `DATABASE_URL` — **ทำให้วันนำเสนอยังเดโม่ได้แม้ db บนคลาวด์พัง**
3. ก่อนนำเสนอ 1 วัน ต้องเข้าเว็บปลุก server ให้ตื่นก่อน (cold start ใช้เวลา 30-60 วิ)

### G9 — "ถ้า GPU delegate พังบนเครื่องอาจารย์ตอนนำเสนอล่ะ"

**คำตอบที่แนะนำ:** ครอบ `createFromOptions` ด้วย try/catch แล้ว retry ด้วย `delegate: "CPU"` ทันที + แสดงข้อความเล็กๆ ว่า "โหมดประหยัด" **ทำตั้งแต่สัปดาห์ 1 ไม่ใช่ไปนึกได้ตอนสัปดาห์ 5**

### G10 — "จะทดสอบ Edge Case 'ไม่มีกล้อง' ได้ยังไงในเมื่อโน้ตบุ๊กทุกเครื่องมีกล้อง"

**คำตอบที่แนะนำ:** Chrome DevTools → เมนู 3 จุด → More tools → Sensors ปิดกล้องได้ หรือง่ายกว่านั้นคือทำ **query parameter สำหรับทดสอบ** เช่น `?simulate=NotFoundError` ให้โค้ด throw error ปลอมตามที่ระบุ วิธีนี้เดโม่ edge case ให้อาจารย์ดูได้ในคลิกเดียว — และเป็นของที่โชว์ในสไลด์ได้ด้วย

### G11 — "ถ้าสัปดาห์ 3 แล้วสูตรคะแนนยังใช้ไม่ได้ จะทำยังไง"

**คำตอบที่แนะนำ:** ตั้งเส้นตายไว้เลยว่า **จบสัปดาห์ 2 ต้องมีคะแนนที่ 'พอใช้ได้'** ถ้าไม่ทัน ให้ตัดองค์ประกอบ `align` (15%) และ `tuck` (25%) ออก เหลือแค่ `straight` + `raised` + `bend` แล้วปรับน้ำหนักเป็น 40/20/40 ความแม่นลดลงแต่ยังเล่นได้ **มีเกมที่ตรวจหยาบๆ ดีกว่าไม่มีเกม**

---

## ส่วนที่ 5 — สิ่งที่ต้องตัดสินใจก่อนเขียนโค้ดบรรทัดแรก

- [ ] G2: ยืนยันสูตรจัดอันดับ (ผลรวมคะแนน ÷ 10) — กระทบทั้ง frontend และ validator
- [ ] G5: ยืนยันว่า Persona เล่นบนมือถือหรือโน้ตบุ๊ก — กระทบ UX ทั้งหมด
- [ ] G1: ยืนยันว่าสัปดาห์ 1-3 มีโหมดเดียว
- [ ] ตกลงกันในกลุ่มว่าใครทำ frontend / ใครทำ backend (ดูเส้นทางวิกฤต 3.4)
- [ ] เลือก Render หรือ Railway แล้วสมัครบัญชีให้เรียบร้อยตั้งแต่สัปดาห์ 1

---

**ขั้นตอนถัดไป:** เริ่มที่ลำดับ 1-4 ในตาราง 2.2 ให้ `docker compose up` แล้วเห็นหน้าเว็บกับ `/docs` ได้ภายในวันแรก จากนั้นพุ่งไปที่ F9 Debug Panel ให้เร็วที่สุด
