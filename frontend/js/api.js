// รวมการเรียก backend ทุกเส้นทางไว้ที่เดียว (Auth, Scores, Admin, Share)
const BASE = (() => {
  if (typeof window === "undefined") return "http://localhost:8000/api";
  // If running directly on backend (port 8000) or behind a standard proxy (port 80/443)
  if (window.location.port === "8000" || window.location.port === "") return "/api";
  // If running on a separate frontend dev server (e.g. port 3000, 5500)
  return `${window.location.protocol}//${window.location.hostname}:8000/api`;
})();


function getLocalScores() {
  const data = localStorage.getItem("dd_local_scores");
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveLocalScore(scoreData) {
  const scores = getLocalScores();
  const newId = Date.now();
  const newEntry = {
    id: newId,
    user_id: newId,
    nickname: scoreData.display_name || "Guest",
    pose_key: scoreData.pose_key || "dab",
    score: Number(scoreData.score) || 0,
    dab_count: Number(scoreData.count) || 0,
    count: Number(scoreData.count) || 0,
    created_at: new Date().toISOString().replace("T", " ").substring(0, 19)
  };
  scores.push(newEntry);
  scores.sort((a, b) => b.score - a.score);
  localStorage.setItem("dd_local_scores", JSON.stringify(scores));
  return newEntry;
}

// ── Auth Token & Session Helpers ──
export function getAuthToken() {
  return localStorage.getItem("dd_token");
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem("dd_token", token);
  } else {
    localStorage.removeItem("dd_token");
  }
}

export function getSavedSession() {
  const data = localStorage.getItem("dd_user_session");
  if (!data) return null;
  try {
    const sessionObj = JSON.parse(data);
    if (sessionObj && sessionObj.token) {
      setAuthToken(sessionObj.token);
    }
    return sessionObj;
  } catch {
    return null;
  }
}

export function saveSession(user, token) {
  if (token) setAuthToken(token);
  if (user) {
    const sessionObj = { token: token || getAuthToken(), user };
    localStorage.setItem("dd_user_session", JSON.stringify(sessionObj));
    localStorage.setItem("dd_current_user", JSON.stringify(user));
  }
}

export function clearSession() {
  setAuthToken(null);
  localStorage.removeItem("dd_user_session");
  localStorage.removeItem("dd_current_user");
}

function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

// ── Score APIs ──
export async function fetchTopScores(limit = 20) {
  try {
    const res = await fetch(`${BASE}/scores/top?limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn("⚠️ DB Connection offline, using local storage fallback:", err);
  }
  const scores = getLocalScores();
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, limit);
}

export async function fetchLeaderboards(limit = 10) {
  try {
    const res = await fetch(`${BASE}/scores/leaderboards?limit=${limit}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("⚠️ DB Connection offline, using local storage fallback:", err);
  }

  const scores = getLocalScores();
  const getBoard = (poseFilter = null, sortBy = "score") => {
    let list = scores.slice();
    if (poseFilter) {
      list = list.filter((s) => (s.pose_key || "dab") === poseFilter);
    }
    if (sortBy === "count") {
      list.sort((a, b) => (b.count ?? b.dab_count ?? 0) - (a.count ?? a.dab_count ?? 0));
    } else {
      list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }
    return list.slice(0, limit);
  };

  return {
    overall: getBoard(null, "score"),
    dab: getBoard("dab", "count"),
    six_seven: getBoard("six_seven", "count"),
    scuba: getBoard("scuba", "count"),
  };
}

export async function submitScore(scoreData) {
  const payload = {
    ...scoreData,
    score: Math.round(Number(scoreData.score) || 0)
  };

  // 1. ส่งบันทึกเข้า MySQL Database โดยตรงเป็นหลัก
  try {
    const res = await fetch(`${BASE}/scores/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const dbResult = await res.json();
      console.log("✅ Saved successfully to MySQL Database:", dbResult);
      return dbResult;
    } else {
      console.warn("⚠️ MySQL DB API returned non-OK status:", res.status, await res.text());
    }
  } catch (err) {
    console.warn("⚠️ Cannot connect to MySQL DB Server, using LocalStorage fallback:", err);
  }

  // 2. สำรองลง LocalStorage เฉพาะกรณี DB หลุดหรือเชื่อมต่อไม่ได้เท่านั้น
  const saved = saveLocalScore(payload);
  return {
    id: saved.id,
    user_id: saved.user_id,
    display_name: saved.nickname,
    pose_key: saved.pose_key,
    score: saved.score,
    count: saved.count,
    created_at: saved.created_at
  };
}

// ── Auth APIs ──
export async function loginUser(username, password) {
  const cleanUname = username.trim().toLowerCase();
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: cleanUname, password }),
  });
  
  if (res.ok) {
    const data = await res.json();
    saveSession(data.user, data.access_token);
    return data;
  } else {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Username หรือ Password ไม่ถูกต้อง");
  }
}

export async function registerUser(username, password, displayName, email = null) {
  const cleanUname = username.trim().toLowerCase();
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: cleanUname, password, display_name: displayName, email }),
  });

  if (res.ok) {
    const data = await res.json();
    saveSession(data.user, data.access_token);
    return data;
  } else {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "ไม่สามารถลงทะเบียนได้ (อาจมี Username หรือ Email นี้แล้ว)");
  }
}

export async function fetchCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const res = await fetch(`${BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ใช้ LocalStorage เมื่อไม่ได้รัน Backend Server
  }
  const localUser = localStorage.getItem("dd_current_user");
  return localUser ? JSON.parse(localUser) : { username: "Player", display_name: "Player" };
}

// ── Admin APIs ──
export async function fetchAdminUsers() {
  const res = await fetch(`${BASE}/admin/users`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "ไม่สามารถโหลดรายชื่อผู้ใช้ได้ (ต้องใช้สิทธิ์ Admin)");
  }
  return res.json();
}


export async function updateAdminUserRole(userId, newRole) {
  const res = await fetch(`${BASE}/admin/users/${userId}/role`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ role: newRole }),
  });
  if (!res.ok) throw new Error("เปลี่ยนสิทธิ์ผู้ใช้ไม่สำเร็จ");
  return res.json();
}

export async function deleteAdminUser(userId) {
  const res = await fetch(`${BASE}/admin/users/${userId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("ลบผู้ใช้ไม่สำเร็จ");
  return res.json();
}

export async function deleteAdminScore(scoreId) {
  const res = await fetch(`${BASE}/admin/scores/${scoreId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("ลบคะแนนไม่สำเร็จ");
  return res.json();
}
