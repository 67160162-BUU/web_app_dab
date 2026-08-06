// คณิตศาสตร์ตรวจท่า Brazilian TikTok Dance (Hand + Knee Lift)
import { CFG } from "./config.js";
import { dist, angle, smoothstep, LM } from "./dab.js";

function visible(lm, ...ids) {
  return ids.every((i) => (lm[i]?.visibility ?? 1) >= CFG.MIN_VISIBILITY);
}

export function scoreBrazil(lm) {
  // ต้องการเฉพาะท่อนบนเป็นพื้นฐาน (เพื่อให้เล่นได้ทั้งแบบเห็นขาและครึ่งตัว)
  const needed = [LM.L_SHOULDER, LM.R_SHOULDER, LM.L_WRIST, LM.R_WRIST];
  if (!lm || lm.length < 33 || !visible(lm, ...needed)) {
    return { total: 0, parts: null, valid: false };
  }

  const pCfg = CFG.POSES?.brazil ?? {};
  const shoulderW = dist(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]);
  if (shoulderW === 0) return { total: 0, parts: null, valid: false };

  const hasLegs = visible(lm, LM.L_HIP, LM.R_HIP, LM.L_KNEE, LM.R_KNEE);

  function scoreSide(sideArm, sideLeg) {
    // 1. ชูมือขึ้นสูงกว่าระดับไหล่
    const handRaise = (lm[sideArm.shoulder].y - lm[sideArm.wrist].y) / shoulderW;
    const handRaiseScore = smoothstep(-0.1, (pCfg.DIST?.HAND_RAISE_MIN ?? 0.20) * 2, handRaise);

    // 2. ยกเข่าลอยขึ้นสูง (ถ้าเห็นขาในกล้อง) — ถ้าเห็นเฉพาะครึ่งตัว ให้คะแนนส่วนขาเต็ม 1.0 ทันที
    let kneeLiftScore = 1.0;
    let kneeBendScore = 1.0;
    let kneeHeightDiff = 0;
    let kneeAngle = 90;

    if (hasLegs) {
      kneeHeightDiff = (lm[sideLeg.otherKnee].y - lm[sideLeg.knee].y) / shoulderW;
      kneeLiftScore = smoothstep(-0.05, (pCfg.DIST?.KNEE_LIFT_MIN ?? 0.15) * 2, kneeHeightDiff);

      if (visible(lm, sideLeg.hip, sideLeg.knee, sideLeg.ankle)) {
        kneeAngle = angle(lm[sideLeg.hip], lm[sideLeg.knee], lm[sideLeg.ankle]);
        const kneeMid = pCfg.ANGLE?.KNEE_BEND_MID ?? 90;
        const kneeTol = pCfg.ANGLE?.KNEE_BEND_TOL ?? 40;
        kneeBendScore = 1 - smoothstep(0, kneeTol, Math.abs(kneeAngle - kneeMid));
      }
    }

    const parts = { handRaise: handRaiseScore, kneeLift: kneeLiftScore, kneeBend: kneeBendScore };
    const W = pCfg.WEIGHTS ?? { handRaise: 0.40, kneeLift: 0.40, kneeBend: 0.20 };
    const total = (handRaiseScore * W.handRaise + kneeLiftScore * W.kneeLift + kneeBendScore * W.kneeBend) * 100;
    return { total, parts, debug: { handRaise, kneeHeightDiff, kneeAngle, hasLegs } };
  }

  const leftSide = scoreSide(
    { shoulder: LM.L_SHOULDER, wrist: LM.L_WRIST },
    { hip: LM.L_HIP, knee: LM.L_KNEE, ankle: LM.L_ANKLE, otherKnee: LM.R_KNEE }
  );

  const rightSide = scoreSide(
    { shoulder: LM.R_SHOULDER, wrist: LM.R_WRIST },
    { hip: LM.R_HIP, knee: LM.R_KNEE, ankle: LM.R_ANKLE, otherKnee: LM.L_KNEE }
  );

  const best = leftSide.total >= rightSide.total ? { ...leftSide, side: "left-lift" } : { ...rightSide, side: "right-lift" };
  return { ...best, valid: true };
}
