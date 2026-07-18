// รวมการเรียก backend ทุกเส้นทางไว้ที่เดียว
const BASE = "/api";

export async function fetchTopScores(limit = 20) {
  const res = await fetch(`${BASE}/scores/top?limit=${limit}`);
  if (!res.ok) throw new Error(`โหลดอันดับไม่สำเร็จ (${res.status})`);
  return res.json();
}
