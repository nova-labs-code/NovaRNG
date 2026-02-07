let rarities = [];

// Load rarities
fetch("rarities.json")
  .then((res) => res.json())
  .then((data) => {
    rarities = data;
    showProbabilities();
  });

// Calculate normalized probabilities
function getNormalizedProbabilities() {
  const total = rarities.reduce((sum, r) => sum + 1 / r.number, 0);
  return rarities.map((r) => ({
    rarity: r.rarity,
    probability: (1 / r.number) / total,
  }));
}

// Display probabilities
function showProbabilities() {
  const panel = document.getElementById("probabilities");
  const probs = getNormalizedProbabilities();
  panel.innerHTML = `<h3>Current Odds</h3>`;
  probs.forEach((p) => {
    const percent = (p.probability * 100).toFixed(2);
    panel.innerHTML += `<div>${p.rarity}: ${percent}%</div>`;
  });
}

// Pick weighted rarity
function pickRarity() {
  const probs = getNormalizedProbabilities();
  let rand = Math.random();
  let cum = 0;
  for (let p of probs) {
    cum += p.probability;
    if (rand < cum) return p.rarity;
  }
  return probs[probs.length - 1]?.rarity;
}

// Button handler
document.getElementById("pick-btn").addEventListener("click", () => {
  const res = pickRarity();
  document.getElementById("result").textContent = `🎉 You got: ${res}!`;
});