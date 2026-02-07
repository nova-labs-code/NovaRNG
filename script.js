let rarities = [];
let rolledRarity = null;

// Load rarities
fetch("rarities.json")
  .then(res => res.json())
  .then(data => {
    rarities = data;
    initOddsPanel();
    renderStats(); // initial stats render
  });

// Stats saved in localStorage
let stats = JSON.parse(localStorage.getItem('novaRNGStats')) || {};

// Initialize odds panel with ??? %
function initOddsPanel() {
  const panel = document.getElementById("odds-panel");
  const total = rarities.reduce((sum,r)=>sum+1/r.number,0);
  panel.innerHTML = "<h3>Current Odds</h3>";
  rarities.forEach((r,i)=>{
    const percent = ((1/r.number)/total*100).toFixed(2);
    panel.innerHTML += `<div id="rarity-${i}">??? - ${percent}%</div>`;
  });
}

// Weighted RNG pick
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

  // Update text under frame
  const textEl = resultElem.querySelector(".result-text");
  textEl.textContent = `🎉 You got: ${result}!`;

  // Add semi-transparent wipe bar
  const wipe = document.createElement("div");
  wipe.className = "wipe-bar";
  resultElem.appendChild(wipe);

  // Remove wipe bar after animation + 0.5s cooldown
  setTimeout(() => {
    wipe.remove();
    setTimeout(() => { button.disabled = false; }, 500);
  }, 650);

  // Reveal odds
  revealRarity(result);

  // Update stats
  updateStats(result);
});

// Reveal rarity on odds page
function revealRarity(rarityName){
  rarities.forEach((r,i)=>{
    if(r.rarity === rarityName){
      const total = rarities.reduce((s,x)=>s+1/x.number,0);
      const percent = ((1/r.number)/total*100).toFixed(2);
      document.getElementById(`rarity-${i}`).textContent = `${r.rarity} - ${percent}%`;
    }
  });
}

// Update stats and save
function updateStats(rarityName){
  if(!stats[rarityName]) stats[rarityName] = 0;
  stats[rarityName]++;
  localStorage.setItem('novaRNGStats', JSON.stringify(stats));
  renderStats();
}

// Render stats page
function renderStats(){
  const panel = document.getElementById("stats-panel");
  panel.innerHTML = '';
  const totalRolls = Object.values(stats).reduce((a,b)=>a+b,0);
  panel.innerHTML += `<div>Total Rolls: ${totalRolls}</div>`;
  rarities.forEach(r=>{
    const count = stats[r.rarity] || 0;
    const percent = totalRolls>0 ? ((count/totalRolls)*100).toFixed(2) : "0.00";
    panel.innerHTML += `<div>${r.rarity}: ${count} (${percent}%)</div>`;
  });
}

// Reset stats button
document.getElementById("reset-stats").addEventListener("click", ()=>{
  stats = {};
  localStorage.removeItem('novaRNGStats');
  renderStats();
});

// Swipe detection for 3 pages
let startX = 0;
document.addEventListener("touchstart", e => startX = e.touches[0].clientX);
document.addEventListener("touchend", e => {
  const endX = e.changedTouches[0].clientX;
  const pages = [
    document.getElementById("page1"),
    document.getElementById("page2"),
    document.getElementById("page3")
  ];
  let currentIndex = pages.findIndex(p => p.style.transform === "translateX(0%)" || p.style.transform === "");

  if(startX - endX > 50){ // swipe left
    const nextIndex = Math.min(currentIndex+1, pages.length-1);
    pages.forEach((p,i)=> p.style.transform = `translateX(${100*(i-nextIndex)}%)`);
  } else if(endX - startX > 50){ // swipe right
    const prevIndex = Math.max(currentIndex-1,0);
    pages.forEach((p,i)=> p.style.transform = `translateX(${100*(i-prevIndex)}%)`);
  }
});