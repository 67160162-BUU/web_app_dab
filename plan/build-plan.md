# แผนการลงมือทำเว็บ — DAB DETECTOR

> เอกสารสำหรับตรวจก่อนเริ่มเขียนโค้ด
> อ้างอิง: `user-journey.md` (สเปก), `dab-detector-plan.md` (สถาปัตยกรรม), `user-journey-summary.md` (AC)
> **อ่านหัวข้อ 0 ก่อน — มี 3 เรื่องที่ต้องตัดสินใจก่อนโค้ดบรรทัดแรก**

---

## 0. เรื่องที่ต้องเคาะก่อน (ถ้าไม่เคาะ จะต้องรื้อทีหลัง)

### D1 — 🔴 ปัญหาหน้า HTML แยกไฟล์ กับ กล้อง/โมเดลที่ต้องอยู่ต่อ

**ปัญหา:** เอกสารกำหนดให้แยกไฟล์เป็น `camera-setup.html` → `game.html` → `result.html` ตามขั้นตอนใน journey แต่ **การเปลี่ยนหน้า HTML = ทิ้ง MediaPipe model และ camera stream ทั้งหมด** ต้องโหลดโมเดลใหม่ 2-5 วินาทีทุกครั้งที่เปลี่ยนหน้า

ซึ่งขัดกับ Acceptance Criteria 2 ข้อพร้อมกัน:
- "กด 'เล่นอีก' โดยไม่ต้องขออนุญาตกล้องใหม่" (ขั้นตอนที่ 9)
- "ไม่มีจอว่างเปล่าเกิน 1 วินาที" (AC 6.1)

และการส่งภาพ best shot ข้ามหน้าต้องยัดผ่าน `sessionStorage` เป็น dataURL ซึ่งเปลืองและพังง่าย

| ตัวเลือก | ข้อดี | ข้อเสีย |
|---|---|---|
| **A. แยกไฟล์จริงตามเอกสาร** | ตรงเป๊ะกับ scaffold อาจารย์ ตรวจงานง่าย | โหลดโมเดลใหม่ทุกหน้า, จอค้าง 2-5 วิ ระหว่างเล่น, ผิด AC 2 ข้อ |
| **B. รวมช่วงเล่นเป็นหน้าเดียว `play.html` แล้วสลับ section ด้วย hash** ⭐ | กล้อง+โมเดลอยู่ต่อตลอด, "เล่นอีก" ทันที, ไม่มีจอค้างกลางเกม | ต้องอธิบายในสไลด์ว่าทำไมไม่แยกไฟล์ |
| C. SPA เต็มรูปแบบ | ยืดหยุ่นสุด | ซับซ้อนเกินไปสำหรับกรอบเวลา |

**แนะนำ: ตัวเลือก B** — ใช้ URL เป็น `play.html#setup` → `#countdown` → `#play` → `#result` ยังคง mapping กับขั้นตอนใน journey ได้ครบ (แต่ละ hash = 1 ขั้นตอน) และเขียนเหตุผลลง README ให้อาจารย์เห็นว่าเป็นการตัดสินใจเชิงเทคนิคที่มีเหตุผล ไม่ใช่ทำไม่เป็น

โครงสร้างที่ได้: `index.html`, `pages/play.html`, `pages/leaderboard.html` (3 ไฟล์)

**✅ ต้องการคำยืนยัน — ข้อนี้กระทบโครงสร้างไฟล์ทั้งหมด**

---

### D2 — สูตรคะแนนรวมที่ใช้จัดอันดับ

`score` กับ `dab_count` ขัดกันเอง (ทำเร็วรัวๆ = count เยอะ score เฉลี่ยต่ำ / ทำประณีต = ตรงข้าม)

**แนะนำ:** `finalScore = clamp(ผลรวมคะแนนของทุกครั้งที่นับได้ ÷ 10, 0, 100)`
ทำเร็วอย่างเดียวไม่ชนะ ทำสวยอย่างเดียวไม่ชนะ ต้องทั้งเร็วทั้งสวย

ตัวอย่าง: ทำได้ 12 ครั้ง คะแนนเฉลี่ยครั้งละ 80 → 12 × 80 ÷ 10 = 96 คะแนน

**กระทบ:** `config.js`, `game.js`, validator ใน `schemas.py`

---

### D3 — โหมดเกม

`Score.mode` มี 3 ค่าในสเปก แต่ journey อธิบายแค่โหมดเดียว

**แนะนำ:** สัปดาห์ 1-3 ทำ `"rush"` อย่างเดียว แต่**เก็บคอลัมน์ `mode` ไว้ในตารางตั้งแต่แรก** (hardcode `"rush"`) เพราะเพิ่มคอลัมน์ทีหลังเจ็บกว่าปล่อยว่างไว้

---

## 1. ภาพรวมแผน 6 เฟส

```
Phase 0  ตั้งระบบ           →  docker compose up ขึ้น      (~2 ชม.)
Phase 1  โครงเว็บ + mock API →  เห็นหน้าเว็บ + leaderboard ปลอม  (~3 ชม.)
Phase 2  กล้อง + โครงกระดูก  →  เห็นโครงกระดูกตัวเอง        (~3 ชม.)
Phase 3  Debug Panel + สูตร  →  ⚠️ คอขวด ทำท่าแล้วได้คะแนนถูก (~4-6 ชม.)
Phase 4  ประกอบเป็นเกม       →  เล่นจบ 1 รอบได้             (~4 ชม.)
Phase 5  DB + API จริง       →  คะแนนขึ้นกระดานจริง         (~3 ชม.)
Phase 6  Edge cases + deploy →  ส่งงานได้                   (~4 ชม.)
```

**Phase 3 คือคอขวด** — เป็นเฟสเดียวที่ AI ช่วยไม่ได้ ต้องยืนหน้ากล้องอ่านค่าจริง อย่าเผื่อเวลาน้อยเกินไป

---

## 2. Phase 0 — ตั้งระบบให้รันได้

### ไฟล์ที่สร้าง
```
.gitignore
README.md
docker-compose.yml
.env.example
backend/Dockerfile
backend/requirements.txt
backend/app/main.py          ← มีแค่ /api/health
frontend/index.html          ← มีแค่ <h1>DAB DETECTOR</h1>
```

### รายละเอียด
- `backend/requirements.txt`: `fastapi`, `uvicorn[standard]`, `sqlmodel`, `psycopg2-binary`, `python-dotenv`
- `Dockerfile`: base `python:3.11-slim`, **`COPY` ไฟล์เข้า image เสมอ** (volume mount ใช้เฉพาะตอน dev)
- `main.py`: mount `frontend/` เป็น StaticFiles ที่ `/` + endpoint `/api/health` คืน `{"status":"ok"}`
- `.gitignore`: `.env`, `__pycache__/`, `*.pyc`, `.DS_Store`

### 🚦 Gate — ผ่านเมื่อ
- [ ] `docker compose up` ไม่มี error
- [ ] `http://localhost:8000` เห็นหน้าเว็บ
- [ ] `http://localhost:8000/docs` เห็น Swagger UI
- [ ] `docker build` + `docker run` ตรงๆ (ไม่ผ่าน compose) ก็ยังรันได้ ← พิสูจน์ว่าตอน deploy จะไม่พัง
- [ ] push ขึ้น GitHub + ต่อ Render/Railway ได้ **URL จริงที่มี HTTPS**

> **อย่าข้ามข้อสุดท้าย** หลักการข้อ 1 ของอาจารย์คือ "เริ่มจาก URL จริงตั้งแต่วันแรก" ถ้าเลื่อนไปทำท้ายเทอมมักพังและแก้ไม่ทัน

---

## 3. Phase 1 — โครงเว็บและ mock API

### ไฟล์ที่สร้าง
```
backend/app/routers/scores.py    ← GET /api/scores/top คืน mock data
frontend/css/style.css
frontend/js/config.js
frontend/js/api.js
frontend/js/ui.js
frontend/index.html              ← เติมเนื้อหาจริง
frontend/pages/leaderboard.html
```

### รายละเอียด

**`routers/scores.py`** — mock ก่อน ยังไม่ต่อ DB
```python
@router.get("/top")
def get_top(limit: int = 20):
    return [{"id": 1, "nickname": "บิว", "score": 96.0, "dab_count": 12}, ...]
```

**`config.js`** — รวมค่าคงที่ทุกตัวไว้ที่เดียว (จูนที่นี่ที่เดียวตลอดโปรเจกต์)
```js
export const CFG = {
  GAME_DURATION_MS: 20000,
  COUNTDOWN_DESKTOP: 3, COUNTDOWN_MOBILE: 5,
  SMOOTH_FRAMES: 5,
  DAB_ENTER: 75, DAB_EXIT: 40,        // state machine
  MIN_VISIBILITY: 0.5,
  ANGLE: { STRAIGHT_LO: 140, STRAIGHT_HI: 170, BEND_MID: 50, BEND_TOL: 25 },
  WEIGHTS: { straight:.25, raised:.15, bend:.20, tuck:.25, align:.15 },
  // ค่าใน ANGLE เป็นค่าเดา — จะแก้จริงใน Phase 3
};
```

**`index.html`** — landing page
- ปุ่มเดียว "เริ่ม DAB" + GIF ตัวอย่างท่า
- ข้อความความเป็นส่วนตัวแสดง**ก่อน**กดปุ่ม (P1, AC 6.1)
- ข้อความ "ใช้เวลา 20 วินาที ต้องขยับตัว" (P4 — กันคนกดเล่นกลางที่สาธารณะแล้วอาย)
- ปุ่มรอง "ดูอันดับอย่างเดียว"
- แสดง Top 5 จาก mock API
- **เริ่ม preload โมเดล MediaPipe เบื้องหลังตั้งแต่หน้านี้**

### 🚦 Gate
- [ ] เปิดหน้าแรกเห็น leaderboard ปลอมที่ดึงจาก API จริง
- [ ] `/docs` ยิง `GET /api/scores/top` ได้
- [ ] ย่อหน้าจอเป็นมือถือแล้วยังอ่านได้
- [ ] leaderboard ว่าง (แก้ mock ให้คืน `[]`) → เห็นข้อความชวนเล่น ไม่ใช่ตารางเปล่า (E11)

---

## 4. Phase 2 — กล้องและโครงกระดูก

### ไฟล์ที่สร้าง
```
frontend/pages/play.html     ← section #setup
frontend/js/pose.js
```

### รายละเอียด

**ลำดับการเขียน `pose.js` (ทำตามลำดับนี้ จะ debug ง่ายกว่ามาก)**
1. `initModel()` — โหลด MediaPipe + **try/catch fallback GPU → CPU ทำตั้งแต่ตอนนี้เลย** (E12)
2. `startCamera()` — `getUserMedia()` + จัดการ error 3 ประเภทแยกกัน
3. รอ `loadeddata` และเช็ค `video.videoWidth > 0` ก่อนเริ่มลูป
4. ตั้ง `canvas.width = video.videoWidth` (**ไม่ใช่ขนาด CSS**)
5. ลูป `requestAnimationFrame` + กัน timestamp ซ้ำด้วย `lastVideoTime`
6. `drawSkeleton()` — คูณพิกัด normalized ด้วยขนาด canvas ก่อนวาด

**สิ่งที่ต้องไม่ลืม**
- `<video playsinline muted autoplay>` — ขาด `playsinline` แล้ว iOS จะเด้ง fullscreen
- `transform: scaleX(-1)` ทั้ง video และ canvas
- เพิ่ม query param สำหรับทดสอบ: `?simulate=NotAllowedError` ให้ throw error ปลอม ← ใช้เดโม่ edge case ให้อาจารย์ดูได้ในคลิกเดียว (E1, E2)

### 🚦 Gate
- [ ] เห็นโครงกระดูก 33 จุดขยับตามตัวเอง ไม่เบี้ยว ไม่ค้าง
- [ ] กด Block ปฏิเสธกล้อง → เห็นหน้าอธิบาย + ปุ่มลองใหม่ **ไม่ใช่จอขาว** (E1)
- [ ] `?simulate=NotFoundError` และ `?simulate=NotReadableError` แสดงข้อความต่างกัน (E2)
- [ ] ระหว่างโหลดโมเดลมี loading indicator
- [ ] ทดสอบบนมือถือจริงผ่าน URL ที่ deploy (HTTPS) — **ไม่ใช่แค่ localhost**

---

## 5. Phase 3 — Debug Panel และสูตรคะแนน ⚠️ คอขวด

### ไฟล์ที่สร้าง
```
frontend/js/dab.js
docs/test-poses.json         ← landmark ที่บันทึกไว้ทดสอบ
```

### ขั้นที่ 1 — Debug Panel (ทำก่อนเขียนสูตร ห้ามสลับลำดับ)

แสดงสดๆ มุมขวาบนของ `play.html`:
- มุมข้อศอกซ้าย / ขวา
- `dist(ข้อมือ, จมูก) / shoulderWidth` ทั้งสองข้าง
- `(ไหล่.y − ข้อมือ.y) / shoulderWidth`
- มุมแขนท่อนบนซ้าย/ขวา (สำหรับเกณฑ์ align)
- fps

**+ ปุ่ม "บันทึก landmark เป็น JSON"** — ยืนทำท่าจริงแล้ว export เก็บไว้:

| ท่า | จำนวน | คาดหวัง |
|---|---|---|
| Dab ซ้าย | 3 | > 75 |
| Dab ขวา | 3 | > 75 |
| ยกแขนสองข้าง | 2 | < 40 |
| ยืนเฉยๆ | 2 | < 20 |
| Dab แบบทำครึ่งๆ | 2 | 40-70 |

ลงแรงเพิ่ม 30 นาที แต่ประหยัดหลายชั่วโมง — จูนสูตรได้ในคอนโซลโดยไม่ต้องยืนหน้ากล้องซ้ำทุกครั้ง

### ขั้นที่ 2 — จดค่าจริง แล้วแก้ `config.js`

ยืนทำท่า Dab หน้ากล้อง **แล้วจดตัวเลขที่เห็นจริง** เอามาแทนค่าเดาใน `CFG.ANGLE`
🚨 **ห้ามให้ AI เดาค่าเหล่านี้** — AI จะให้ตัวเลขที่ดูสมเหตุสมผลแต่ใช้จริงไม่ได้

### ขั้นที่ 3 — เขียน `dab.js`

**กฎเหล็ก: `dab.js` ห้ามรู้จัก DOM และห้ามรู้จัก MediaPipe** รับ array landmark คืนตัวเลข เท่านั้น

```js
export function angle(a, b, c)            // มุมที่จุด b
export function dist(a, b)
export function smoothstep(lo, hi, x)
export function scoreDab(lm)              // → { total, parts:{straight,raised,bend,tuck,align}, side }
```
- ทุกระยะทางหารด้วย `shoulderWidth = dist(lm[11], lm[12])` เสมอ
- จุดที่ `visibility < 0.5` ถือว่าใช้ไม่ได้ (คืน 0 หรือข้าม)
- คำนวณทั้งสองด้าน (ซ้ายเหยียด/ขวาเหยียด) แล้วเอา `max`

### 🚦 Gate — เข้มที่สุดในโปรเจกต์
- [ ] ท่า Dab ถูกต้อง → **> 75** (ทดสอบทั้งซ้ายและขวา)
- [ ] ยกแขนสองข้าง / ชูมือ → **< 40** (ไม่ใช่ false positive)
- [ ] ยืนใกล้ 1 ม. กับไกล 3 ม. ทำท่าเดิม → คะแนนต่างกัน **≤ 10**
- [ ] รัน `test-poses.json` ผ่านสูตร แล้วผลตรงกับที่คาดไว้ทุกท่า
- [ ] เห็นคะแนนแยกรายเกณฑ์ 5 ตัว บอกได้ว่า "แขนยังเหยียดไม่พอ"

> **ถ้าจบ Phase 3 แล้วยังไม่ผ่าน** ให้ตัดเกณฑ์ `align` (15%) และ `tuck` (25%) ออก เหลือ `straight`/`raised`/`bend` ปรับน้ำหนักเป็น 40/20/40 — มีเกมที่ตรวจหยาบๆ ดีกว่าไม่มีเกม

---

## 6. Phase 4 — ประกอบเป็นเกม

### ไฟล์ที่สร้าง
```
frontend/js/game.js
frontend/pages/play.html    ← เติม section #countdown, #play, #result
```

### รายละเอียด
- **Smoothing** — ค่าเฉลี่ยเคลื่อนที่ 5 เฟรม (AC: คะแนนต้องไม่กระพริบ)
- **State machine นับครั้ง** (E5)
  ```
  IDLE  --คะแนน ≥ 75 ติดกัน 3 เฟรม-->  IN_DAB  (นับ +1, เก็บ best shot)
  IN_DAB --คะแนน < 40 ติดกัน 3 เฟรม-->  IDLE
  ```
- **นับถอยหลัง** desktop 3 / mobile 5 (P5 — ต้องมีเวลาถอยห่างจากมือถือ)
- **จับเวลา 20 วินาที** + แสดงเวลาที่เหลือ
- **โครงกระดูกเปลี่ยนสีตามคะแนน** แดง → เหลือง → เขียว (feedback สด)
- **Capture best frame** จาก canvas ตอนคะแนนสูงสุด
- **คำนวณคะแนนรวม** ตาม D2
- **หน้าผล** แสดงคะแนน + แยกรายเกณฑ์ + best shot + อันดับโดยประมาณ (P6)
- **ปุ่มเล่นอีก** → กลับไป `#countdown` โดยไม่แตะกล้อง/โมเดล
- **`visibilitychange`** → pause เกม กลับมาต้องเริ่มรอบใหม่ (E7)

### 🚦 Gate
- [ ] เล่นจบ 1 รอบได้ครบ ตั้งแต่นับถอยหลังถึงหน้าผล
- [ ] ค้างท่า Dab 10 วินาที → นับได้ **แค่ 1 ครั้ง** (E5)
- [ ] คะแนนบนจอไม่กระพริบ
- [ ] กด "เล่นอีก" → เริ่มใหม่ทันที ไม่ขอกล้องใหม่ ไม่โหลดโมเดลใหม่
- [ ] สลับแท็บกลางเกม → pause แล้วเริ่มรอบใหม่เมื่อกลับมา (E7)

---

## 7. Phase 5 — ฐานข้อมูลและ API จริง

> 🔄 **อัปเดตหลังเริ่มลงมือ:** เปลี่ยนแผนเป็น **MySQL + phpMyAdmin** (ของ XAMPP) แทน PostgreSQL + Docker
> และ **ลบ Docker ออกจากช่วงพัฒนาแล้ว** จะกลับมาทำ container ตอนงานใกล้เสร็จเพื่อส่ง/deploy
> รายละเอียดในตาราง "บันทึกการตัดสินใจ" ของ `README.md` — ส่วนล่างของหัวข้อนี้ยังเขียนอิง PostgreSQL อยู่ ต้องปรับตอนลงมือจริง

### ไฟล์ที่สร้าง
```
backend/app/database.py
backend/app/models.py
backend/app/schemas.py
backend/app/crud.py
backend/app/routers/scores.py    ← เลิกใช้ mock
docs/er-diagram.png
docs/api-spec.md
```

### รายละเอียด

**`models.py`**
```python
class Score(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    nickname: str = Field(max_length=12, index=True)
    score: float
    dab_count: int
    mode: str = "rush"
    created_at: datetime = Field(default_factory=datetime.utcnow)
```
**ไม่มีคอลัมน์อันดับ** — คำนวณตอน query ด้วย `ORDER BY score DESC`

**`schemas.py`** — validator กันยิง API ปลอม (E9)
- `score`: 0-100
- `dab_count`: 0-40
- `nickname`: ว่าง → `"Anonymous"`, ตัดที่ 12 ตัว, กรองคำหยาบ **ฝั่ง server** (E8)

**`database.py`**
- อ่าน `DATABASE_URL` จาก env var **ห้าม hardcode**
- **fallback เป็น SQLite ถ้าไม่มีค่านี้** ← วันนำเสนอยังเดโม่ได้แม้ DB คลาวด์พัง

**endpoints**
| Method | Path | ใช้ที่ |
|---|---|---|
| POST | `/api/scores` | ขั้นตอน 7 → คืน `id` ให้เก็บใน sessionStorage (D3/ไฮไลต์อันดับ) |
| GET | `/api/scores/top?limit=20` | ขั้นตอน 8 |
| GET | `/api/scores/rank/{score}` | ขั้นตอน 6 (P6) |

### 🚦 Gate
- [ ] `POST` score=999 → **422**
- [ ] `POST` dab_count=100 → **422**
- [ ] `POST` nickname ว่าง → บันทึกเป็น `"Anonymous"`
- [ ] `POST` nickname 20 ตัว → ไม่บันทึกเกิน 12 ตัว
- [ ] เล่นจบ → ส่งคะแนน → refresh leaderboard เห็นชื่อตัวเองไฮไลต์
- [ ] `GET /top` ตอน DB ว่าง → คืน `[]` (200) ไม่ใช่ 500

---

## 8. Phase 6 — Edge cases ที่เหลือ, แชร์, deploy

### งานที่เหลือ
| งาน | อ้างอิง |
|---|---|
| เตือนแสงน้อย / ยืนไม่เต็มเฟรม (visibility ต่ำเกิน 1 วิ) | E3 |
| เตือนเมื่อตรวจพบมากกว่า 1 คน | E4 |
| ตรวจ landmark นิ่งเกินไป (กันถือรูปมาส่อง) | E6 |
| fps < 15 → ลดความละเอียดอัตโนมัติ | E10 |
| ปิดปุ่มส่งคะแนนหลังกดครั้งแรก + rate limit backend | E13 |
| สร้างการ์ดภาพผลคะแนนสำหรับแชร์ | P7 |
| ทดสอบ responsive บนมือถือจริง + iOS Safari | AC 6.5 |
| README: วิธีรัน + URL + prompt ที่ใช้ | Rubric 10% |

### 🚦 Gate สุดท้าย — เช็คลิสต์ก่อนส่ง
- [ ] clone ใหม่จาก GitHub แล้ว `docker compose up` รันได้เลย
- [ ] URL production มี HTTPS และเปิดกล้องได้จากเครื่องคนอื่น
- [ ] เปิดแท็บ Network เล่นจบ 1 รอบ → **ไม่มี request ที่ส่งภาพออกจากเบราว์เซอร์**
- [ ] ไม่มี `.env` หรือคีย์ลับใน repo
- [ ] สาธิต edge case ได้อย่างน้อย 3 กรณี (E1, E2, E3)
- [ ] ทุกคนในกลุ่มมี commit

---

## 9. ลำดับที่จะลงมือ (ถ้าอนุมัติแผนนี้)

```
1. เคาะ D1, D2, D3
2. Phase 0  → ให้ได้ URL จริงก่อนทำอย่างอื่น
3. Phase 1  → โครงเว็บ + mock API
4. Phase 2  → กล้อง + โครงกระดูก
5. Phase 3  → Debug Panel → จดค่าจริง → สูตรคะแนน  ⚠️ ช้าที่สุด
6. Phase 4  → ประกอบเกม
7. Phase 5  → DB จริง
8. Phase 6  → edge cases + ขัดเงา + ส่ง
```

**ทำคู่ขนานได้ (ถ้าแบ่งงานหลายคน):** Phase 1 (หน้าตาเว็บ) และ Phase 5 (backend/DB) ไม่ติดใคร ทำพร้อม Phase 2-3 ได้เลย

---

## 10. สิ่งที่ต้องการจากคุณก่อนเริ่ม

1. **ยืนยัน D1** — รวมช่วงเล่นเป็น `play.html` หน้าเดียว (แนะนำ) หรือแยก 3 ไฟล์ตามเอกสาร
2. **ยืนยัน D2** — สูตรคะแนนรวม `ผลรวม ÷ 10`
3. **ยืนยัน D3** — โหมดเดียว `"rush"` ไปก่อน
4. บอกว่าจะให้เริ่ม Phase ไหนก่อน (แนะนำ Phase 0 → 1 รวดเดียว แล้วหยุดให้ตรวจ)
