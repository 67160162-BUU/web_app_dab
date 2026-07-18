// คณิตศาสตร์ตรวจท่า Dab ล้วนๆ — ไฟล์นี้ห้ามรู้จัก DOM และห้ามรู้จัก MediaPipe
// รับ array landmark 33 จุด ({x,y,visibility}) → คืนตัวเลข
// ทำให้ทดสอบในคอนโซลด้วย landmark ปลอม (docs/test-poses.json) ได้โดยไม่ต้องเปิดกล้อง
import { CFG } from "./config.js";

// index ของ landmark ที่ใช้ (จาก 33 จุดของ MediaPipe)
export const LM = {
  NOSE: 0,
  L_SHOULDER: 11, R_SHOULDER: 12,
  L_ELBOW: 13, R_ELBOW: 14,
  L_WRIST: 15, R_WRIST: 16,
  L_HIP: 23, R_HIP: 24,
};

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// มุมที่จุด b ระหว่างเวกเตอร์ b→a และ b→c (องศา) — ใช้แค่ x,y เพราะแกน z ไม่แม่น
export function angle(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (mag === 0) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

// ฟังก์ชันไล่ระดับ 0→1 — ใช้แทน if/else เพื่อให้บอกได้ว่า "ใกล้แล้วแค่ไหน"
export function smoothstep(lo, hi, x) {
  const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

// มุมเอียงของแขนท่อนบน (ไหล่→ศอก) เทียบแกนนอน — ใช้เกณฑ์ align
function upperArmAngle(shoulder, elbow) {
  return (Math.atan2(elbow.y - shoulder.y, elbow.x - shoulder.x) * 180) / Math.PI;
}

function visible(lm, ...ids) {
  return ids.every((i) => (lm[i].visibility ?? 1) >= CFG.MIN_VISIBILITY);
}

// คำนวณคะแนนของ "ด้านเดียว": straightSide = ด้านที่แขนเหยียด, bendSide = ด้านที่แขนพับ
function scoreSide(lm, s) {
  const { A, D, W } = { A: CFG.ANGLE, D: CFG.DIST, W: CFG.WEIGHTS };
  const shoulderW = dist(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]);
  if (shoulderW === 0) return null;

  const straightAngle = angle(lm[s.straightShoulder], lm[s.straightElbow], lm[s.straightWrist]);
  const bendAngle = angle(lm[s.bendShoulder], lm[s.bendElbow], lm[s.bendWrist]);

  // 1) straight — แขนข้างเหยียด มุมศอกต้องกว้าง
  const straight = smoothstep(A.STRAIGHT_LO, A.STRAIGHT_HI, straightAngle);

  // 2) raised — ปลายมือแขนเหยียดต้องสูงกว่าไหล่ (แกน y ชี้ลง: สูงกว่า = ค่าน้อยกว่า)
  const raiseAmount = (lm[s.straightShoulder].y - lm[s.straightWrist].y) / shoulderW;
  const raised = smoothstep(0, D.RAISE_FULL, raiseAmount);

  // 3) bend — แขนอีกข้างพับ มุมศอกอยู่ในช่วงระฆังรอบ BEND_MID
  const bend = 1 - smoothstep(0, A.BEND_TOL, Math.abs(bendAngle - A.BEND_MID));

  // 4) tuck — ข้อมือข้างพับซุกใกล้จมูก (หารความกว้างไหล่ให้ไม่ขึ้นกับระยะกล้อง)
  const tuckDist = dist(lm[s.bendWrist], lm[LM.NOSE]) / shoulderW;
  const tuck = 1 - smoothstep(D.TUCK_NEAR, D.TUCK_FAR, tuckDist);

  // 5) align — แขนท่อนบนสองข้างเรียงเป็นเส้นเฉียงเดียวกัน
  const diff = Math.abs(
    upperArmAngle(lm[s.straightShoulder], lm[s.straightElbow]) -
    upperArmAngle(lm[s.bendShoulder], lm[s.bendElbow])
  );
  const align = 1 - smoothstep(0, A.ALIGN_TOL, Math.min(diff, 360 - diff));

  const parts = { straight, raised, bend, tuck, align };
  const total =
    (straight * W.straight + raised * W.raised + bend * W.bend +
     tuck * W.tuck + align * W.align) * 100;
  return { total, parts, debug: { straightAngle, bendAngle, tuckDist, raiseAmount } };
}

// คะแนนท่า Dab = ค่าที่ดีกว่าระหว่าง "ซ้ายเหยียด" กับ "ขวาเหยียด"
// จำไว้: จอเป็นภาพกระจก — left_wrist ของ MediaPipe จะปรากฏทางขวาของจอ
export function scoreDab(lm) {
  const needed = [LM.NOSE, LM.L_SHOULDER, LM.R_SHOULDER, LM.L_ELBOW, LM.R_ELBOW, LM.L_WRIST, LM.R_WRIST];
  if (!lm || lm.length < 33 || !visible(lm, ...needed)) {
    return { total: 0, parts: null, side: null, valid: false };
  }

  const leftStraight = scoreSide(lm, {
    straightShoulder: LM.L_SHOULDER, straightElbow: LM.L_ELBOW, straightWrist: LM.L_WRIST,
    bendShoulder: LM.R_SHOULDER, bendElbow: LM.R_ELBOW, bendWrist: LM.R_WRIST,
  });
  const rightStraight = scoreSide(lm, {
    straightShoulder: LM.R_SHOULDER, straightElbow: LM.R_ELBOW, straightWrist: LM.R_WRIST,
    bendShoulder: LM.L_SHOULDER, bendElbow: LM.L_ELBOW, bendWrist: LM.L_WRIST,
  });
  if (!leftStraight || !rightStraight) return { total: 0, parts: null, side: null, valid: false };

  const best = leftStraight.total >= rightStraight.total
    ? { ...leftStraight, side: "left-straight" }
    : { ...rightStraight, side: "right-straight" };
  return { ...best, valid: true };
}

// ตัวเฉลี่ยเคลื่อนที่ N เฟรม — กันคะแนนกระพริบ
export function createSmoother(n = CFG.SMOOTH_FRAMES) {
  const buf = [];
  return (v) => {
    buf.push(v);
    if (buf.length > n) buf.shift();
    return buf.reduce((a, b) => a + b, 0) / buf.length;
  };
}

// state machine นับจำนวนครั้ง — ค้างท่าไว้ได้แค่ 1 ครั้ง ต้องกลับท่าปกติก่อน (Edge Case 5)
export function createDabCounter() {
  let state = "IDLE";
  let enterStreak = 0, exitStreak = 0, count = 0;
  return {
    update(score) {
      if (state === "IDLE") {
        enterStreak = score >= CFG.DAB_ENTER ? enterStreak + 1 : 0;
        if (enterStreak >= CFG.ENTER_FRAMES) {
          state = "IN_DAB"; count++; enterStreak = 0;
          return { counted: true, count, state };
        }
      } else {
        exitStreak = score < CFG.DAB_EXIT ? exitStreak + 1 : 0;
        if (exitStreak >= CFG.EXIT_FRAMES) { state = "IDLE"; exitStreak = 0; }
      }
      return { counted: false, count, state };
    },
    get count() { return count; },
  };
}
