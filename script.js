/* ===============================
   NOVA RNG — MULTI PAGE SWIPE
   =============================== */

let rarities = [];
let stats = {};
let history = [];
let owned = {};

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

/* ===============================
   LOAD DATA
   =============================== */

fetch("rarities.json")
  .then(r => r.json())
  .then(data => {
    rarities = data;
    loadSave();
    restorePages();
    updateUI();
  });

/* ===============================
   SAVE / LOAD
   =============================== */

function loadSave() {
  stats = JSON.parse(localStorage.getItem("nova_stats")) || {};
  history = JSON.parse(localStorage.getItem("nova_history")) || [];
  owned = JSON.parse(localStorage.getItem("nova_owned")) || {};
  currentPageIndex = Number(localStorage.getItem("nova_pageIndex")) || 0;
  updateLoginStreak();
}

function saveAll() {
  localStorage.setItem("nova_stats", JSON.stringify(stats));
  localStorage.setItem("nova_history", JSON.stringify(history));
  localStorage.setItem("nova_owned", JSON.stringify(owned));
  localStorage.setItem("nova_pageIndex", currentPageIndex);
}

/* ===============================
   PAGE POSITIONING
   =============================== */

function restorePages() {
  pages.forEach((page, i) => {
    page.style.transform = `translateX(${(i - currentPageIndex) * 100}%)`;
  });
}

function goToPage(index) {
  if (index < 0 || index >= pages.length) return;
  currentPageIndex = index;
  saveAll();
  restorePages();
}

/* ===============================
   SWIPE HANDLING
   =============================== */

let startX = 0;
let dragging = false;

document.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
  dragging = true;
});

document.addEventListener("touchend", e => {
  if (!dragging) return;
  dragging = false;

  const endX = e.changedTouches[0].clientX;
  const delta = endX - startX;

  if (Math.abs(delta) < 60) return;

  if (delta < 0) goToPage(currentPageIndex + 1);
  if (delta > 0) goToPage(currentPageIndex - 1);
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
   RNG LOGIC
   =============================== */

rollBtn?.addEventListener("click", roll);

function roll() {
  if (rollBtn.disabled) return;
  rollBtn.disabled = true;

  const rarity = weightedPick();

  resultText.textContent = rarity;
  owned[rarity] = true;
  stats[rarity] = (stats[rarity] || 0) + 1;

  history.unshift(rarity);
  if (history.length > 5) history.pop();

  saveAll();
  updateUI();

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
   AUTO ROLL
   =============================== */

autoBtn?.addEventListener("click", () => toggleAuto(100, 1000));
fastBtn?.addEventListener("click", () => toggleAuto(1000, 500));

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
   UI
   =============================== */

function updateUI() {
  if (historyBox) {
    historyBox.innerHTML = "<b>Last 5 Rolls</b>";
    history.forEach(r => historyBox.innerHTML += `<div>${r}</div>`);
  }

  autoBtn.disabled = totalRolls() < 100;
  fastBtn.disabled = totalRolls() < 1000;
}

function totalRolls() {
  return Object.values(stats).reduce((a, b) => a + b, 0);
}

/* ===============================
   POPUP
   =============================== */

function showPopup(text) {
  popup.textContent = text;
  popup.style.display = "block";
  clearTimeout(popup._t);
  popup._t = setTimeout(() => popup.style.display = "none", 3000);
}