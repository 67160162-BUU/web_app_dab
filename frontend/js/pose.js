// หุ้ม MediaPipe Pose Landmarker: โหลดโมเดล, เปิดกล้อง, ลูปตรวจจับ, วาดโครงกระดูก
// ภาพจากกล้องประมวลผลบนเครื่องทั้งหมด ไม่มีการส่งออกไปที่ใดทั้งสิ้น
import { CFG } from "./config.js";
import {
  FilesetResolver,
  PoseLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

let landmarker = null;
let modelPromise = null;

// โหลดโมเดล (เรียกซ้ำได้ คืน promise เดิม) — เริ่ม preload ตั้งแต่หน้า index ได้เลย
export function preloadModel() {
  if (!modelPromise) modelPromise = initModel();
  return modelPromise;
}

async function initModel() {
  const vision = await FilesetResolver.forVisionTasks(CFG.MEDIAPIPE.WASM_URL);
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: CFG.MEDIAPIPE.MODEL_URL, delegate },
    runningMode: "VIDEO",          // โหมด VIDEO เท่านั้น — ใช้ tracking ระหว่างเฟรม
    numPoses: 1,                   // จับคนเดียว (Edge Case: คนเดินผ่านหลัง)
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputSegmentationMasks: false,
  });
  try {
    landmarker = await PoseLandmarker.createFromOptions(vision, options("GPU"));
    return { delegate: "GPU" };
  } catch (e) {
    // บางเครื่อง GPU delegate พัง → ถอยมาใช้ CPU (Edge Case 12)
    console.warn("GPU delegate ใช้ไม่ได้ ใช้ CPU แทน:", e);
    landmarker = await PoseLandmarker.createFromOptions(vision, options("CPU"));
    return { delegate: "CPU" };
  }
}

// เปิดกล้อง — ต้องเรียกหลังผู้ใช้กดปุ่มเท่านั้น (ห้ามเรียกตอนโหลดหน้า)
// ?simulate=NotAllowedError|NotFoundError|NotReadableError ใช้เดโม่ edge case
export async function startCamera(videoEl) {
  const sim = new URLSearchParams(location.search).get("simulate");
  if (sim) {
    const err = new Error(`(จำลอง) ${sim}`);
    err.name = sim;
    throw err;
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  videoEl.srcObject = stream;
  // รอวิดีโอพร้อมจริงก่อน — ถ้า detect ก่อน videoWidth > 0 จะได้ผลว่าง
  await new Promise((resolve) => {
    if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) return resolve();
    videoEl.addEventListener("loadeddata", resolve, { once: true });
  });
  await videoEl.play();
  return stream;
}

export function stopCamera(videoEl) {
  videoEl.srcObject?.getTracks().forEach((t) => t.stop());
  videoEl.srcObject = null;
}

// ลูปตรวจจับ: เรียก onFrame(landmarks|null, fps) ทุกเฟรม จนกว่าจะสั่ง stop
export function startDetectLoop(videoEl, onFrame) {
  let running = true;
  let lastVideoTime = -1;
  let frames = 0, fpsTime = performance.now(), fps = 0;

  function loop() {
    if (!running) return;
    // กัน timestamp ซ้ำ — detectForVideo จะ throw ถ้า timestamp ไม่เพิ่มขึ้น
    if (videoEl.currentTime !== lastVideoTime && videoEl.videoWidth > 0) {
      lastVideoTime = videoEl.currentTime;
      const result = landmarker.detectForVideo(videoEl, performance.now());
      frames++;
      const now = performance.now();
      if (now - fpsTime >= 1000) { fps = frames; frames = 0; fpsTime = now; }
      onFrame(result.landmarks?.[0] ?? null, fps);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  return () => { running = false; };
}

// เส้นเชื่อมโครงกระดูก (เฉพาะช่วงตัวบน+ขา พอสำหรับเกมนี้)
const BONES = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],   // ไหล่ + แขนสองข้าง
  [11, 23], [12, 24], [23, 24],                        // ลำตัว + สะโพก
  [23, 25], [25, 27], [24, 26], [26, 28],              // ขา
];

// วาดโครงกระดูกลง canvas — สี = feedback คะแนนสด (แดง→เหลือง→เขียว)
export function drawSkeleton(canvas, lm, score = 0) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!lm) return;

  const hue = Math.max(0, Math.min(120, (score / 100) * 120)); // 0=แดง 120=เขียว
  ctx.strokeStyle = `hsl(${hue} 90% 55%)`;
  ctx.fillStyle = `hsl(${hue} 90% 65%)`;
  ctx.lineWidth = Math.max(3, canvas.width / 160);

  // พิกัด MediaPipe เป็น 0..1 ต้องคูณขนาด canvas จริงก่อนวาด
  for (const [a, b] of BONES) {
    if ((lm[a].visibility ?? 1) < CFG.MIN_VISIBILITY) continue;
    if ((lm[b].visibility ?? 1) < CFG.MIN_VISIBILITY) continue;
    ctx.beginPath();
    ctx.moveTo(lm[a].x * canvas.width, lm[a].y * canvas.height);
    ctx.lineTo(lm[b].x * canvas.width, lm[b].y * canvas.height);
    ctx.stroke();
  }
  for (const p of lm) {
    if ((p.visibility ?? 1) < CFG.MIN_VISIBILITY) continue;
    ctx.beginPath();
    ctx.arc(p.x * canvas.width, p.y * canvas.height, ctx.lineWidth, 0, Math.PI * 2);
    ctx.fill();
  }
}
