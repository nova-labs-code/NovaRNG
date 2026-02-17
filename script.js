// ===================== DATA =====================
let rarities = [];
let upgrades = [];

let owned = JSON.parse(localStorage.getItem("owned")) || {};
let rollHistory = JSON.parse(localStorage.getItem("rollHistory")) || [];
let loginStreak = parseInt(localStorage.getItem("loginStreak")) || 0;
let totalRolls = parseInt(localStorage.getItem("totalRolls")) || 0;
let lastLogin = localStorage.getItem("lastLogin");
let points = parseFloat(localStorage.getItem("points")) || 0;
let rebirths = parseInt(localStorage.getItem("rebirths")) || 0;
let prestiges = parseInt(localStorage.getItem("prestiges")) || 0;

let canRoll = true;
let autoRollInterval = null;
let isAutoRolling = false;
let isFastAutoRolling = false;

// Settings storage
let settings = JSON.parse(localStorage.getItem("settings")) || {
  volume: 25,
  muted: false,
  theme: "dark",
  autoRollOnStart: false,
  fastAutoRollOnStart: false
};

// ===================== DOM =====================
const resultDiv = document.getElementById("result");
const oddsPanel = document.getElementById("odds-panel");
const rollHistoryDiv = document.getElementById("roll-history");
const loginStreakDiv = document.getElementById("login-streak");
const statsPanel = document.getElementById("stats-panel");
const upgradesPanel = document.getElementById("upgrades-panel");
const popup = document.getElementById("popup");

// Settings DOM
const volumeInput = document.getElementById("volume-input");
const muteCheckbox = document.getElementById("mute-checkbox");
const themeSelect = document.getElementById("theme-select");
const autoRollStartCheckbox = document.getElementById("auto-roll-start");
const fastAutoRollStartCheckbox = document.getElementById("fast-auto-roll-start");

const pickBtn = document.getElementById("pick-btn");
const autoRollBtn = document.getElementById("auto-roll-btn");
const fastAutoRollBtn = document.getElementById("fast-auto-roll-btn");
const resetStatsBtn = document.getElementById("reset-stats");

// ===================== PAGE SWIPE =====================
let currentPage = 0;
const pages = document.querySelectorAll(".page");
let startX = null;
let isSwiping = false;

function showPage(index){
  pages.forEach((page,i)=>{
    page.style.transform = `translateX(${(i-index)*100}%)`;
  });
  currentPage = index;
}

pages.forEach(page=>{
  page.addEventListener("touchstart", e=>{
    startX = e.touches[0].clientX;
    isSwiping = true;
  });
  page.addEventListener("touchmove", e=>{
    if(!isSwiping) return;
    const deltaX = e.touches[0].clientX - startX;
    pages.forEach((p,i)=>{
      p.style.transition = "none";
      p.style.transform = `translateX(${(i-currentPage)*100 + deltaX / window.innerWidth * 100}%)`;
    });
  });
  page.addEventListener("touchend", e=>{
    if(!isSwiping) return;
    const deltaX = e.changedTouches[0].clientX - startX;
    isSwiping = false;
    pages.forEach(p=>p.style.transition = "transform 0.5s ease");
    if(deltaX > 50) showPage(Math.max(0,currentPage-1));
    else if(deltaX < -50) showPage(Math.min(pages.length-1,currentPage+1));
    else showPage(currentPage);
  });
});

// ===================== HELPERS =====================
function getRarityColor(number){
  if(number<=100) return "#aaaaaa";
  if(number<=215) return "#55ff55";
  if(number<=330) return "#55aaff";
  if(number<=400) return "#ffdd55";
  return "#aa55ff";
}

function showPopup(msg){
  popup.innerText = msg;
  popup.style.display = "block";
  setTimeout(()=>popup.style.display="none",3000);
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

  const upgradeSave = {};
  upgrades.forEach(u=>{
    upgradeSave[u.id] = {
      level: u.level || 0,
      unlocked: u.unlocked || false,
      price: u.price
    };
  });
  localStorage.setItem("upgrades", JSON.stringify(upgradeSave));
  localStorage.setItem("settings", JSON.stringify(settings));
}

// ===================== LOGIN STREAK =====================
function updateLoginStreak(){
  loginStreakDiv.innerText = `Login Streak: ${loginStreak}`;
}

function checkLoginStreak(){
  const today = new Date().toISOString().split("T")[0];
  if(lastLogin === today){ updateLoginStreak(); return; }
  if(lastLogin){
    const y = new Date(); y.setDate(y.getDate()-1);
    loginStreak = lastLogin === y.toISOString().split("T")[0] ? loginStreak + 1 : 1;
  } else loginStreak = 1;
  lastLogin = today;
  saveData();
  updateLoginStreak();
}

// ===================== ROLL HELPERS =====================
function getRandomRarity(){
  let total = rarities.reduce((s,r)=>s+(1/r.number),0);
  let rand = Math.random()*total;
  let acc = 0;
  for(const r of rarities){
    acc += 1/r.number;
    if(rand <= acc) return r;
  }
}

function getExtraRolls(){
  const upgrade = upgrades.find(u=>u.id==="extra1");
  return upgrade?.level ? Math.min(upgrade.level,5) : 0;
}

// ===================== SPEED HELPERS =====================
function getSpeedBonus(){
  let bonus = 0;
  const s1 = upgrades.find(u=>u.id==="speed1");
  const s2 = upgrades.find(u=>u.id==="speed2");
  const s3 = upgrades.find(u=>u.id==="speed3");
  if(s1?.level) bonus += s1.level * 1;
  if(s2?.level) bonus += s2.level * 2;
  if(s3?.level) bonus += s3.level * 5;
  return bonus;
}

function getRollDelay(){
  const base = 650;
  const reduction = getSpeedBonus() * 40;
  return Math.max(120, base - reduction);
}

// ===================== ROLL =====================
function roll(extra=0){
  if(!canRoll || rarities.length===0) return;
  canRoll=false;
  const rolls = 1 + extra;
  const results = [];
  for(let i=0;i<rolls;i++){
    results.push(getRandomRarity());
  }
  const wipe = document.createElement("div");
  wipe.className = "wipe-bar";
  resultDiv.appendChild(wipe);
  setTimeout(()=>{
    resultDiv.querySelector(".result-text").innerHTML =
      results.map(r=>`<span style="color:${getRarityColor(r.number)}">${r.rarity}</span>`).join("<br>");
    const multUpgrade = upgrades.find(u=>u.id==="pointsMultiplier");
    const mult = 1 + ((multUpgrade?.level||0) * 0.08);
    const rebirthUpgrade = upgrades.find(u=>u.id==="rebirthLimit");
    const rebirthMultiplier = 1 + (rebirthUpgrade?.level||0);
    const prestigeUpgrade = upgrades.find(u=>u.id==="prestigeLimit");
    const prestigeMultiplier = 1 + (prestigeUpgrade?.level||0);
    results.forEach(r=>{
      owned[r.rarity]=(owned[r.rarity]||0)+1;
      rollHistory.push(r.rarity);
      points += (r.number/2) * mult * Math.pow(1.5, rebirths*rebirthMultiplier) * Math.pow(1.5, prestiges*prestigeMultiplier);
      totalRolls++;
    });
    rollHistory = rollHistory.slice(-5);
    updateRollHistory();
    updateOdds();
    updateStatsText();
    updateUpgrades();
    updateAutoRollButtons();
    saveData();
    resultDiv.removeChild(wipe);
    canRoll=true;
  }, getRollDelay());
}

// ===================== UPDATE PANELS =====================
function updateRollHistory(){
  rollHistoryDiv.innerHTML="Last Rolls:<br>"+rollHistory.join("<br>");
}

function updateOdds(){
  oddsPanel.innerHTML="";
  const total = rarities.reduce((s,r)=>s+(1/r.number),0);
  rarities.forEach(r=>{
    const ownedCount = owned[r.rarity]||0;
    const chance = ((1/r.number)/total*100).toFixed(6);
    const div=document.createElement("div");
    div.className="odds-box";
    div.style.borderColor=getRarityColor(r.number);
    div.style.background=ownedCount?`${getRarityColor(r.number)}33`:"#1a1a1a";
    div.innerHTML=`<span>${ownedCount?r.rarity:"???"}</span><span>${ownedCount} owned</span><span>${chance}%</span>`;
    oddsPanel.appendChild(div);
  });
}

function updateStatsText(){
  statsPanel.innerHTML=`
    Total Rolls: ${totalRolls}<br>
    Points: ${points.toFixed(1)}<br>
    Rebirths: ${rebirths}<br>
    Prestiges: ${prestiges}<br>
    Unique Owned: ${Object.values(owned).filter(v=>v>0).length}
  `;
}

// ===================== UPGRADES =====================
function updateUpgrades(){
  upgradesPanel.innerHTML = "";
  upgrades.forEach(u=>{
    const div = document.createElement("div");
    div.className = "upgrade-box";
    if(u.multiBuy && !u.infinite){
      const pct = ((u.level||0)/(u.maxLevel||1))*100;
      div.style.background = `linear-gradient(to right,#55aa55 ${pct}%,#222 ${pct}%)`;
    } else if(u.infinite){
      const pct = Math.min((u.level||0)*5,100);
      div.style.background = `linear-gradient(to right,#ffaa55 ${pct}%,#222 ${pct}%)`;
    } else {
      div.style.background = u.unlocked ? "#55aa55" : "#222";
    }
    let levelText = "";
    if(u.multiBuy && !u.infinite){
      levelText = `Level: ${u.level||0}/${u.maxLevel||1}`;
    } else if(u.infinite){
      levelText = `Purchased: ${u.level||0} times`;
    } else {
      levelText = u.unlocked ? "✅ Unlocked" : "🔒 Locked";
    }
    div.innerHTML = `
      <strong>${u.name}</strong>
      <p>${u.description}</p>
      <span>${levelText}</span>
      <span>Cost: ${Math.ceil(u.price)} pts</span>
    `;
    const canBuy =
      (u.multiBuy && !u.infinite && (u.level||0)<u.maxLevel && points>=u.price) ||
      (!u.multiBuy && !u.unlocked && points>=u.price) ||
      (u.infinite && points>=u.price);
    if(canBuy){
      div.style.cursor = "pointer";
      div.onclick = ()=>{
        points -= u.price;
        if(u.multiBuy && !u.infinite){
          u.level = (u.level||0) + 1;
          u.price = Math.ceil(u.price * 1.5);
          if(u.level >= u.maxLevel) u.unlocked = true;
        } else if(u.infinite){
          u.level = (u.level||0) + 1;
          u.price = Math.ceil(u.price * 1.5);
        } else {
          u.unlocked = true;
        }
        showPopup(`${u.name} purchased`);
        saveData();
        updateUpgrades();
        updateStatsText();
      };
    }
    upgradesPanel.appendChild(div);
  });
}

// ===================== AUTO ROLL =====================
function startAutoRoll(interval){
  stopAutoRoll();
  if(interval===1000) isAutoRolling=true;
  if(interval===500) isFastAutoRolling=true;
  autoRollInterval=setInterval(()=>{
    if(canRoll) roll(getExtraRolls());
  }, Math.max(120, interval - getSpeedBonus()*40));
}

function stopAutoRoll(){
  clearInterval(autoRollInterval);
  autoRollInterval=null;
  isAutoRolling=false;
  isFastAutoRolling=false;
}

function updateAutoRollButtons(){
  const auto = upgrades.find(u=>u.id==="autoRoll" && u.unlocked);
  const fast = upgrades.find(u=>u.id==="fastAuto" && u.unlocked);
  autoRollBtn.disabled = !auto;
  fastAutoRollBtn.disabled = !fast;
  autoRollBtn.innerText = isAutoRolling ? "Stop Auto Roll" : "Auto Roll";
  fastAutoRollBtn.innerText = isFastAutoRolling ? "Stop Fast Auto Roll" : "Fast Auto Roll";
}

// ===================== MUSIC =====================
const SONG_COUNT = 21;
const SONG_PREFIX = "song";
const SONG_EXT = ".mp3";
let currentMusic = null;
let lastSong = null;
let musicStarted = false;

function getRandomSong() {
  let index;
  do { index = Math.floor(Math.random()*SONG_COUNT)+1; } while(index===lastSong && SONG_COUNT>1);
  lastSong = index;
  return `${SONG_PREFIX}${index}${SONG_EXT}`;
}

function playRandomMusic() {
  if(currentMusic){ currentMusic.pause(); currentMusic.currentTime=0; }
  const trackSrc = getRandomSong();
  currentMusic = new Audio(trackSrc);
  currentMusic.volume = settings.muted ? 0 : settings.volume/100;
  currentMusic.preload="auto"; currentMusic.loop=false;
  currentMusic.addEventListener("ended", playRandomMusic);
  currentMusic.play().catch(err=>console.log("Music blocked:",err));
}

function startMusic(){
  if(!musicStarted){ playRandomMusic(); musicStarted=true; }
}

// ===================== SETTINGS =====================
function initSettings(){
  // Volume
  volumeInput.value = settings.volume;
  volumeInput.addEventListener("change", ()=>{
    let val = parseInt(volumeInput.value);
    if(isNaN(val) || val<0) val=0;
    if(val>100) val=100;
    settings.volume=val;
    if(!settings.muted && currentMusic) currentMusic.volume=val/100;
    saveData();
  });

  // Mute
  muteCheckbox.checked = settings.muted;
  muteCheckbox.addEventListener("change", ()=>{
    settings.muted = muteCheckbox.checked;
    if(currentMusic) currentMusic.volume = settings.muted ? 0 : settings.volume/100;
    saveData();
  });

  // Theme
  themeSelect.value = settings.theme;
  themeSelect.addEventListener("change", ()=>{
    settings.theme = themeSelect.value;
    applyTheme(settings.theme);
    saveData();
  });

  // Auto-roll on start
  autoRollStartCheckbox.checked = settings.autoRollOnStart;
  autoRollStartCheckbox.addEventListener("change", ()=>{
    settings.autoRollOnStart = autoRollStartCheckbox.checked;
    saveData();
  });

  fastAutoRollStartCheckbox.checked = settings.fastAutoRollOnStart;
  fastAutoRollStartCheckbox.addEventListener("change", ()=>{
    settings.fastAutoRollOnStart = fastAutoRollStartCheckbox.checked;
    saveData();
  });
}

function applyTheme(theme){
  document.body.className = "";
  document.body.classList.add(`theme-${theme}`);
}

// ===================== EVENTS =====================
pickBtn.onclick = ()=>roll(getExtraRolls());
autoRollBtn.onclick = ()=>isAutoRolling ? stopAutoRoll() : startAutoRoll(1000);
fastAutoRollBtn.onclick = ()=>isFastAutoRolling ? stopAutoRoll() : startAutoRoll(500);

resetStatsBtn.onclick = async()=>{
  owned={}; rollHistory=[]; totalRolls=0; points=0; rebirths=0; prestiges=0;
  localStorage.removeItem("upgrades");
  upgrades = await fetch("upgrades.json").then(r=>r.json());
  saveData();
  updateUpgrades();
  updateStatsText();
  updateOdds();
  showPopup("Stats reset");
};

// ===================== INIT PAGES =====================
function initPages(){
  pages.forEach((p,i)=>{ p.style.transform=`translateX(${i*100}%)`; });
}

// ===================== INIT =====================
async function init(){
  rarities = await fetch("rarities.json").then(r=>r.json());
  upgrades = await fetch("upgrades.json").then(r=>r.json());

  const saved = JSON.parse(localStorage.getItem("upgrades")) || {};
  upgrades.forEach(u=>{
    const s = saved[u.id];
    if(s){ u.level = s.level; u.unlocked = s.unlocked; u.price = s.price; }
    else { u.level = u.multiBuy||u.infinite?0:undefined; u.unlocked=false; }
  });

  checkLoginStreak();
  updateOdds(); updateStatsText(); updateUpgrades(); updateRollHistory();
  initPages(); showPage(0);
  initSettings();
  applyTheme(settings.theme);
  startMusic();

  // Auto-roll on start
  const autoUpgrade = upgrades.find(u=>u.id==="autoRoll" && u.unlocked);
  const fastUpgrade = upgrades.find(u=>u.id==="fastAuto" && u.unlocked);
  if(autoUpgrade && settings.autoRollOnStart) startAutoRoll(1000);
  if(fastUpgrade && settings.fastAutoRollOnStart) startAutoRoll(500);
}

init();