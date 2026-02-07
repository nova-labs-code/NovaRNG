/* ===============================
   Nova RNG – FULL SCRIPT
   =============================== */

let rarities = [];
let stats = {};
let rollHistory = [];
let lastVisit = null;
let loginStreak = 0;

let autoRolling = false;
let autoTimer = null;

// Elements
const pickBtn = document.getElementById("pick-btn");
const autoBtn = document.getElementById("auto-roll-btn");
const fastBtn = document.getElementById("fast-auto-roll-btn");
const resultBox = document.getElementById("result");
const resultText = resultBox.querySelector(".result-text");
const historyBox = document.getElementById("roll-history");
const streakBox = document.getElementById("login-streak");
const popup = document.getElementById("popup");

/* ===============================
   LOAD RARITIES FROM JSON
   =============================== */

fetch("rarities.json")
  .then(r => r.json())
  .then(data => {
    rarities = data;
    init();
  });

/* ===============================
   INIT
   =============================== */

function init() {
  stats = JSON.parse(localStorage.getItem("nova_stats")) || {};
  rollHistory = JSON.parse(localStorage.getItem("nova_history")) || [];
  lastVisit = localStorage.getItem("nova_lastVisit");
  loginStreak = parseInt(localStorage.getItem("nova_streak")) || 0;

  updateLoginStreak();
  renderHistory();
  updateAutoButtons();
}

/* ===============================
   LOGIN STREAK
   =============================== */

function updateLoginStreak() {
  const today = new Date().toDateString();

  if (lastVisit) {
    const diff =
      (new Date(today) - new Date(lastVisit)) /
      (1000 * 60 * 60 * 24);

    if (diff === 1) loginStreak++;
    else if (diff > 1) loginStreak = 1;
  } else {
    loginStreak = 1;
  }

  streakBox.textContent = `Login Streak: ${loginStreak}`;
  localStorage.setItem("nova_streak", loginStreak);
  localStorage.setItem("nova_lastVisit", today);
  lastVisit = today;
}

/* ===============================
   TOTAL ROLLS
   =============================== */

function totalRolls() {
  return Object.values(stats).reduce((a, b) => a + b, 0);
}

/* ===============================
   NOTIFICATION POPUP
   =============================== */

function notify(text) {
  popup.textContent = text;
  popup.style.display = "block";
  clearTimeout(popup._t);
  popup._t = setTimeout(() => {
    popup.style.display = "none";
  }, 3000);
}

/* ===============================
   ROLL LOGIC
   =============================== */

pickBtn.addEventListener("click", roll);
autoBtn.addEventListener("click", () => toggleAuto(autoBtn, 100, 1000));
fastBtn.addEventListener("click", () => toggleAuto(fastBtn, 1000, 500));

function roll() {
  if (pickBtn.disabled) return;
  pickBtn.disabled = true;

  const rarity = pickRarity();
  resultText.textContent = `🎲 ${rarity}`;

  // wipe animation
  const wipe = document.createElement("div");
  wipe.className = "wipe-bar";
  resultBox.appendChild(wipe);

  setTimeout(() => {
    wipe.remove();
    setTimeout(() => (pickBtn.disabled = false), 500);
  }, 650);

  // save stats
  stats[rarity] = (stats[rarity] || 0) + 1;
  rollHistory.unshift(rarity);
  if (rollHistory.length > 5) rollHistory.pop();

  localStorage.setItem("nova_stats", JSON.stringify(stats));
  localStorage.setItem("nova_history", JSON.stringify(rollHistory));

  renderHistory();
  updateAutoButtons();
}

/* ===============================
   WEIGHTED RNG
   =============================== */

function pickRarity() {
  const totalWeight = rarities.reduce((s, r) => s + 1 / r.number, 0);
  let rand = Math.random() * totalWeight;
  let acc = 0;

  for (let r of rarities) {
    acc += 1 / r.number;
    if (rand <= acc) return r.rarity;
  }
  return rarities[rarities.length - 1].rarity;
}

/* ===============================
   ROLL HISTORY
   =============================== */

function renderHistory() {
  historyBox.innerHTML = "<strong>Last 5 Rolls</strong><br>";
  rollHistory.forEach(r => {
    historyBox.innerHTML += `<div>${r}</div>`;
  });
}

/* ===============================
   AUTO ROLL SYSTEM
   =============================== */

function updateAutoButtons() {
  const total = totalRolls();

  autoBtn.disabled = total < 100;
  fastBtn.disabled = total < 1000;

  autoBtn.dataset.cooldown = 1000;
  fastBtn.dataset.cooldown = 500;
}

function toggleAuto(button, requirement, cooldown) {
  if (button.disabled) {
    notify(`Need ${requirement - totalRolls()} more rolls`);
    return;
  }

  if (autoRolling) {
    autoRolling = false;
    clearTimeout(autoTimer);
    notify("Auto Roll stopped");
    return;
  }

  autoRolling = true;
  notify(button === fastBtn ? "Fast Auto Roll started" : "Auto Roll started");
  autoLoop(cooldown);
}

function autoLoop(cooldown) {
  if (!autoRolling) return;
  pickBtn.click();
  autoTimer = setTimeout(() => autoLoop(cooldown), cooldown + 650);
}

/* ===============================
   SPACEBAR SUPPORT
   =============================== */

document.addEventListener("keydown", e => {
  if (e.code === "Space") roll();
});