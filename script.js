let rarities = [];
let rolledRarity = null; // Store the last rolled rarity

// Load rarities
fetch("rarities.json")
  .then(res => res.json())
  .then(data => {
    rarities = data;
    initOddsPanel();
  });

// Initialize odds panel with ??? and percentages
function initOddsPanel() {
  const panel = document.getElementById("odds-panel");
  const probs = rarities.map(r => ({ rarity: r.rarity, prob: 1/r.number }));
  const total = probs.reduce((s, p) => s + p.prob, 0);

  panel.innerHTML = "<h3>Current Odds</h3>";
  probs.forEach((p, i) => {
    const percent = ((p.prob/total)*100).toFixed(2);
    panel.innerHTML += `<div id="rarity-${i}">??? - ${percent}%</div>`;
  });
}

// Pick rarity weighted
function pickRarity() {
  const probs = rarities.map(r => ({ rarity: r.rarity, weight: 1/r.number }));
  const total = probs.reduce((s, p) => s + p.weight, 0);
  let rand = Math.random() * total;
  let cum = 0;
  for (let p of probs) {
    cum += p.weight;
    if (rand <= cum) return p.rarity;
  }
  return probs[probs.length-1].rarity;
}

// Roll button
document.getElementById("pick-btn").addEventListener("click", () => {
  const result = pickRarity();
  rolledRarity = result;
  document.getElementById("result").textContent = `🎉 You got: ${result}!`;
  revealRarity(result);
});

// Reveal rolled rarity on the odds page
function revealRarity(rarityName) {
  rarities.forEach((r, i) => {
    if(r.rarity === rarityName){
      document.getElementById(`rarity-${i}`).textContent = `${r.rarity} - ${((1/r.number)/rarities.reduce((s, x)=>s+1/x.number,0)*100).toFixed(2)}%`;
    }
  });
}

// Swipe between pages
let startX = 0;
document.addEventListener("touchstart", e => startX = e.touches[0].clientX);
document.addEventListener("touchend", e => {
  const endX = e.changedTouches[0].clientX;
  const pagesDiv = document.querySelector(".pages");
  if(startX - endX > 50){ // swipe left
    pagesDiv.style.transform = "translateX(-50%)";
  } else if(endX - startX > 50){ // swipe right
    pagesDiv.style.transform = "translateX(0%)";
  }
});