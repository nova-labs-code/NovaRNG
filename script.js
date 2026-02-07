let rarities = [];
let stats = {};
let rollHistory = [];
let dailyRolls = {};
let lastVisit = null;
let loginStreak = 0;
let autoRolling = false;
let autoInterval = null;
let rolledRarity = null;

const pages = [
  document.getElementById("page1"),
  document.getElementById("page2"),
  document.getElementById("page3")
];
let currentPage = 0;

// Buttons
const pickBtn = document.getElementById("pick-btn");
const autoBtn = document.getElementById("auto-roll-btn");
const fastBtn = document.getElementById("fast-auto-roll-btn");
const popup = document.getElementById("popup");

// --- Load rarities from JSON ---
fetch("rarities.json")
  .then(res => res.json())
  .then(data => {
    rarities = data;
    initApp();
  });

// --- Initialize App ---
function initApp() {
  // Load storage
  stats = JSON.parse(localStorage.getItem('novaRNGStats'))||{};
  rollHistory = JSON.parse(localStorage.getItem('novaRNGHistory'))||[];
  dailyRolls = JSON.parse(localStorage.getItem('novaRNGDaily'))||{};
  lastVisit = localStorage.getItem('novaRNGLastVisit')||null;
  loginStreak = parseInt(localStorage.getItem('novaRNGStreak'))||0;

  updateLoginStreak();
  renderRollHistory();
  updateAutoRollButtons();
}

// --- Login streak ---
function updateLoginStreak(){
  const today=(new Date()).toDateString();
  if(lastVisit){
    const last=new Date(lastVisit);
    const diff=(new Date(today)-last)/(1000*60*60*24);
    if(diff===1) loginStreak++;
    else if(diff>1) loginStreak=1;
  } else loginStreak=1;
  document.getElementById("login-streak").textContent=`Login Streak: ${loginStreak}`;
  localStorage.setItem('novaRNGStreak',loginStreak);
  localStorage.setItem('novaRNGLastVisit',today);
  lastVisit=today;
}

// --- Total rolls ---
function getTotalRolls(){ return Object.values(stats).reduce((a,b)=>a+b,0); }

// --- Popup ---
function showPopup(msg){
  popup.textContent=msg;
  popup.style.display="block";
  setTimeout(()=>popup.style.display="none",3000);
}

// --- Update auto-roll buttons ---
function updateAutoRollButtons(){
  const total=getTotalRolls();
  autoBtn.disabled = total<100;
  autoBtn.dataset.cooldown=1000;
  fastBtn.disabled = total<1000;
  fastBtn.dataset.cooldown=500;
}

// --- Roll ---
pickBtn.addEventListener("click",()=>roll());
autoBtn.addEventListener("click",()=>toggleAuto(autoBtn));
fastBtn.addEventListener("click",()=>toggleAuto(fastBtn));

function roll(){
  if(pickBtn.disabled) return;
  pickBtn.disabled=true;

  const result=pickRarity();
  rolledRarity=result;

  const resElem=document.getElementById("result");
  const textEl=resElem.querySelector(".result-text");
  textEl.textContent=`🎲 ${result}!`;

  const wipe=document.createElement("div");
  wipe.className="wipe-bar";
  resElem.appendChild(wipe);
  setTimeout(()=>{
    wipe.remove();
    setTimeout(()=>pickBtn.disabled=false,500);
  },650);

  // Update stats
  if(!stats[result]) stats[result]=0;
  stats[result]++;
  rollHistory.unshift(result);
  if(rollHistory.length>5) rollHistory.pop();

  localStorage.setItem('novaRNGStats',JSON.stringify(stats));
  localStorage.setItem('novaRNGHistory',JSON.stringify(rollHistory));

  renderRollHistory();
  updateAutoRollButtons();
}

function pickRarity(){
  const total=rarities.reduce((s,r)=>s+1/r.number,0);
  let rand=Math.random()*total;
  let cum=0;
  for(let r of rarities){
    cum+=1/r.number;
    if(rand<=cum) return r.rarity;
  }
  return rarities[rarities.length-1].rarity;
}

function renderRollHistory(){
  const container=document.getElementById("roll-history");
  container.innerHTML="<strong>Last 5 Rolls:</strong><br>";
  rollHistory.forEach(r=>{
    container.innerHTML+=`<div>${r}</div>`;
  });
}

// --- Auto-roll ---
function toggleAuto(btn){
  if(btn.disabled){
    const needed = btn===autoBtn ? 100-getTotalRolls() : 1000-getTotalRolls();
    showPopup(`Need ${needed} more rolls to unlock`);
    return;
  }
  if(autoRolling){ autoRolling=false; clearTimeout(autoInterval); showPopup("Auto Roll stopped"); }
  else{ autoRolling=true; showPopup("Auto Roll started"); autoRollLoop(btn); }
}

function autoRollLoop(btn){
  if(!autoRolling) return;
  const cooldown=parseInt(btn.dataset.cooldown||1000);
  pickBtn.click();
  autoInterval=setTimeout(()=>autoRollLoop(btn), cooldown+650);
}

// --- Swipe pages ---
let startX=0;
document.addEventListener("touchstart",e=>startX=e.touches[0].clientX);
document.addEventListener("touchend",e=>{
  const endX=e.changedTouches[0].clientX;
  if(startX-endX>50) goToPage(Math.min(currentPage+1,pages.length-1));
  else if(endX-startX>50) goToPage(Math.max(currentPage-1,0));
});
function goToPage(idx){ currentPage=idx; pages.forEach((p,i)=>p.style.transform=`translateX(${100*(i-currentPage)}%)`);}