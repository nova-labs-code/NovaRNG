let rarities = [];
let rolledRarity = null;
let currentPage = 0;
const pages = [];

// Persistent storage
let stats = {};
let rollHistory = [];
let dailyRolls = {};
let lastVisit = null;
let loginStreak = 0;

// --- Auto-roll variables ---
let autoRolling = false;
let autoInterval = null;

fetch("rarities.json")
  .then(res=>res.json())
  .then(data=>{
    rarities = data;
    pages.push(document.getElementById("page1"));
    pages.push(document.getElementById("page2"));
    pages.push(document.getElementById("page3"));

    loadStorage();
    initOddsPanel();
    markOwnedRarities();
    renderRollHistory();
    renderStats();
    drawGraph();
    updateLoginStreak();
    updateAutoRollButtons();
  });

// --- Load storage ---
function loadStorage(){
  stats = JSON.parse(localStorage.getItem('novaRNGStats'))||{};
  rollHistory = JSON.parse(localStorage.getItem('novaRNGHistory'))||[];
  dailyRolls = JSON.parse(localStorage.getItem('novaRNGDaily'))||{};
  lastVisit = localStorage.getItem('novaRNGLastVisit')||null;
  loginStreak = parseInt(localStorage.getItem('novaRNGStreak'))||0;
}

// --- Roll ---
document.getElementById("pick-btn").addEventListener("click", ()=>roll());
document.addEventListener("keydown", e=>{ if(e.code=="Space") roll(); });

function roll(){
  const btn = document.getElementById("pick-btn");
  if(btn.disabled) return;
  btn.disabled=true;

  const result = pickRarity();
  rolledRarity=result;

  // Result animation
  const resElem = document.getElementById("result");
  const textEl = resElem.querySelector(".result-text");
  textEl.textContent = `🎉 You got: ${result}!`;

  const wipe = document.createElement("div");
  wipe.className="wipe-bar";
  resElem.appendChild(wipe);

  setTimeout(()=>{
    wipe.remove();
    setTimeout(()=>btn.disabled=false,500);
  },650);

  updateStats(result);
  updateRollHistory(result);
  updateDaily(result);
  revealRarity(result);
  drawGraph();
  updateAutoRollButtons();
}

// --- Weighted RNG ---
function pickRarity(){
  const total = rarities.reduce((s,r)=>s+1/r.number,0);
  let rand=Math.random()*total;
  let cum=0;
  for(let r of rarities){
    cum+=1/r.number;
    if(rand<=cum) return r.rarity;
  }
  return rarities[rarities.length-1].rarity;
}

// --- Odds ---
function initOddsPanel(){
  const panel=document.getElementById("odds-panel");
  const total=rarities.reduce((s,r)=>s+1/r.number,0);
  panel.innerHTML="<h3>Current Odds</h3>";
  rarities.forEach((r,i)=>{
    const percent=((1/r.number)/total*100).toFixed(2);
    panel.innerHTML+=`<div id="rarity-${i}">??? - ${percent}%</div>`;
  });
}

function revealRarity(name){
  rarities.forEach((r,i)=>{
    const el=document.getElementById(`rarity-${i}`);
    const total=rarities.reduce((s,x)=>s+1/x.number,0);
    const percent=((1/r.number)/total*100).toFixed(2);
    if(stats[r.rarity]) el.classList.add("rarity-owned");
    else el.classList.remove("rarity-owned");
    if(r.rarity===name) el.textContent=`${r.rarity} - ${percent}%`;
  });
}

function markOwnedRarities(){
  rarities.forEach((r,i)=>{
    const el=document.getElementById(`rarity-${i}`);
    const total=rarities.reduce((s,x)=>s+1/x.number,0);
    const percent=((1/r.number)/total*100).toFixed(2);
    if(stats[r.rarity]) { el.classList.add("rarity-owned"); el.textContent=`${r.rarity} - ${percent}%`; }
    else { el.classList.remove("rarity-owned"); el.textContent=`??? - ${percent}%`; }
  });
}

// --- Stats ---
function updateStats(name){ if(!stats[name]) stats[name]=0; stats[name]++; localStorage.setItem('novaRNGStats',JSON.stringify(stats)); renderStats();}
function renderStats(){
  const panel=document.getElementById("stats-panel");
  panel.innerHTML='';
  const totalRolls=Object.values(stats).reduce((a,b)=>a+b,0);
  panel.innerHTML+=`<div>Total Rolls: ${totalRolls}</div>`;
  rarities.forEach(r=>{
    const count=stats[r.rarity]||0;
    const percent=totalRolls>0?((count/totalRolls)*100).toFixed(2):"0.00";
    const barLength=Math.min(100,(percent*2));
    panel.innerHTML+=`<div>${r.rarity}: ${count} (${percent}%) <div style="background:#ffdd55;height:8px;width:${barLength}px;"></div></div>`;
  });
}

// --- Roll History ---
function updateRollHistory(name){ rollHistory.unshift(name); if(rollHistory.length>5) rollHistory.pop(); localStorage.setItem('novaRNGHistory',JSON.stringify(rollHistory)); renderRollHistory();}
function renderRollHistory(){
  const container=document.getElementById("roll-history");
  container.innerHTML="<strong>Roll History (last 5):</strong><br>";
  rollHistory.forEach(r=>{
    let color="";
    if(r=="Legendary") color="#ff5555";
    else if(r=="Rare") color="#ffdd55";
    else if(r=="Uncommon") color="#55ffff";
    else color="#ffffff";
    container.innerHTML+=`<div style="color:${color}">${r}</div>`;
  });
}

// --- Daily graph ---
function updateDaily(name){
  const today=(new Date()).toISOString().slice(0,10);
  if(!dailyRolls[today]) dailyRolls[today]={};
  if(!dailyRolls[today][name]) dailyRolls[today][name]=0;
  const rarityNum = rarities.find(r=>r.rarity===name).number;
  dailyRolls[today][name]+=rarityNum;
  localStorage.setItem('novaRNGDaily',JSON.stringify(dailyRolls));
}

function drawGraph(){
  const canvas=document.getElementById("stats-graph");
  const ctx=canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const dates=[];
  for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); dates.push(d.toISOString().slice(0,10)); }
  const maxValue=Math.max(...dates.map(date=>{
    const day=dailyRolls[date]||{};
    return Object.values(day).reduce((a,b)=>a+b,0);
  }),1);
  const barWidth=canvas.width/dates.length-5;
  dates.forEach((date,i)=>{
    const day=dailyRolls[date]||{};
    const value=Object.values(day).reduce((a,b)=>a+b,0);
    const height=(value/maxValue)*canvas.height;
    ctx.fillStyle="#ffdd55";
    ctx.fillRect(i*(barWidth+5),canvas.height-height,barWidth,height);
    ctx.fillStyle="#eee";
    ctx.font="10px monospace";
    ctx.fillText(date.slice(5), i*(barWidth+5), canvas.height-2);
  });
}

// --- Login streak ---
function updateLoginStreak(){
  const today=(new Date()).toDateString();
  const streakElem=document.getElementById("login-streak");
  if(lastVisit){
    const last=new Date(lastVisit);
    const diff=(new Date(today)-last)/(1000*60*60*24);
    if(diff==1) loginStreak++;
    else if(diff>1) loginStreak=1;
  } else loginStreak=1;
  streakElem.textContent=`Login Streak: ${loginStreak}`;
  localStorage.setItem('novaRNGStreak',loginStreak);
  localStorage.setItem('novaRNGLastVisit',today);
  lastVisit=today;
}

// --- Reset button ---
document.getElementById("reset-stats").addEventListener("click",()=>{
  stats={}; rollHistory=[]; dailyRolls={};
  localStorage.removeItem('novaRNGStats');
  localStorage.removeItem('novaRNGHistory');
  localStorage.removeItem('novaRNGDaily');
  renderStats(); renderRollHistory(); drawGraph(); initOddsPanel(); markOwnedRarities();
});

// --- Auto-roll buttons ---
autoBtn.addEventListener("click", ()=>toggleAutoRoll(autoBtn));
fastBtn.addEventListener("click", ()=>toggleAutoRoll(fastBtn));

autoBtn.onmouseover = ()=>{
  if(autoBtn.disabled){
    tooltip.textContent=`Need ${Math.max(100-getTotalRolls(),0)} more rolls to unlock Auto Roll`;
  } else tooltip.textContent="";
};
fastBtn.onmouseover = ()=>{
  if(fastBtn.disabled){
    tooltip.textContent=`Need ${Math.max(1000-getTotalRolls(),0)} more rolls to unlock Fast Auto Roll`;
  } else tooltip.textContent="";
};

autoBtn.onclick = ()=>{ if(autoBtn.disabled) tooltip.textContent=`Need ${Math.max(100-getTotalRolls(),0)} more rolls to unlock Auto Roll`; };
fastBtn.onclick = ()=>{ if(fastBtn.disabled) tooltip.textContent=`Need ${Math.max(1000-getTotalRolls(),0)} more rolls to unlock Fast Auto Roll`; };

function toggleAutoRoll(btn){
  if(btn.disabled) return;
  if(autoRolling){
    autoRolling=false;
    clearTimeout(autoInterval);
    tooltip.textContent="Auto Roll stopped";
  } else {
    autoRolling=true;
    tooltip.textContent="Auto Roll started";
    autoRollLoop(btn);
  }
}

function autoRollLoop(btn){
  if(!autoRolling) return;
  const cooldown=parseInt(btn.dataset.cooldown || 1000);
  document.getElementById("pick-btn").click();
  autoInterval=setTimeout(()=>autoRollLoop(btn), cooldown+650);
}

// --- Total rolls ---
function getTotalRolls(){ return Object.values(stats).reduce((a,b)=>a+b,0); }

// --- Swipe pages ---
let startX=0;
document.addEventListener("touchstart", e=>startX=e.touches[0].clientX);
document.addEventListener("touchend", e=>{
  const endX=e.changedTouches[0].clientX;
  if(startX-endX>50) goToPage(Math.min(currentPage+1,pages.length-1));
  else if(endX-startX>50) goToPage(Math.max(currentPage-1,0));
});
function goToPage(idx){ currentPage=idx; pages.forEach((p,i)=>p.style.transform=`translateX(${100*(i-currentPage)}%)`);}