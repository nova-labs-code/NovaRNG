let rarities = [];

// Load rarities
fetch("rarities.json")
  .then(res => res.json())
  .then(data => {
    rarities = data;
    showProbabilities();
  });

// Show only percentages
function showProbabilities() {
  const panel = document.getElementById("probabilities");
  const probs = rarities.map(r => ({ prob: 1/r.number }));
  const total = probs.reduce((s, p) => s + p.prob, 0);
  panel.innerHTML = "<h3>Current Odds</h3>";
  probs.forEach((p) => {
    panel.innerHTML += `<div>${((p.prob/total)*100).toFixed(2)}%</div>`;
  });
}

// Pick weighted rarity
function pickRarity() {
  const probs = rarities.map(r => ({ rarity: r.rarity, weight: 1/r.number }));
  const total = probs.reduce((s, p) => s + p.weight, 0);
  let rand = Math.random()*total;
  let cum = 0;
  for (let p of probs) {
    cum += p.weight;
    if (rand <= cum) return p.rarity;
  }
  return probs[probs.length-1].rarity;
}

// Roll button
document.getElementById("pick-btn").addEventListener("click", () => {
  const rarity = pickRarity();
  document.getElementById("result").textContent = `🎉 You got: ${rarity}!`;
});

// Page navigation
function goToPage(page) {
  if(page===0){
    document.getElementById("page1").style.transform = "translateX(0)";
    document.getElementById("page2").style.transform = "translateX(100%)";
  } else {
    document.getElementById("page1").style.transform = "translateX(-100%)";
    document.getElementById("page2").style.transform = "translateX(0)";
  }
}

// Back button
document.getElementById("back-btn").addEventListener("click", ()=>goToPage(0));

// Optional swipe detection
let startX = 0;
document.addEventListener("touchstart", e=>startX=e.touches[0].clientX);
document.addEventListener("touchend", e=>{
  let endX = e.changedTouches[0].clientX;
  if(startX-endX>50) goToPage(1);
  if(endX-startX>50) goToPage(0);
});