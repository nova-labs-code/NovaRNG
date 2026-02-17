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

// ===================== DOM =====================
const resultDiv = document.getElementById("result");
const oddsPanel = document.getElementById("odds-panel");
const rollHistoryDiv = document.getElementById("roll-history");
const loginStreakDiv = document.getElementById("login-streak");
const statsPanel = document.getElementById("stats-panel");
const upgradesPanel = document.getElementById("upgrades-panel");
const popup = document.getElementById("popup");

// Roll buttons
const pickBtn = document.getElementById("pick-btn");
const autoRollBtn = document.getElementById("auto-roll-btn");
const fastAutoRollBtn = document.getElementById("fast-auto-roll-btn");
const resetStatsBtn = document.getElementById("reset-stats");

// Settings page elements
const volumeSlider = document.getElementById("volume-slider");
const volumeLabel = document.getElementById("volume-label");
const muteToggle = document.getElementById("mute-toggle");
const themeSelect = document.getElementById("theme-select");
const resetGameBtn = document.getElementById("reset-game-btn");

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

function initPages(){
  pages.forEach((page,i)=>{
    page.style.transform = `translateX(${(i-currentPage)*100}%)`;

    page.addEventListener("touchstart", e=>{
      startX = e.touches[0].clientX;
      isSwiping = true;
    });

    page.addEventListener("touchmove", e=>{
      if(!isSwiping) return;
      const deltaX = e.touches[0].clientX - startX;
      pages.forEach((p,j)=>{
        p.style.transition = "none";
        p.style.transform = `translateX(${(j-currentPage)*100 + deltaX / window.innerWidth * 100}%)`;
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
}

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
}

// ===================== LOGIN STREAK =====================
function updateLoginStreak(){
  loginStreakDiv.innerText = `Login Streak: ${loginStreak}`;
}

function checkLoginStreak(){
  const today = new Date().toISOString().split("T")[0];
  if(lastLogin === today){ updateLoginStreak(); return; }

  if(lastLogin){
    const y = new Date();
    y.setDate(y.getDate()-1);
    loginStreak = lastLogin === y.toISOString().split("T")[0]
      ? loginStreak + 1
      : 1;
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

function getSpeedBonus(){
  let bonus = 0;
  ["speed1","speed2","speed3"].forEach(id=>{
    const u = upgrades.find(up=>up.id===id);
    if(u?.level) bonus += u.level * (id==="speed1"?1:id==="speed2"?2:5);
  });
  return bonus;
}

function getRollDelay(){
  return Math.max(120, 650 - getSpeedBonus()*40);
}

// ===================== ROLL =====================
function roll(extra=0){
  if(!canRoll || rarities.length===0) return;
  canRoll=false;
  const rolls = 1 + extra;
  const results = [];
  for(let i=0;i<rolls;i++) results.push(getRandomRarity());

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
    } else div.style.background = u.unlocked ? "#55aa55" : "#222";

    let levelText = u.multiBuy && !u.infinite
      ? `Level: ${u.level||0}/${u.maxLevel||1}`
      : u.infinite
        ? `Purchased: ${u.level||0} times`
        : u.unlocked ? "✅ Unlocked" : "🔒 Locked";

    div.innerHTML = `
      <strong>${u.name}</strong>
      <p>${u.description}</p>
      <span>${levelText}</span>
      <span>Cost: ${Math.ceil(u.price)} pts</span>
    `;

    const canBuy = (u.multiBuy && !u.infinite && (u.level||0)<u.maxLevel && points>=u.price) ||
                   (!u.multiBuy && !u.unlocked && points>=u.price) ||
                   (u.infinite && points>=u.price);

    if(canBuy){
      div.style.cursor = "pointer";
      div.onclick = ()=>{
        points -= u.price;
        if(u.multiBuy && !u.infinite){
          u.level = (u.level||0)+1;
          u.price = Math.ceil(u.price*1.5);
          if(u.level>=u.maxLevel) u.unlocked=true;
        } else if(u.infinite){
          u.level = (u.level||0)+1;
          u.price = Math.ceil(u.price*1.5);
        } else u.unlocked=true;

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

// ===================== EVENTS =====================
pickBtn.onclick = ()=>roll(getExtraRolls());
autoRollBtn.onclick = ()=>isAutoRolling ? stopAutoRoll() : startAutoRoll(1000);
fastAutoRollBtn.onclick = ()=>isFastAutoRolling ? stopAutoRoll() : startAutoRoll(500);

resetStatsBtn.onclick = async()=>{
  owned={}; rollHistory=[]; totalRolls=0; points=0;
  rebirths=0; prestiges=0;
  localStorage.removeItem("upgrades");
  upgrades = await fetch("upgrades.json").then(r=>r.json());
  saveData();
  updateUpgrades();
  updateStatsText();
  updateOdds();
  showPopup("Stats reset");
};

// ===================== SETTINGS =====================
volumeSlider.oninput = () => {
  const val = volumeSlider.value;
  volumeLabel.innerText = val + "%";
  if (currentMusic) currentMusic.volume = val / 100;
  localStorage.setItem("volume", val);
};

muteToggle.onchange = () => {
  isMuted = muteToggle.checked;
  if (currentMusic) currentMusic.muted = isMuted;
  localStorage.setItem("mute", isMuted);
  showPopup(isMuted ? "Muted" : "Unmuted");
};

themeSelect.onchange = () => {
  const theme = themeSelect.value;
  document.body.className = theme;
  localStorage.setItem("theme", theme);
  showPopup(`Theme set to ${theme}`);
};

resetGameBtn.onclick = () => {
  if(confirm("Reset all progress?")) {
    localStorage.clear();
    location.reload();
  }
};

function loadSettings(){
  const vol = localStorage.getItem("volume");
  if(vol){ volumeSlider.value=vol; volumeLabel.innerText=vol+"%"; if(currentMusic) currentMusic.volume=vol/100; }
  const mute = localStorage.getItem("mute");
  if(mute){ isMuted = mute==="true"; muteToggle.checked=isMuted; if(currentMusic) currentMusic.muted=isMuted; }
  const theme = localStorage.getItem("theme");
  if(theme){ document.body.className=theme; themeSelect.value=theme; }
}

// ===================== BACKGROUND MUSIC =====================
let currentMusic = null;
let musicStarted = false;
let lastSong = null;

function getRandomSong() {
  let index;
  do { index = Math.floor(Math.random() * 21) + 1; } while (index === lastSong && 21>1);
  lastSong = index;
  return `song${index}.mp3`;
}

function playRandomMusic() {
  if(currentMusic){ currentMusic.pause(); currentMusic.currentTime=0; }
  currentMusic = new Audio(getRandomSong());
  currentMusic.volume = (volumeSlider?.value||25)/100;
  currentMusic.loop = false;
  currentMusic.muted = isMuted;
  currentMusic.addEventListener("ended", playRandomMusic);
  currentMusic.play().catch(err=>console.log("Music blocked until interaction",err));
}

function startMusic(){
  if(!musicStarted){ playRandomMusic(); musicStarted=true; }
}

["click","touchstart","keydown"].forEach(evt => { document.addEventListener(evt, startMusic, { once:true }); });

// ===================== INIT =====================
async function init(){
  rarities = await fetch("rarities.json").then(r=>r.json());
  upgrades = await fetch("upgrades.json").then(r=>r.json());

  const saved = JSON.parse(localStorage.getItem("upgrades")) || {};
  upgrades.forEach(u=>{
    const s = saved[u.id];
    if(s){ u.level=s.level; u.unlocked=s.unlocked; u.price=s.price; } 
    else { u.level = u.multiBuy||u.infinite?0:undefined; u.unlocked=false; }
  });

  updateOdds();
  updateStatsText();
  updateUpgrades();
  updateRollHistory();
  checkLoginStreak();
  updateAutoRollButtons();
  loadSettings();
  initPages();
  showPage(0);
}

init();