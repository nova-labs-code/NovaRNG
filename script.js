// -------------------- DATA STORAGE --------------------
let rarities = [];
let owned = JSON.parse(localStorage.getItem("owned")) || {};
let rollHistory = JSON.parse(localStorage.getItem("rollHistory")) || [];
let loginStreak = parseInt(localStorage.getItem("loginStreak")) || 0;
let totalRolls = parseInt(localStorage.getItem("totalRolls")) || 0;
let lastLogin = localStorage.getItem("lastLogin");
let points = parseFloat(localStorage.getItem("points")) || 0;

// DOM Elements
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

// -------------------- PAGE SWIPE --------------------
const pages = document.querySelectorAll(".page");
let currentPage = 0;

function showPage(index){
  pages.forEach((page,i)=> page.style.transform=`translateX(${(i-index)*100}%)`);
  currentPage = index;
}

let touchStartX = null;
pages.forEach(page=>{
  page.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; });
  page.addEventListener("touchend", e => {
    if(touchStartX===null) return;
    let delta = e.changedTouches[0].clientX - touchStartX;
    const SWIPE_THRESHOLD = 80;
    if(delta > SWIPE_THRESHOLD) showPage(Math.max(0, currentPage-1));
    if(delta < -SWIPE_THRESHOLD) showPage(Math.min(pages.length-1, currentPage+1));
    touchStartX = null;
  });
});

// -------------------- HELPERS --------------------
function getRarityColor(number){
  if(number >= 1 && number <= 100) return "#aaaaaa";
  if(number >= 101 && number <= 215) return "#55ff55";
  if(number >= 216 && number <= 330) return "#55aaff";
  if(number >= 331 && number <= 400) return "#ffdd55";
  if(number > 400) return "#aa55ff";
  return "#ccc";
}

function showPopup(msg){
  popup.innerText = msg;
  popup.style.display = "block";
  setTimeout(()=> popup.style.display = "none", 3000);
}

function saveData(){
  localStorage.setItem("owned", JSON.stringify(owned));
  localStorage.setItem("rollHistory", JSON.stringify(rollHistory.slice(-5)));
  localStorage.setItem("loginStreak", loginStreak);
  localStorage.setItem("totalRolls", totalRolls);
  localStorage.setItem("lastLogin", lastLogin);
  localStorage.setItem("points", points);
  localStorage.setItem("upgrades", JSON.stringify(upgrades.reduce((acc,u)=>{
    acc[u.id] = { unlocked: u.unlocked, price: u.price };
    return acc;
  }, {})));
}

// -------------------- LOGIN STREAK --------------------
function updateLoginStreak(){ loginStreakDiv.innerText = `Login Streak: ${loginStreak}`; }

function checkLoginStreak() {
  const today = new Date().toISOString().split("T")[0];
  if(lastLogin === today){ updateLoginStreak(); return; }

  if(lastLogin){
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    loginStreak = (lastLogin === yesterdayStr) ? loginStreak + 1 : loginStreak;
  } else {
    loginStreak = 1;
  }
  lastLogin = today;
  saveData();
  updateLoginStreak();
}

// -------------------- ROLL --------------------
function roll(extra=0){
  if(!canRoll || rarities.length === 0) return;
  canRoll = false;

  let rollsToDo = 1 + extra;
  let i = 0;

  function singleRoll(){
    let totalInverse = rarities.reduce((sum,r)=> sum + (1/r.number), 0);
    let rand = Math.random() * totalInverse;
    let cumulative = 0;
    let resultRarity;
    for(let r of rarities){
      cumulative += 1 / r.number;
      if(rand <= cumulative){ resultRarity = r; break; }
    }

    const wipe = document.createElement("div");
    wipe.className = "wipe-bar";
    resultDiv.appendChild(wipe);

    setTimeout(()=>{
      const resultText = resultDiv.querySelector(".result-text");
      if(resultText) resultText.innerText = resultRarity.rarity;

      owned[resultRarity.rarity] = (owned[resultRarity.rarity] || 0) + 1;
      rollHistory.push(resultRarity.rarity);
      if(rollHistory.length > 5) rollHistory.shift();
      points += (resultRarity.number / 2);
      totalRolls++;

      updateRollHistory();
      updateOdds();
      updateStatsText();
      updateUpgrades();
      updateAutoRollButtons();
      saveData();
      resultDiv.removeChild(wipe);

      i++;
      if(i < rollsToDo) setTimeout(singleRoll, 200);
      else canRoll = true;
    }, 650);
  }

  singleRoll();
}

// -------------------- UPDATE FUNCTIONS --------------------
function updateRollHistory(){ rollHistoryDiv.innerHTML = "Last Rolls:<br>" + rollHistory.join("<br>"); }

function updateOdds(){
  oddsPanel.innerHTML = "";
  if(rarities.length === 0) return;

  let totalInverse = rarities.reduce((sum,r)=>sum + (1/r.number),0);
  rarities.forEach(r=>{
    const div = document.createElement("div");
    div.classList.add("odds-box");
    const color = getRarityColor(r.number);
    div.style.borderColor = color;
    const chancePercent = ((1/r.number)/totalInverse*100).toFixed(2);
    const countOwned = owned[r.rarity] || 0;
    const displayName = countOwned > 0 ? r.rarity : "???";
    div.innerHTML = `<span>${displayName}</span><span>${countOwned} owned</span><span>${chancePercent}%</span>`;
    div.style.background = countOwned > 0 ? `${color}33` : "#1a1a1a";
    if(countOwned > 0) div.classList.add("owned");
    oddsPanel.appendChild(div);
  });
}

function updateStatsText(){
  statsPanel.innerHTML=`
    Total Rolls: ${totalRolls}<br>
    Points: ${points.toFixed(1)}<br>
    Unique Rarities Owned: ${Object.values(owned).filter(v=>v>0).length}<br>
    Last 5 Rolls:<br>${rollHistory.join("<br>")}
  `;
}

// -------------------- UPGRADES --------------------
let upgrades=[
  {id:"speed1", name:"Roll Speed +1", description:"Roll faster automatically.", price:50, unlocked:false, type:"speed"},
  {id:"speed2", name:"Roll Speed +2", description:"Even faster auto rolls.", price:200, unlocked:false, type:"speed"},
  {id:"luck1", name:"Luck +5%", description:"Better chance for rare rolls.", price:100, unlocked:false, type:"luck"},
  {id:"luck2", name:"Luck +10%", description:"Maximize rare chances.", price:500, unlocked:false, type:"luck"},
  {id:"extra1", name:"Extra Roll", description:"Gain 1 extra roll each time.", price:30, unlocked:false, type:"extra"},
  {id:"cooldown1", name:"Cooldown -0.1s", description:"Reduce roll cooldown slightly.", price:80, unlocked:false, type:"cooldown"},
  {id:"cooldown2", name:"Cooldown -0.2s", description:"Reduce roll cooldown more.", price:200, unlocked:false, type:"cooldown"}
];

// Load saved upgrades
let savedUpgrades = JSON.parse(localStorage.getItem("upgrades")) || {};
upgrades.forEach(u=>{
  if(savedUpgrades[u.id]){
    u.unlocked = savedUpgrades[u.id].unlocked;
    u.price = savedUpgrades[u.id].price;
  }
});

function updateUpgrades(){
  upgradesPanel.innerHTML = "";
  upgrades.forEach(u=>{
    const div = document.createElement("div");
    div.className = "upgrade-box";
    div.style.background = u.unlocked ? "#55aa55" : "#222";
    div.style.border = u.unlocked ? "2px solid #55ff55" : "2px solid #444";
    div.innerHTML = `<strong>${u.name}</strong><p>${u.description}</p><span>${u.unlocked ? "✅ Unlocked" : "Cost: " + u.price.toFixed(1) + " pts"}</span>`;

    if(!u.unlocked && points >= u.price){
      div.style.cursor = "pointer";
      div.addEventListener("click", ()=>{
        points -= u.price;
        u.unlocked = true;
        u.price *= 1.5;
        savedUpgrades[u.id] = { unlocked:true, price:u.price };
        localStorage.setItem("upgrades", JSON.stringify(savedUpgrades));
        showPopup(`${u.name} unlocked!`);
        updateUpgrades();
        updateStatsText();
      });
    }
    upgradesPanel.appendChild(div);
  });
}

// -------------------- AUTO-ROLL --------------------
function getRollInterval() {
  let base = 1000;
  upgrades.filter(u => u.type === "speed" && u.unlocked).forEach(u=>{
    if(u.id === "speed1") base -= 200;
    if(u.id === "speed2") base -= 300;
  });
  return Math.max(100, base);
}

function getExtraRolls() {
  return upgrades.filter(u => u.type==="extra" && u.unlocked).length;
}

function startAutoRoll(isFast=false){
  stopAutoRoll();
  let interval = isFast ? 500 : getRollInterval();
  if(isFast){
    isFastAutoRolling = true;
    fastAutoRollInterval = setInterval(()=>{ if(canRoll) roll(getExtraRolls()); }, interval);
  } else {
    isAutoRolling = true;
    autoRollInterval = setInterval(()=>{ if(canRoll) roll(getExtraRolls()); }, interval);
  }
  updateAutoRollButtons();
}

function stopAutoRoll(){
  if(autoRollInterval){ clearInterval(autoRollInterval); autoRollInterval = null; }
  if(fastAutoRollInterval){ clearInterval(fastAutoRollInterval); fastAutoRollInterval = null; }
  isAutoRolling = false;
  isFastAutoRolling = false;
  updateAutoRollButtons();
}

function updateAutoRollButtons(){
  autoRollBtn.disabled = !upgrades.find(u=>u.id==="autoUnlock")?.unlocked;
  fastAutoRollBtn.disabled = !upgrades.find(u=>u.id==="fastAutoUnlock")?.unlocked;
  autoRollBtn.innerText = isAutoRolling ? "⏹ Stop Auto Roll" : "🎲 Auto Roll";
  fastAutoRollBtn.innerText = isFastAutoRolling ? "⏹ Stop Fast Auto Roll" : "🎲 Fast Auto Roll";
}

// -------------------- EVENTS --------------------
pickBtn.addEventListener("click", ()=> roll(getExtraRolls()));

autoRollBtn.addEventListener("click", ()=>{
  isAutoRolling ? stopAutoRoll() : startAutoRoll(false);
});

fastAutoRollBtn.addEventListener("click", ()=>{
  isFastAutoRolling ? stopAutoRoll() : startAutoRoll(true);
});

resetStatsBtn.addEventListener("click", ()=>{
  rollHistory = [];
  owned = {};
  totalRolls = 0;
  lastLogin = null;
  points = 0;
  upgrades.forEach(u=>{
    if(!["autoUnlock","fastAutoUnlock"].includes(u.id)){
      u.unlocked = false;
      u.price = u.price / 1.5;
    }
  });
  savedUpgrades = {};
  saveData();
  updateRollHistory(); 
  updateOdds(); 
  updateStatsText(); 
  updateUpgrades(); 
  updateAutoRollButtons(); 
  updateLoginStreak();
  showPopup("Stats reset!");
});

// -------------------- INIT --------------------
function init(){
  fetch("rarities.json")
    .then(res=>res.json())
    .then(data=>{
      rarities = data;
      updateOdds(); 
      updateStatsText(); 
      updateAutoRollButtons(); 
      updateUpgrades();
    })
    .catch(err=>console.error("Failed to load rarities.json:", err));

  updateRollHistory();
  checkLoginStreak();
  showPage(0);
}

init();

// -------------------- BACKGROUND MUSIC --------------------
const bgMusicTracks = ["song1.mp3","song2.mp3","song3.mp3","song4.mp3"];
const preloadedMusic = bgMusicTracks.map(src=>{
  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = 0.25;
  audio.preload = "auto";
  return audio;
});
let currentMusic = preloadedMusic[Math.floor(Math.random()*preloadedMusic.length)];
let musicStarted = false;

function startMusic() {
  if(!musicStarted){
    currentMusic.play().catch(err=>console.log("Music blocked, will start on interaction:", err));
    musicStarted = true;
  }
}

["click","touchstart","keydown"].forEach(evt=>{
  document.addEventListener(evt, startMusic, { once:true });
});