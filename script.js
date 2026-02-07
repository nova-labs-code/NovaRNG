/* ===============================
   NOVA RNG — FULL SCRIPT
   =============================== */

/* ---------- GLOBAL STATE ---------- */
let rarities = [];
let stats = {};
let history = [];
let owned = {};
let autoRolling = false;
let autoTimer = null;

let currentPage = "page1";

/* ---------- ELEMENTS ---------- */
const page1 = document.getElementById("page1");
const page2 = document.getElementById("page2");

const rollBtn = document.getElementById("pick-btn");
const autoBtn = document.getElementById("auto-roll-btn");
const fastBtn = document.getElementById("fast-auto-roll-btn");

const resultBox = document.getElementById("result");
const resultText = resultBox.querySelector(".result-text");
const historyBox = document.getElementById("roll-history");
const streakBox = document.getElementById("login-streak");
const popup = document.getElementById("popup");

/* ---------- LOAD JSON ---------- */
fetch("rarities.json")
  .then(r => r.json())
  .then(data => {
    rarities = data;
    loadSave();
    restorePage();
    updateUI();
  });

/* ===============================
   SAVE / LOAD
   =============================== */

function loadSave() {
  stats = JSON.parse(localStorage.getItem("nova_stats")) || {};
  history = JSON.parse(localStorage.getItem("nova_history")) || [];
  owned = JSON.parse(localStorage.getItem("nova_owned")) || {};
  currentPage = localStorage.getItem("nova_page") || "page1";
  updateLoginStreak();
}

function saveAll() {
  localStorage.setItem("nova_stats", JSON.stringify(stats));
  localStorage.setItem("nova_history", JSON.stringify(history));
  localStorage.setItem("nova_owned", JSON.stringify(owned));
  localStorage.setItem("nova_page", currentPage);
}

/* ===============================
   PAGE SWIPE SYSTEM
   =============================== */

function restorePage() {
  if (currentPage === "page2") {
    page1.style.transform = "translateX(-100%)";
    page2.style.transform = "translateX(0%)";
  } else {
    page1.style.transform = "translateX(0%)";
    page2.style.transform = "translateX(100%)";
  }
}

function goTo(page) {
  currentPage = page;
  saveAll();

  if (page === "page2") {
    page1.style.transform = "translateX(-100%)";
    page2.style.transform = "translateX(0%)";
  } else {
    page1.style.transform = "translateX(0%)";
    page2.style.transform = "translateX(100%)";
  }
}

/* --- Touch swipe --- */
let startX = 0;

document.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
});

document.addEventListener("touchend", e => {
  const endX = e.changedTouches[0].clientX;
  const delta = endX - startX;

  if (Math.abs(delta) < 50) return;

  if (delta < 0 && currentPage === "page1") goTo("page2");
  if (delta > 0 && currentPage === "page2") goTo("page1");
});

/* ===============================
   LOGIN STREAK
   =============================== */

function updateLoginStreak() {
  const today = new Date().toDateString();
  let last = localStorage.getItem("nova_last");
  let streak = Number(localStorage.getItem("nova_streak")) || 0;

  if (last) {
    const diff =
      (new Date(today) - new Date(last)) / 86400000;

    if (diff === 1) streak++;
    else if (diff > 1) streak = 1;
  } else streak = 1;

  localStorage.setItem("nova_last", today);
  localStorage.setItem("nova_streak", streak);
  streakBox.textContent = `Login Streak: ${streak}`;
}

/* ===============================
   ROLL SYSTEM
   =============================== */

rollBtn.onclick = roll;

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

function updateUI() {
  historyBox.innerHTML = "<b>Last 5 Rolls</b>";
  history.forEach(r => historyBox.innerHTML += `<div>${r}</div>`);

  autoBtn.disabled = totalRolls() < 100;
  fastBtn.disabled = totalRolls() < 1000;
}

function totalRolls() {
  return Object.values(stats).reduce((a, b) => a + b, 0);
}

/* ===============================
   POPUP (BOTTOM RIGHT)
   =============================== */

function showPopup(text) {
  popup.textContent = text;
  popup.style.display = "block";
  clearTimeout(popup._t);
  popup._t = setTimeout(() => popup.style.display = "none", 3000);
}