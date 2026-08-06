const DAB_CONFIG = {
  name: "Dab Challenge",
  enterScore: 75,
  exitScore: 40,
  ANGLE: {
    STRAIGHT_LO: 140,
    STRAIGHT_HI: 165,
    BEND_MID: 50,
    BEND_TOL: 30,
    ALIGN_TOL: 40,
  },
  DIST: {
    TUCK_NEAR: 0.4,
    TUCK_FAR: 0.9,
    RAISE_FULL: 0.3,
  },
  WEIGHTS: { straight: 0.25, raised: 0.15, bend: 0.20, tuck: 0.25, align: 0.15 },
};

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

  // ── ย้อนหลังเข้าถึงแบบตรงๆ สำหรับ dab.js (ไม่ใช้ 'this' ป้องกัน TypeError) ──
  ANGLE: DAB_CONFIG.ANGLE,
  DIST: DAB_CONFIG.DIST,
  WEIGHTS: DAB_CONFIG.WEIGHTS,

  // ── พารามิเตอร์เกณฑ์แต่ละท่า (สามารถปรับจูนค่าได้ที่นี่) ──
  POSES: {
    dab: DAB_CONFIG,
    six_seven: {
      name: "Six-Seven Dance",
      enterScore: 50,
      exitScore: 25,
      DIST: {
        STOMACH_OFFSET: 0.85,   // มือพักระดับเอว/ต่ำ
        SHOULDER_OFFSET: 0.55,  // แค่มือขึ้นถึงระดับลำตัว (50% ความยาวจากไหล่) ก็ได้คะแนนเต็มและนับ 1 ทันที
      },
      WEIGHTS: { handRaise: 1.0 },
    },
    scuba: {
      name: "Scuba Diver 🤿",
      enterScore: 50,
      exitScore: 30,
      DIST: {
        NOSE_HAND_MAX: 0.45,   // มือข้างหนึ่งต้องอยู่ใกล้จมูกไม่เกิน 0.45 เท่าไหล่
      },
      WEIGHTS: { noseHand: 0.50, waveHand: 0.50 },
    },
    brazil: {
      name: "Brazilian TikTok Dance 🇧🇷",
      enterScore: 70,
      exitScore: 40,
      ANGLE: {
        KNEE_BEND_MID: 90,     // เข่าข้างที่ยกพับประมาณ 90°
        KNEE_BEND_TOL: 40,     // บวกลบ 40°
      },
      DIST: {
        HAND_RAISE_MIN: 0.20,  // มือชูสูงกว่าไหล่อย่างน้อย 0.20 เท่าไหล่
        KNEE_LIFT_MIN: 0.15,   // เข่ายกสูงกว่าอีกข้างอย่างน้อย 0.15 เท่าความยาวขา
      },
      WEIGHTS: { handRaise: 0.40, kneeLift: 0.40, kneeBend: 0.20 },
    },
  },

  MEDIAPIPE: {
    WASM_URL: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
    MODEL_URL:
      "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
  },
};
