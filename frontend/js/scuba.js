// คณิตศาสตร์ตรวจท่า Scuba Diver (มือข้างหนึ่งจับ/ป้องบริเวณจมูก/ใบหน้า + มืออีกข้างยื่นปัดซ้าย-ขวา)
import { CFG } from "./config.js";
import { dist, LM } from "./dab.js";

function visible(lm, ...ids) {
  return ids.every((i) => (lm[i]?.visibility ?? 1) >= CFG.MIN_VISIBILITY);
}

export function scoreScuba(lm) {
  const needed = [LM.NOSE, LM.L_SHOULDER, LM.R_SHOULDER, LM.L_WRIST, LM.R_WRIST];
  if (!lm || lm.length < 33 || !visible(lm, ...needed)) {
    return { total: 0, parts: null, valid: false };
  }

  const pCfg = CFG.POSES?.scuba ?? {};
  const shoulderW = dist(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]);
  if (shoulderW === 0) return { total: 0, parts: null, valid: false };

  const shoulderY = (lm[LM.L_SHOULDER].y + lm[LM.R_SHOULDER].y) / 2;

  // 1. เช็กมือจับ/ป้องบริเวณจมูก/ใบหน้า (Nose Hand Check - ระยะยืดหยุ่นครอบคลุมช่วงใบหน้าและหัว)
  const leftDistToNose = dist(lm[LM.L_WRIST], lm[LM.NOSE]) / shoulderW;
  const rightDistToNose = dist(lm[LM.R_WRIST], lm[LM.NOSE]) / shoulderW;

  const maxNoseDist = pCfg.DIST?.NOSE_HAND_MAX ?? 1.20;

  // มือข้างที่อยู่ใกล้จมูกหรือยกขึ้นมาแถวใบหน้า (y น้อยกว่าระดับไหล่)
  const leftAtNose = leftDistToNose <= maxNoseDist || lm[LM.L_WRIST].y <= shoulderY + 0.25 * shoulderW;
  const rightAtNose = rightDistToNose <= maxNoseDist || lm[LM.R_WRIST].y <= shoulderY + 0.25 * shoulderW;

  if (!leftAtNose && !rightAtNose) {
    // ไม่มีมือข้างไหนป้องใบหน้า/จมูกเลย -> คะแนนเป็น 0
    return { total: 0, parts: { noseHand: 0, waveHand: 0 }, swipeDir: "CENTER", valid: true };
  }

  // กำหนดมือปัด (Wave Hand): มือข้างที่ไม่ได้จับจมูก
  let waveWrist = lm[LM.R_WRIST];
  let noseScore = 1.0;

  if (rightAtNose && (!leftAtNose || rightDistToNose < leftDistToNose)) {
    waveWrist = lm[LM.L_WRIST];
  }

  // 2. ตรวจสอบมืออีกข้างปัดไปมา (Side-to-Side Swipe Direction)
  const shoulderCenterX = (lm[LM.L_SHOULDER].x + lm[LM.R_SHOULDER].x) / 2;
  const waveDistX = (waveWrist.x - shoulderCenterX) / shoulderW;

  let swipeDir = "CENTER";
  if (waveDistX < -0.05) {
    swipeDir = "SWIPE_LEFT";
  } else if (waveDistX > 0.05) {
    swipeDir = "SWIPE_RIGHT";
  }

  const total = 100;

  return {
    total,
    parts: { noseHand: noseScore, waveHand: 1.0 },
    swipeDir,
    valid: true,
    debug: { leftDistToNose, rightDistToNose, waveDistX, swipeDir }
  };
}
