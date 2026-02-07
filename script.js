let rarities = [];
let currentPage = 0; // 0 = main RNG, 1 = extras

// Load rarities from JSON
fetch("rarities.json")
  .then(res => res.json())
  .then(data => {
    rarities = data;
    showProbabilities();
  })
  .catch(err => console.error("Failed to load rarities:", err));

// Calculate normalized probabilities
function getNormalizedProbabilities() {
  const total = rarities.reduce((sum, r) => sum + 1 / r.number, 0);
  return rarities.map(r => ({
    rarity: r.rarity,
    probability: (1 / r.number) / total
  }));
}

// Display only percentages (no names)
function showProbabilities() {
  const panel = document.getElementById("probabilities");
  const probs = getNormalizedProbabilities();
  panel.innerHTML = `<h3>Current Odds</h3>`;
  probs.forEach(p => {
    panel.innerHTML += `<div>${(p.probability*100).toFixed(2)}%</div>`;
  });
}

// Pick a rarity
function pickRarity() {
  const probs = getNormalizedProbabilities();
  let rand = Math.random();
  let cumulative = 0;
  for (const p of probs) {
    cumulative += p.probability;
    if (rand < cumulative) return p.rarity;
  }
  return probs[probs.length - 1]?.rarity;
}

// Roll button
document.getElementById("pick-btn").addEventListener("click", () => {
  const resultElem = document.getElementById("result");
  const rarity = pickRarity();
  resultElem.textContent = `🎉 You got: ${rarity}!`;
});

// Back button to page 1
document.getElementById("back-btn").addEventListener("click", () => {
  goToPage(0);
});

// Function to switch pages
function goToPage(pageIndex) {
  const pagesDiv = document.querySelector(".pages");
  pagesDiv.style.transform = `translateX(-${pageIndex * 50}vw)`; // 50vw per page
  currentPage = pageIndex;
}

// Swipe detection for touch devices
let startX = 0;
document.addEventListener("touchstart", e => { startX = e.touches[0].clientX; });
document.addEventListener("touchend", e => {
  const endX = e.changedTouches[0].clientX;
  if (endX - startX > 50) goToPage(0);   // swipe right
  else if (startX - endX > 50) goToPage(1); // swipe left
});