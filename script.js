// -----------------------------
// Global Variables
// -----------------------------
let rarities = [];
let owned = JSON.parse(localStorage.getItem("owned")) || {};
let rollHistory = JSON.parse(localStorage.getItem("rollHistory")) || [];
let loginStreak = parseInt(localStorage.getItem("loginStreak")) || 0;

// DOM Elements
const resultDiv = document.getElementById("result");
const oddsPanel = document.getElementById("odds-panel");
const rollHistoryDiv = document.getElementById("roll-history");
const loginStreakDiv = document.getElementById("login-streak");
const popup = document.getElementById("popup");
const statsGraph = document.getElementById("stats-graph");

const pickBtn = document.getElementById("pick-btn");
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

let touchStartX=null;
pages.forEach(page=>{
  page.addEventListener("touchstart", e=>{ touchStartX=e.touches[0].clientX; });
  page.addEventListener("touchend", e=>{
    if(!touchStartX) return;
    let delta = e.changedTouches[0].clientX - touchStartX;
    if(delta>50) showPage(Math.max(0,currentPage-1));
    if(delta<-50) showPage(Math.min(pages.length-1,currentPage+1));
    touchStartX=null;
  });
});

// -----------------------------
// Helper Functions
// -----------------------------
function getRarityColor(number){
  if(number>=1 && number<=100) return "#aaaaaa";
  if(number>=101 && number<=215) return "#55ff55";
  if(number>=216 && number<=330) return "#55aaff";
  if(number>=331 && number<=400) return "#ffdd55";
  if(number>400) return "#aa55ff";
  return "#ccc";
}

function showPopup(msg){
  popup.innerText=msg;
  popup.style.display="block";
  setTimeout(()=>{popup.style.display="none";},3000);
}

function saveData(){
  localStorage.setItem("owned",JSON.stringify(owned));
  localStorage.setItem("rollHistory",JSON.stringify(rollHistory.slice(-5)));
  localStorage.setItem("loginStreak",loginStreak);
}

// -----------------------------
// Roll Function
// -----------------------------
function roll(){
  if(!canRoll || rarities.length===0) return;
  canRoll=false;

  const totalWeight = rarities.reduce((sum,r)=>sum+r.number,0);
  let rand=Math.floor(Math.random()*totalWeight)+1;
  let cumulative=0;
  let resultRarity;

  for(let r of rarities){
    cumulative+=r.number;
    if(rand<=cumulative){ resultRarity=r; break; }
  }

  const wipe=document.createElement("div");
  wipe.className="wipe-bar";
  resultDiv.appendChild(wipe);

  setTimeout(()=>{
    resultDiv.querySelector(".result-text").innerText=resultRarity.rarity;
    owned[resultRarity.rarity]=true;

    rollHistory.push(resultRarity.rarity);
    if(rollHistory.length>5) rollHistory.shift();

    updateRollHistory();
    updateOdds();
    updateStatsGraph();
    saveData();

    setTimeout(()=>{canRoll=true;},500);
    resultDiv.removeChild(wipe);
  },650);
}

// -----------------------------
// Update Functions
// -----------------------------
function updateRollHistory(){
  rollHistoryDiv.innerHTML="Last Rolls:<br>"+rollHistory.join("<br>");
}

function updateOdds(){
  oddsPanel.innerHTML="";
  rarities.forEach(r=>{
    const div=document.createElement("div");
    div.classList.add("odds-box");

    const color=getRarityColor(r.number);
    div.style.borderColor=color;

    if(owned[r.rarity]){
      div.classList.add("owned");
      div.style.background=`${color}33`;
    }else{
      div.style.background="#1a1a1a";
    }

    div.innerHTML=`
      <span>${owned[r.rarity]?r.rarity:"???"}</span>
      <span>${owned[r.rarity]?`1 / ${r.number}`:"??? Odds"}</span>
    `;
    oddsPanel.appendChild(div);
  });
}

function updateLoginStreak(){ loginStreakDiv.innerText=`Login Streak: ${loginStreak}`; }

// -----------------------------
// Stats Graph (last 7 days)
// -----------------------------
function updateStatsGraph(){
  const ctx=statsGraph.getContext("2d");
  ctx.clearRect(0,0,statsGraph.width,statsGraph.height);

  // Simulate last 7 days with random data (replace with real tracking if available)
  let dayCounts=[0,0,0,0,0,0,0];
  rollHistory.forEach(r=>{
    const idx=Math.floor(Math.random()*7);
    const rarity=rarities.find(x=>x.rarity===r);
    if(rarity) dayCounts[idx]+=rarity.number;
  });

  const max=Math.max(...dayCounts,1);
  const barWidth=statsGraph.width/7 -5;

  ctx.fillStyle="#55aaff";
  dayCounts.forEach((val,i)=>{
    const h=(val/max)*statsGraph.height*0.9;
    ctx.fillRect(i*(barWidth+5), statsGraph.height-h, barWidth, h);
  });
}

// -----------------------------
// Event Listeners
// -----------------------------
pickBtn.addEventListener("click",roll);

// -----------------------------
// Init
// -----------------------------
function init(){
  fetch("rarities.json")
    .then(res=>res.json())
    .then(data=>{
      rarities=data;
      updateOdds();
      updateStatsGraph();
    });

  updateRollHistory();
  updateLoginStreak();
  showPage(0);
}

init();