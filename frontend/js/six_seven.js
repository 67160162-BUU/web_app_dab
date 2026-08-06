// คณิตศาสตร์ตรวจท่า Six-Seven (หงายมือเท่านั้น + ยกขึ้นระดับลำตัว)
import { CFG } from "./config.js";
import { dist, smoothstep, LM } from "./dab.js";

function visible(lm, ...ids) {
  return ids.every((i) => (lm[i]?.visibility ?? 1) >= CFG.MIN_VISIBILITY);
}

export function scoreSixSeven(lm) {
  // บังคับเฉพาะพิกัดหลัก (ไหล่ และ ข้อมือ)
  const needed = [LM.L_SHOULDER, LM.R_SHOULDER, LM.L_WRIST, LM.R_WRIST];

  if (!lm || lm.length < 33 || !visible(lm, ...needed)) {
    return { total: 0, parts: null, valid: false };
  }

  const pCfg = CFG.POSES?.six_seven ?? {};
  const shoulderW = dist(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]);
  if (shoulderW === 0) return { total: 0, parts: null, valid: false };

  const shoulderY = (lm[LM.L_SHOULDER].y + lm[LM.R_SHOULDER].y) / 2;

  // ระยะมือเทียบกับระดับไหล่ (ยิ่งน้อย = มือยิ่งสูง)
  const leftDistFromShoulder = (lm[LM.L_WRIST].y - shoulderY) / shoulderW;
  const rightDistFromShoulder = (lm[LM.R_WRIST].y - shoulderY) / shoulderW;

  const stomachOffset = pCfg.DIST?.STOMACH_OFFSET ?? 0.85;
  const shoulderOffset = pCfg.DIST?.SHOULDER_OFFSET ?? 0.55;

  // ── ตรวจจับการหงายมือแบบปลอดภัย (Safe Palm UP Check) ──
  // ตัดคะแนนเป็น 0 เฉพาะเมื่อตั้งใจคว่ำมือชัดเจน (นิ้วก้อยลอยสูงกว่านิ้วชี้เกิน 0.03 เท่าความกว้างไหล่)
  function checkPalmUp(wristId, indexId, pinkyId) {
    const index = lm[indexId];
    const pinky = lm[pinkyId];

    // ถ้าไม่มีพิกัดนิ้วในเฟรมนั้น ให้ผ่านเพื่อไม่ให้คะแนนค้างเป็น 0
    if (!index || !pinky) return true;

    // ถ้าคว่ำมือชัดเจน: pinky.y จะน้อยกว่า index.y (นิ้วก้อยลอยสูงกว่านิ้วชี้)
    const isPalmDown = (pinky.y < index.y - 0.03 * shoulderW);

    return !isPalmDown;
  }

  const isLeftPalmUp = checkPalmUp(LM.L_WRIST, LM.L_INDEX, LM.L_PINKY);
  const isRightPalmUp = checkPalmUp(LM.R_WRIST, LM.R_INDEX, LM.R_PINKY);

  // คำนวณคะแนน: ถ้าตั้งใจคว่ำมือ คะแนนข้างนั้นจะเป็น 0 ทันที
  let leftHandScore = smoothstep(stomachOffset, shoulderOffset, leftDistFromShoulder);
  if (!isLeftPalmUp) leftHandScore = 0;

  let rightHandScore = smoothstep(stomachOffset, shoulderOffset, rightDistFromShoulder);
  if (!isRightPalmUp) rightHandScore = 0;

  const maxHandScore = Math.max(leftHandScore, rightHandScore);
  const side = leftHandScore >= rightHandScore ? "left-hand-raised" : "right-hand-raised";

  const total = maxHandScore * 100;
  const parts = { leftHand: leftHandScore, rightHand: rightHandScore };

  return {
    total,
    parts,
    side,
    valid: true,
    debug: {
      leftDistFromShoulder,
      rightDistFromShoulder,
      isLeftPalmUp,
      isRightPalmUp
    }
  };
}
