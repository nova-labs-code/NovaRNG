// ==================== STORAGE ====================
let rarities = [];
let upgrades = [];
let savedUpgrades = JSON.parse(localStorage.getItem("upgrades")) || {};
let owned = JSON.parse(localStorage.getItem("owned")) || {};
let rollHistory = JSON.parse(localStorage.getItem("rollHistory")) || [];
let loginStreak = +localStorage.getItem("loginStreak") || 0;
let totalRolls = +localStorage.getItem("totalRolls") || 0;
let lastLogin = localStorage.getItem("lastLogin");
let points = +localStorage.getItem("points") || 0;
let rebirths = +localStorage.getItem("rebirths") || 0;
let prestiges = +localStorage.getItem("prestiges") || 0;

let canRoll = true;
let autoRollInterval = null;
let fastAutoRollInterval = null;

// ==================== DOM ====================
const pages = document.querySelectorAll(".page");
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

// ==================== PAGE SYSTEM (JS FIX) ====================
let currentPage = 0;

// INITIAL POSITION — THIS FIXES THE BUG
pages.forEach((p, i) => {
  p.style.transform = `translateX(${i * 100}%)`;
  p.style.opacity = i === 0 ? "1" : "0";
  p.style.pointerEvents = i === 0 ? "auto" : "none";
});

function showPage(index){
  pages.forEach((p,i)=>{
    p.style.transform = `translateX(${(i-index)*100}%)`;
    p.style.opacity = i === index ? "1" : "0";
    p.style.pointerEvents = i === index ? "auto" : "none";
  });
  currentPage = index;
}

// Swipe
let touchX = null;
pages.forEach(p=>{
  p.addEventListener("touchstart",e=>touchX=e.touches[0].clientX);
  p.addEventListener("touchend",e=>{
    if(touchX===null) return;
    const d = e.changedTouches[0].clientX - touchX;
    if(d>80) showPage(Math.max(0,currentPage-1));
    if(d<-80) showPage(Math.min(pages.length-1,currentPage+1));
    touchX=null;
  });
});

// ==================== HELPERS ====================
function saveData(){
  localStorage.setItem("owned", JSON.stringify(owned));
  localStorage.setItem("rollHistory", JSON.stringify(rollHistory));
  localStorage.setItem("loginStreak", loginStreak);
  localStorage.setItem("totalRolls", totalRolls);
  localStorage.setItem("lastLogin", lastLogin);
  localStorage.setItem("points", points);
  localStorage.setItem("rebirths", rebirths);
  localStorage.setItem("prestiges", prestiges);
  localStorage.setItem("upgrades", JSON.stringify(savedUpgrades));
}

function popupMsg(t){
  popup.innerText=t;
  popup.style.display="block";
  setTimeout(()=>popup.style.display="none",2500);
}

// ==================== LOGIN ====================
function checkLogin(){
  const today=new Date().toISOString().split("T")[0];
  if(lastLogin!==today){
    loginStreak++;
    lastLogin=today;
    saveData();
  }
  loginStreakDiv.innerText=`Login Streak: ${loginStreak}`;
}

// ==================== ROLL ====================
function roll(){
  if(!canRoll) return;
  canRoll=false;

  let total=rarities.reduce((s,r)=>s+1/r.number,0);
  let r=Math.random()*total,sum=0,hit;

  for(let x of rarities){
    sum+=1/x.number;
    if(r<=sum){hit=x;break;}
  }

  owned[hit.rarity]=(owned[hit.rarity]||0)+1;
  rollHistory.push(hit.rarity);
  if(rollHistory.length>5) rollHistory.shift();

  let mult=1+(upgrades.find(u=>u.id==="pointsMultiplier")?.level||0)*0.01;
  points+=(hit.number/2)*mult*Math.pow(1.5,rebirths)*Math.pow(1.5,prestiges);

  totalRolls++;
  updateAll();
  saveData();

  setTimeout(()=>canRoll=true,200);
}

// ==================== UI ====================
function updateOdds(){
  oddsPanel.innerHTML="";
  let total=rarities.reduce((s,r)=>s+1/r.number,0);

  rarities.forEach(r=>{
    let c=((1/r.number)/total*100);
    c=c<0.00000001?0:c;
    oddsPanel.innerHTML+=`
      <div class="odds-box">
        <span>${owned[r.rarity]?r.rarity:"???"}</span>
        <span>${owned[r.rarity]||0}</span>
        <span>${c.toFixed(8)}%</span>
      </div>`;
  });
}

function updateStats(){
  statsPanel.innerHTML=`
    Rolls: ${totalRolls}<br>
    Points: ${points.toFixed(1)}<br>
    Rebirths: ${rebirths}<br>
    Prestiges: ${prestiges}
  `;
}

function updateRollHistory(){
  rollHistoryDiv.innerHTML=rollHistory.join("<br>");
}

// ==================== UPGRADES ====================
function updateUpgrades(){
  upgradesPanel.innerHTML="";

  upgrades.forEach(u=>{
    savedUpgrades[u.id]={level:u.level||0,unlocked:u.unlocked||false,price:u.price};

    const canBuy=u.multiBuy
      ?u.level<u.maxLevel&&points>=u.price
      :!u.unlocked&&points>=u.price;

    const div=document.createElement("div");
    div.className="upgrade-box";
    div.innerHTML=`
      <strong>${u.name}</strong>
      <p>${u.description}</p>
      <span>${u.multiBuy
        ?`Lvl ${u.level}/${u.maxLevel} — ${u.price.toFixed(1)} pts`
        :u.unlocked?"Unlocked":`${u.price.toFixed(1)} pts`}
      </span>`;

    if(canBuy){
      div.onclick=()=>{
        points-=u.price;
        if(u.multiBuy){
          u.level++;
          u.price*=1.5;
          if(u.level>=u.maxLevel)u.unlocked=true;
        }else u.unlocked=true;
        popupMsg("Upgrade applied");
        updateUpgrades();
        updateStats();
        saveData();
      };
    }

    upgradesPanel.appendChild(div);
  });
}

// ==================== AUTO ROLL ====================
function stopAuto(){
  clearInterval(autoRollInterval);
  clearInterval(fastAutoRollInterval);
  autoRollInterval=null;
  fastAutoRollInterval=null;
}

autoRollBtn.onclick=()=>{
  stopAuto();
  autoRollInterval=setInterval(roll,1000);
};

fastAutoRollBtn.onclick=()=>{
  stopAuto();
  fastAutoRollInterval=setInterval(roll,500);
};

pickBtn.onclick=roll;

// ==================== RESET ====================
resetStatsBtn.onclick=async()=>{
  owned={}; rollHistory=[]; points=0; totalRolls=0;
  savedUpgrades={};
  upgrades=await fetch("upgrades.json").then(r=>r.json());
  updateAll();
  popupMsg("Reset complete");
};

// ==================== INIT ====================
async function init(){
  showPage(0); // 🔑 prevents stacking
  rarities=await fetch("rarities.json").then(r=>r.json());
  upgrades=await fetch("upgrades.json").then(r=>r.json());

  upgrades.forEach(u=>{
    if(savedUpgrades[u.id]) Object.assign(u,savedUpgrades[u.id]);
  });

  checkLogin();
  updateAll();
}

function updateAll(){
  updateOdds();
  updateStats();
  updateRollHistory();
  updateUpgrades();
}

init();