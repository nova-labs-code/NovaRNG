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

// Stats and history
let stats = JSON.parse(localStorage.getItem('novaRNGStats')) || {};
let rollHistory = JSON.parse(localStorage.getItem('novaRNGHistory')) || [];
let lastVisit = localStorage.getItem('novaRNGLastVisit') || null;
let loginStreak = parseInt(localStorage.getItem('novaRNGStreak')) || 0;

// Initialize odds panel
function initOddsPanel() {
  const panel = document.getElementById("odds-panel");
  const total = rarities.reduce((sum,r)=>sum+1/r.number,0);
  panel.innerHTML = "<h3>Current Odds</h3>";
  rarities.forEach((r,i)=>{
    const percent = ((1/r.number)/total*100).toFixed(2);
    panel.innerHTML += `<div id="rarity-${i}">??? - ${percent}%</div>`;
  });
}

// Weighted pick
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

// Roll button
document.getElementById("pick-btn").addEventListener("click", () => {
  const resultElem = document.getElementById("result");
  const button = document.getElementById("pick-btn");

  button.disabled = true;
  const result = pickRarity();
  rolledRarity = result;

  // Result text
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

  // Update stats, odds, and history
  updateStats(result);
  revealRarity(result);
  addRollHistory(result);
});

// Reveal rarity
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

// Mark owned on load
function markOwnedRarities() {
  rarities.forEach((r,i)=>{
    const el = document.getElementById(`rarity-${i}`);
    const total = rarities.reduce((s,x)=>s+1/x.number,0);
    const percent = ((1/r.number)/total*100).toFixed(2);
    if(stats[r.rarity] && stats[r.rarity]>0){
      el.classList.add("rarity-owned");
      el.textContent = `${r.rarity} - ${percent}%`;
    } else {
      el.classList.remove("rarity-owned");
      el.textContent = `??? - ${percent}%`;
    }
  });
}

// Update stats
function updateStats(rarityName){
  if(!stats[rarityName]) stats[rarityName]=0;
  stats[rarityName]++;
  localStorage.setItem('novaRNGStats', JSON.stringify(stats));
  renderStats();
  markOwnedRarities();
}

// Roll history
function addRollHistory(rarity){
  rollHistory.unshift(rarity);
  if(rollHistory.length>10) rollHistory.pop();
  localStorage.setItem('novaRNGHistory', JSON.stringify(rollHistory));
  renderRollHistory();
}

function renderRollHistory(){
  let container = document.getElementById("roll-history");
  if(!container){
    container = document.createElement("div");
    container.id = "roll-history";
    document.getElementById("page1").appendChild(container);
  }
  container.innerHTML = "<strong>Roll History:</strong><br>" +
    rollHistory.map(r=>colorRarity(r)).join(", ");
}

// Color-coded roll
function colorRarity(r){
  const colorMap = {
    "Common":"#eee",
    "Uncommon":"#ffdd55",
    "Rare":"#ff8800",
    "Legendary":"#ff5555"
  };
  return `<span style="color:${colorMap[r] || '#fff'}">${r}</span>`;
}

// Login streak
function updateLoginStreak(){
  const today = new Date().toDateString();
  if(lastVisit){
    const lastDate = new Date(lastVisit);
    const diff = (new Date(today) - lastDate)/(1000*60*60*24);
    if(diff===1) loginStreak++;
    else if(diff>1) loginStreak=1;
  } else loginStreak=1;
  localStorage.setItem('novaRNGStreak', loginStreak);
  localStorage.setItem('novaRNGLastVisit', today);
  document.getElementById("login-streak").textContent = `Login Streak: ${loginStreak} day${loginStreak>1?"s":""}`;
}

// Render stats page
function renderStats(){
  const panel = document.getElementById("stats-panel");
  panel.innerHTML = '';
  const totalRolls = Object.values(stats).reduce((a,b)=>a+b,0);
  panel.innerHTML += `<div>Total Rolls: ${totalRolls}</div>`;
  rarities.forEach(r=>{
    const count = stats[r.rarity]||0;
    const percent = totalRolls>0 ? ((count/totalRolls)*100).toFixed(2) : "0.00";
    panel.innerHTML += `<div>${r.rarity}: ${count} (${percent}%)</div>`;
  });
}

// Reset stats
document.getElementById("reset-stats").addEventListener("click", ()=>{
  stats={};
  rollHistory=[];
  localStorage.removeItem('novaRNGStats');
  localStorage.removeItem('novaRNGHistory');
  renderStats();
  initOddsPanel();
  markOwnedRarities();
  renderRollHistory();
});

// Swipe pages
let startX = 0;
document.addEventListener("touchstart", e => startX = e.touches[0].clientX);
document.addEventListener("touchend", e => {
  const endX = e.changedTouches[0].clientX;
  const pages = [document.getElementById("page1"),document.getElementById("page2"),document.getElementById("page3")];
  let currentIndex = pages.findIndex(p => getComputedStyle(p).transform.includes('matrix(1, 0, 0, 1, 0, 0)'));
  if(currentIndex===-1) currentIndex=0;
  if(startX - endX > 50){
    const nextIndex = Math.min(currentIndex+1,pages.length-1);
    pages.forEach((p,i)=> p.style.transform=`translateX(${100*(i-nextIndex)}%)`);
  } else if(endX - startX >50){
    const prevIndex = Math.max(currentIndex-1,0);
    pages.forEach((p,i)=> p.style.transform=`translateX(${100*(i-prevIndex)}%)`);
  }
});

// Spacebar roll
document.addEventListener("keydown", e=>{
  if(e.code==="Space"){
    e.preventDefault();
    document.getElementById("pick-btn").click();
  }
});