// ค่าคงที่ทั้งหมดของเกม — จูนที่ไฟล์นี้ที่เดียว
// ⚠️ ค่าใน ANGLE/DIST เป็นค่าตั้งต้นจากการประมาณ ยังไม่ได้จูนจากคนจริง
//    ต้องยืนหน้ากล้องอ่านค่าจาก Debug Panel แล้วแก้ตัวเลขชุดนี้ (Phase 3)
export const CFG = {
  GAME_DURATION_MS: 20000,
  COUNTDOWN_DESKTOP: 3,
  COUNTDOWN_MOBILE: 5,          // มือถือให้เวลาถอยห่างจากเครื่อง

  SMOOTH_FRAMES: 5,             // เฉลี่ยคะแนนย้อนหลังกี่เฟรม (กันคะแนนกระพริบ)
  MIN_VISIBILITY: 0.5,          // landmark ที่ต่ำกว่านี้ถือว่าใช้ไม่ได้

  // state machine นับครั้ง (กันค้างท่าโกงคะแนน)
  DAB_ENTER: 75,                // คะแนน ≥ นี้ติดกัน ENTER_FRAMES เฟรม → นับ 1 ครั้ง
  DAB_EXIT: 40,                 // ต้องต่ำกว่านี้ก่อน ถึงนับครั้งต่อไปได้
  ENTER_FRAMES: 3,
  EXIT_FRAMES: 3,

  // เกณฑ์มุม/ระยะ (หน่วย: องศา และ สัดส่วนต่อความกว้างไหล่)
  ANGLE: {
    STRAIGHT_LO: 140,           // แขนเหยียด: มุมศอกเริ่มได้คะแนนที่ 140°
    STRAIGHT_HI: 165,           //             เต็มที่ 165°
    BEND_MID: 50,               // แขนพับ: มุมศอกที่ดีที่สุด ~50°
    BEND_TOL: 30,               //          บวกลบได้ 30°
    ALIGN_TOL: 40,              // แขนท่อนบนสองข้างเฉียงต่างกันได้ไม่เกิน 40°
  },
  DIST: {
    TUCK_NEAR: 0.4,             // ข้อมือพับใกล้จมูก ≤ 0.4 เท่าความกว้างไหล่ = เต็ม
    TUCK_FAR: 0.9,              //                    ≥ 0.9 = ศูนย์
    RAISE_FULL: 0.3,            // ข้อมือเหยียดสูงกว่าไหล่ ≥ 0.3 เท่า = เต็ม
  },

  // น้ำหนักคะแนน 5 องค์ประกอบ (รวม = 1)
  WEIGHTS: { straight: 0.25, raised: 0.15, bend: 0.20, tuck: 0.25, align: 0.15 },

  MEDIAPIPE: {
    WASM_URL: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
    MODEL_URL:
      "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
  },
};
