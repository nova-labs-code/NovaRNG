let rarities = [];

// Load rarities from JSON
fetch("rarities.json")
  .then((res) => res.json())
  .then((data) => {
    rarities = data;
    showProbabilities();
  })
  .catch((err) => console.error("Failed to load rarities:", err));

// Calculate normalized probabilities (1/number)
function getNormalizedProbabilities() {
  const total = rarities.reduce((sum, r) => sum + 1 / r.number, 0);
  return rarities.map((r) => ({
    rarity: r.rarity,
    probability: (1 / r.number) / total,
  }));
}

// Display probabilities in the panel
function showProbabilities() {
  const panel = document.getElementById("probabilities");
  const probs = getNormalizedProbabilities();
  panel.innerHTML = `<h3>Current Odds</h3>`;
  probs.forEach((p) => {
    const percent = (p.probability * 100).toFixed(2);
    panel.innerHTML += `<div>${p.rarity}: ${percent}%</div>`;
  });
}

// Pick a rarity based on weighted probabilities
function pickRarity() {
  const probs = getNormalizedProbabilities();
  let rand = Math.random();
  let cumulative = 0;
  for (let p of probs) {
    cumulative += p.probability;
    if (rand < cumulative) return p.rarity;
  }
  return probs[probs.length - 1]?.rarity; // fallback
}

// Button click handler with roll animation
document.getElementById("pick-btn").addEventListener("click", () => {
  const resultElem = document.getElementById("result");

  // Start rolling animation
  resultElem.textContent = "";
  resultElem.classList.add("rolling");

  // Wait 700ms to simulate roll
  setTimeout(() => {
    const rarity = pickRarity();
    resultElem.classList.remove("rolling");
    resultElem.textContent = `🎉 You got: ${rarity}!`;
  }, 700);
});