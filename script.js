/* =======================
   CORE STATE
======================= */
let rarities = [];
let upgrades = [];

let owned = JSON.parse(localStorage.getItem("owned")) || {};
let rollHistory = JSON.parse(localStorage.getItem("rollHistory")) || [];
let totalRolls = +localStorage.getItem("totalRolls") || 0;
let points = +localStorage.getItem("points") || 0;

/* =======================
   SETTINGS
======================= */
let theme = localStorage.getItem("theme") || "dark";
let volume = +localStorage.getItem("volume") || 25;
let muted = localStorage.getItem("muted") === "true";

let autoEnabled = localStorage.getItem("autoEnabled") === "true";
let fastAutoEnabled = localStorage.getItem("fastAutoEnabled") === "true";

/* =======================
   MUSIC
======================= */
const SONG_COUNT = 21;
let currentMusic = null;
let musicStarted = false;
let lastSong = null;

function randomSong() {
  let n;
  do {
    n = Math.floor(Math.random() * SONG_COUNT) + 1;
  } while (n === lastSong && SONG_COUNT > 1);
  lastSong = n;
  return `song${n}.mp3`;
}

function syncAudio() {
  if (!currentMusic) return;
  currentMusic.volume = volume / 100;
  currentMusic.muted = muted;
}

function playMusic() {
  if (currentMusic) currentMusic.pause();
  currentMusic = new Audio(randomSong());
  syncAudio();
  currentMusic.onended = playMusic;
  currentMusic.play().catch(() => {});
}

function startMusic() {
  if (musicStarted) return;
  musicStarted = true;
  playMusic();
}

/* =======================
   THEME
======================= */
function applyTheme(t) {
  theme = t;
  document.body.dataset.theme = t;
  localStorage.setItem("theme", t);
}

/* =======================
   AUTO ROLL
======================= */
let autoTimer = null;
let rolling = false;

function startAuto(interval) {
  stopAuto();
  autoTimer = setInterval(() => {
    if (!rolling) roll(getExtraRolls());
  }, interval);
}

function stopAuto() {
  clearInterval(autoTimer);
  autoTimer = null;
}

function getExtraRolls() {
  return upgrades.find(u => u.id === "extra1")?.level || 0;
}

/* =======================
   ROLL LOGIC
======================= */
function weightedPick() {
  const total = rarities.reduce((s, r) => s + 1 / r.number, 0);
  let roll = Math.random() * total;
  let acc = 0;
  for (const r of rarities) {
    acc += 1 / r.number;
    if (roll <= acc) return r;
  }
}

function roll(extra = 0) {
  if (!rarities.length) return;
  rolling = true;

  const pulls = Array.from({ length: 1 + extra }, weightedPick);

  setTimeout(() => {
    pulls.forEach(r => {
      owned[r.rarity] = (owned[r.rarity] || 0) + 1;
      rollHistory.push(r.rarity);
      points += r.number / 2;
      totalRolls++;
    });

    rollHistory = rollHistory.slice(-5);
    save();
    updateAll();
    rolling = false;
  }, 300);
}

/* =======================
   UI UPDATES
======================= */
function updateStats() {
  document.getElementById("points").textContent = Math.floor(points);
  document.getElementById("total-rolls").textContent = totalRolls;
}

function updateHistory() {
  document.getElementById("roll-history").innerHTML =
    rollHistory.map(r => `<div>${r}</div>`).join("");
}

function updateOdds() {
  const el = document.getElementById("odds-panel");
  el.innerHTML = rarities.map(r =>
    `<div>${r.rarity}: 1 / ${r.number}</div>`
  ).join("");
}

function updateUpgrades() {
  const el = document.getElementById("upgrades-panel");
  el.innerHTML = "";

  upgrades.forEach(u => {
    const btn = document.createElement("button");
    btn.textContent = `${u.name} (${u.cost})`;
    btn.disabled = points < u.cost;
    btn.onclick = () => {
      if (points < u.cost) return;
      points -= u.cost;
      u.level++;
      u.cost = Math.floor(u.cost * 1.5);
      if (u.max && u.level >= u.max) u.unlocked = true;
      save();
      updateAll();
    };
    el.appendChild(btn);
  });
}

function updateAll() {
  updateStats();
  updateHistory();
  updateOdds();
  updateUpgrades();
}

/* =======================
   SAVE
======================= */
function save() {
  localStorage.setItem("owned", JSON.stringify(owned));
  localStorage.setItem("rollHistory", JSON.stringify(rollHistory));
  localStorage.setItem("points", points);
  localStorage.setItem("totalRolls", totalRolls);
  localStorage.setItem("volume", volume);
  localStorage.setItem("muted", muted);
  localStorage.setItem("autoEnabled", autoEnabled);
  localStorage.setItem("fastAutoEnabled", fastAutoEnabled);
}

/* =======================
   INIT
======================= */
async function init() {
  rarities = await fetch("rarities.json").then(r => r.json());
  upgrades = await fetch("upgrades.json").then(r => r.json());

  applyTheme(theme);

  document.getElementById("volume").value = volume;
  document.getElementById("mute").checked = muted;
  document.getElementById("theme").value = theme;

  updateAll();

  if (autoEnabled && upgrades.find(u => u.id === "autoRoll" && u.unlocked))
    startAuto(1000);

  if (fastAutoEnabled && upgrades.find(u => u.id === "fastAuto" && u.unlocked))
    startAuto(500);
}

init();

/* =======================
   EVENTS
======================= */
document.getElementById("roll").onclick = () => roll(getExtraRolls());

document.getElementById("auto").onclick = () => {
  autoEnabled = !autoEnabled;
  autoEnabled ? startAuto(1000) : stopAuto();
  save();
};

document.getElementById("fast-auto").onclick = () => {
  fastAutoEnabled = !fastAutoEnabled;
  fastAutoEnabled ? startAuto(500) : stopAuto();
  save();
};

document.getElementById("volume").oninput = e => {
  volume = +e.target.value;
  muted = volume === 0;
  syncAudio();
  save();
};

document.getElementById("mute").onchange = e => {
  muted = e.target.checked;
  syncAudio();
  save();
};

document.getElementById("theme").onchange = e => {
  applyTheme(e.target.value);
};

/* Browser audio unlock */
["click", "touchstart", "keydown"].forEach(ev =>
  document.addEventListener(ev, startMusic, { once: true })
);