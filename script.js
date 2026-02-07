let rarities = [];
let rolledRarity = null;

// Load rarities
fetch("rarities.json")
  .then(res => res.json())
  .then(data => {
    rarities = data;
    initOddsPanel();
  });

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

// Pick weighted rarity
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

// Roll button with semi-transparent wipe + cooldown
document.getElementById("pick-btn").addEventListener("click", () => {
  const resultElem = document.getElementById("result");
  const button = document.getElementById("pick-btn");

  // Disable button until animation + cooldown finishes
  button.disabled = true;

  // Pick rarity immediately
  const result = pickRarity();
  rolledRarity = result;

  // Clear previous wipe bars but keep text (pre-under frame)
  if (!resultElem.querySelector(".result-text")) {
    const text = document.createElement("div");
    text.className = "result-text";
    text.textContent = `🎉 You got: ${result}!`;
    resultElem.appendChild(text);
  } else {
    resultElem.querySelector(".result-text").textContent = `🎉 You got: ${result}!`;
  }

  // Create semi-transparent wipe bar
  const wipe = document.createElement("div");
  wipe.className = "wipe-bar";
  resultElem.appendChild(wipe);

  // Remove wipe bar and apply 0.5s cooldown after animation
  setTimeout(() => {
    wipe.remove();
    setTimeout(() => {
      button.disabled = false;
    }, 500); // 0.5s cooldown
  }, 650); // matches animation duration

  // Update odds page
  revealRarity(result);
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

// Swipe detection
let startX = 0;
document.addEventListener("touchstart", e => startX = e.touches[0].clientX);
document.addEventListener("touchend", e => {
  const endX = e.changedTouches[0].clientX;
  const page1 = document.getElementById("page1");
  const page2 = document.getElementById("page2");

  if(startX - endX > 50){ // swipe left → page2
    page1.style.transform = "translateX(-100%)";
    page2.style.transform = "translateX(0%)";
  } else if(endX - startX > 50){ // swipe right → page1
    page1.style.transform = "translateX(0%)";
    page2.style.transform = "translateX(100%)";
  }
});