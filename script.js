// --- Audio Engine (Web Audio API Synthesizer) ---
let audioCtx = null;
let audioEnabled = true;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSynthTone(freq, type, duration, gainValue) {
  if (!audioEnabled || !audioCtx) return;
  
  try {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(gainValue, audioCtx.currentTime);
    // Smooth decay
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn("Audio play failed:", e);
  }
}

// 1. Tick Sound (Shuffling)
function playTick() {
  playSynthTone(600 + Math.random() * 200, 'sine', 0.05, 0.08);
}

// 2. Winner Reveal Sound (Single landing)
function playWinnerReveal() {
  playSynthTone(523.25, 'triangle', 0.15, 0.15); // C5
  setTimeout(() => {
    playSynthTone(659.25, 'triangle', 0.25, 0.15); // E5
  }, 80);
}

// 3. Triumph Sound (All done!)
function playTriumph() {
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
  notes.forEach((freq, index) => {
    setTimeout(() => {
      playSynthTone(freq, 'sine', 0.4, 0.15);
    }, index * 100);
  });
}


// --- Confetti Particle System ---
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let confettiAnimationId = null;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class ConfettiParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 8 + 6;
    this.color = `hsl(${Math.random() * 360}, 85%, 60%)`;
    this.speedX = Math.random() * 8 - 4;
    this.speedY = Math.random() * -12 - 6; // Explode upward
    this.gravity = 0.35;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 8 - 4;
    this.opacity = 1;
  }
  
  update() {
    this.speedY += this.gravity;
    this.x += this.speedX;
    this.y += this.speedY;
    this.rotation += this.rotationSpeed;
    if (this.y > canvas.height) {
      this.opacity -= 0.015;
    }
  }
  
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.opacity;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

function launchConfetti() {
  // Clear previous confetti animation if running
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
  }
  particles = [];
  
  // Create particles from two sources on left and right side of viewport
  const leftSourceX = canvas.width * 0.15;
  const rightSourceX = canvas.width * 0.85;
  const sourceY = canvas.height * 0.8;
  
  for (let i = 0; i < 70; i++) {
    particles.push(new ConfettiParticle(leftSourceX, sourceY));
    particles.push(new ConfettiParticle(rightSourceX, sourceY));
  }
  
  animateConfetti();
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Filter out completely faded particles
  particles = particles.filter(p => p.opacity > 0);
  
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  
  if (particles.length > 0) {
    confettiAnimationId = requestAnimationFrame(animateConfetti);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}


// --- Main Application State & Logic ---
let drawMode = 'number'; // 'number' or 'name'
let isDrawing = false;
let currentWinners = [];

// DOM Elements
const soundToggleBtn = document.getElementById('sound-toggle');
const soundStatusText = document.getElementById('sound-status-text');

const tabNumber = document.getElementById('tab-number');
const tabName = document.getElementById('tab-name');
const paneNumber = document.getElementById('control-number-pane');
const paneName = document.getElementById('control-name-pane');

const numMinInput = document.getElementById('num-min');
const numMaxInput = document.getElementById('num-max');
const nameListInput = document.getElementById('name-list');
const drawCountInput = document.getElementById('draw-count');

const boardContainer = document.getElementById('board-container');
const drawStatus = document.getElementById('draw-status');
const btnDraw = document.getElementById('btn-draw');
const btnReset = document.getElementById('btn-reset');

const resultBoard = document.getElementById('result-board');
const winnerCardsContainer = document.getElementById('winner-cards');
const btnCopy = document.getElementById('btn-copy');
const historyList = document.getElementById('history-list');

// Default tasks to prefill chore inputs
const defaultChores = ['바닥 쓸기 🧹', '바닥 닦기 🧽', '칠판 닦기 🧼', '쓰레기통 비우기 🗑️', '책상 정돈 🪑', '창문 닦기 🪟', '분리수거 ♻️'];

// --- Event Listeners ---

// Initialize sound on first page interaction
document.body.addEventListener('click', initAudio, { once: true });

// Sound Toggle
soundToggleBtn.addEventListener('click', () => {
  audioEnabled = !audioEnabled;
  if (audioEnabled) {
    initAudio();
    soundToggleBtn.classList.remove('muted');
    soundStatusText.textContent = '효과음 켜짐';
  } else {
    soundToggleBtn.classList.add('muted');
    soundStatusText.textContent = '효과음 꺼짐';
  }
});

// Mode Tabs Selection
tabNumber.addEventListener('click', () => {
  if (isDrawing) return;
  setDrawMode('number');
});

tabName.addEventListener('click', () => {
  if (isDrawing) return;
  setDrawMode('name');
});

function setDrawMode(mode) {
  drawMode = mode;
  if (mode === 'number') {
    tabNumber.classList.add('active');
    tabNumber.setAttribute('aria-selected', 'true');
    tabName.classList.remove('active');
    tabName.setAttribute('aria-selected', 'false');
    paneNumber.style.display = 'block';
    paneName.style.display = 'none';
  } else {
    tabName.classList.add('active');
    tabName.setAttribute('aria-selected', 'true');
    tabNumber.classList.remove('active');
    tabNumber.setAttribute('aria-selected', 'false');
    paneName.style.display = 'block';
    paneNumber.style.display = 'none';
  }
  resetApp(false); // Reset display board, keep settings
}

// Action Buttons
btnDraw.addEventListener('click', startDrawSequence);
btnReset.addEventListener('click', () => resetApp(true));
btnCopy.addEventListener('click', copyResultsToClipboard);

// --- Initialization ---
resetApp(true);

// --- Core Helper Functions ---

// 1. Reset Application
function resetApp(fullReset = true) {
  if (isDrawing) return;
  
  currentWinners = [];
  drawStatus.textContent = '';
  drawStatus.style.color = 'var(--secondary)';
  resultBoard.style.display = 'none';
  winnerCardsContainer.innerHTML = '';
  
  if (fullReset) {
    if (drawMode === 'number') {
      numMinInput.value = 1;
      numMaxInput.value = 30;
    }
    drawCountInput.value = 5;
  }
  
  // Show placeholder inside board
  boardContainer.innerHTML = `
    <div class="grid-placeholder">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <p>추첨 시작 버튼을 누르면 당번 선정이 진행됩니다.</p>
    </div>
  `;
  
  btnDraw.disabled = false;
  btnDraw.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
    </svg>
    당번 추첨 시작!
  `;
}

// 2. Parse candidates based on active draw mode
function getCandidates() {
  if (drawMode === 'number') {
    const min = parseInt(numMinInput.value) || 1;
    const max = parseInt(numMaxInput.value) || 30;
    
    if (min >= max) {
      alert("끝 번호는 시작 번호보다 커야 합니다.");
      return null;
    }
    if (max - min + 1 > 500) {
      alert("원활한 성능을 위해 최대 범위는 500개 이하로 설정해주세요.");
      return null;
    }
    
    const arr = [];
    for (let i = min; i <= max; i++) {
      arr.push({ id: i, label: `${i}번` });
    }
    return arr;
  } else {
    const rawNames = nameListInput.value;
    const names = rawNames
      .split(/[\n,]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);
      
    if (names.length === 0) {
      alert("이름 목록에 이름을 입력해 주세요.");
      return null;
    }
    
    return names.map((name, index) => ({ id: index + 1, label: name }));
  }
}

// 3. Build DOM representation of candidates grid
function buildGridDOM(candidates) {
  boardContainer.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'numbers-grid';
  
  // Style adjustment if too many candidates
  if (candidates.length > 60) {
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(40px, 1fr))';
  } else {
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(50px, 1fr))';
  }
  
  candidates.forEach(cand => {
    const node = document.createElement('div');
    node.className = 'number-node';
    node.id = `node-${cand.id}`;
    node.textContent = drawMode === 'number' ? cand.id : cand.label.slice(0, 3); // Trim name in grid node if long
    node.title = cand.label; // Full name as tooltip
    grid.appendChild(node);
  });
  
  boardContainer.appendChild(grid);
}

// --- Cinematic Decelerating Draw Sequence ---
async function startDrawSequence() {
  initAudio();
  if (isDrawing) return;
  
  const candidates = getCandidates();
  if (!candidates) return;
  
  const drawCount = parseInt(drawCountInput.value) || 5;
  if (drawCount <= 0) {
    alert("추첨 인원은 최소 1명 이상이어야 합니다.");
    return;
  }
  if (drawCount > candidates.length) {
    alert(`추첨 인원(${drawCount}명)이 전체 대상자 수(${candidates.length}명)보다 많습니다.`);
    return;
  }
  
  // Prepare states
  isDrawing = true;
  btnDraw.disabled = true;
  btnDraw.innerHTML = `<span class="brand-logo" style="font-size: 1rem; animation: float 1s infinite;">🌀</span> 추첨 진행 중...`;
  resultBoard.style.display = 'none';
  winnerCardsContainer.innerHTML = '';
  
  buildGridDOM(candidates);
  
  let pool = [...candidates];
  const winners = [];
  
  // Reveal each winner one by one sequentially
  for (let wIdx = 0; wIdx < drawCount; wIdx++) {
    drawStatus.textContent = `당번 추첨 중... (${wIdx + 1}번째 인원 선정 중)`;
    
    // Choose one winner from current pool
    const winnerPoolIndex = Math.floor(Math.random() * pool.length);
    const chosenWinner = pool[winnerPoolIndex];
    
    // Shuffle animation deceleration
    // We gradually increase duration between shifts to create tension
    const baseSteps = 8 + Math.floor(Math.random() * 6); // Number of shuffle shifts
    const delays = [];
    let curDelay = 40;
    
    for (let s = 0; s < baseSteps; s++) {
      delays.push(curDelay);
      curDelay += Math.floor(s * 8); // Linear increase in delay (Deceleration)
    }
    
    let lastHighlightedNode = null;
    
    // Perform each shuffle step
    for (let step = 0; step < delays.length; step++) {
      await new Promise(resolve => setTimeout(resolve, delays[step]));
      
      // Clear previous active highlight
      if (lastHighlightedNode) {
        lastHighlightedNode.classList.remove('active-draw');
      }
      
      // Randomly pick a candidate node from pool to highlight temporarily
      const randPoolIdx = Math.floor(Math.random() * pool.length);
      const tempCand = pool[randPoolIdx];
      const nodeEl = document.getElementById(`node-${tempCand.id}`);
      
      if (nodeEl) {
        nodeEl.classList.add('active-draw');
        lastHighlightedNode = nodeEl;
      }
      
      playTick();
    }
    
    // Final reveal for this winner
    await new Promise(resolve => setTimeout(resolve, 250));
    if (lastHighlightedNode) {
      lastHighlightedNode.classList.remove('active-draw');
    }
    
    // Crown current winner
    const winnerNodeEl = document.getElementById(`node-${chosenWinner.id}`);
    if (winnerNodeEl) {
      winnerNodeEl.classList.remove('active-draw');
      winnerNodeEl.classList.add('drawn-winner');
    }
    
    playWinnerReveal();
    winners.push(chosenWinner);
    
    // Remove winner from eligible pool
    pool.splice(winnerPoolIndex, 1);
    
    // Fade out other non-winners slightly to highlight winners clearly
    candidates.forEach(c => {
      const el = document.getElementById(`node-${c.id}`);
      if (el && !winners.some(w => w.id === c.id)) {
        el.classList.add('fade-out');
      }
    });
    
    // Brief delay before starting the next draw
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  
  // --- Draw sequence completed ---
  isDrawing = false;
  currentWinners = winners;
  
  drawStatus.textContent = "🎉 청소 당번 추첨이 완료되었습니다! 🎉";
  drawStatus.style.color = "var(--accent)";
  
  playTriumph();
  launchConfetti();
  
  displayWinners(winners);
  addHistoryRecord(winners);
  
  // Reset button state
  btnDraw.disabled = false;
  btnDraw.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
    </svg>
    다시 추첨하기!
  `;
}

// 4. Render Winner Showcase Card Grid
function displayWinners(winners) {
  winnerCardsContainer.innerHTML = '';
  resultBoard.style.display = 'block';
  
  // Shuffle list of tasks to randomly assign default chores
  const shuffledChores = [...defaultChores].sort(() => Math.random() - 0.5);
  
  winners.forEach((winner, index) => {
    const card = document.createElement('div');
    card.className = 'winner-card';
    
    const rankLabel = `${index + 1}지망 당번`;
    const defaultChore = shuffledChores[index % shuffledChores.length];
    
    card.innerHTML = `
      <div class="winner-rank">당번 ${index + 1}</div>
      <div class="winner-number">${drawMode === 'number' ? winner.id : '👤'}</div>
      <div class="winner-name">${winner.label}</div>
      <input type="text" class="winner-chore-input" placeholder="역할 입력" value="${defaultChore}">
    `;
    
    winnerCardsContainer.appendChild(card);
  });
  
  // Smooth scroll down to result card dashboard
  resultBoard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 5. Add current selection record to history
function addHistoryRecord(winners) {
  const timeString = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const winnerNames = winners.map(w => w.label).join(', ');
  
  // Remove empty label
  const emptyHistory = historyList.querySelector('.empty-history');
  if (emptyHistory) {
    emptyHistory.remove();
  }
  
  const historyItem = document.createElement('div');
  historyItem.className = 'history-item';
  historyItem.innerHTML = `
    <span class="history-time">[${timeString}]</span>
    <span class="history-winners">${winnerNames}</span>
  `;
  
  // Insert at top of list
  historyList.insertBefore(historyItem, historyList.firstChild);
}

// 6. Clipboard formatting utility
function copyResultsToClipboard() {
  if (currentWinners.length === 0) return;
  
  const choreInputs = winnerCardsContainer.querySelectorAll('.winner-chore-input');
  
  let copyText = `🧹 오늘의 청소 당번 결과 🧹\n`;
  copyText += `------------------------------\n`;
  
  currentWinners.forEach((winner, index) => {
    const chore = choreInputs[index] ? choreInputs[index].value : '당번';
    copyText += `당번 ${index + 1}: ${winner.label} (${chore})\n`;
  });
  
  copyText += `------------------------------\n`;
  copyText += `✨ 공정한 추첨기로 선정되었습니다. 모두 깨끗이 청소합시다! ✨`;
  
  navigator.clipboard.writeText(copyText)
    .then(() => {
      // Temporarily change copy button text
      const originalHTML = btnCopy.innerHTML;
      btnCopy.style.background = 'var(--success)';
      btnCopy.style.color = '#fff';
      btnCopy.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        복사 완료!
      `;
      
      playSynthTone(880, 'sine', 0.15, 0.1); // High pitch notification tone
      
      setTimeout(() => {
        btnCopy.style.background = 'rgba(16, 185, 129, 0.1)';
        btnCopy.style.color = 'var(--success)';
        btnCopy.innerHTML = originalHTML;
      }, 1500);
    })
    .catch(err => {
      console.error("Clipboard copy failed:", err);
      alert("복사에 실패했습니다. 수동으로 복사해주세요.");
    });
}
