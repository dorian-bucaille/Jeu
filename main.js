const canvas = document.getElementById('field');
const ctx = canvas.getContext('2d');
const lobby = document.getElementById('lobby');
const gameSection = document.getElementById('game');
const status = document.getElementById('status');
const countdownEl = document.getElementById('countdown');
const scoreAEl = document.getElementById('score-a');
const scoreBEl = document.getElementById('score-b');
const playerALabel = document.getElementById('player-a-label');
const playerBLabel = document.getElementById('player-b-label');
const scanACounter = document.getElementById('scan-a');
const scanBCounter = document.getElementById('scan-b');
const cardsA = document.getElementById('cards-a');
const cardsB = document.getElementById('cards-b');
const cardTemplate = document.getElementById('card-template');
const scoreLimitSelect = document.getElementById('score-limit');
const roomCodeInput = document.getElementById('room-code');

const ui = {
  generateRoom: document.getElementById('generate-room'),
  copyRoom: document.getElementById('copy-room'),
  readyButtons: document.querySelectorAll('.ready-btn'),
  startGame: document.getElementById('start-game'),
  scanButtons: document.querySelectorAll('.scan-btn'),
};

const BASE_BALL_SPEED = 280;
const BASE_PADDLE_WIDTH = 140;
const PADDLE_HEIGHT = 14;
const HINT_WINDOW_MS = 5000;
const SCAN_RECHARGE_MS = 20000;
const COUNTDOWN_MS = 1000;
const MAX_SCANS = 2;

const players = {
  a: {
    name: 'Alpha',
    ready: false,
    score: 0,
    paddle: { x: 0.5, width: BASE_PADDLE_WIDTH },
    velocity: 0,
    scans: MAX_SCANS,
    canScanThisWindow: true,
    scanArmed: false,
  },
  b: {
    name: 'Beta',
    ready: false,
    score: 0,
    paddle: { x: 0.5, width: BASE_PADDLE_WIDTH },
    velocity: 0,
    scans: MAX_SCANS,
    canScanThisWindow: true,
    scanArmed: false,
  },
};

const ball = {
  x: 0.5,
  y: 0.5,
  vx: 0,
  vy: 0,
  speedMultiplier: 1,
  spinFactor: 0.35,
  rotation: 0,
  serving: 'a',
};

let targetScore = parseInt(scoreLimitSelect.value, 10);
let lastTime = 0;
let hintTimer;
let scanRechargeTimer;
let countdownTimer;
let activeEffect = null;
let currentHints = { a: [], b: [] };
let isPlaying = false;
let pointerState = { active: false, lastX: null, vx: 0 };

function randomRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function formatEffect(effect) {
  switch (effect.type) {
    case 'ballSpeed':
      return `${effect.value > 1 ? 'Vitesse +' : 'Vitesse -'}${Math.round(Math.abs(effect.value - 1) * 100)}%`;
    case 'paddleSize':
      return `${effect.value > 1 ? 'Paddle +' : 'Paddle -'}${Math.round(Math.abs(effect.value - 1) * 100)}%`;
    case 'spin':
      return `${effect.value > 1 ? 'Spin +' : 'Spin -'}${Math.round(Math.abs(effect.value - 1) * 100)}%`;
    default:
      return 'Effet';
  }
}

function applyEffect(effect) {
  activeEffect = effect;
  ball.speedMultiplier = 1;
  ball.spinFactor = 0.35;
  players.a.paddle.width = BASE_PADDLE_WIDTH;
  players.b.paddle.width = BASE_PADDLE_WIDTH;

  if (!effect) return;

  if (effect.type === 'ballSpeed') {
    ball.speedMultiplier = effect.value;
  }

  if (effect.type === 'paddleSize') {
    players.a.paddle.width = BASE_PADDLE_WIDTH * effect.value;
    players.b.paddle.width = BASE_PADDLE_WIDTH * effect.value;
  }

  if (effect.type === 'spin') {
    ball.spinFactor = 0.35 * effect.value;
  }

  flash(canvas);
}

function flash(el) {
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}

function buildHintPair(realEffect) {
  const alternateValue = realEffect.value > 1 ? 0.8 : 1.2;
  const fake = { type: realEffect.type, value: alternateValue };

  const cardTrue = {
    title: formatEffect(realEffect),
    subtitle: 'Information réelle',
    truth: true,
    effect: realEffect,
  };

  const cardFalse = {
    title: formatEffect(fake),
    subtitle: 'Désinformation',
    truth: false,
    effect: fake,
  };

  return Math.random() > 0.5 ? [cardTrue, cardFalse] : [cardFalse, cardTrue];
}

function newHintWindow() {
  const candidates = [
    { type: 'ballSpeed', value: Math.random() > 0.5 ? 1.2 : 0.8 },
    { type: 'paddleSize', value: Math.random() > 0.5 ? 1.2 : 0.8 },
    { type: 'spin', value: Math.random() > 0.5 ? 1.3 : 0.7 },
  ];
  const realEffect = candidates[Math.floor(Math.random() * candidates.length)];

  currentHints = {
    a: buildHintPair(realEffect),
    b: buildHintPair(realEffect),
  };

  Object.values(players).forEach((p) => {
    p.canScanThisWindow = true;
    p.scanArmed = false;
  });

  applyEffect(realEffect);
  renderHints();
  status.textContent = 'Nouvelles cartes distribuées';
  flash(status);
}

function renderHints() {
  renderHintSet(cardsA, currentHints.a, 'a');
  renderHintSet(cardsB, currentHints.b, 'b');
}

function renderHintSet(container, cards, playerKey) {
  container.innerHTML = '';
  cards.forEach((card, idx) => {
    const node = cardTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.card-title').textContent = card.title;
    node.querySelector('.card-subtitle').textContent = card.subtitle;
    node.dataset.truth = card.truth;
    node.dataset.player = playerKey;
    node.dataset.index = idx;
    node.addEventListener('click', handleCardClick);
    container.appendChild(node);
  });
}

function handleCardClick(event) {
  const node = event.currentTarget;
  const playerKey = node.dataset.player;
  const index = parseInt(node.dataset.index, 10);
  const player = players[playerKey];

  if (!player.canScanThisWindow || !player.scanArmed || player.scans <= 0) return;

  node.classList.add('flash');
  const card = currentHints[playerKey][index];
  node.querySelector('.card-reveal').textContent = card.truth ? 'VRAI' : 'FAUX';
  node.classList.add(card.truth ? 'true' : 'false');
  player.scans -= 1;
  player.canScanThisWindow = false;
  player.scanArmed = false;
  updateScanCounters();
}

function updateScanCounters() {
  scanACounter.textContent = players.a.scans;
  scanBCounter.textContent = players.b.scans;
}

function initScanRecharge() {
  if (scanRechargeTimer) clearInterval(scanRechargeTimer);
  scanRechargeTimer = setInterval(() => {
    ['a', 'b'].forEach((k) => {
      const player = players[k];
      if (player.scans < MAX_SCANS) {
        player.scans += 1;
      }
    });
    updateScanCounters();
  }, SCAN_RECHARGE_MS);
}

function startHintLoop() {
  if (hintTimer) clearInterval(hintTimer);
  newHintWindow();
  hintTimer = setInterval(newHintWindow, HINT_WINDOW_MS);
}

function startCountdown() {
  let remaining = COUNTDOWN_MS;
  countdownEl.textContent = 'Service...';
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    remaining -= 250;
    countdownEl.textContent = `Départ dans ${(remaining / 1000).toFixed(1)}s`;
    if (remaining <= 0) {
      clearInterval(countdownTimer);
      countdownEl.textContent = 'En jeu';
      serveBall();
      isPlaying = true;
    }
  }, 250);
}

function serveBall() {
  const speed = (BASE_BALL_SPEED * ball.speedMultiplier) / canvas.width;
  const direction = ball.serving === 'a' ? 1 : -1;
  ball.x = 0.5;
  ball.y = 0.5;
  ball.vx = (Math.random() * 0.4 - 0.2) * speed;
  ball.vy = direction * speed;
  ball.rotation = 0;
}

function update(dt) {
  if (!isPlaying) return;
  handleInput(dt);
  moveBall(dt);
  checkPoint();
}

function handleInput(dt) {
  ['a', 'b'].forEach((key) => {
    const paddle = players[key].paddle;
    let targetX = paddle.x;
    if (pointerState.active) {
      targetX = pointerState.lastX / canvas.width;
      paddle.x = targetX;
      players[key].velocity = pointerState.vx;
    } else if (key === 'a' && inputState.mouseX !== null) {
      targetX = inputState.mouseX / canvas.width;
    }

    if (key === 'b' && (inputState.keys['a'] || inputState.keys['arrowleft'])) {
      players[key].velocity = -0.6;
      targetX += players[key].velocity * dt;
    }

    if (key === 'b' && (inputState.keys['d'] || inputState.keys['arrowright'])) {
      players[key].velocity = 0.6;
      targetX += players[key].velocity * dt;
    }

    paddle.x = clamp(targetX + players[key].velocity * dt, 0.1, 0.9);
    players[key].velocity *= 0.92;
  });
}

function moveBall(dt) {
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.rotation += (ball.vx + ball.vy) * 0.1;

  if (ball.x < 0.05 || ball.x > 0.95) {
    ball.vx *= -1;
    ball.x = clamp(ball.x, 0.05, 0.95);
  }

  const topPaddle = players.a.paddle;
  const bottomPaddle = players.b.paddle;
  const ballPixel = { x: ball.x * canvas.width, y: ball.y * canvas.height };

  if (
    ballPixel.y <= PADDLE_HEIGHT + 10 &&
    Math.abs(ballPixel.x - topPaddle.x * canvas.width) <= topPaddle.width / 2
  ) {
    collide(topPaddle);
  }

  if (
    ballPixel.y >= canvas.height - (PADDLE_HEIGHT + 10) &&
    Math.abs(ballPixel.x - bottomPaddle.x * canvas.width) <= bottomPaddle.width / 2
  ) {
    collide(bottomPaddle, true);
  }
}

function collide(paddle, invert = false) {
  const spin = clamp(paddle.x - ball.x, -0.5, 0.5) * ball.spinFactor;
  ball.vy = Math.abs(ball.vy) * (invert ? -1 : 1);
  ball.vx += spin;
  ball.vx = clamp(ball.vx, -0.9, 0.9);
}

function checkPoint() {
  if (ball.y < 0) {
    players.b.score += 1;
    ball.serving = 'a';
    endRally('Joueur 2 marque');
  } else if (ball.y > 1) {
    players.a.score += 1;
    ball.serving = 'b';
    endRally('Joueur 1 marque');
  }
}

function endRally(message) {
  isPlaying = false;
  countdownEl.textContent = message;
  updateScores();
  ['a', 'b'].forEach((k) => {
    if (players[k].scans < MAX_SCANS) players[k].scans += 1;
  });
  updateScanCounters();
  if (players.a.score >= targetScore || players.b.score >= targetScore) {
    countdownEl.textContent = 'Fin de match';
    status.textContent = `${players.a.score} - ${players.b.score}`;
    return;
  }
  setTimeout(startCountdown, 800);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

const inputState = {
  mouseX: null,
  keys: {},
};

canvas.addEventListener('pointerdown', (e) => {
  pointerState.active = true;
  pointerState.lastX = e.offsetX;
});

canvas.addEventListener('pointermove', (e) => {
  if (!pointerState.active) return;
  const dx = e.offsetX - pointerState.lastX;
  pointerState.vx = dx / 120;
  pointerState.lastX = e.offsetX;
});

canvas.addEventListener('pointerup', () => {
  pointerState.active = false;
});

canvas.addEventListener('mouseleave', () => {
  pointerState.active = false;
});

canvas.addEventListener('mousemove', (e) => {
  inputState.mouseX = e.offsetX;
});

window.addEventListener('keydown', (e) => {
  inputState.keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
  inputState.keys[e.key.toLowerCase()] = false;
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCourt();
  drawPaddles();
  drawBall();
}

function drawCourt() {
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPaddles() {
  const padding = 10;
  const topPaddle = players.a.paddle;
  const bottomPaddle = players.b.paddle;

  ctx.fillStyle = 'rgba(106, 243, 197, 0.8)';
  ctx.fillRect(
    topPaddle.x * canvas.width - topPaddle.width / 2,
    padding,
    topPaddle.width,
    PADDLE_HEIGHT,
  );

  ctx.fillStyle = 'rgba(74, 203, 224, 0.8)';
  ctx.fillRect(
    bottomPaddle.x * canvas.width - bottomPaddle.width / 2,
    canvas.height - padding - PADDLE_HEIGHT,
    bottomPaddle.width,
    PADDLE_HEIGHT,
  );
}

function drawBall() {
  ctx.save();
  ctx.translate(ball.x * canvas.width, ball.y * canvas.height);
  ctx.rotate(ball.rotation);
  const radius = 10;
  const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, radius);
  gradient.addColorStop(0, '#fff');
  gradient.addColorStop(1, 'rgba(255,255,255,0.25)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const ratio = rect.width / rect.height;
  const targetHeight = Math.min(window.innerHeight - 220, 720);
  canvas.width = rect.width;
  canvas.height = Math.max(targetHeight, 320);
}

function loop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function setReady(playerKey) {
  const input = playerKey === 'a' ? document.getElementById('player-a-name') : document.getElementById('player-b-name');
  players[playerKey].ready = !players[playerKey].ready;
  players[playerKey].name = input.value;
  const btn = Array.from(ui.readyButtons).find((b) => b.dataset.player === playerKey);
  btn.textContent = players[playerKey].ready ? 'Prêt ✔' : 'Prêt';
  const allReady = players.a.ready && players.b.ready;
  status.textContent = allReady ? 'Les joueurs sont prêts' : 'En attente';
}

function startGame() {
  targetScore = parseInt(scoreLimitSelect.value, 10);
  players.a.score = 0;
  players.b.score = 0;
  updateScores();
  lobby.classList.add('hidden');
  gameSection.classList.remove('hidden');
  players.a.paddle.x = 0.5;
  players.b.paddle.x = 0.5;
  players.a.scans = MAX_SCANS;
  players.b.scans = MAX_SCANS;
  updateScanCounters();
  newHintWindow();
  startHintLoop();
  initScanRecharge();
  startCountdown();
}

function updateScores() {
  scoreAEl.textContent = players.a.score;
  scoreBEl.textContent = players.b.score;
  playerALabel.textContent = players.a.name;
  playerBLabel.textContent = players.b.name;
}

ui.readyButtons.forEach((btn) =>
  btn.addEventListener('click', () => {
    setReady(btn.dataset.player);
  }),
);

ui.startGame.addEventListener('click', () => {
  startGame();
});

ui.generateRoom.addEventListener('click', () => {
  roomCodeInput.value = randomRoomCode();
});

ui.copyRoom.addEventListener('click', async () => {
  if (!roomCodeInput.value) {
    roomCodeInput.value = randomRoomCode();
  }
  try {
    await navigator.clipboard.writeText(roomCodeInput.value);
    status.textContent = 'Code copié';
  } catch (err) {
    status.textContent = 'Impossible de copier';
  }
});

ui.scanButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.player;
    const player = players[key];
    if (!player.canScanThisWindow || player.scans <= 0) return;
    player.scanArmed = true;
    status.textContent = `${players[key].name} arme un scan (1 par fenêtre)`;
  });
});

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(loop);
updateScanCounters();
