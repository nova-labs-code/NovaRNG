// -------------------- DATA STORAGE --------------------
let rarities = [];
let owned = JSON.parse(localStorage.getItem("owned")) || {};
let rollHistory = JSON.parse(localStorage.getItem("rollHistory")) || [];
let loginStreak = parseInt(localStorage.getItem("loginStreak")) || 0;
let totalRolls = parseInt(localStorage.getItem("totalRolls")) || 0;
let lastLogin = localStorage.getItem("lastLogin");
let points = parseFloat(localStorage.getItem("points")) || 0;
let rebirths = parseInt(localStorage.getItem("rebirths")) || 0;
let prestige = parseInt(localStorage.getItem("prestige")) || 0;

// -------------------- DOM ELEMENTS --------------------
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
const rebirthBtn = document.getElementById("rebirth-btn");
const prestigeBtn = document.getElementById("prestige-btn");

// -------------------- STATE --------------------
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
  currentPage=index;
}
let touchStartX=null;
pages.forEach(page=>{
  page.addEventListener("touchstart",e=> touchStartX=e.touches[0].clientX);
  page.addEventListener("touchend",e=>{
    if(!touchStartX) return;
    let delta=e.changedTouches[0].clientX - touchStartX;
    const SWIPE_THRESHOLD=80;
    if(delta>SWIPE_THRESHOLD) showPage(Math.max(0,currentPage-1));
    if(delta<-SWIPE_THRESHOLD) showPage(Math.min(pages.length-1,currentPage+1));
    touchStartX=null;
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
  popup.style.display="block";
  setTimeout(()=>{ popup.style.display="none"; },3000);
}

function saveData(){
  localStorage.setItem("owned", JSON.stringify(owned));
  localStorage.setItem("rollHistory", JSON.stringify(rollHistory.slice(-5)));
  localStorage.setItem("loginStreak", loginStreak);
  localStorage.setItem("totalRolls", totalRolls);
  localStorage.setItem("lastLogin", lastLogin);
  localStorage.setItem("points", points);
  localStorage.setItem("rebirths", rebirths);
  localStorage.setItem("prestige", prestige);
  localStorage.setItem("upgrades", JSON.stringify(upgrades.reduce((acc,u)=>{
    acc[u.id]={unlocked:u.unlocked, price:u.price, level:u.level||0};
    return acc;
  },{})));
}

// -------------------- LOGIN STREAK --------------------
function updateLoginStreak(){ loginStreakDiv.innerText=`Login Streak: ${loginStreak}`; }
function checkLoginStreak(){
  const today=new Date().toISOString().split("T")[0];
  if(lastLogin===today){ updateLoginStreak(); return; }
  if(lastLogin){
    const yesterday=new Date();
    yesterday.setDate(yesterday.getDate()-1);
    const yesterdayStr=yesterday.toISOString().split("T")[0];
    loginStreak=lastLogin===yesterdayStr?loginStreak+1:loginStreak;
  } else loginStreak=1;
  lastLogin=today;
  saveData();
  updateLoginStreak();
}

// -------------------- POINTS MULTIPLIER --------------------
function getPointsMultiplier(){
  let multiplier=1;
  const pm = upgrades.find(u=>u.id==="pointsMultiplier")?.level||0;
  multiplier *= 1 + (pm*0.05); // 5% per level
  multiplier *= Math.pow(1.5, rebirths);
  multiplier *= Math.pow(1.5, prestige);
  return multiplier;
}

// -------------------- OFFLINE ROLLING --------------------
function applyOfflineRolls(){
  const offline = upgrades.find(u=>u.id==="offlineRoll" && u.unlocked);
  if(!offline || !lastLogin) return;

  const now=new Date();
  const last=new Date(lastLogin);
  const msOffline=now-last;
  if(msOffline<=0) return;

  const rollsOffline = Math.floor(msOffline / 650);
  for(let i=0;i<rollsOffline;i++){
    if(rarities.length===0) break;
    let totalInverse = rarities.reduce((sum,r)=>sum+(1/r.number),0);
    let rand=Math.random()*totalInverse;
    let cumulative=0;
    let result;
    for(let r of rarities){ cumulative+=1/r.number; if(rand<=cumulative){ result=r; break; } }
    if(!result) continue;
    owned[result.rarity]=(owned[result.rarity]||0)+1;
    rollHistory.push(result.rarity);
    if(rollHistory.length>5) rollHistory.shift();
    points += (result.number/2)*getPointsMultiplier()*0.25; // offline 25%
    totalRolls++;
  }
}

// -------------------- ROLL --------------------
function roll(extra=0){
  if(!canRoll || rarities.length===0) return;
  canRoll=false;

  let rollsToDo=1+extra;
  let i=0;

  function singleRoll(){
    let totalInverse = rarities.reduce((sum,r)=>sum+(1/r.number),0);
    let rand=Math.random()*totalInverse;
    let cumulative=0;
    let result;
    for(let r of rarities){ cumulative+=1/r.number; if(rand<=cumulative){ result=r; break; } }

    const wipe=document.createElement("div");
    wipe.className="wipe-bar";
    resultDiv.appendChild(wipe);

    setTimeout(()=>{
      const resultText=resultDiv.querySelector(".result-text");
      if(resultText) resultText.innerText=result.rarity;
      owned[result.rarity]=(owned[result.rarity]||0)+1;
      rollHistory.push(result.rarity);
      if(rollHistory.length>5) rollHistory.shift();
      points += (result.number/2)*getPointsMultiplier();
      totalRolls++;

      updateRollHistory();
      updateOdds();
      updateStats();
      updateUpgrades();
      updateAutoRollButtons();
      saveData();
      resultDiv.removeChild(wipe);

      i++;
      if(i<rollsToDo) setTimeout(singleRoll,200);
      else canRoll=true;
    },650);
  }

  singleRoll();
}

// -------------------- UPDATE FUNCTIONS --------------------
function updateRollHistory(){ rollHistoryDiv.innerHTML="Last Rolls:<br>"+rollHistory.join("<br>"); }

function updateOdds(){
  oddsPanel.innerHTML="";
  if(rarities.length===0) return;
  let totalInverse = rarities.reduce((sum,r)=>sum+(1/r.number),0);
  rarities.forEach(r=>{
    const div=document.createElement("div");
    div.classList.add("odds-box");
    const color=getRarityColor(r.number);
    div.style.borderColor=color;
    const chancePercent = ((1/r.number)/totalInverse*100).toFixed(2);
    const countOwned = owned[r.rarity]||0;
    const displayName = countOwned>0?r.rarity:"???";
    div.innerHTML=`<span>${displayName}</span><span>${countOwned} owned</span><span>${chancePercent}%</span>`;
    div.style.background=countOwned>0?`${color}33`:"#1a1a1a";
    if(countOwned>0) div.classList.add("owned");
    oddsPanel.appendChild(div);
  });
}

function updateStats(){
  statsPanel.innerHTML=`Points: ${points.toFixed(0)}<br>
                        Total Rolls: ${totalRolls}<br>
                        Rebirths: ${rebirths}<br>
                        Prestige: ${prestige}<br>
                        Unique Rarities Owned: ${Object.values(owned).filter(v=>v>0).length}<br>
                        Last 5 Rolls:<br>${rollHistory.join("<br>")}`;
}

// -------------------- UPGRADES --------------------
let upgrades=[
  {id:"speed1", name:"Roll Speed +1", description:"Roll faster automatically.", basePrice:300, price:300, unlocked:false, type:"speed", level:0, maxLevel:5},
  {id:"speed2", name:"Roll Speed +2", description:"Even faster auto rolls.", basePrice:900, price:900, unlocked:false, type:"speed", level:0, maxLevel:3},
  {id:"luck1", name:"Luck +5%", description:"Better chance for rare rolls.", basePrice:600, price:600, unlocked:false, type:"luck", level:0, maxLevel:10},
  {id:"luck2", name:"Luck +10%", description:"Maximize rare chances.", basePrice:3000, price:3000, unlocked:false, type:"luck", level:0, maxLevel:5},
  {id:"extra1", name:"Extra Roll", description:"Gain 1 extra roll each time.", basePrice:900, price:900, unlocked:false, type:"extra", level:0, maxLevel:5},
  {id:"cooldown1", name:"Cooldown -0.1s", description:"Reduce roll cooldown slightly.", basePrice:1200, price:1200, unlocked:false, type:"cooldown", level:0, maxLevel:5},
  {id:"cooldown2", name:"Cooldown -0.2s", description:"Reduce roll cooldown more.", basePrice:3000, price:3000, unlocked:false, type:"cooldown", level:0, maxLevel:3},
  {id:"pointsMultiplier", name:"Points Multiplier", description:"Increase points gained per roll.", basePrice:3000, price:3000, unlocked:false, type:"points", level:0, maxLevel:1000},
  {id:"offlineRoll", name:"Offline Rolling", description:"Earn points while offline.", basePrice:15000, price:15000, unlocked:false, type:"special", level:0, maxLevel:1},
  {id:"autoUnlock", name:"Auto Roll Unlock", description:"Enable normal auto roll.", price:9000, unlocked:false, type:"auto"},
  {id:"fastAutoUnlock", name:"Fast Auto Roll Unlock", description:"Enable fast auto roll.", price:30000, unlocked:false, type:"auto"}
];

// Load saved upgrades
let savedUpgrades=JSON.parse(localStorage.getItem("upgrades"))||{};
upgrades.forEach(u=>{
  if(savedUpgrades[u.id]!==undefined){
    u.unlocked=savedUpgrades[u.id].unlocked;
    u.price=savedUpgrades[u.id].price || u.price;
    if(u.level!==undefined) u.level = savedUpgrades[u.id].level || 0;
  }
});

function updateUpgrades(){
  upgradesPanel.innerHTML="";
  upgrades.forEach(u=>{
    const div=document.createElement("div");
    div.className="upgrade-box";
    let levelText=(u.level!==undefined)?`Level: ${u.level}/${u.maxLevel}`:"";
    div.innerHTML=`<strong>${u.name}</strong><p>${u.description}</p>
                   <span>${u.unlocked?"✅ Unlocked":levelText + " | Cost: "+u.price.toFixed(0)+" pts"}</span>`;
    if(u.type!=="auto" && u.level<u.maxLevel && points>=u.price){
      div.style.cursor="pointer";
      div.addEventListener("click",()=>{
        points-=u.price;
        if(u.level!==undefined) u.level++;
        u.price=Math.min(u.basePrice*Math.pow(1.5,u.level||0),1e9);
        if(u.unlocked!==undefined) u.unlocked=true;
        savedUpgrades[u.id]={unlocked:u.unlocked, price:u.price, level:u.level||0};
        localStorage.setItem("upgrades",JSON.stringify(savedUpgrades));
        updateUpgrades();
        updateStats();
      });
    }
    upgradesPanel.appendChild(div);
  });
}

// -------------------- AUTO-ROLL --------------------
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
  autoRollBtn.disabled = !upgrades.find(u=>u.id==="autoUnlock" && u.unlocked);
  autoRollBtn.innerText = isAutoRolling?"⏹ Stop Auto Roll":"🎲 Auto Roll";
  fastAutoRollBtn.disabled = !upgrades.find(u=>u.id==="fastAutoUnlock" && u.unlocked);
  fastAutoRollBtn.innerText = isFastAutoRolling?"⏹ Stop Fast Auto Roll":"🎲 Fast Auto Roll";
}
function getExtraRolls(){ return upgrades.find(u=>u.id==="extra1" && u.unlocked)?1:0; }

// -------------------- REBIRTH & PRESTIGE --------------------
function canRebirth(){ return points>=500000; }
function doRebirth(){
  if(!canRebirth()) return showPopup("Need 500,000 points to rebirth!");
  points=0; rollHistory=[]; upgrades.forEach(u=>{ if(u.type!=="auto") u.level=0; u.price=u.basePrice; });
  rebirths++;
  saveData();
  showPopup(`Rebirth complete! Points multiplier x${(1.5**rebirths).toFixed(2)}`);
  updateStats();
}
function canPrestige(){ return rebirths>=1000; }
function doPrestige(){
  if(!canPrestige()) return showPopup("Need 1000 rebirths to prestige!");
  rebirths=0; points=0; rollHistory=[]; upgrades.forEach(u=>{ if(u.type!=="auto") u.level=0; u.price=u.basePrice; });
  prestige++;
  saveData();
  showPopup(`Prestige complete! All multipliers increased x${(1.5**prestige).toFixed(2)}`);
  updateStats();
}

// -------------------- EVENTS --------------------
pickBtn.addEventListener("click",()=>roll(getExtraRolls()));
autoRollBtn.addEventListener("click",()=>isAutoRolling?stopAutoRoll():startAutoRoll(1000));
fastAutoRollBtn.addEventListener("click",()=>isFastAutoRolling?stopAutoRoll():startAutoRoll(500));
rebirthBtn.addEventListener("click", doRebirth);
prestigeBtn.addEventListener("click", doPrestige);

resetStatsBtn.addEventListener("click",()=>{
  rollHistory=[]; owned={}; totalRolls=0; lastLogin=null; points=0; rebirths=0; prestige=0;
  upgrades.forEach(u=>{ if(u.type!=="auto") u.level=0; u.price=u.basePrice; u.unlocked=false; });
  savedUpgrades={};
  saveData();
  updateRollHistory(); updateOdds(); updateStats(); updateUpgrades(); updateAutoRollButtons(); updateLoginStreak();
  showPopup("Stats reset!");
});

// -------------------- INIT --------------------
function init(){
  fetch("rarities.json")
    .then(res=>res.json())
    .then(data=>{
      rarities=data;
      applyOfflineRolls();
      updateOdds(); updateStats(); updateUpgrades(); updateAutoRollButtons();
    });
  updateRollHistory();
  checkLoginStreak();
  showPage(0);
}

init();

// -------------------- BACKGROUND MUSIC --------------------
const bgMusicTracks = ["song1.mp3","song2.mp3","song3.mp3","song4.mp3"];
const preloadedMusic = bgMusicTracks.map(src=>{
  const audio=new Audio(src);
  audio.loop=true;
  audio.volume=0.25;
  audio.preload="auto";
  return audio;
});
let currentMusic = preloadedMusic[Math.floor(Math.random()*preloadedMusic.length)];
let musicStarted=false;
function startMusic(){
  if(!musicStarted){ currentMusic.play().catch(err=>console.log("Music blocked:",err)); musicStarted=true; }
}
["click","touchstart","keydown"].forEach(evt=> document.addEventListener(evt,startMusic,{once:true}));