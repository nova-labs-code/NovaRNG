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

// PAGE SWIPE
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
  page.addEventListener("touchstart",e=>{ touchStartX=e.touches[0].clientX; });
  page.addEventListener("touchend",e=>{
    if(!touchStartX) return;
    let delta=e.changedTouches[0].clientX - touchStartX;
    if(delta>50) showPage(Math.max(0,currentPage-1));
    if(delta<-50) showPage(Math.min(pages.length-1,currentPage+1));
    touchStartX=null;
  });
});

// HELPERS
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
  setTimeout(()=>{ popup.style.display="none"; },3000);
}

function saveData(){
  localStorage.setItem("owned",JSON.stringify(owned));
  localStorage.setItem("rollHistory",JSON.stringify(rollHistory.slice(-5)));
  localStorage.setItem("loginStreak",loginStreak);
  localStorage.setItem("totalRolls",totalRolls);
}

// ROLL
function roll(){
  if(!canRoll || rarities.length===0) return;
  canRoll=false;
  totalRolls++;

  const totalWeight = rarities.reduce((sum,r)=>sum+r.number,0);
  let rand = Math.floor(Math.random()*totalWeight)+1;
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
    updateStatsText();
    updateAutoRollButtons();
    saveData();

    setTimeout(()=>{ canRoll=true; },500);
    resultDiv.removeChild(wipe);
  },650);
}

// UPDATES
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
    } else { div.style.background="#1a1a1a"; }
    div.innerHTML=`
      <span>${owned[r.rarity]?r.rarity:"???"}</span>
      <span>${owned[r.rarity]?`1 / ${r.number}`:"??? Odds"}</span>
    `;
    oddsPanel.appendChild(div);
  });
}

function updateLoginStreak(){
  loginStreakDiv.innerText=`Login Streak: ${loginStreak}`;
}

function updateStatsText(){
  let statsHTML=`Total Rolls: ${totalRolls}<br>Unique Rarities Owned: ${Object.keys(owned).length}<br><br>`;
  rarities.forEach(r=>{
    const count = rollHistory.filter(x=>x===r.rarity).length;
    statsHTML+=`${r.rarity}: ${count}<br>`;
  });
  statsPanel.innerHTML=statsHTML;
}

// AUTO-ROLL BUTTONS WITH LOCKED TEXT
function updateAutoRollButtons(){
  autoRollBtn.disabled = totalRolls<100;
  fastAutoRollBtn.disabled = totalRolls<1000;

  // Add or remove locked text
  let autoText = autoRollBtn.nextElementSibling;
  if(!autoText || !autoText.classList.contains("locked-text")){
    autoText = document.createElement("div");
    autoText.className="locked-text";
    autoRollBtn.parentNode.appendChild(autoText);
  }
  autoText.innerText = totalRolls<100 ? `Locked: get ${100-totalRolls} more rolls` : "";

  let fastText = fastAutoRollBtn.nextElementSibling;
  if(!fastText || !fastText.classList.contains("locked-text")){
    fastText = document.createElement("div");
    fastText.className="locked-text";
    fastAutoRollBtn.parentNode.appendChild(fastText);
  }
  fastText.innerText = totalRolls<1000 ? `Locked: get ${1000-totalRolls} more rolls` : "";
}

// AUTO-ROLL
function startAutoRoll(speed){
  if(autoRollInterval) clearInterval(autoRollInterval);
  if(fastAutoRollInterval) clearInterval(fastAutoRollInterval);
  if(speed===1000) autoRollInterval = setInterval(()=>{ if(canRoll) roll(); },1000);
  else if(speed===500) fastAutoRollInterval = setInterval(()=>{ if(canRoll) roll(); },500);
}

function stopAutoRoll(){
  if(autoRollInterval) clearInterval(autoRollInterval);
  if(fastAutoRollInterval) clearInterval(fastAutoRollInterval);
}

// EVENT LISTENERS
pickBtn.addEventListener("click",roll);

autoRollBtn.addEventListener("click", ()=>{
  if(totalRolls<100) showPopup(`Locked — get ${100-totalRolls} more rolls`);
  else startAutoRoll(1000);
});

fastAutoRollBtn.addEventListener("click", ()=>{
  if(totalRolls<1000) showPopup(`Locked — get ${1000-totalRolls} more rolls`);
  else startAutoRoll(500);
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

// INIT
function init(){
  fetch("rarities.json")
    .then(res=>res.json())
    .then(data=>{
      rarities=data;
      updateOdds();
      updateStatsText();
      updateAutoRollButtons();
    });

  updateRollHistory();
  updateLoginStreak();
  showPage(0);
}

init();