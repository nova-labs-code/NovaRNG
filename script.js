// -------------------- DATA STORAGE --------------------
let rarities = [];
let owned = JSON.parse(localStorage.getItem("owned")) || {};
let rollHistory = JSON.parse(localStorage.getItem("rollHistory")) || [];
let loginStreak = parseInt(localStorage.getItem("loginStreak")) || 0;
let totalRolls = parseInt(localStorage.getItem("totalRolls")) || 0;
let lastLogin = localStorage.getItem("lastLogin");
let points = parseFloat(localStorage.getItem("points")) || 0;

// -------------------- DOM --------------------
const resultDiv = document.getElementById("result");
const oddsPanel = document.getElementById("odds-panel");
const rollHistoryDiv = document.getElementById("roll-history");
const loginStreakDiv = document.getElementById("login-streak");
const statsPanel = document.getElementById("stats-panel");
const upgradesPanel = document.getElementById("upgrades-panel");
const popup = document.getElementById("popup");

const pickBtn = document.getElementById("pick-btn");
const autoRollBtn = document.getElementById("auto-roll-btn");
const fastAutoRollBtn = document.getElementById("fast-auto-roll-btn");
const resetStatsBtn = document.getElementById("reset-stats");

let canRoll = true;
let autoRollInterval = null;
let fastAutoRollInterval = null;

// -------------------- PAGE SWIPE --------------------
const pages = document.querySelectorAll(".page");
let currentPage = 0;

function showPage(index){
  pages.forEach((page,i)=>{
    page.style.transform = `translateX(${(i-index)*100}%)`;
  });
  currentPage = index;
}

let touchStartX = null;
pages.forEach(page=>{
  page.addEventListener("touchstart", e=>{
    touchStartX = e.touches[0].clientX;
  });
  page.addEventListener("touchend", e=>{
    if(touchStartX === null) return;
    let delta = e.changedTouches[0].clientX - touchStartX;
    if(delta > 80) showPage(Math.max(0, currentPage - 1));
    if(delta < -80) showPage(Math.min(pages.length - 1, currentPage + 1));
    touchStartX = null;
  });
});

// -------------------- HELPERS --------------------
function getRarityColor(n){
  if(n <= 100) return "#aaaaaa";
  if(n <= 250) return "#55ff55";
  if(n <= 400) return "#55aaff";
  if(n <= 800) return "#ffdd55";
  return "#aa55ff";
}

function showPopup(msg){
  popup.textContent = msg;
  popup.style.display = "block";
  setTimeout(()=> popup.style.display = "none", 2500);
}

// ---- SAFE RESULT TEXT (CRASH FIX) ----
function setResultText(text){
  let el = resultDiv.querySelector(".result-text");
  if(!el){
    el = document.createElement("div");
    el.className = "result-text";
    resultDiv.appendChild(el);
  }
  el.textContent = text;
}

// -------------------- SAVE --------------------
function saveData(){
  localStorage.setItem("owned", JSON.stringify(owned));
  localStorage.setItem("rollHistory", JSON.stringify(rollHistory));
  localStorage.setItem("loginStreak", loginStreak);
  localStorage.setItem("totalRolls", totalRolls);
  localStorage.setItem("lastLogin", lastLogin);
  localStorage.setItem("points", points);
}

// -------------------- LOGIN STREAK --------------------
function updateLoginStreak(){
  loginStreakDiv.textContent = `Login Streak: ${loginStreak}`;
}

function checkLoginStreak(){
  const today = new Date().toISOString().split("T")[0];
  if(lastLogin === today) return updateLoginStreak();

  if(lastLogin){
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yStr = y.toISOString().split("T")[0];
    if(lastLogin === yStr) loginStreak++;
  } else {
    loginStreak = 1;
  }

  lastLogin = today;
  saveData();
  updateLoginStreak();
}

// -------------------- ROLL --------------------
function roll(){
  if(!canRoll || rarities.length === 0) return;
  canRoll = false;

  let totalInv = rarities.reduce((s,r)=>s + 1/r.number, 0);
  let rand = Math.random() * totalInv;
  let acc = 0;
  let result = rarities[0];

  for(let r of rarities){
    acc += 1 / r.number;
    if(rand <= acc){ result = r; break; }
  }

  const wipe = document.createElement("div");
  wipe.className = "wipe-bar";
  resultDiv.appendChild(wipe);

  setTimeout(()=>{
    setResultText(result.rarity);

    owned[result.rarity] = (owned[result.rarity] || 0) + 1;
    rollHistory.push(result.rarity);
    if(rollHistory.length > 5) rollHistory.shift();

    points += result.number / 2;
    totalRolls++;

    wipe.remove();
    updateUI();
    saveData();
    canRoll = true;
  }, 650);
}

// -------------------- UI UPDATES --------------------
function updateUI(){
  rollHistoryDiv.innerHTML = "Last Rolls:<br>" + rollHistory.join("<br>");

  statsPanel.innerHTML = `
    <div class="stats-box"><span>Total Rolls</span><span>${totalRolls}</span></div>
    <div class="stats-box"><span>Points</span><span>${points.toFixed(1)}</span></div>
    <div class="stats-box"><span>Unique Rarities</span><span>${Object.keys(owned).length}</span></div>
  `;

  oddsPanel.innerHTML = "";
  let totalInv = rarities.reduce((s,r)=>s + 1/r.number, 0);

  rarities.forEach(r=>{
    const div = document.createElement("div");
    div.className = "odds-box";
    div.style.borderColor = getRarityColor(r.number);
    const chance = ((1/r.number)/totalInv*100).toFixed(2);
    div.innerHTML = `
      <span>${owned[r.rarity] ? r.rarity : "???"}</span>
      <span>${chance}%</span>
    `;
    oddsPanel.appendChild(div);
  });
}

// -------------------- AUTO ROLL --------------------
autoRollBtn.onclick = ()=>{
  if(autoRollInterval){
    clearInterval(autoRollInterval);
    autoRollInterval = null;
    autoRollBtn.textContent = "🎲 Auto Roll";
  } else {
    autoRollInterval = setInterval(()=>{ if(canRoll) roll(); }, 1000);
    autoRollBtn.textContent = "⏹ Stop Auto";
  }
};

fastAutoRollBtn.onclick = ()=>{
  if(fastAutoRollInterval){
    clearInterval(fastAutoRollInterval);
    fastAutoRollInterval = null;
    fastAutoRollBtn.textContent = "🎲 Fast Auto Roll";
  } else {
    fastAutoRollInterval = setInterval(()=>{ if(canRoll) roll(); }, 400);
    fastAutoRollBtn.textContent = "⏹ Stop Fast";
  }
};

pickBtn.onclick = roll;

// -------------------- RESET --------------------
resetStatsBtn.onclick = ()=>{
  owned = {};
  rollHistory = [];
  totalRolls = 0;
  points = 0;
  loginStreak = 0;
  lastLogin = null;
  saveData();
  updateUI();
  updateLoginStreak();
  showPopup("Stats reset");
};

// -------------------- INIT --------------------
function init(){
  fetch("rarities.json")
    .then(r=>r.json())
    .then(data=>{
      rarities = data;
      updateUI();
    });

  checkLoginStreak();
  showPage(0);
}

init();

// -------------------- MUSIC --------------------
const tracks = ["song1.mp3","song2.mp3","song3.mp3","song4.mp3"];
const music = new Audio(tracks[Math.floor(Math.random()*tracks.length)]);
music.loop = true;
music.volume = 0.25;

function startMusic(){
  music.play().catch(()=>{});
}

["click","touchstart","keydown"].forEach(e=>{
  document.addEventListener(e, startMusic, { once:true });
});