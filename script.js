// -----------------------------
// Global Variables
// -----------------------------
let rarities = [];
let owned = JSON.parse(localStorage.getItem("owned")) || {};
let rollHistory = JSON.parse(localStorage.getItem("rollHistory")) || [];
let loginStreak = parseInt(localStorage.getItem("loginStreak")) || 0;

// DOM Elements
const resultDiv = document.getElementById("result");
const oddsPanel = document.getElementById("odds-panel");
const rollHistoryDiv = document.getElementById("roll-history");
const loginStreakDiv = document.getElementById("login-streak");
const popup = document.getElementById("popup");

const pickBtn = document.getElementById("pick-btn");
let canRoll = true;

// -----------------------------
// Helper Functions
// -----------------------------
function getRarityColor(number) {
  if (number >= 1 && number <= 100) return "#aaaaaa";       // Common
  if (number >= 101 && number <= 215) return "#55ff55";    // Uncommon
  if (number >= 216 && number <= 330) return "#55aaff";    // Rare
  if (number >= 331 && number <= 400) return "#ffdd55";    // Legendary
  if (number > 400) return "#aa55ff";                      // Mythical
  return "#ccc";
}

function showPopup(message) {
  popup.innerText = message;
  popup.style.display = "block";
  setTimeout(() => { popup.style.display = "none"; }, 3000);
}

function saveData() {
  localStorage.setItem("owned", JSON.stringify(owned));
  localStorage.setItem("rollHistory", JSON.stringify(rollHistory.slice(-5)));
  localStorage.setItem("loginStreak", loginStreak);
}

// -----------------------------
// Roll Function
// -----------------------------
function roll() {
  if (!canRoll || rarities.length === 0) return;

  canRoll = false;

  // Weighted roll based on 'number'
  const totalWeight = rarities.reduce((sum, r) => sum + r.number, 0);
  let rand = Math.floor(Math.random() * totalWeight) + 1;
  let cumulative = 0;
  let resultRarity;

  for (let r of rarities) {
    cumulative += r.number;
    if (rand <= cumulative) {
      resultRarity = r;
      break;
    }
  }

  // Animate roll
  const wipe = document.createElement("div");
  wipe.className = "wipe-bar";
  resultDiv.appendChild(wipe);

  setTimeout(() => {
    // Show result text
    resultDiv.querySelector(".result-text").innerText = resultRarity.rarity;

    // Mark as owned
    owned[resultRarity.rarity] = true;

    // Update roll history
    rollHistory.push(resultRarity.rarity);
    if (rollHistory.length > 5) rollHistory.shift();

    // Update UI
    updateRollHistory();
    updateOdds();
    saveData();

    // Cooldown after animation
    setTimeout(() => { canRoll = true; }, 500);
    resultDiv.removeChild(wipe);
  }, 650);
}

// -----------------------------
// Update Functions
// -----------------------------
function updateRollHistory() {
  rollHistoryDiv.innerHTML = "Last Rolls:<br>" + rollHistory.join("<br>");
}

function updateOdds() {
  oddsPanel.innerHTML = "";

  rarities.forEach(r => {
    const div = document.createElement("div");
    div.classList.add("odds-box");

    const color = getRarityColor(r.number);

    // Owned rarities have semi-transparent background + name
    if (owned[r.rarity]) {
      div.classList.add("owned");
      div.style.borderColor = color;
      div.style.background = `${color}33`;
    } else {
      // Locked rarities still show colored border based on their range
      div.style.borderColor = color;
      div.style.background = "#1a1a1a";
    }

    div.innerHTML = `
      <span>${owned[r.rarity] ? r.rarity : "???"}</span>
      <span>${owned[r.rarity] ? `1 / ${r.number}` : "??? Odds"}</span>
    `;

    oddsPanel.appendChild(div);
  });
}

function updateLoginStreak() {
  loginStreakDiv.innerText = `Login Streak: ${loginStreak}`;
}

// -----------------------------
// Event Listeners
// -----------------------------
pickBtn.addEventListener("click", roll);

// -----------------------------
// Initialize
// -----------------------------
function init() {
  // Load rarities from JSON
  fetch("rarities.json")
    .then(res => res.json())
    .then(data => {
      rarities = data;
      updateOdds();        // Generate all boxes at startup
    });

  updateRollHistory();
  updateLoginStreak();
}

init();