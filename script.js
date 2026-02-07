// -----------------------------
// NOVA RNG FULL JS
// -----------------------------

// -----------------------------
// Global Variables
// -----------------------------
let rarities = [];
let owned = JSON.parse(localStorage.getItem("owned")) || {};
let rollHistory = JSON.parse(localStorage.getItem("rollHistory")) || [];
let loginStreak = parseInt(localStorage.getItem("loginStreak")) || 0;
let totalRolls = parseInt(localStorage.getItem("totalRolls")) || 0;

let autoRollInterval = null;
let fastAutoRollInterval = null;

const resultDiv = document.getElementById("result");
const oddsPanel = document.getElementById("odds-panel");
const rollHistoryDiv = document.getElementById("roll-history");
const loginStreakDiv = document.getElementById("login-streak");
const statsGraph = document.getElementById("stats-graph");
const popup = document.getElementById("popup");

const pickBtn = document.getElementById("pick-btn");
const autoRollBtn = document.getElementById("auto-roll-btn");
const fastAutoRollBtn = document.getElementById("fast-auto-roll-btn");

let canRoll = true;

// -----------------------------
// Page Swiping
// -----------------------------
const pages = document.querySelectorAll(".page");
let currentPage = 0;

function showPage(index){
  pages.forEach((page,i)=>{
    page.style.transform=`translateX(${(i-index)*100}%)`;
  });
  currentPage=index;
}

let touchStartX = null;
pages.forEach(page=>{
  page.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; });
  page.addEventListener("touchend", e => {
    if(!touchStartX) return;
    let delta = e.changedTouches[0].clientX - touchStartX;
    if(delta > 50) showPage(Math.max(0,currentPage-1));
    if(delta < -50) showPage(Math.min(pages.length-1,currentPage+1));
    touchStartX = null;
  });
});

// -----------------------------
// Helper Functions
// -----------------------------
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
  setTimeout(()=>{ popup.style.display="none"; }, 3000);
}

function saveData(){
  localStorage.setItem("owned", JSON.stringify(owned));
  localStorage.setItem("rollHistory", JSON.stringify(rollHistory.slice(-5)));
  localStorage.setItem("loginStreak", loginStreak);
  localStorage.setItem("totalRolls", totalRolls);
}

// -----------------------------
// Roll Function
// -----------------------------
function roll(){
  if(!canRoll || rarities.length === 0) return;
  canRoll = false;
  totalRolls++;

  // Weighted roll
  const totalWeight = rarities.reduce((sum,r)=>sum+r.number,0);
  let rand = Math.floor(Math.random()*totalWeight)+1;
  let cumulative = 0;
  let resultRarity;

  for(let r of rarities){
    cumulative += r.number;
    if(rand <= cumulative){ resultRarity=r; break; }
  }

  // Animate wipe
  const wipe = document.createElement("div");
  wipe.className="wipe-bar";
  resultDiv.appendChild(wipe);

  setTimeout(()=>{
    resultDiv.querySelector(".result-text").innerText = resultRarity.rarity;
    owned[resultRarity.rarity] = true;

    // Update history
    rollHistory.push(resultRarity.rarity);
    if(rollHistory.length>5) rollHistory.shift();

    updateRollHistory();
    updateOdds();
    updateStatsGraph();
    updateAutoRollButtons();
    saveData();

    setTimeout(()=>{ canRoll=true; }, 500);
    resultDiv.removeChild(wipe);
  }, 650);
}

// -----------------------------
// Update Functions
// -----------------------------
function updateRollHistory(){
  rollHistoryDiv.innerHTML = "Last Rolls:<br>"+rollHistory.join("<br>");
}

function updateOdds(){
  oddsPanel.innerHTML = "";
  rarities.forEach(r=>{
    const div = document.createElement("div");
    div.classList.add("odds-box");
    const color = getRarityColor(r.number);
    div.style.borderColor = color;
    if(owned[r.rarity]){
      div.classList.add("owned");
      div.style.background = `${color}33`;
    } else {
      div.style.background = "#1a1a1a";
    }
    div.innerHTML = `
      <span>${owned[r.rarity]?r.rarity:"???"}</span>
      <span>${owned[r.rarity]?`1 / ${r.number}`:"??? Odds"}</span>
    `;
    oddsPanel.appendChild(div);
  });
}

function updateLoginStreak(){
  loginStreakDiv.innerText = `Login Streak: ${loginStreak}`;
}

function updateStatsGraph(){
  const ctx = statsGraph.getContext("2d");
  ctx.clearRect(0,0,statsGraph.width,statsGraph.height);

  // Track last 7 days
  let dayCounts = [0,0,0,0,0,0,0];
  rollHistory.forEach((r,i)=>{
    const rarity = rarities.find(x=>x.rarity===r);
    if(rarity){
      dayCounts[i%7] += rarity.number;
    }
  });

  const max = Math.max(...dayCounts,1);
  const barWidth = statsGraph.width/7 -5;

  dayCounts.forEach((val,i)=>{
    const h = (val/max)*statsGraph.height*0.9;
    ctx.fillStyle = "#55aaff";
    ctx.fillRect(i*(barWidth+5), statsGraph.height-h, barWidth, h);
  });
}

// -----------------------------
// Auto-roll Functions
// -----------------------------
function startAutoRoll(speed){
  if(autoRollInterval) clearInterval(autoRollInterval);
  if(fastAutoRollInterval) clearInterval(fastAutoRollInterval);
  if(speed===1000){
    autoRollInterval = setInterval(()=>{ if(canRoll) roll(); }, 1000);
  } else if(speed===500){
    fastAutoRollInterval = setInterval(()=>{ if(canRoll) roll(); }, 500);
  }
}

function stopAutoRoll(){
  if(autoRollInterval) clearInterval(autoRollInterval);
  if(fastAutoRollInterval) clearInterval(fastAutoRollInterval);
}

function updateAutoRollButtons(){
  // Auto-roll unlock at 100 rolls
  if(totalRolls >= 100){
    autoRollBtn.disabled=false;
    autoRollBtn.title="";
  } else {
    autoRollBtn.disabled=true;
    autoRollBtn.title=`Locked. ${100-totalRolls} rolls to unlock`;
  }

  // Fast auto-roll unlock at 1000 rolls
  if(totalRolls >= 1000){
    fastAutoRollBtn.disabled=false;
    fastAutoRollBtn.title="";
  } else {
    fastAutoRollBtn.disabled=true;
    fastAutoRollBtn.title=`Locked. ${1000-totalRolls} rolls to unlock`;
  }
}

// -----------------------------
// Event Listeners
// -----------------------------
pickBtn.addEventListener("click", roll);
autoRollBtn.addEventListener("click", ()=> startAutoRoll(1000));
fastAutoRollBtn.addEventListener("click", ()=> startAutoRoll(500));

// -----------------------------
// Init
// -----------------------------
function init(){
  fetch("rarities.json")
    .then(res=>res.json())
    .then(data=>{
      rarities = data;
      updateOdds();
      updateStatsGraph();
      updateAutoRollButtons();
    });

  updateRollHistory();
  updateLoginStreak();
  showPage(0);
}

init();