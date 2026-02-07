let rarities = [];
let rolledRarity = null;

// Load rarities
fetch("rarities.json")
  .then(res => res.json())
  .then(data => {
    rarities = data;
    initOddsPanel();
    renderStats();
    markOwnedRarities(); // mark owned on load
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

  // Semi-transparent wipe bar
  const wipe = document.createElement("div");
  wipe.className = "wipe-bar";
  resultElem.appendChild(wipe);

  // Remove wipe + cooldown
  setTimeout(() => {
    wipe.remove();
    setTimeout(() => { button.disabled = false; }, 500);
  }, 650);

  // Update stats & save
  updateStats(result);

  // Reveal odds & mark owned
  revealRarity(result);
});

// Reveal rarity on odds page and mark owned dynamically
function revealRarity(rarityName){
  const total = rarities.reduce((s,x)=>s+1/x.number,0);
  rarities.forEach((r,i)=>{
    const el = document.getElementById(`rarity-${i}`);
    const percent = ((1/r.number)/total*100).toFixed(2);
    if(stats[r.rarity]) {
      el.classList.add("rarity-owned");
    } else {
      el.classList.remove("rarity-owned");
    }
    if(r.rarity === rarityName){
      el.textContent = `${r.rarity} - ${percent}%`;
    }
  });
}

// Mark owned rarities on site load and reveal their name
function markOwnedRarities() {
  const total = rarities.reduce((s,x)=>s+1/x.number,0);
  rarities.forEach((r,i)=>{
    const el = document.getElementById(`rarity-${i}`);
    const percent = ((1/r.number)/total*100).toFixed(2);

    if(stats[r.rarity] && stats[r.rarity] > 0){
      el.classList.add("rarity-owned");
      // Show the actual rarity name instead of ???
      el.textContent = `${r.rarity} - ${percent}%`;
    } else {
      el.classList.remove("rarity-owned");
      el.textContent = `??? - ${percent}%`;
    }
  });
}
// Update stats and save
function updateStats(rarityName){
  if(!stats[rarityName]) stats[rarityName] = 0;
  stats[rarityName]++;
  localStorage.setItem('novaRNGStats', JSON.stringify(stats));
  renderStats();
  markOwnedRarities();
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
  initOddsPanel();
  markOwnedRarities();
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

  let currentIndex = pages.findIndex(p => {
    const transform = getComputedStyle(p).transform;
    if(transform === 'none') return true;
    return transform.includes('matrix(1, 0, 0, 1, 0, 0)');
  });
  if(currentIndex === -1) currentIndex = 0;

  if(startX - endX > 50){ // swipe left
    const nextIndex = Math.min(currentIndex+1, pages.length-1);
    pages.forEach((p,i)=> p.style.transform = `translateX(${100*(i-nextIndex)}%)`);
  } else if(endX - startX > 50){ // swipe right
    const prevIndex = Math.max(currentIndex-1,0);
    pages.forEach((p,i)=> p.style.transform = `translateX(${100*(i-prevIndex)}%)`);
  }
});