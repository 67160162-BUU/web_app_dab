// ศูนย์รวมและดัชนีลงทะเบียนท่าทางทั้งหมด (Pose Registry Index)
import { CFG } from "./config.js";
import { scoreDab } from "./dab.js";
import { scoreSixSeven } from "./six_seven.js";
import { scoreScuba } from "./scuba.js";
import { scoreBrazil } from "./brazil.js";

export { LM } from "./dab.js";
export { scoreDab } from "./dab.js";
export { scoreSixSeven } from "./six_seven.js";
export { scoreScuba } from "./scuba.js";
export { scoreBrazil } from "./brazil.js";

// ── Evaluator กลางสำหรับประเมินคะแนนตามชื่อท่า ──
export function evaluatePose(poseKey, lm) {
  switch (poseKey) {
    case "six_seven":
      return scoreSixSeven(lm);
    case "scuba":
      return scoreScuba(lm);
    case "brazil":
      return scoreBrazil(lm);
    case "dab":
    default:
      return scoreDab(lm);
  }
}

// ── State Machine Counter กลางตามชื่อท่า ──
export function createPoseCounter(poseKey = "dab") {
  // ── พิเศษสำหรับ Six-Seven: นับเมื่อมีการสลับมือซ้าย<->ขวา ทันที ──
  if (poseKey === "six_seven") {
    let activeSide = null;
    let count = 0;

    return {
      reset() {
        activeSide = null;
        count = 0;
      },
      update(score, result) {
        if (!result || !result.valid || score < 30) {
          return { counted: false, count, state: "IDLE" };
        }

        const currentSide = result.side === "left-hand-raised" ? "LEFT_UP" : "RIGHT_UP";

        if (activeSide !== currentSide) {
          activeSide = currentSide;
          count++;
          return { counted: true, count, state: activeSide };
        }

        return { counted: false, count, state: activeSide };
      },
      get count() { return count; },
    };
  }

  // ── มาตรฐานสำหรับ Dab, Scuba, Brazil ──
  const pCfg = CFG.POSES?.[poseKey] ?? CFG.POSES?.dab ?? { enterScore: 70, exitScore: 40 };
  let state = "IDLE";
  let enterStreak = 0, exitStreak = 0, count = 0;

  return {
    reset() {
      state = "IDLE";
      enterStreak = 0;
      exitStreak = 0;
      count = 0;
    },
    update(score) {
      if (state === "IDLE") {
        enterStreak = score >= pCfg.enterScore ? enterStreak + 1 : 0;
        if (enterStreak >= CFG.ENTER_FRAMES) {
          state = "IN_POSE"; count++; enterStreak = 0;
          return { counted: true, count, state };
        }
      } else {
        exitStreak = score < pCfg.exitScore ? exitStreak + 1 : 0;
        if (exitStreak >= CFG.EXIT_FRAMES) { state = "IDLE"; exitStreak = 0; }
      }
      return { counted: false, count, state };
    },
    get count() { return count; },
  };
}
