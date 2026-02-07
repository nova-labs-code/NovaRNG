let rarities = [];

// Load rarities from JSON
fetch('rarities.json')
  .then(response => response.json())
  .then(data => {
    rarities = data;
    displayProbabilities();
  })
  .catch(err => console.error("Failed to load rarities:", err));

// Calculate normalized probabilities
function getNormalizedProbabilities() {
  const totalWeight = rarities.reduce((sum, r) => sum + 1 / r.number, 0);
  return rarities.map(r => ({
    rarity: r.rarity,
    probability: (1 / r.number) / totalWeight
  }));
}

// Display probabilities
function displayProbabilities() {
  const container = document.getElementById('probabilities');
  const probs = getNormalizedProbabilities();
  container.innerHTML = "<h3>Probabilities:</h3>";
  probs.forEach(p => {
    container.innerHTML += `<div>${p.rarity}: ${(p.probability*100).toFixed(2)}%</div>`;
  });
}

// Pick a random rarity based on probabilities
function pickRarity() {
  const probs = getNormalizedProbabilities();
  let rand = Math.random();
  let cumulative = 0;

  for (const p of probs) {
    cumulative += p.probability;
    if (rand < cumulative) {
      return p.rarity;
    }
  }
  return probs[probs.length - 1].rarity; // fallback
}

// Button click
document.getElementById('pick-btn').addEventListener('click', () => {
  const result = pickRarity();
  document.getElementById('result').innerText = `🎉 You got: ${result}!`;
});