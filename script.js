// -------------------- DATA STORAGE --------------------
let rarities = [];
let upgrades = [];
let savedUpgrades = JSON.parse(localStorage.getItem("upgrades")) || {};
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
let fastAutoRollInterval = null;
let isAutoRolling = false;
let isFastAutoRolling = false;

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
  localStorage.setItem("lastLogin", lastLogin);
  localStorage.setItem("points", points);
  localStorage.setItem("rebirths", rebirths);
  localStorage.setItem("prestiges", prestiges);
  localStorage.setItem("upgrades", JSON.stringify(savedUpgrades));
}

// -------------------- LOGIN STREAK --------------------
function updateLoginStreak(){ loginStreakDiv.innerText = `Login Streak: ${loginStreak}`; }

function checkLoginStreak() {
  const today = new Date().toISOString().split("T")[0];
  if(lastLogin===today){ updateLoginStreak(); return; }
  if(lastLogin){
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    loginStreak = lastLogin===yesterdayStr ? loginStreak+1 : 1; 
  } else loginStreak=1;
  lastLogin=today;
  saveData();
  updateLoginStreak();
}

// -------------------- ROLL --------------------
function roll(extra=0){
  if(!canRoll || rarities.length===0) return;
  canRoll=false;
  let rollsToDo = 1 + extra;
  let i=0;

  function singleRoll(){
    // Calculate total inverse chance
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
      resultDiv.querySelector(".result-text").innerText=resultRarity.rarity;
      owned[resultRarity.rarity]=(owned[resultRarity.rarity]||0)+1;
      rollHistory.push(resultRarity.rarity);
      if(rollHistory.length>5) rollHistory.shift();
      
      let multiplier = 1 + (upgrades.find(u=>u.id==="pointsMultiplier")?.level||0) * 0.01;
      points += (resultRarity.number / 2) * multiplier * Math.pow(1.5, rebirths) * Math.pow(1.5, prestiges);
      
      totalRolls++;
      updateRollHistory();
      updateOdds();
      updateStatsText();
      updateUpgrades();
      updateAutoRollButtons();
      saveData();
      resultDiv.removeChild(wipe);

      i++;
      if(i<rollsToDo){
        setTimeout(singleRoll, 200);
      } else canRoll=true;
    },650);
  }

  singleRoll();
}

// -------------------- UPDATE FUNCTIONS --------------------
function updateRollHistory(){ rollHistoryDiv.innerHTML = "Last Rolls:<br>" + rollHistory.join("<br>"); }

function updateOdds(){
  oddsPanel.innerHTML = "";
  let totalInverse = rarities.reduce((sum,r)=>sum+(1/r.number),0);
  rarities.forEach(r=>{
    const div=document.createElement("div");
    div.classList.add("odds-box");
    const color=getRarityColor(r.number);

    // Show chance with 8 decimals
    let chancePercent = ((1/r.number)/totalInverse*100);
    chancePercent = chancePercent < 0.00000001 ? 0 : chancePercent;
    chancePercent = chancePercent.toFixed(8);

    const countOwned = owned[r.rarity]||0;
    const displayName = countOwned>0?r.rarity:"???";
    div.innerHTML=`<span>${displayName}</span><span>${countOwned} owned</span><span>${chancePercent}%</span>`;
    div.style.borderColor=color;
    div.style.background=countOwned>0?`${color}33`:"#1a1a1a";
    if(countOwned>0) div.classList.add("owned");
    oddsPanel.appendChild(div);
  });
}

function updateStatsText(){
  statsPanel.innerHTML=`
    Total Rolls: ${totalRolls}<br>
    Points: ${points.toFixed(1)}<br>
    Rebirths: ${rebirths} (x${Math.pow(1.5, rebirths).toFixed(2)})<br>
    Prestiges: ${prestiges} (x${Math.pow(1.5, prestiges).toFixed(2)})<br>
    Unique Rarities Owned: ${Object.values(owned).filter(v=>v>0).length}<br>
    Last 5 Rolls:<br>${rollHistory.join("<br>")}
  `;
}

// -------------------- UPGRADES --------------------
function updateUpgrades(){
  upgradesPanel.innerHTML="";
  upgrades.forEach(u=>{
    const div=document.createElement("div");
    div.className="upgrade-box";
    
    if(u.multiBuy){
      const pct = ((u.level||0)/(u.maxLevel||1))*100;
      div.style.background = `linear-gradient(to right, #55aa55 ${pct}%, #222 ${pct}%)`;
      div.style.border = "2px solid #444";
    } else {
      div.style.background = u.unlocked?"#55aa55":"#222";
      div.style.border = u.unlocked?"2px solid #55ff55":"2px solid #444";
    }
    
    div.innerHTML = `<strong>${u.name}</strong><p>${u.description}</p><span>${u.multiBuy?"Level: "+(u.level||0)+"/"+(u.maxLevel||1):u.unlocked?"✅ Unlocked":"Cost: "+u.price+" pts"}</span>`;

    if((u.multiBuy && (u.level||0)<(u.maxLevel||1) && points>=u.price) || (!u.multiBuy && !u.unlocked && points>=u.price)){
      div.style.cursor="pointer";
      div.addEventListener("click", ()=>{
        if(u.multiBuy){
          if((u.level||0)<(u.maxLevel||1) && points>=u.price){
            points -= u.price;
            u.level = (u.level||0)+1;
            u.price *= 1.5;
            if(u.level >= u.maxLevel) u.unlocked = true;
            savedUpgrades[u.id] = {level:u.level, unlocked:u.unlocked, price:u.price};
            showPopup(`${u.name} upgraded! Level: ${u.level}`);
          }
        } else {
          points -= u.price;
          u.unlocked = true;
          savedUpgrades[u.id] = {unlocked:true, price:u.price};
          showPopup(`${u.name} unlocked!`);
        }
        saveData();
        updateUpgrades();
        updateStatsText();
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
  autoRollBtn.disabled = !upgrades.find(u=>u.id==="autoRoll" && u.unlocked);
  autoRollBtn.innerText = isAutoRolling?"⏹ Stop Auto Roll":"🎲 Auto Roll";
  fastAutoRollBtn.disabled = !upgrades.find(u=>u.id==="fastAuto" && u.unlocked);
  fastAutoRollBtn.innerText = isFastAutoRolling?"⏹ Stop Fast Auto Roll":"🎲 Fast Auto Roll";
}

function getExtraRolls(){
  return upgrades.find(u=>u.id==="extra1" && (u.level||0)>0)?1:0;
}

// -------------------- EVENTS --------------------
pickBtn.addEventListener("click", ()=> roll(getExtraRolls()));
autoRollBtn.addEventListener("click", ()=>{ isAutoRolling?stopAutoRoll():startAutoRoll(1000); });
fastAutoRollBtn.addEventListener("click", ()=>{ isFastAutoRolling?stopAutoRoll():startAutoRoll(500); });

resetStatsBtn.addEventListener("click", async ()=>{
  rollHistory=[]; owned={}; totalRolls=0; lastLogin=null; points=0; rebirths=0; prestiges=0;
  savedUpgrades={};

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

// -------------------- INIT --------------------
async function init(){
  rarities = await fetch("rarities.json").then(res=>res.json());
  upgrades = await fetch("upgrades.json").then(res=>res.json());

  // Merge saved upgrades
  upgrades.forEach(u=>{
    if(savedUpgrades[u.id]!==undefined){
      u.level = savedUpgrades[u.id].level||0;
      u.unlocked = savedUpgrades[u.id].unlocked||false;
      u.price = savedUpgrades[u.id].price||u.price;
    } else if(u.multiBuy) u.level = 0;
  });

  updateOdds();
  updateStatsText();
  updateAutoRollButtons();
  updateUpgrades();
  updateRollHistory();
  checkLoginStreak();
  showPage(0);
}

init();

// -------------------- BACKGROUND MUSIC --------------------
const bgMusicTracks = ["song1.mp3","song2.mp3","song3.mp3","song4.mp3"];
let currentMusic = null;
let musicStarted = false;

function playRandomMusic(){
  if(currentMusic){
    currentMusic.pause();
    currentMusic.currentTime = 0;
  }
  const trackSrc = bgMusicTracks[Math.floor(Math.random()*bgMusicTracks.length)];
  currentMusic = new Audio(trackSrc);
  currentMusic.volume = 0.25;
  currentMusic.preload = "auto";

  // When a song ends, pick a new random one
  currentMusic.addEventListener("ended", playRandomMusic);

  currentMusic.play().catch(err=>{
    console.log("Music blocked, will start on interaction:", err);
  });
}

// Start music on first user interaction
function startMusic(){
  if(!musicStarted){
    playRandomMusic();
    musicStarted = true;
  }
}

["click","touchstart","keydown"].forEach(evt=>{
  document.addEventListener(evt, startMusic, {once:true});
});