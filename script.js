/* ===============================
   NOVA RNG — FULL RESPONSIVE
   =============================== */

let rarities = [];
let stats = {};
let history = [];
let owned = {};
let dailyStats = {};

let autoRolling = false;
let autoTimer = null;

/* ---------- PAGE SYSTEM ---------- */
const pages = Array.from(document.querySelectorAll(".page"));
let currentPageIndex = 0;

/* ---------- ELEMENTS ---------- */
const rollBtn = document.getElementById("pick-btn");
const autoBtn = document.getElementById("auto-roll-btn");
const fastBtn = document.getElementById("fast-auto-roll-btn");

const resultBox = document.getElementById("result");
const resultText = resultBox.querySelector(".result-text");
const historyBox = document.getElementById("roll-history");
const streakBox = document.getElementById("login-streak");
const popup = document.getElementById("popup");

const oddsPanel = document.getElementById("odds-panel");
const statsPanel = document.getElementById("stats-panel");
const statsCanvas = document.getElementById("stats-graph");
const resetStatsBtn = document.getElementById("reset-stats");

/* ===============================
   LOAD RARITIES
   =============================== */

fetch("rarities.json")
  .then(r => r.json())
  .then(data => {
    rarities = data;
    loadSave();
    restorePages();
    updateAll();
  });

/* ===============================
   SAVE / LOAD
   =============================== */

function loadSave() {
  stats = JSON.parse(localStorage.getItem("nova_stats")) || {};
  history = JSON.parse(localStorage.getItem("nova_history")) || [];
  owned = JSON.parse(localStorage.getItem("nova_owned")) || {};
  dailyStats = JSON.parse(localStorage.getItem("nova_daily")) || {};
  currentPageIndex = Number(localStorage.getItem("nova_pageIndex")) || 0;
  updateLoginStreak();
}

function saveAll() {
  localStorage.setItem("nova_stats", JSON.stringify(stats));
  localStorage.setItem("nova_history", JSON.stringify(history));
  localStorage.setItem("nova_owned", JSON.stringify(owned));
  localStorage.setItem("nova_daily", JSON.stringify(dailyStats));
  localStorage.setItem("nova_pageIndex", currentPageIndex);
}

/* ===============================
   PAGE SWIPING
   =============================== */

function restorePages() {
  pages.forEach((p, i) => {
    p.style.transform = `translateX(${(i - currentPageIndex) * 100}%)`;
  });
}

function goToPage(i) {
  if (i < 0 || i >= pages.length) return;
  currentPageIndex = i;
  saveAll();
  restorePages();
}

let startX = 0;
document.addEventListener("touchstart", e => startX = e.touches[0].clientX);
document.addEventListener("touchend", e => {
  const dx = e.changedTouches[0].clientX - startX;
  if (Math.abs(dx) < 60) return;
  if (dx < 0) goToPage(currentPageIndex + 1);
  if (dx > 0) goToPage(currentPageIndex - 1);
});

/* ===============================
   LOGIN STREAK
   =============================== */

function updateLoginStreak() {
  const today = new Date().toDateString();
  let last = localStorage.getItem("nova_last");
  let streak = Number(localStorage.getItem("nova_streak")) || 0;

  if (last) {
    const diff = (new Date(today) - new Date(last)) / 86400000;
    if (diff === 1) streak++;
    else if (diff > 1) streak = 1;
  } else streak = 1;

  localStorage.setItem("nova_last", today);
  localStorage.setItem("nova_streak", streak);
  streakBox.textContent = `Login Streak: ${streak}`;
}

/* ===============================
   ROLLING
   =============================== */

rollBtn.addEventListener("click", roll);

function roll() {
  if (rollBtn.disabled) return;
  rollBtn.disabled = true;

  const rarity = weightedPick();
  resultText.textContent = rarity;

  owned[rarity] = true;
  stats[rarity] = (stats[rarity] || 0) + 1;

  history.unshift(rarity);
  if (history.length > 5) history.pop();

  trackDaily(rarity);
  saveAll();
  updateAll();

  const wipe = document.createElement("div");
  wipe.className = "wipe-bar";
  resultBox.appendChild(wipe);

  setTimeout(() => {
    wipe.remove();
    setTimeout(() => rollBtn.disabled = false, 500);
  }, 650);
}

/* ===============================
   WEIGHTED RNG
   =============================== */

function weightedPick() {
  const total = rarities.reduce((s, r) => s + 1 / r.number, 0);
  let rand = Math.random() * total;
  let acc = 0;

  for (let r of rarities) {
    acc += 1 / r.number;
    if (rand <= acc) return r.rarity;
  }
  return rarities[rarities.length - 1].rarity;
}

/* ===============================
   DAILY STATS (7 DAYS)
   =============================== */

function trackDaily(rarity) {
  const today = new Date().toISOString().slice(0, 10);
  if (!dailyStats[today]) dailyStats[today] = 0;
  const r = rarities.find(x => x.rarity === rarity);
  dailyStats[today] += r.number;

  const days = Object.keys(dailyStats).sort().slice(-7);
  dailyStats = Object.fromEntries(days.map(d => [d, dailyStats[d]]));
}

/* ===============================
   AUTO ROLL
   =============================== */

autoBtn.onclick = () => toggleAuto(100, 1000);
fastBtn.onclick = () => toggleAuto(1000, 500);

function toggleAuto(req, cd) {
  if (totalRolls() < req) {
    showPopup(`Need ${req - totalRolls()} more rolls`);
    return;
  }

  autoRolling = !autoRolling;
  if (!autoRolling) {
    clearTimeout(autoTimer);
    showPopup("Auto Roll stopped");
    return;
  }

  showPopup("Auto Roll started");
  autoLoop(cd);
}

function autoLoop(cd) {
  if (!autoRolling) return;
  roll();
  autoTimer = setTimeout(() => autoLoop(cd), cd + 650);
}

/* ===============================
   UI UPDATES
   =============================== */

function updateAll() {
  updateHistory();
  updateOdds();
  updateStats();
  updateAutoButtons();
}

function updateHistory() {
  historyBox.innerHTML = "<b>Last 5 Rolls</b>";
  history.forEach(r => historyBox.innerHTML += `<div>${r}</div>`);
}

function updateOdds() {
  oddsPanel.innerHTML = "";
  rarities.forEach(r => {
    const div = document.createElement("div");
    if (owned[r.rarity]) {
      div.textContent = `${r.rarity} — 1 / ${r.number}`;
      div.style.color = "#55ff88";
    } else {
      div.textContent = "??? Odds";
      div.style.color = "#aaa";
    }
    oddsPanel.appendChild(div);
  });
}

function updateStats() {
  statsPanel.innerHTML = `<b>Total Rolls:</b> ${totalRolls()}<br><br>`;
  Object.entries(stats).forEach(([k, v]) => {
    statsPanel.innerHTML += `${k}: ${v}<br>`;
  });
  drawGraph();
}

function updateAutoButtons() {
  // Auto Roll
  if (totalRolls() < 100) {
    autoBtn.disabled = true;
    autoBtn.textContent = `🎲 Locked — ${100 - totalRolls()} rolls away`;
  } else {
    autoBtn.disabled = false;
    autoBtn.textContent = "🎲 Auto Roll";
  }

  // Fast Auto Roll
  if (totalRolls() < 1000) {
    fastBtn.disabled = true;
    fastBtn.textContent = `🎲 Locked — ${1000 - totalRolls()} rolls away`;
  } else {
    fastBtn.disabled = false;
    fastBtn.textContent = "🎲 Fast Auto Roll";
  }
}

function totalRolls() {
  return Object.values(stats).reduce((a, b) => a + b, 0);
}

/* ===============================
   GRAPH (CANVAS)
   =============================== */

function drawGraph() {
  const ctx = statsCanvas.getContext("2d");
  ctx.clearRect(0, 0, statsCanvas.width, statsCanvas.height);

  const values = Object.values(dailyStats);
  if (!values.length) return;

  const max = Math.max(...values);
  const barW = statsCanvas.width / values.length;

  Object.values(dailyStats).forEach((v, i) => {
    const h = (v / max) * statsCanvas.height;
    ctx.fillStyle = "#ffdd55";
    ctx.fillRect(i * barW, statsCanvas.height - h, barW - 6, h);
  });
}

/* ===============================
   RESET STATS
   =============================== */

resetStatsBtn.onclick = () => {
  if (!confirm("Reset all stats?")) return;
  stats = {};
  history = [];
  owned = {};
  dailyStats = {};
  saveAll();
  updateAll();
};

/* ===============================
   POPUP
   =============================== */

function showPopup(text) {
  popup.textContent = text;
  popup.style.display = "block";
  clearTimeout(popup._t);
  popup._t = setTimeout(() => popup.style.display = "none", 3000);
}