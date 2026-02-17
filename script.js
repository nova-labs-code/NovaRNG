// ===================== DATA =====================
let rarities = [];
let upgrades = [];
let owned = JSON.parse(localStorage.getItem("owned")) || {};
let rollHistory = JSON.parse(localStorage.getItem("rollHistory")) || [];
let loginStreak = parseInt(localStorage.getItem("loginStreak")) || 0;
let totalRolls = parseInt(localStorage.getItem("totalRolls")) || 0;
let lastLogin = localStorage.getItem("lastLogin");
let points = parseFloat(localStorage.getItem("points")) || 0;
let rebirths = parseInt(localStorage.getItem("rebirths")) || 0;
let prestiges = parseInt(localStorage.getItem("prestiges")) || 0;

// ===================== STATE =====================
let canRoll = true;
let autoRollInterval = null;
let isAutoRolling = false;
let isFastAutoRolling = false;
let currentTheme = localStorage.getItem("theme") || "dark";
let isMuted = localStorage.getItem("muted") === "true" || false;
let currentVolume = parseFloat(localStorage.getItem("volume")) || 0.25;
let currentMusic = null;
let musicStarted = false;

// ===================== DOM =====================
const pages = document.querySelectorAll(".page");
let currentPage = 0;

const resultDiv = document.getElementById("result");
const rollHistoryDiv = document.getElementById("roll-history");
const loginStreakDiv = document.getElementById("login-streak");
const statsPanel = document.getElementById("stats-panel");
const oddsPanel = document.getElementById("odds-panel");
const upgradesPanel = document.getElementById("upgrades-panel");
const popup = document.getElementById("popup");

// Buttons
const pickBtn = document.getElementById("pick-btn");
const autoRollBtn = document.getElementById("auto-roll-btn");
const fastAutoRollBtn = document.getElementById("fast-auto-roll-btn");
const resetStatsBtn = document.getElementById("reset-stats");

// Settings
const themeSelect = document.getElementById("theme-select");
const volumeInput = document.getElementById("volume-input");
const muteCheckbox = document.getElementById("mute-checkbox");

// ===================== PAGE SWIPE =====================
let startX = null;
let isSwiping = false;

function showPage(index){
    pages.forEach((page,i)=>{
        page.style.transform = `translateX(${(i-index)*100}%)`;
    });
    currentPage = index;
}

pages.forEach(page=>{
    page.addEventListener("touchstart", e=>{
        startX = e.touches[0].clientX;
        isSwiping = true;
    });
    page.addEventListener("touchmove", e=>{
        if(!isSwiping) return;
        const deltaX = e.touches[0].clientX - startX;
        pages.forEach((p,i)=>{
            p.style.transition = "none";
            p.style.transform = `translateX(${(i-currentPage)*100 + deltaX/window.innerWidth*100}%)`;
        });
    });
    page.addEventListener("touchend", e=>{
        if(!isSwiping) return;
        const deltaX = e.changedTouches[0].clientX - startX;
        isSwiping = false;
        pages.forEach(p=>p.style.transition="transform 0.5s ease");
        if(deltaX > 50) showPage(Math.max(0,currentPage-1));
        else if(deltaX < -50) showPage(Math.min(pages.length-1,currentPage+1));
        else showPage(currentPage);
    });
});

// ===================== HELPERS =====================
function getRarityColor(number){
    if(number <= 100) return "#aaaaaa";
    if(number <= 215) return "#55ff55";
    if(number <= 330) return "#55aaff";
    if(number <= 400) return "#ffdd55";
    return "#aa55ff";
}

function showPopup(msg){
    popup.innerText = msg;
    popup.style.display = "block";
    setTimeout(()=>popup.style.display="none",3000);
}

function saveData(){
    localStorage.setItem("owned", JSON.stringify(owned));
    localStorage.setItem("rollHistory", JSON.stringify(rollHistory.slice(-5)));
    localStorage.setItem("loginStreak", loginStreak);
    localStorage.setItem("totalRolls", totalRolls);
    localStorage.setItem("lastLogin", lastLogin);
    localStorage.setItem("points", points);
    localStorage.setItem("rebirths", rebirths);
    localStorage.setItem("prestiges", prestiges);
    localStorage.setItem("theme", currentTheme);
    localStorage.setItem("muted", isMuted);
    localStorage.setItem("volume", currentVolume);
    const upgradeSave = {};
    upgrades.forEach(u=>{
        upgradeSave[u.id] = {level:u.level||0, unlocked:u.unlocked||false, price:u.price};
    });
    localStorage.setItem("upgrades", JSON.stringify(upgradeSave));
}

// ===================== LOGIN =====================
function updateLoginStreak(){loginStreakDiv.innerText = `Login Streak: ${loginStreak}`;}

function checkLoginStreak(){
    const today = new Date().toISOString().split("T")[0];
    if(lastLogin === today){ updateLoginStreak(); return; }
    if(lastLogin){
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate()-1);
        loginStreak = lastLogin === yesterday.toISOString().split("T")[0]? loginStreak+1:1;
    } else loginStreak=1;
    lastLogin=today;
    saveData();
    updateLoginStreak();
}

// ===================== ROLL =====================
function getRandomRarity(){
    const total = rarities.reduce((s,r)=>s+1/r.number,0);
    let rand = Math.random()*total, acc=0;
    for(const r of rarities){
        acc += 1/r.number;
        if(rand <= acc) return r;
    }
}

function getExtraRolls(){
    const upgrade = upgrades.find(u=>u.id==="extra1");
    return upgrade?.level ? Math.min(upgrade.level,5) : 0;
}

function roll(extra=0){
    if(!canRoll || rarities.length===0) return;
    canRoll=false;
    const rolls = 1+extra;
    const results=[];
    for(let i=0;i<rolls;i++) results.push(getRandomRarity());

    const wipe = document.createElement("div");
    wipe.className="wipe-bar";
    resultDiv.appendChild(wipe);

    setTimeout(()=>{
        resultDiv.querySelector(".result-text").innerHTML = results.map(r=>`<span style="color:${getRarityColor(r.number)}">${r.rarity}</span>`).join("<br>");
        results.forEach(r=>{
            owned[r.rarity]=(owned[r.rarity]||0)+1;
            rollHistory.push(r.rarity);
            points += r.number/2;
            totalRolls++;
        });
        rollHistory = rollHistory.slice(-5);
        updateRollHistory();
        updateOdds();
        updateStatsText();
        updateUpgrades();
        updateAutoRollButtons();
        saveData();
        resultDiv.removeChild(wipe);
        canRoll=true;
    }, 500);
}

// ===================== PANELS =====================
function updateRollHistory(){ rollHistoryDiv.innerHTML="Last Rolls:<br>"+rollHistory.join("<br>"); }

function updateOdds(){
    oddsPanel.innerHTML="";
    const total = rarities.reduce((s,r)=>s+1/r.number,0);
    rarities.forEach(r=>{
        const ownedCount = owned[r.rarity] || 0;
        const chance = ((1/r.number)/total*100).toFixed(4);
        const div = document.createElement("div");
        div.className="odds-box";
        div.style.borderColor = getRarityColor(r.number);
        div.style.background = ownedCount?`${getRarityColor(r.number)}33`:"#1a1a1a";
        div.innerHTML = `<span>${ownedCount?r.rarity:"???"}</span><span>${ownedCount} owned</span><span>${chance}%</span>`;
        oddsPanel.appendChild(div);
    });
}

function updateStatsText(){
    statsPanel.innerHTML=`
        Total Rolls: ${totalRolls}<br>
        Points: ${points.toFixed(1)}<br>
        Rebirths: ${rebirths}<br>
        Prestiges: ${prestiges}<br>
        Unique Owned: ${Object.values(owned).filter(v=>v>0).length}
    `;
}

// ===================== UPGRADES =====================
function updateUpgrades(){
    upgradesPanel.innerHTML="";
    upgrades.forEach(u=>{
        const div = document.createElement("div");
        div.className="upgrade-box";
        let levelText = u.multiBuy || u.infinite ? `Level: ${u.level||0}` : u.unlocked?"✅ Unlocked":"🔒 Locked";
        div.innerHTML = `<strong>${u.name}</strong><p>${u.description}</p><span>${levelText}</span><span>Cost: ${Math.ceil(u.price)} pts</span>`;
        const canBuy = (u.multiBuy && !u.infinite && (u.level||0) < (u.maxLevel||1) && points>=u.price)
                       || (!u.multiBuy && !u.unlocked && points>=u.price)
                       || (u.infinite && points>=u.price);
        if(canBuy) div.onclick = ()=>{buyUpgrade(u);};
        upgradesPanel.appendChild(div);
    });
}

function buyUpgrade(u){
    points -= u.price;
    if(u.multiBuy && !u.infinite){ u.level=(u.level||0)+1; u.price=Math.ceil(u.price*1.5); if(u.level>=u.maxLevel) u.unlocked=true; }
    else if(u.infinite) u.level=(u.level||0)+1; u.price=Math.ceil(u.price*1.5);
    else u.unlocked=true;
    showPopup(`${u.name} purchased`);
    saveData();
    updateUpgrades();
    updateStatsText();
}

// ===================== AUTO ROLL =====================
function startAutoRoll(interval){
    stopAutoRoll();
    autoRollInterval = setInterval(()=>{if(canRoll) roll(getExtraRolls());}, interval);
    isAutoRolling = interval===1000;
    isFastAutoRolling = interval===500;
}

function stopAutoRoll(){
    clearInterval(autoRollInterval);
    autoRollInterval=null;
    isAutoRolling=false;
    isFastAutoRolling=false;
}

function updateAutoRollButtons(){
    autoRollBtn.innerText = isAutoRolling?"Stop Auto Roll":"Auto Roll";
    fastAutoRollBtn.innerText = isFastAutoRolling?"Stop Fast Auto Roll":"Fast Auto Roll";
}

// ===================== MUSIC =====================
const SONG_COUNT=21, SONG_PREFIX="song", SONG_EXT=".mp3"; let lastSong=null;
function getRandomSong(){let idx; do{idx=Math.floor(Math.random()*SONG_COUNT)+1;}while(idx===lastSong&&SONG_COUNT>1); lastSong=idx; return `${SONG_PREFIX}${idx}${SONG_EXT}`;}

function playRandomMusic(){
    if(currentMusic){currentMusic.pause(); currentMusic.currentTime=0;}
    const track=getRandomSong();
    currentMusic=new Audio(track);
    currentMusic.volume=currentVolume;
    currentMusic.loop=false;
    currentMusic.muted=isMuted;
    currentMusic.addEventListener("ended",playRandomMusic);
    currentMusic.play().catch(()=>{});
}

function startMusic(){if(!musicStarted){playRandomMusic(); musicStarted=true;}}

// ===================== SETTINGS =====================
function applyTheme(theme){
    currentTheme=theme;
    document.body.dataset.theme=theme;
    if(theme==="dark"){document.body.style.background="radial-gradient(circle at top,#111 0%,#050505 60%)"; document.body.style.color="#eee";}
    else if(theme==="light"){document.body.style.background="#f0f0f0"; document.body.style.color="#111";}
    else if(theme==="blue"){document.body.style.background="linear-gradient(135deg,#1e3c72,#2a5298)"; document.body.style.color="#fff";}
    localStorage.setItem("theme",currentTheme);
}

function setVolume(v){
    currentVolume = v/100;
    isMuted = v===0;
    if(currentMusic){currentMusic.volume=currentVolume; currentMusic.muted=isMuted;}
    localStorage.setItem("volume",currentVolume);
    localStorage.setItem("muted",isMuted);
}

// ===================== EVENTS =====================
pickBtn.onclick=()=>roll(getExtraRolls());
autoRollBtn.onclick=()=>isAutoRolling?stopAutoRoll():startAutoRoll(1000);
fastAutoRollBtn.onclick=()=>isFastAutoRolling?stopAutoRoll():startAutoRoll(500);
resetStatsBtn.onclick=()=>{
    owned={}; rollHistory=[]; totalRolls=0; points=0; rebirths=0; prestiges=0;
    localStorage.removeItem("upgrades");
    saveData();
    updateUpgrades(); updateStatsText(); updateOdds(); showPopup("Stats reset");
};
themeSelect.onchange = ()=>applyTheme(themeSelect.value);
volumeInput.oninput = ()=>setVolume(parseInt(volumeInput.value));
muteCheckbox.onchange = ()=>{isMuted=muteCheckbox.checked; if(currentMusic) currentMusic.muted=isMuted; localStorage.setItem("muted",isMuted);}
["click","touchstart","keydown"].forEach(evt=>document.addEventListener(evt,startMusic,{once:true}));

// ===================== INIT =====================
async function init(){
    rarities = await fetch("rarities.json").then(r=>r.json());
    upgrades = await fetch("upgrades.json").then(r=>r.json());
    const saved = JSON.parse(localStorage.getItem("upgrades"))||{};
    upgrades.forEach(u=>{
        const s = saved[u.id];
        if(s){u.level=s.level; u.unlocked=s.unlocked; u.price=s.price;}
        else{u.level=u.multiBuy||u.infinite?0:undefined; u.unlocked=false;}
    });
    updateOdds(); updateStatsText(); updateUpgrades(); updateRollHistory(); checkLoginStreak();
    updateAutoRollButtons(); showPage(0); applyTheme(currentTheme);
    volumeInput.value=currentVolume*100; muteCheckbox.checked=isMuted;

    // Auto-roll on start only if upgrades unlocked
    if(upgrades.find(u=>u.id==="autoRoll"&&u.unlocked)) startAutoRoll(1000);
    if(upgrades.find(u=>u.id==="fastAuto"&&u.unlocked)) startAutoRoll(500);
}

init();