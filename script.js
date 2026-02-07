let rarities = [];
let rolledRarity = null;

// Load rarities
fetch("rarities.json")
  .then(res => res.json())
  .then(data => {
    rarities = data;
    initOddsPanel();
    renderStats();
    markOwnedRarities();
    renderRollHistory();
    updateLoginStreak();
  });

// Persistent storage
let stats = JSON.parse(localStorage.getItem('novaRNGStats')) || {};
let rollHistory = JSON.parse(localStorage.getItem('novaRNGHistory')) || [];
let lastVisit = localStorage.getItem('novaRNGLastVisit') || null;
let loginStreak = parseInt(localStorage.getItem('novaRNGStreak')) || 0;

// --- Page 1: Roll Button ---
document.getElementById("pick-btn").addEventListener("click", () => {
  const resultElem = document.getElementById("result");
  const button = document.getElementById("pick-btn");
  button.disabled = true;

  const result = pickRarity();
  rolledRarity = result;

  // Show result text
  const textEl = resultElem.querySelector(".result-text");
  textEl.textContent = `🎉 You got: ${result}!`;

  // Wipe animation
  const wipe = document.createElement("div");
  wipe.className = "wipe-bar";
  resultElem.appendChild(wipe);

  setTimeout(() => {
    wipe.remove();
    setTimeout(() => { button.disabled = false; }, 500);
  }, 650);

  // Update stats/history
  updateStats(result);
  updateRollHistory(result);
  revealRarity(result);
});

// Weighted RNG
function pickRarity() {
  const total = rarities.reduce((sum,r)=>sum+1/r.number,0);
  let rand = Math.random() * total;
  let cum = 0;
  for(let i=0;i<rarities.length;i++){
    cum += 1/rarities[i].number;
    if(rand <= cum) return rarities[i].rarity;
  }
  return rarities[rarities.length-1].rarity;
}

// --- Odds Page ---
function initOddsPanel() {
  const panel = document.getElementById("odds-panel");
  const total = rarities.reduce((sum,r)=>sum+1/r.number,0);
  panel.innerHTML = "<h3>Current Odds</h3>";
  rarities.forEach((r,i)=>{
    const percent = ((1/r.number)/total*100).toFixed(2);
    panel.innerHTML += `<div id="rarity-${i}">??? - ${percent}%</div>`;
  });
}

function revealRarity(rarityName){
  const total = rarities.reduce((s,x)=>s+1/x.number,0);
  rarities.forEach((r,i)=>{
    const el = document.getElementById(`rarity-${i}`);
    const percent = ((1/r.number)/total*100).toFixed(2);
    if(stats[r.rarity]) el.classList.add("rarity-owned");
    else el.classList.remove("rarity-owned");
    if(r.rarity === rarityName) el.textContent = `${r.rarity} - ${percent}%`;
  });
}

function markOwnedRarities() {
  const total = rarities.reduce((s,x)=>s+1/x.number,0);
  rarities.forEach((r,i)=>{
    const el = document.getElementById(`rarity-${i}`);
    const percent = ((1/r.number)/total*100).toFixed(2);
    if(stats[r.rarity]) el.classList.add("rarity-owned");
    else el.classList.remove("rarity-owned");
    if(stats[r.rarity]) el.textContent = `${r.rarity} - ${percent}%`;
    else el.textContent = `??? - ${percent}%`;
  });
}

// --- Stats Page ---
function updateStats(rarityName){
  if(!stats[rarityName]) stats[rarityName]=0;
  stats[rarityName]++;
  localStorage.setItem('novaRNGStats', JSON.stringify(stats));
  renderStats();
  markOwnedRarities();
}

function renderStats(){
  const panel = document.getElementById("stats-panel");
  panel.innerHTML='';
  const totalRolls = Object.values(stats).reduce((a,b)=>a+b,0);
  panel.innerHTML += `<div>Total Rolls: ${totalRolls}</div>`;
  rarities.forEach(r=>{
    const count = stats[r.rarity]||0;
    const percent = totalRolls>0?((count/totalRolls)*100).toFixed(2):"0.00";
    // Optional simple bar chart using inline div
    const barLength = Math.min(100,(percent*2)); // scale for visual
    panel.innerHTML += `<div>${r.rarity}: ${count} (${percent}%) <div style="background:#ffdd55;height:8px;width:${barLength}px;"></div></div>`;
  });
}

document.getElementById("reset-stats").addEventListener("click", ()=>{
  stats={};
  rollHistory=[];
  localStorage.removeItem('novaRNGStats');
  localStorage.removeItem('novaRNGHistory');
  renderStats();
  renderRollHistory();
  initOddsPanel();
  markOwnedRarities();
});

// --- Roll History (last 5 rolls) ---
function updateRollHistory(rarityName){
  rollHistory.unshift(rarityName);
  if(rollHistory.length>5) rollHistory.pop(); // only last 5
  localStorage.setItem('novaRNGHistory', JSON.stringify(rollHistory));
  renderRollHistory();
}

function renderRollHistory(){
  const container = document.getElementById("roll-history");
  if(!container) return;
  container.innerHTML = "<strong>Roll History (last 5):</strong><br>";
  rollHistory.forEach(r=>{
    let color="";
    if(r=="Legendary") color="#ff5555";
    else if(r=="Rare") color="#ffdd55";
    else if(r=="Uncommon") color="#55ffff";
    else color="#ffffff";
    container.innerHTML += `<div style="color:${color}">${r}</div>`;
  });
}

// --- Login Streak ---
function updateLoginStreak(){
  const today = new Date().toDateString();
  const streakElem = document.getElementById("login-streak");

  if(lastVisit){
    const last = new Date(lastVisit);
    const diff = (new Date(today) - last)/(1000*60*60*24);
    if(diff==1) loginStreak++;
    else if(diff>1) loginStreak=1; // reset streak
  } else loginStreak=1;

  streakElem.textContent = `Login Streak: ${loginStreak}`;
  localStorage.setItem('novaRNGStreak', loginStreak);
  localStorage.setItem('novaRNGLastVisit', today);
  lastVisit=today;
}

// --- Swipe Detection ---
let startX=0;
document.addEventListener("touchstart", e=>startX=e.touches[0].clientX);
document.addEventListener("touchend", e=>{
  const endX = e.changedTouches[0].clientX;
  const pages=[document.getElementById("page1"),
               document.getElementById("page2"),
               document.getElementById("page3")];
  let currentIndex = pages.findIndex(p=>{
    const t=getComputedStyle(p).transform;
    if(t=='none') return true;
    return t.includes('matrix(1,0,0,1,0,0)');
  });
  if(currentIndex==-1) currentIndex=0;

  if(startX-endX>50){ // swipe left
    const nextIndex = Math.min(currentIndex+1,pages.length-1);
    pages.forEach((p,i)=>p.style.transform=`translateX(${100*(i-nextIndex)}%)`);
  } else if(endX-startX>50){ // swipe right
    const prevIndex = Math.max(currentIndex-1,0);
    pages.forEach((p,i)=>p.style.transform=`translateX(${100*(i-prevIndex)}%)`);
  }
});

// --- Keyboard roll shortcut ---
document.addEventListener("keydown", e=>{
  if(e.code=="Space") document.getElementById("pick-btn").click();
});