// ===================== STATE =====================
let owned = JSON.parse(localStorage.getItem("owned")) || {};
let rollHistory = JSON.parse(localStorage.getItem("rollHistory")) || [];
let loginStreak = parseInt(localStorage.getItem("loginStreak")) || 0;
let totalRolls = parseInt(localStorage.getItem("totalRolls")) || 0;
let lastLogin = localStorage.getItem("lastLogin");
let points = parseFloat(localStorage.getItem("points")) || 0;
let rebirths = parseInt(localStorage.getItem("rebirths")) || 0;
let prestiges = parseInt(localStorage.getItem("prestiges")) || 0;
let upgrades = JSON.parse(localStorage.getItem("upgrades")) || {};
let rarities = [];

// ===================== DOM =====================
const resultDiv = document.getElementById("result");
const rollHistoryDiv = document.getElementById("roll-history");
const oddsPanel = document.getElementById("odds-panel");
const statsPanel = document.getElementById("stats-panel");
const upgradesPanel = document.getElementById("upgrades-panel");
const loginStreakDiv = document.getElementById("login-streak");
const popup = document.getElementById("popup");

const pickBtn = document.getElementById("pick-btn");
const autoRollBtn = document.getElementById("auto-roll-btn");
const fastAutoRollBtn = document.getElementById("fast-auto-roll-btn");
const resetStatsBtn = document.getElementById("reset-stats");

// ===================== STATE CONTROL =====================
let canRoll = true;
let autoRollInterval = null;
let fastAutoRollInterval = null;
let isAutoRolling = false;
let isFastAutoRolling = false;

// ===================== PAGE SWIPE =====================
const pages = document.querySelectorAll(".page");
let currentPage = 0;
function showPage(index){
  pages.forEach((page,i)=> page.style.transform=`translateX(${(i-index)*100}%)`);
  currentPage=index;
}
let touchStartX = null;
pages.forEach(page=>{
  page.addEventListener("touchstart", e => touchStartX = e.touches[0].clientX);
  page.addEventListener("touchend", e=>{
    if(!touchStartX) return;
    let delta = e.changedTouches[0].clientX - touchStartX;
    const SWIPE_THRESHOLD = 80;
    if(delta > SWIPE_THRESHOLD) showPage(Math.max(0,currentPage-1));
    if(delta < -SWIPE_THRESHOLD) showPage(Math.min(pages.length-1,currentPage+1));
    touchStartX = null;
  });
});

// ===================== HELPERS =====================
function showPopup(msg){
  popup.innerText = msg;
  popup.style.display = "block";
  setTimeout(()=> popup.style.display="none", 3000);
}
function saveData(){
  localStorage.setItem("owned", JSON.stringify(owned));
  localStorage.setItem("rollHistory", JSON.stringify(rollHistory.slice(-5)));
  localStorage.setItem("loginStreak", loginStreak);
  localStorage.setItem("totalRolls", totalRolls);
  localStorage.setItem("lastLogin", lastLogin);
  localStorage.setItem("points", points);
  localStorage.setItem("rebirths", rebirths);
  localStorage.setItem("prestiges", prestiges);
  localStorage.setItem("upgrades", JSON.stringify(upgrades));
}
function getExtraRolls(){
  return upgrades.extra1?.purchases||0;
}
function getOfflineMultiplier(){
  return upgrades.offline?.purchases?0.25:0;
}

// ===================== LOGIN STREAK =====================
function updateLoginStreak(){ loginStreakDiv.innerText = `Login Streak: ${loginStreak}`; }
function checkLoginStreak() {
  const today = new Date().toISOString().split("T")[0];
  if(lastLogin===today){ updateLoginStreak(); return; }
  if(lastLogin){
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate()-1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    loginStreak = lastLogin===yesterdayStr?loginStreak+1:loginStreak;
  } else loginStreak=1;
  lastLogin=today;
  saveData();
  updateLoginStreak();
}

// ===================== ROLL =====================
function roll(extra=0){
  if(!canRoll || rarities.length===0) return;
  canRoll=false;
  let rollsToDo = 1 + extra;
  let i=0;

  function singleRoll(){
    let totalInverse = rarities.reduce((sum,r)=>sum+(1/r.number),0);
    let rand=Math.random()*totalInverse;
    let cumulative=0;
    let resultRarity;
    for(let r of rarities){
      cumulative+=1/r.number;
      if(rand<=cumulative){ resultRarity=r; break; }
    }

    const wipe=document.createElement("div");
    wipe.className="wipe-bar";
    resultDiv.appendChild(wipe);

    setTimeout(()=>{
      const resultText = resultDiv.querySelector(".result-text");
      if(resultText) resultText.innerText=resultRarity.rarity;

      owned[resultRarity.rarity]=(owned[resultRarity.rarity]||0)+1;
      rollHistory.push(resultRarity.rarity);
      if(rollHistory.length>5) rollHistory.shift();

      let gained = (resultRarity.number/2);
      let multi = Math.pow(1.5, rebirths)*Math.pow(1.2, prestiges);
      if(upgrades.pointsMultiplier?.purchases) multi *= Math.pow(1+0.01, upgrades.pointsMultiplier.purchases);
      gained *= multi;

      points += gained;
      totalRolls++;

      updateRollHistory();
      updateOdds();
      updateStatsText();
      updateUpgrades();
      updateAutoRollButtons();
      saveData();

      resultDiv.removeChild(wipe);

      i++;
      if(i<rollsToDo) setTimeout(singleRoll, 200);
      else canRoll=true;
    },650);
  }
  singleRoll();
}

// ===================== UPDATE FUNCTIONS =====================
function updateRollHistory(){ rollHistoryDiv.innerHTML = "Last Rolls:<br>" + rollHistory.join("<br>"); }

function getRarityColor(number){
  if(number>=1 && number<=100) return "#aaaaaa";
  if(number>=101 && number<=215) return "#55ff55";
  if(number>=216 && number<=330) return "#55aaff";
  if(number>=331 && number<=400) return "#ffdd55";
  if(number>400) return "#aa55ff";
  return "#ccc";
}

function updateOdds(){
  oddsPanel.innerHTML = "";
  let totalInverse = rarities.reduce((sum,r)=>sum+(1/r.number),0);
  rarities.forEach(r=>{
    const div=document.createElement("div");
    div.classList.add("odds-box");
    const color = getRarityColor(r.number);
    div.style.borderColor = color;
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
  let rebirthMulti = Math.pow(1.5, rebirths).toFixed(2);
  let prestigeMulti = Math.pow(1.2, prestiges).toFixed(2);

  statsPanel.innerHTML=`
    Total Rolls: ${totalRolls}<br>
    Points: ${points.toFixed(1)}<br>
    Rebirths: ${rebirths} (×${rebirthMulti})<br>
    Prestiges: ${prestiges} (×${prestigeMulti})<br>
    Unique Rarities Owned: ${Object.values(owned).filter(v=>v>0).length}<br>
    Last 5 Rolls:<br>${rollHistory.join("<br>")}
  `;
}

// ===================== LOAD UPGRADES =====================
function loadUpgrades(){
  fetch("upgrades.json")
    .then(res => res.json())
    .then(data => {
      data.forEach(u=>{
        if(upgrades[u.id]){
          u.unlocked = upgrades[u.id].unlocked || false;
          u.price = upgrades[u.id].price || u.price;
          u.purchases = upgrades[u.id].purchases || 0;
        } else {
          u.unlocked = false;
          u.purchases = 0;
        }
        upgrades[u.id] = u;
      });
      updateUpgrades();
    });
}

function updateUpgrades(){
  upgradesPanel.innerHTML="";
  Object.values(upgrades).forEach(u=>{
    const div = document.createElement("div");
    div.className="upgrade-box";

    // Reset styling
    div.style.background="#222";
    div.style.border="2px solid #444";
    if(u.unlocked || u.infinite || (u.multiBuy && (!u.maxLevel || (u.purchases||0)<u.maxLevel))){
      div.style.background="#55aa55";
      div.style.border="2px solid #55ff55";
    }

    let displayCost;
    if(u.infinite || u.multiBuy){
      displayCost = `Cost: ${u.price.toFixed(1)} pts | Level: ${u.purchases||0}` + (u.maxLevel?" / "+u.maxLevel:"");
    } else {
      displayCost = u.unlocked?"✅ Unlocked":"Cost: "+u.price.toFixed(1)+" pts";
    }

    div.innerHTML=`<strong>${u.name}</strong><p>${u.description}</p><span>${displayCost}</span>`;

    if(points >= u.price && (!u.unlocked || u.multiBuy || u.infinite) && (!u.maxLevel || (u.purchases||0) < u.maxLevel)){
      div.style.cursor="pointer";
      div.addEventListener("click", ()=>{
        points -= u.price;
        if(u.infinite || u.multiBuy){
          u.purchases = (u.purchases||0)+1;
          u.price *= 1.5;
        } else u.unlocked = true;

        saveData();
        updateUpgrades();
        updateStatsText();
        showPopup(`${u.name} purchased!`);
      });
    }

    upgradesPanel.appendChild(div);
  });
}

// ===================== AUTO-ROLL =====================
function startAutoRoll(speed){
  stopAutoRoll();
  if(speed===1000){ isAutoRolling=true; autoRollInterval=setInterval(()=>{ if(canRoll) roll(getExtraRolls()); },1000);}
  if(speed===500){ isFastAutoRolling=true; fastAutoRollInterval=setInterval(()=>{ if(canRoll) roll(getExtraRolls()); },500);}
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
  autoRollBtn.disabled = !upgrades.autoRoll?.unlocked;
  autoRollBtn.innerText = isAutoRolling?"⏹ Stop Auto Roll":"🎲 Auto Roll";
  fastAutoRollBtn.disabled = !upgrades.fastAuto?.unlocked;
  fastAutoRollBtn.innerText = isFastAutoRolling?"⏹ Stop Fast Auto Roll":"🎲 Fast Auto Roll";
}

// ===================== EVENTS =====================
pickBtn.addEventListener("click", ()=>roll(getExtraRolls()));
autoRollBtn.addEventListener("click",()=> isAutoRolling?stopAutoRoll():startAutoRoll(1000));
fastAutoRollBtn.addEventListener("click",()=> isFastAutoRolling?stopAutoRoll():startAutoRoll(500));

resetStatsBtn.addEventListener("click", async () => {
  rollHistory = [];
  owned = {};
  totalRolls = 0;
  lastLogin = null;
  points = 0;
  rebirths = 0;
  prestiges = 0;
  savedUpgrades = {};

  // Reload upgrades from JSON to reset original prices and styling
  rarities = rarities || []; // keep rarities intact
  const res = await fetch("upgrades.json");
  upgrades = await res.json();

  saveData();
  updateRollHistory();
  updateOdds();
  updateStatsText();
  updateUpgrades();
  updateAutoRollButtons();
  updateLoginStreak();
  showPopup("Stats reset!");
});
// ===================== INIT =====================
function init(){
  fetch("rarities.json")
    .then(res=>res.json())
    .then(data=>{
      rarities = data;
      updateOdds(); updateStatsText(); updateAutoRollButtons();
    });
  loadUpgrades();
  updateRollHistory();
  checkLoginStreak();
  showPage(0);
}
init();

// ===================== MUSIC =====================
const bgMusicTracks = ["song1.mp3","song2.mp3","song3.mp3","song4.mp3"];
const preloadedMusic = bgMusicTracks.map(src=>{
  const audio = new Audio(src);
  audio.loop=true;
  audio.volume=0.25;
  audio.preload="auto";
  return audio;
});
let currentMusic = preloadedMusic[Math.floor(Math.random()*preloadedMusic.length)];
let musicStarted=false;
function startMusic() {
  if(!musicStarted){
    currentMusic.play().catch(err=>{
      console.log("Music blocked, will start on interaction:", err);
    });
    musicStarted=true;
  }
}
["click","touchstart","keydown"].forEach(evt=>document.addEventListener(evt,startMusic,{once:true}));

// ===================== REBIRTH / PRESTIGE =====================
function rebirthAction(){
  if(points<500000) return showPopup("Need 500,000 points to rebirth");
  let max = 1 + (upgrades.rebirthLimit?.purchases||0);
  rebirths += max;
  points=0;
  showPopup(`Rebirthed x${max} (Points ×1.5 each)`);
  saveData(); updateStatsText();
}
function prestigeAction(){
  if(rebirths<1000) return showPopup("Need 1000 rebirths to prestige");
  let max = 1 + (upgrades.prestigeLimit?.purchases||0);
  prestiges += max;
  rebirths=0;
  showPopup(`Prestiged x${max} (Points ×1.2 each)`);
  saveData(); updateStatsText();
}