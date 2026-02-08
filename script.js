let rarities = [];
let owned = JSON.parse(localStorage.getItem("owned")) || {};
let rollHistory = JSON.parse(localStorage.getItem("rollHistory")) || [];
let loginStreak = parseInt(localStorage.getItem("loginStreak")) || 0;
let totalRolls = parseInt(localStorage.getItem("totalRolls")) || 0;

const resultDiv = document.getElementById("result");
const oddsPanel = document.getElementById("odds-panel");
const rollHistoryDiv = document.getElementById("roll-history");
const loginStreakDiv = document.getElementById("login-streak");
const statsPanel = document.getElementById("stats-panel");
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

// -------------------- HELPERS --------------------
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
  localStorage.setItem("loginStreak", loginStreak);
  localStorage.setItem("totalRolls", totalRolls);
}

// -------------------- ROLL --------------------
function roll(){
  if(!canRoll || rarities.length===0) return;
  canRoll=false;
  totalRolls++;

  // Inverse probability: smaller number = higher chance
  const totalInverse = rarities.reduce((sum,r)=>sum+(1/r.number),0);
  let rand = Math.random()*totalInverse;
  let cumulative=0;
  let resultRarity;
  for(let r of rarities){
    cumulative += 1/r.number;
    if(rand <= cumulative){ resultRarity=r; break; }
  }

  const wipe=document.createElement("div");
  wipe.className="wipe-bar";
  resultDiv.appendChild(wipe);

  setTimeout(()=>{
    resultDiv.querySelector(".result-text").innerText=resultRarity.rarity;

    // Fix: count owned properly
    owned[resultRarity.rarity] = (owned[resultRarity.rarity] || 0) + 1;

    rollHistory.push(resultRarity.rarity);
    if(rollHistory.length>5) rollHistory.shift();

    updateRollHistory();
    updateOdds();
    updateStatsText();
    updateAutoRollButtons();
    saveData();

    setTimeout(()=>{ canRoll=true; },500);
    resultDiv.removeChild(wipe);
  },650);
}

// -------------------- UPDATE FUNCTIONS --------------------
function updateRollHistory(){
  rollHistoryDiv.innerHTML = "Last Rolls:<br>" + rollHistory.join("<br>");
}

function updateOdds(){
  oddsPanel.innerHTML = "";
  const totalInverse = rarities.reduce((sum,r)=>sum+(1/r.number),0);

  rarities.forEach(r=>{
    const div = document.createElement("div");
    div.classList.add("odds-box");
    const color = getRarityColor(r.number);
    div.style.borderColor = color;

    const chancePercent = ((1/r.number)/totalInverse*100).toFixed(2);
    const countOwned = owned[r.rarity] || 0;
    const displayName = countOwned > 0 ? r.rarity : "???";

    div.innerHTML = `<span>${displayName}</span><span>${countOwned} owned</span><span>${chancePercent}%</span>`;

    if(countOwned > 0){
      div.classList.add("owned");
      div.style.background = `${color}33`;
    } else {
      div.style.background="#1a1a1a";
    }

    oddsPanel.appendChild(div);
  });
}

function updateLoginStreak(){ loginStreakDiv.innerText=`Login Streak: ${loginStreak}`; }

function updateStatsText(){
  statsPanel.innerHTML = `
    Total Rolls: ${totalRolls}<br>
    Unique Rarities Owned: ${Object.values(owned).filter(v=>v>0).length}<br>
    Last 5 Rolls:<br>${rollHistory.join("<br>")}
  `;
}

// -------------------- AUTO-ROLL --------------------
function startAutoRoll(speed){
  stopAutoRoll();

  if(speed === 1000){
    isAutoRolling = true;
    autoRollInterval = setInterval(()=>{ if(canRoll) roll(); }, 1000);
  }

  if(speed === 500){
    isFastAutoRolling = true;
    fastAutoRollInterval = setInterval(()=>{ if(canRoll) roll(); }, 500);
  }

  updateAutoRollButtons();
}

function stopAutoRoll(){
  if(autoRollInterval){
    clearInterval(autoRollInterval);
    autoRollInterval = null;
  }
  if(fastAutoRollInterval){
    clearInterval(fastAutoRollInterval);
    fastAutoRollInterval = null;
  }

  isAutoRolling = false;
  isFastAutoRolling = false;
  updateAutoRollButtons();
}

function updateAutoRollButtons(){
  autoRollBtn.disabled = totalRolls < 100;
  autoRollBtn.innerText =
    totalRolls < 100
      ? `Locked: get ${100-totalRolls} more rolls`
      : isAutoRolling ? "⏹ Stop Auto Roll" : "🎲 Auto Roll";

  fastAutoRollBtn.disabled = totalRolls < 1000;
  fastAutoRollBtn.innerText =
    totalRolls < 1000
      ? `Locked: get ${1000-totalRolls} more rolls`
      : isFastAutoRolling ? "⏹ Stop Fast Auto Roll" : "🎲 Fast Auto Roll";
}

// -------------------- EVENTS --------------------
pickBtn.addEventListener("click", roll);

autoRollBtn.addEventListener("click", ()=>{
  if(totalRolls < 100){
    showPopup(`Locked — get ${100-totalRolls} more rolls`);
    return;
  }
  isAutoRolling ? stopAutoRoll() : startAutoRoll(1000);
});

fastAutoRollBtn.addEventListener("click", ()=>{
  if(totalRolls < 1000){
    showPopup(`Locked — get ${1000-totalRolls} more rolls`);
    return;
  }
  isFastAutoRolling ? stopAutoRoll() : startAutoRoll(500);
});

resetStatsBtn.addEventListener("click", ()=>{
  rollHistory=[];
  owned={};
  totalRolls=0;
  saveData();
  updateRollHistory();
  updateOdds();
  updateStatsText();
  updateAutoRollButtons();
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
    });

  updateRollHistory();
  updateLoginStreak();
  showPage(0);
}

init();