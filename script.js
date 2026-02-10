// ---------------- VARIABLES ----------------
let rarities = [];
let owned = JSON.parse(localStorage.getItem("owned")) || {};
let rollHistory = JSON.parse(localStorage.getItem("rollHistory")) || [];
let loginStreak = parseInt(localStorage.getItem("loginStreak")) || 0;
let totalRolls = parseInt(localStorage.getItem("totalRolls")) || 0;
let points = parseFloat(localStorage.getItem("points")) || 0;
let lastLogin = localStorage.getItem("lastLogin");

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
let isAutoRolling = false;
let isFastAutoRolling = false;

// ---------------- BASE COSTS ----------------
const baseUpgradeCosts = {
  speed: 300, luck: 500, extraRoll: 700, rarityBoost: 800,
  bonusXP: 500, autoUnlock: 1000, fastAutoUnlock: 2500,
  megaLuck: 3000, speedBoost: 2500, superExtra: 4000,
  ultraLuck: 5000, hyperSpeed: 4500, cooldownReduce1: 1500,
  cooldownReduce2: 2000, cooldownReduce3: 3000
};

// ---------------- PAGE SWIPE ----------------
const pages = document.querySelectorAll(".page");
let currentPage = 0;

function showPage(index){
  pages.forEach((page,i)=>{ page.style.transform=`translateX(${(i-index)*100}%)`; });
  currentPage=index;
}

let touchStartX = null;
pages.forEach(page=>{
  page.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; });
  page.addEventListener("touchend", e => {
    if (!touchStartX) return;
    let delta = e.changedTouches[0].clientX - touchStartX;
    const SWIPE_THRESHOLD = 80;
    if(delta > SWIPE_THRESHOLD) showPage(Math.max(0,currentPage-1));
    if(delta < -SWIPE_THRESHOLD) showPage(Math.min(pages.length-1,currentPage+1));
    touchStartX = null;
  });
});

// ---------------- HELPERS ----------------
function getRarityColor(number){
  if(number>=1 && number<=100) return "#aaaaaa";
  if(number>=101 && number<=215) return "#55ff55";
  if(number>=216 && number<=330) return "#55aaff";
  if(number>=331 && number<=400) return "#ffdd55";
  if(number>400) return "#aa55ff";
  return "#ccc";
}

function showPopup(msg){
  popup.innerText = msg;
  popup.style.display = "block";
  setTimeout(()=>{ popup.style.display="none"; },3000);
}

function saveData(){
  localStorage.setItem("owned", JSON.stringify(owned));
  localStorage.setItem("rollHistory", JSON.stringify(rollHistory.slice(-5)));
  localStorage.setItem("points", points);
  localStorage.setItem("totalRolls", totalRolls);
  localStorage.setItem("lastLogin", lastLogin);
  localStorage.setItem("upgrades", JSON.stringify(upgrades.reduce((acc,u)=>{
    acc[u.id] = {level:u.level, cost:u.cost, unlocked:u.unlocked};
    return acc;
  },{})));
}

// ---------------- LOGIN STREAK ----------------
function updateLoginStreak(){ loginStreakDiv.innerText = `Login Streak: ${loginStreak}`; }

function checkLoginStreak() {
  const today = new Date().toISOString().split("T")[0];
  if(lastLogin===today){ updateLoginStreak(); return; }
  if(lastLogin){
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    loginStreak = lastLogin===yesterdayStr ? loginStreak+1 : 1;
  } else loginStreak=1;
  lastLogin=today;
  saveData();
  updateLoginStreak();
}

// ---------------- ROLL ----------------
function roll(){
  if(!canRoll || rarities.length===0) return;
  canRoll=false;

  const extraRollUpg = upgrades.find(u => u.id === "extraRoll");
  const bonusXPUpg = upgrades.find(u => u.id === "bonusXP");
  const speedUpg = upgrades.find(u => u.id === "speed");
  const cooldownUpgs = upgrades.filter(u => u.id.includes("cooldownReduce"));

  const rollsToDo = 1 + (extraRollUpg ? extraRollUpg.level : 0);

  let results = [];

  for(let i=0; i<rollsToDo; i++){
    totalRolls++;

    let totalInverse = rarities.reduce((sum,r)=>sum+(1/r.number),0);
    let rand = Math.random() * totalInverse;
    let cumulative=0;
    let resultRarity;
    for(let r of rarities){
      cumulative += 1/r.number;
      if(rand <= cumulative){ resultRarity=r; break; }
    }

    let rollPoints = resultRarity.number / 2;
    if(bonusXPUpg) rollPoints *= 1 + 0.05 * bonusXPUpg.level;

    points += rollPoints;

    owned[resultRarity.rarity] = (owned[resultRarity.rarity] || 0) + 1;
    results.push(resultRarity.rarity);
    rollHistory.push(resultRarity.rarity);
  }

  if(rollHistory.length>5) rollHistory = rollHistory.slice(-5);

  // Visual wipe
  const wipe = document.createElement("div");
  wipe.className = "wipe-bar";

  let baseAnim = 650;
  if(speedUpg) baseAnim /= 1 + 0.2 * speedUpg.level;
  cooldownUpgs.forEach(u=>{ baseAnim /= 1 + 0.05 * u.level; });

  wipe.style.animation = `wipeLeftToRight ${baseAnim}ms ease forwards`;
  resultDiv.appendChild(wipe);

  setTimeout(()=>{
    resultDiv.querySelector(".result-text").innerText = results.join(", ");
    updateRollHistory();
    updateOdds();
    updateStatsText();
    updateUpgrades();
    updateAutoRollButtons();
    saveData();
    setTimeout(()=>{ canRoll=true; }, baseAnim);
    resultDiv.removeChild(wipe);
  }, baseAnim);
}

// ---------------- UPDATE FUNCTIONS ----------------
function updateRollHistory(){ rollHistoryDiv.innerHTML = "Last Rolls:<br>" + rollHistory.join("<br>"); }

function updateOdds(){
  oddsPanel.innerHTML = "";
  let totalInverse = rarities.reduce((sum,r)=>sum+(1/r.number),0);
  rarities.forEach(r=>{
    const div=document.createElement("div");
    div.classList.add("odds-box");
    const color=getRarityColor(r.number);
    div.style.borderColor=color;
    const chancePercent = ((1/r.number)/totalInverse*100).toFixed(2);
    const countOwned = owned[r.rarity]||0;
    const displayName = countOwned>0?r.rarity:"???";
    div.innerHTML=`<span>${displayName}</span><span>${countOwned} owned</span><span>${chancePercent}%</span>`;
    div.style.background=countOwned>0?`${color}33`:"#1a1a1a";
    if(countOwned>0) div.classList.add("owned");
    oddsPanel.appendChild(div);
  });
}

function updateStatsText(){
  statsPanel.innerHTML=`
    <div class="stats-box"><strong>Total Rolls:</strong> ${totalRolls}</div>
    <div class="stats-box"><strong>Points:</strong> ${Math.floor(points)}</div>
    <div class="stats-box"><strong>Unique Rarities:</strong> ${Object.values(owned).filter(v=>v>0).length}</div>
    <div class="stats-box"><strong>Last 5 Rolls:</strong><br>${rollHistory.join(", ")}</div>
  `;
}

// ---------------- UPGRADES ----------------
let upgrades = [
  {id:"speed", name:"Roll Speed", description:"Increase auto-roll speed and animation", cost:300, level:0, maxLevel:5, unlocked:false},
  {id:"luck", name:"Luck", description:"Increase chance for rare rolls", cost:500, level:0, maxLevel:10, unlocked:false},
  {id:"extraRoll", name:"Extra Roll", description:"Gain extra roll per click", cost:700, level:0, maxLevel:3, unlocked:false},
  {id:"rarityBoost", name:"Rarity Boost", description:"Increase chance for high-tier rarities", cost:800, level:0, maxLevel:5, unlocked:false},
  {id:"bonusXP", name:"Bonus XP", description:"Extra points per roll", cost:500, level:0, maxLevel:10, unlocked:false},
  {id:"autoUnlock", name:"Auto Roll Unlock", description:"Unlock auto-roll feature", cost:1000, level:0, maxLevel:1, unlocked:false},
  {id:"fastAutoUnlock", name:"Fast Auto Roll Unlock", description:"Unlock fast auto-roll feature", cost:2500, level:0, maxLevel:1, unlocked:false},
  {id:"megaLuck", name:"Mega Luck", description:"Maximize rare chances", cost:3000, level:0, maxLevel:3, unlocked:false},
  {id:"speedBoost", name:"Speed Boost", description:"Further reduce roll animation time", cost:2500, level:0, maxLevel:5, unlocked:false},
  {id:"superExtra", name:"Super Extra Roll", description:"Gain 2 extra rolls per click", cost:4000, level:0, maxLevel:2, unlocked:false},
  {id:"ultraLuck", name:"Ultra Luck", description:"Huge rare chance boost", cost:5000, level:0, maxLevel:2, unlocked:false},
  {id:"hyperSpeed", name:"Hyper Speed", description:"Massively reduce auto-roll delay", cost:4500, level:0, maxLevel:3, unlocked:false},
  {id:"cooldownReduce1", name:"Cooldown Reduction I", description:"Reduce roll animation and auto-roll delay", cost:1500, level:0, maxLevel:3, unlocked:false},
  {id:"cooldownReduce2", name:"Cooldown Reduction II", description:"Reduce roll animation and auto-roll delay further", cost:2000, level:0, maxLevel:2, unlocked:false},
  {id:"cooldownReduce3", name:"Cooldown Reduction III", description:"Maximum cooldown reduction", cost:3000, level:0, maxLevel:1, unlocked:false}
];

// Restore saved upgrades
let savedUpgrades = JSON.parse(localStorage.getItem("upgrades")) || {};
upgrades.forEach(u=>{
  if(savedUpgrades[u.id] !== undefined){
    u.level = savedUpgrades[u.id].level || 0;
    u.cost = savedUpgrades[u.id].cost || u.cost;
    u.unlocked = savedUpgrades[u.id].unlocked || false;
  }
});

// ---------------- UPDATE UPGRADES ----------------
function updateUpgrades(){
  upgradesPanel.innerHTML = "";
  upgrades.forEach(u=>{
    const div = document.createElement("div");
    div.className = "upgrade-box";
    div.style.border = u.unlocked ? "2px solid #55ff55" : "2px solid #444";

    const name = document.createElement("strong");
    name.innerText = u.name;
    div.appendChild(name);

    const desc = document.createElement("p");
    desc.innerText = u.description;
    div.appendChild(desc);

    const levelContainer = document.createElement("div");
    levelContainer.className = "upgrade-level";
    const levelFill = document.createElement("div");
    levelFill.className = "upgrade-level-fill";
    levelFill.style.width = `${(u.level / u.maxLevel) * 100}%`;
    levelContainer.appendChild(levelFill);
    div.appendChild(levelContainer);

    const status = document.createElement("span");
    status.innerText = u.unlocked ? `✅ Unlocked | Level: ${u.level}/${u.maxLevel}` : `Cost: ${Math.floor(u.cost)} pts | Level: ${u.level}/${u.maxLevel}`;
    div.appendChild(status);

    if(!u.unlocked && points >= u.cost && u.level < u.maxLevel){
      div.style.cursor = "pointer";
      div.addEventListener("click", ()=>{
        points -= Math.floor(u.cost);
        u.level++;
        u.cost *= 1.5;
        if(u.level >= u.maxLevel) u.unlocked = true;
        savedUpgrades[u.id] = {level:u.level, cost:u.cost, unlocked:u.unlocked};
        localStorage.setItem("upgrades", JSON.stringify(savedUpgrades));
        saveData();
        showPopup(`${u.name} upgraded to level ${u.level}! Next level: ${Math.floor(u.cost)} pts`);
        updateUpgrades();
        updateStatsText();
        updateAutoRollButtons();
      });
    }

    upgradesPanel.appendChild(div);
  });
}

// ---------------- AUTO-ROLL ----------------
function startAutoRoll(speed){
  stopAutoRoll();

  const speedUpg = upgrades.find(u => u.id === "speed");
  const cooldownUpgs = upgrades.filter(u => u.id.includes("cooldownReduce"));

  let interval = speed;
  if(speedUpg) interval /= 1 + 0.2 * speedUpg.level;
  cooldownUpgs.forEach(u=>{ interval /= 1 + 0.05 * u.level; });

  if(speed === 1000){ 
    isAutoRolling = true; 
    autoRollInterval = setInterval(()=>{ if(canRoll) roll(); }, interval);
  }
  if(speed === 500){ 
    isFastAutoRolling = true; 
    fastAutoRollInterval = setInterval(()=>{ if(canRoll) roll(); }, interval);
  }

  updateAutoRollButtons();
}

function stopAutoRoll(){
  if(autoRollInterval){ clearInterval(autoRollInterval); autoRollInterval=null; }
  if(fastAutoRollInterval){ clearInterval(fastAutoRollInterval); fastAutoRollInterval=null; }
  isAutoRolling=false;
  isFastAutoRolling=false;
  updateAutoRollButtons();
}

function updateAutoRollButtons(){
  const autoUpg = upgrades.find(u=>u.id==="autoUnlock");
  const fastAutoUpg = upgrades.find(u=>u.id==="fastAutoUnlock");

  autoRollBtn.disabled = !autoUpg.unlocked;
  autoRollBtn.innerText = !autoUpg.unlocked ? `Locked` : (isAutoRolling?"⏹ Stop Auto Roll":"🎲 Auto Roll");

  fastAutoRollBtn.disabled = !fastAutoUpg.unlocked;
  fastAutoRollBtn.innerText = !fastAutoUpg.unlocked ? `Locked` : (isFastAutoRolling?"⏹ Stop Fast Auto Roll":"🎲 Fast Auto Roll");
}

// ---------------- EVENTS ----------------
pickBtn.addEventListener("click", roll);

autoRollBtn.addEventListener("click", ()=>{
  const autoUpg = upgrades.find(u=>u.id==="autoUnlock");
  if(!autoUpg.unlocked){ showPopup("Locked! Purchase Auto Roll."); return; }
  isAutoRolling ? stopAutoRoll() : startAutoRoll(1000);
});

fastAutoRollBtn.addEventListener("click", ()=>{
  const fastUpg = upgrades.find(u=>u.id==="fastAutoUnlock");
  if(!fastUpg.unlocked){ showPopup("Locked! Purchase Fast Auto Roll."); return; }
  isFastAutoRolling ? stopAutoRoll() : startAutoRoll(500);
});

resetStatsBtn.addEventListener("click", ()=>{
  rollHistory = [];
  owned = {};
  points = 0;
  totalRolls = 0;
  // keep login streak intact

  upgrades.forEach(u => {
    u.level = 0;
    u.unlocked = false;
    u.cost = baseUpgradeCosts[u.id] || u.cost;
  });

  savedUpgrades = {};
  saveData();
  updateRollHistory(); updateOdds(); updateStatsText(); updateUpgrades(); updateAutoRollButtons(); updateLoginStreak();
  showPopup("Stats reset!");
});

// ---------------- INIT ----------------
function init(){
  fetch("rarities.json")
    .then(res=>res.json())
    .then(data=>{
      rarities=data;
      updateOdds(); updateStatsText(); updateAutoRollButtons(); updateUpgrades();
    });
  updateRollHistory();
  checkLoginStreak();
  showPage(0);
}

init();
// -------------------- BACKGROUND MUSIC --------------------

// List of royalty-free music tracks
const musicTracks = [
  "https://pixabay.com/uploads/game-music-loop-6-144641.mp3",
  "https://assets.mixkit.co/preview/mixkit-dance-with-me-112.mp3",
  "https://assets.mixkit.co/preview/mixkit-summer-fun-115.mp3",
  "https://assets.mixkit.co/preview/mixkit-its-a-cool-thing-110.mp3",
  "https://assets.mixkit.co/preview/mixkit-fun-at-the-farm-104.mp3",
  "https://assets.mixkit.co/preview/mixkit-serene-view-112.mp3"
];

// Create audio element in JS
const bgMusic = new Audio();
bgMusic.loop = true;
bgMusic.volume = 0.25; // adjust volume

// Choose a random track
const randomTrack = musicTracks[Math.floor(Math.random() * musicTracks.length)];
bgMusic.src = randomTrack;

// Try to play automatically
bgMusic.play().catch(() => {
  console.log("Music will start on first user interaction due to browser autoplay rules");
  // Optional: start music on first click if blocked
  const startMusic = () => { bgMusic.play(); document.removeEventListener("click", startMusic); };
  document.addEventListener("click", startMusic);
});