/* ======================================================
   DATA
====================================================== */
let rarities = [];
let upgrades = [];

let owned = JSON.parse(localStorage.getItem("owned")) || {};
let rollHistory = JSON.parse(localStorage.getItem("rollHistory")) || [];
let loginStreak = Number(localStorage.getItem("loginStreak")) || 0;
let lastLogin = localStorage.getItem("lastLogin");
let totalRolls = Number(localStorage.getItem("totalRolls")) || 0;
let points = Number(localStorage.getItem("points")) || 0;
let rebirths = Number(localStorage.getItem("rebirths")) || 0;
let prestiges = Number(localStorage.getItem("prestiges")) || 0;

/* ======================================================
   SETTINGS STATE
====================================================== */
let currentTheme = localStorage.getItem("theme") || "dark";
let currentVolume = Number(localStorage.getItem("volume")) || 50; // 0–100
let isMuted = localStorage.getItem("muted") === "true";

let autoRollInterval = null;
let isAutoRolling = false;
let isFastAutoRolling = false;
let canRoll = true;

/* ======================================================
   DOM
====================================================== */
const pages = document.querySelectorAll(".page");
const resultDiv = document.getElementById("result");
const rollHistoryDiv = document.getElementById("roll-history");
const statsPanel = document.getElementById("stats-panel");
const oddsPanel = document.getElementById("odds-panel");
const upgradesPanel = document.getElementById("upgrades-panel");
const popup = document.getElementById("popup");

const pickBtn = document.getElementById("pick-btn");
const autoBtn = document.getElementById("auto-roll-btn");
const fastAutoBtn = document.getElementById("fast-auto-roll-btn");

const themeSelect = document.getElementById("theme-select");
const volumeInput = document.getElementById("volume-input");
const muteCheckbox = document.getElementById("mute-checkbox");

/* ======================================================
   PAGE SWIPE
====================================================== */
let pageIndex = 0;
function showPage(i){
  pages.forEach((p,idx)=>{
    p.style.transform = `translateX(${(idx-i)*100}%)`;
  });
  pageIndex = i;
}

/* ======================================================
   HELPERS
====================================================== */
function rarityColor(n){
  if(n<=100) return "#aaa";
  if(n<=250) return "#4cff4c";
  if(n<=500) return "#4ca3ff";
  if(n<=1000) return "#ffd24c";
  return "#b84cff";
}

function save(){
  localStorage.setItem("owned", JSON.stringify(owned));
  localStorage.setItem("rollHistory", JSON.stringify(rollHistory));
  localStorage.setItem("loginStreak", loginStreak);
  localStorage.setItem("lastLogin", lastLogin);
  localStorage.setItem("totalRolls", totalRolls);
  localStorage.setItem("points", points);
  localStorage.setItem("rebirths", rebirths);
  localStorage.setItem("prestiges", prestiges);
  localStorage.setItem("theme", currentTheme);
  localStorage.setItem("volume", currentVolume);
  localStorage.setItem("muted", isMuted);

  const uSave = {};
  upgrades.forEach(u=>{
    uSave[u.id] = { level:u.level||0, unlocked:u.unlocked||false, price:u.price };
  });
  localStorage.setItem("upgrades", JSON.stringify(uSave));
}

function popupMsg(t){
  popup.textContent = t;
  popup.style.display = "block";
  setTimeout(()=>popup.style.display="none",2500);
}

/* ======================================================
   LOGIN STREAK
====================================================== */
function checkLogin(){
  const today = new Date().toISOString().split("T")[0];
  if(lastLogin === today) return;
  if(lastLogin){
    const y = new Date(); y.setDate(y.getDate()-1);
    loginStreak = lastLogin === y.toISOString().split("T")[0] ? loginStreak+1 : 1;
  } else loginStreak = 1;
  lastLogin = today;
  save();
}

/* ======================================================
   ROLL LOGIC
====================================================== */
function pickRarity(){
  const total = rarities.reduce((s,r)=>s + 1/r.number,0);
  let r = Math.random()*total, acc = 0;
  for(const rar of rarities){
    acc += 1/rar.number;
    if(r <= acc) return rar;
  }
}

function speedBonus(){
  let b = 0;
  ["speed1","speed2","speed3"].forEach(id=>{
    const u = upgrades.find(x=>x.id===id);
    if(u?.level) b += u.level * (id==="speed1"?1:id==="speed2"?2:4);
  });
  return b;
}

function roll(){
  if(!canRoll) return;
  canRoll = false;

  const rarity = pickRarity();

  const wipe = document.createElement("div");
  wipe.className = "wipe-bar";
  resultDiv.appendChild(wipe);

  setTimeout(()=>{
    resultDiv.querySelector(".result-text").innerHTML =
      `<span style="color:${rarityColor(rarity.number)}">${rarity.rarity}</span>`;

    owned[rarity.rarity] = (owned[rarity.rarity]||0)+1;
    rollHistory.unshift(rarity.rarity);
    rollHistory = rollHistory.slice(0,5);

    points += rarity.number/2;
    totalRolls++;

    updateUI();
    save();
    resultDiv.removeChild(wipe);
    canRoll = true;
  }, Math.max(120, 600 - speedBonus()*40));
}

/* ======================================================
   AUTO ROLL
====================================================== */
function startAuto(ms, fast=false){
  stopAuto();
  if(fast) isFastAutoRolling = true;
  else isAutoRolling = true;

  autoRollInterval = setInterval(()=>roll(), Math.max(120, ms - speedBonus()*40));
}

function stopAuto(){
  clearInterval(autoRollInterval);
  autoRollInterval = null;
  isAutoRolling = false;
  isFastAutoRolling = false;
}

function updateAutoButtons(){
  const autoUnlocked = upgrades.find(u=>u.id==="autoRoll")?.unlocked;
  const fastUnlocked = upgrades.find(u=>u.id==="fastAuto")?.unlocked;

  autoBtn.disabled = !autoUnlocked;
  fastAutoBtn.disabled = !fastUnlocked;

  autoBtn.textContent = isAutoRolling ? "Stop Auto Roll" : "Auto Roll";
  fastAutoBtn.textContent = isFastAutoRolling ? "Stop Fast Roll" : "Fast Auto Roll";
}

/* ======================================================
   UI UPDATE
====================================================== */
function updateUI(){
  rollHistoryDiv.innerHTML = rollHistory.join("<br>");
  statsPanel.innerHTML = `
    Rolls: ${totalRolls}<br>
    Points: ${points.toFixed(1)}<br>
    Login Streak: ${loginStreak}
  `;

  oddsPanel.innerHTML = "";
  rarities.forEach(r=>{
    const d = document.createElement("div");
    d.className = "odds-box";
    d.style.borderColor = rarityColor(r.number);
    d.innerHTML = `${r.rarity} (1 / ${r.number})`;
    oddsPanel.appendChild(d);
  });

  upgradesPanel.innerHTML = "";
  upgrades.forEach(u=>{
    const d = document.createElement("div");
    d.className = "upgrade-box";
    d.innerHTML = `<strong>${u.name}</strong><p>${u.description}</p><span>Cost: ${u.price}</span>`;
    if(points >= u.price){
      d.onclick = ()=>{
        points -= u.price;
        u.level = (u.level||0)+1;
        u.unlocked = true;
        u.price = Math.ceil(u.price*1.5);
        popupMsg(`${u.name} purchased`);
        updateUI();
        save();
      };
    }
    upgradesPanel.appendChild(d);
  });

  updateAutoButtons();
}

/* ======================================================
   MUSIC SYSTEM (FIXED)
====================================================== */
const SONGS = 21;
let music = null;
let musicStarted = false;
let lastSong = null;

function randomSong(){
  let n;
  do{ n=Math.floor(Math.random()*SONGS)+1; }while(n===lastSong);
  lastSong=n;
  return `song${n}.mp3`;
}

function applyVolume(){
  if(!music) return;
  music.volume = isMuted ? 0 : currentVolume/100;
}

function playMusic(){
  if(music) music.pause();
  music = new Audio(randomSong());
  applyVolume();
  music.onended = playMusic;
  music.play().catch(()=>{});
}

["click","touchstart","keydown"].forEach(e=>{
  document.addEventListener(e, ()=>{
    if(!musicStarted){
      musicStarted=true;
      playMusic();
    }
  }, { once:true });
});

/* ======================================================
   SETTINGS
====================================================== */
function applyTheme(t){
  currentTheme = t;
  document.body.dataset.theme = t;
  save();
}

volumeInput.oninput = ()=>{
  currentVolume = Number(volumeInput.value);
  isMuted = currentVolume === 0;
  applyVolume();
  save();
};

muteCheckbox.onchange = ()=>{
  isMuted = muteCheckbox.checked;
  applyVolume();
  save();
};

themeSelect.onchange = ()=>applyTheme(themeSelect.value);

/* ======================================================
   BUTTON EVENTS
====================================================== */
pickBtn.onclick = roll;

autoBtn.onclick = ()=>{
  if(isAutoRolling) stopAuto();
  else if(upgrades.find(u=>u.id==="autoRoll")?.unlocked) startAuto(900);
};

fastAutoBtn.onclick = ()=>{
  if(isFastAutoRolling) stopAuto();
  else if(upgrades.find(u=>u.id==="fastAuto")?.unlocked) startAuto(450,true);
};

/* ======================================================
   INIT
====================================================== */
async function init(){
  rarities = await fetch("rarities.json").then(r=>r.json());
  upgrades = await fetch("upgrades.json").then(r=>r.json());

  const saved = JSON.parse(localStorage.getItem("upgrades"))||{};
  upgrades.forEach(u=>{
    if(saved[u.id]){
      Object.assign(u, saved[u.id]);
    }else{
      u.level = 0;
      u.unlocked = false;
    }
  });

  checkLogin();
  applyTheme(currentTheme);
  volumeInput.value = currentVolume;
  muteCheckbox.checked = isMuted;
  updateUI();
  showPage(0);
}

init();