const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreValue = document.getElementById("scoreValue");
const bestScoreValue = document.getElementById("bestScoreValue");
const startOverlayButton = document.getElementById("startOverlayButton");
const makerTag = document.getElementById("makerTag");
const musicToggle = document.getElementById("musicToggle");
const pauseToggle = document.getElementById("pauseToggle");
const stopGameButton = document.getElementById("stopGame");
const difficultyButtons = document.querySelectorAll(".difficulty-btn");
const totalPlayCountEl = document.getElementById("totalPlayCount");
const totalPlayMinutesEl = document.getElementById("totalPlayMinutes");

let playerWidth = 100;
let playerHeight = 100;
let x = 50;
let y = canvas.height - playerHeight-10;
let playerSpeed = 5;
let gameOver = false;
let gamePaused = false;
let gameStopped = false;
let gameStarted = false;
let score = 0;
let bestScore = 0;
let musicEnabled = true;
let playerBob = 0;
let runElapsedMs = 0;
let lastFrameTime = 0;
let difficultyLevel = "low";
let playMinuteCounterId = null;

let blocks = [];
let keys = {};

const COUNTER_NAMESPACE = "dodge-supanroy-caretgames-v1";
const COUNTER_TOTAL_PLAYS = "total_plays";
const COUNTER_TOTAL_MINUTES = "total_play_minutes";
const LOCAL_STATS_KEY = "dtfb-community-stats-local-v1";
const BEST_SCORE_STORAGE_KEY = "dtfb-best-score-v1";
const STATS_REFRESH_INTERVAL_MS = 30000;

const localStats = {
    plays: 0,
    minutes: 0
};

const pendingStats = {
    plays: 0,
    minutes: 0
};

let statsSyncInFlight = false;

const sounds = {
    gameStart: new Audio("Sound Effects/game-start.mp3"),
    gameOver: new Audio("Sound Effects/game-over.mp3"),
    hit: new Audio("Sound Effects/hit-sound.mp3"),
    running: new Audio("Sound Effects/running.mp3")
};

const fireballThemes = [
    {
        tail: ["rgba(255, 174, 66, 0.72)", "rgba(255, 104, 24, 0.48)", "rgba(255, 80, 16, 0)"],
        core: ["#fff3bf", "#ffc04d", "#ff7131", "#ab2714"],
        glow: "rgba(255, 106, 31, 0.55)",
        highlight: "rgba(255, 251, 229, 0.56)",
        ring: "rgba(255, 220, 155, 0.7)"
    },
    {
        tail: ["rgba(142, 228, 255, 0.75)", "rgba(64, 181, 255, 0.5)", "rgba(34, 112, 255, 0)"],
        core: ["#eaffff", "#98e8ff", "#4ab8ff", "#1f5ec7"],
        glow: "rgba(67, 183, 255, 0.62)",
        highlight: "rgba(232, 250, 255, 0.58)",
        ring: "rgba(168, 236, 255, 0.78)"
    },
    {
        tail: ["rgba(171, 255, 165, 0.74)", "rgba(96, 231, 121, 0.5)", "rgba(39, 170, 89, 0)"],
        core: ["#ecffe9", "#b7ff9f", "#5fdf74", "#1c9146"],
        glow: "rgba(95, 223, 116, 0.62)",
        highlight: "rgba(234, 255, 229, 0.6)",
        ring: "rgba(188, 255, 170, 0.78)"
    },
    {
        tail: ["rgba(219, 169, 255, 0.74)", "rgba(165, 101, 255, 0.5)", "rgba(108, 63, 208, 0)"],
        core: ["#f7ebff", "#d1a7ff", "#9a69ff", "#5f32bd"],
        glow: "rgba(154, 105, 255, 0.62)",
        highlight: "rgba(244, 232, 255, 0.58)",
        ring: "rgba(220, 185, 255, 0.8)"
    },
    {
        tail: ["rgba(255, 139, 139, 0.73)", "rgba(255, 62, 81, 0.52)", "rgba(170, 23, 48, 0)"],
        core: ["#ffe8e8", "#ff9ea0", "#ff4660", "#8f1630"],
        glow: "rgba(255, 70, 96, 0.62)",
        highlight: "rgba(255, 238, 238, 0.56)",
        ring: "rgba(255, 183, 193, 0.8)"
    },
    {
        tail: ["rgba(255, 242, 145, 0.78)", "rgba(255, 204, 75, 0.56)", "rgba(215, 149, 20, 0)"],
        core: ["#fff9dd", "#ffe88d", "#ffc948", "#b07000"],
        glow: "rgba(255, 201, 72, 0.65)",
        highlight: "rgba(255, 252, 229, 0.62)",
        ring: "rgba(255, 230, 150, 0.82)"
    },
    {
        tail: ["rgba(255, 255, 255, 0.4)", "rgba(114, 234, 255, 0.5)", "rgba(41, 165, 210, 0)"],
        core: ["#fbffff", "#d7f6ff", "#72e9ff", "#257f96"],
        glow: "rgba(137, 245, 255, 0.7)",
        highlight: "rgba(255, 255, 255, 0.78)",
        ring: "rgba(180, 245, 255, 0.86)"
    }
];

function getFireballThemePhase(currentScore) {
    if (currentScore >= 10000) return 6;
    if (currentScore >= 8000) return 5;
    if (currentScore >= 5000) return 4;
    if (currentScore >= 3000) return 3;
    if (currentScore >= 2000) return 2;
    if (currentScore >= 1000) return 1;
    return 0;
}

function pickFireballThemeIndex(currentScore) {
    const phase = getFireballThemePhase(currentScore);

    // Most spawns use the current phase style; occasionally use another unlocked style.
    if (phase > 0 && Math.random() < 0.15) {
        let alt = Math.floor(Math.random() * (phase + 1));
        if (alt === phase) {
            alt = (alt + 1) % (phase + 1);
        }
        return alt;
    }

    return phase;
}

const difficultyConfig = {
    low: {
        spawnRate: 0.018,
        speedMultiplier: 0.92,
        weirdMultiplier: 0.82,
        weirdStartMs: 120000,
        weirdRampMs: 180000,
        weirdChanceEarly: 0.18,
        weirdChanceLate: 0.3
    },
    mid: {
        spawnRate: 0.022,
        speedMultiplier: 1,
        weirdMultiplier: 1,
        weirdStartMs: 60000,
        weirdRampMs: 170000,
        weirdChanceEarly: 0.2,
        weirdChanceLate: 0.34
    },
    high: {
        spawnRate: 0.04,
        speedMultiplier: 1.26,
        weirdMultiplier: 1.38,
        weirdStartMs: 10000,
        weirdRampMs: 110000,
        weirdChanceEarly: 0.38,
        weirdChanceLate: 0.62
    }
};

function getDifficultySettings() {
    return difficultyConfig[difficultyLevel] || difficultyConfig.low;
}

function setDifficulty(level) {
    if (!difficultyConfig[level]) {
        return;
    }

    difficultyLevel = level;
    difficultyButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.level === difficultyLevel);
    });
}

function pickWeirdType() {
    const weirdTypes = ["crystal", "void", "plasma"];
    return weirdTypes[Math.floor(Math.random() * weirdTypes.length)];
}

function formatCounterValue(value) {
    return Number.isFinite(value) ? value.toLocaleString() : "--";
}

function updateCommunityStatsUI({ plays, minutes } = {}) {
    if (totalPlayCountEl && plays !== undefined) {
        totalPlayCountEl.textContent = formatCounterValue(plays);
    }

    if (totalPlayMinutesEl && minutes !== undefined) {
        totalPlayMinutesEl.textContent = formatCounterValue(minutes);
    }
}

function renderCommunityStats() {
    updateCommunityStatsUI({
        plays: localStats.plays + pendingStats.plays,
        minutes: localStats.minutes + pendingStats.minutes
    });
}

function persistLocalStats() {
    try {
        localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify({
            plays: localStats.plays,
            minutes: localStats.minutes,
            pending: {
                plays: pendingStats.plays,
                minutes: pendingStats.minutes
            }
        }));
    } catch {
        // Ignore storage limitations.
    }
}

function loadLocalStats() {
    try {
        const saved = JSON.parse(localStorage.getItem(LOCAL_STATS_KEY) || "{}");
        if (Number.isFinite(saved?.plays) && saved.plays >= 0) {
            localStats.plays = saved.plays;
        }
        if (Number.isFinite(saved?.minutes) && saved.minutes >= 0) {
            localStats.minutes = saved.minutes;
        }
        if (Number.isFinite(saved?.pending?.plays) && saved.pending.plays >= 0) {
            pendingStats.plays = saved.pending.plays;
        }
        if (Number.isFinite(saved?.pending?.minutes) && saved.pending.minutes >= 0) {
            pendingStats.minutes = saved.pending.minutes;
        }
    } catch {
        // Use default local counters.
    }
}

function incrementPendingStat(key) {
    if (key === "plays") {
        pendingStats.plays += 1;
    }

    if (key === "minutes") {
        pendingStats.minutes += 1;
    }

    persistLocalStats();
    renderCommunityStats();
}

function setStatFromRemote(key, value) {
    if (!Number.isFinite(value)) {
        return;
    }

    if (key === "plays") {
        localStats.plays = value;
    }

    if (key === "minutes") {
        localStats.minutes = value;
    }

    persistLocalStats();
    renderCommunityStats();
}

function markPendingSynced(key) {
    if (key === "plays" && pendingStats.plays > 0) {
        pendingStats.plays -= 1;
    }

    if (key === "minutes" && pendingStats.minutes > 0) {
        pendingStats.minutes -= 1;
    }

    persistLocalStats();
    renderCommunityStats();
}

async function flushPendingStats() {
    if (statsSyncInFlight) {
        return;
    }

    statsSyncInFlight = true;

    try {
        if (pendingStats.plays > 0) {
            localStats.plays += pendingStats.plays;
            pendingStats.plays = 0;
        }

        if (pendingStats.minutes > 0) {
            localStats.minutes += pendingStats.minutes;
            pendingStats.minutes = 0;
        }

        persistLocalStats();
        renderCommunityStats();
    } catch {
        // Keep local queued increments for next sync attempt.
    } finally {
        statsSyncInFlight = false;
    }
}

async function counterGetValue(key) {
    const url = `https://api.countapi.xyz/get/${COUNTER_NAMESPACE}/${key}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Counter get failed: ${response.status}`);
    }
    const data = await response.json();
    return Number.isFinite(data?.value) ? data.value : 0;
}

async function counterHitValue(key) {
    const url = `https://api.countapi.xyz/hit/${COUNTER_NAMESPACE}/${key}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Counter hit failed: ${response.status}`);
    }
    const data = await response.json();
    return Number.isFinite(data?.value) ? data.value : 0;
}

async function refreshCommunityStats() {
    await flushPendingStats();
    renderCommunityStats();
}

function isActivePlayState() {
    return gameStarted && !gamePaused && !gameOver && !gameStopped;
}

function ensurePlayMinuteTicker() {
    if (playMinuteCounterId !== null) {
        return;
    }

    playMinuteCounterId = setInterval(async () => {
        if (!isActivePlayState()) {
            return;
        }

        incrementPendingStat("minutes");
        await flushPendingStats();
    }, 60000);
}

async function registerPlayIfNeeded() {
    incrementPendingStat("plays");
    await flushPendingStats();
}

function getWeirdSpawnChance() {
    const settings = getDifficultySettings();

    if (runElapsedMs < settings.weirdStartMs) {
        return 0;
    }

    if (runElapsedMs < settings.weirdRampMs) {
        return Math.min(0.75, settings.weirdChanceEarly * settings.weirdMultiplier);
    }

    return Math.min(0.85, settings.weirdChanceLate * settings.weirdMultiplier);
}

sounds.running.loop = true;
sounds.running.volume = 0.35;
sounds.gameOver.volume = 0.65;
sounds.hit.volume = 0.75;

function playSound(sound, restart = true) {
    if (!musicEnabled) {
        return;
    }

    if (restart) {
        sound.currentTime = 0;
    }

    sound.play().catch(() => {
        // Browser autoplay policies may block sound until user interaction.
    });
}

function startRunAudio() {
    if (!musicEnabled || !gameStarted || gameOver || gamePaused || gameStopped) {
        return;
    }

    playSound(sounds.running, false);
}

function stopRunAudio() {
    sounds.running.pause();
}

function updateMusicButton() {
    musicToggle.textContent = musicEnabled ? "🔊" : "🔇";
}

function updatePauseButton() {
    pauseToggle.classList.toggle("show-play", gamePaused);
}

function updateStartOverlayButton() {
    const showStartOverlay = !gameStarted;
    startOverlayButton.style.display = showStartOverlay ? "block" : "none";

    if (makerTag) {
        makerTag.style.display = showStartOverlay ? "block" : "none";
    }
}

function updateHud() {
    scoreValue.textContent = score;
    bestScoreValue.textContent = bestScore;
}

function persistBestScore() {
    try {
        localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(bestScore));
    } catch {
        // Ignore storage limitations.
    }
}

function loadBestScore() {
    try {
        const savedBest = Number(localStorage.getItem(BEST_SCORE_STORAGE_KEY));
        if (Number.isFinite(savedBest) && savedBest >= 0) {
            bestScore = Math.floor(savedBest);
        }
    } catch {
        // Use default score when local storage is unavailable.
    }
}

function syncBestScoreFromCurrentScore() {
    if (score > bestScore) {
        bestScore = score;
        persistBestScore();
    }
}

function pulseScore() {
    scoreValue.classList.remove("pulse");
    void scoreValue.offsetWidth;
    scoreValue.classList.add("pulse");
}

function togglePauseState() {
    if (!gameStarted || gameOver || gameStopped) {
        return;
    }

    gamePaused = !gamePaused;
    updatePauseButton();

    if (gamePaused) {
        stopRunAudio();
    } else {
        startRunAudio();
    }
}

function handleStartPauseToggle() {
    if (!gameStarted || gameStopped || gameOver) {
        resetGame();
        return;
    }

    togglePauseState();
}

function getCanvasXFromTouch(touch) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    return (touch.clientX - rect.left) * scaleX;
}

function movePlayerToCanvasX(canvasX) {
    x = Math.max(0, Math.min(canvas.width - playerWidth, canvasX - playerWidth / 2));
}

musicToggle.addEventListener("click", () => {
    musicEnabled = !musicEnabled;
    updateMusicButton();

    if (musicEnabled) {
        startRunAudio();
    } else {
        stopRunAudio();
    }
});

startOverlayButton.addEventListener("click", () => {
    resetGame();
});

pauseToggle.addEventListener("click", () => {
    togglePauseState();
});

stopGameButton.addEventListener("click", () => {
    if (!gameStarted) {
        return;
    }

    syncBestScoreFromCurrentScore();
    gameStopped = true;
    gameStarted = false;
    gamePaused = false;
    gameOver = false;
    stopRunAudio();
    blocks = [];
    score = 0;
    updateHud();
    updatePauseButton();
    updateStartOverlayButton();
});

difficultyButtons.forEach((button) => {
    button.addEventListener("click", () => {
        setDifficulty(button.dataset.level);
    });
});

function spawnBlock() {
    const settings = getDifficultySettings();
    const weird = Math.random() < getWeirdSpawnChance();
    const size = weird ? 30 + Math.random() * 22 : 26 + Math.random() * 20;
    const radius = size / 2;
    const themeIndex = pickFireballThemeIndex(score);
    const weirdType = weird ? pickWeirdType() : "fireball";
    const movementType = weird
        ? (Math.random() < 0.55 ? "zigzag" : "drifter")
        : (Math.random() < 0.14 ? "drifter" : "straight");

    blocks.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        radius,
        speed: Math.min(8.2, (2 + score / 480) * settings.speedMultiplier),
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.04,
        themeIndex,
        objectType: weirdType,
        movementType,
        drift: (Math.random() - 0.5) * (weird ? 1.8 : 0.55),
        waveAmp: weird ? 0.95 + Math.random() * 1.45 : 0,
        waveSpeed: weird ? 0.07 + Math.random() * 0.06 : 0,
        wavePhase: Math.random() * Math.PI * 2
    });
}

document.addEventListener("keydown", (e) => {
    const isEnter = e.key === "Enter";
    const isSpace = e.code === "Space";

    if (isEnter || isSpace) {
        e.preventDefault();
        if (!e.repeat) {
            handleStartPauseToggle();
        }
        return;
    }

    keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 0) {
        return;
    }

    e.preventDefault();

    if (!gameStarted || gamePaused || gameStopped || gameOver) {
        handleStartPauseToggle();
        return;
    }

    movePlayerToCanvasX(getCanvasXFromTouch(e.touches[0]));
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
    if (e.touches.length === 0) {
        return;
    }

    if (!gameStarted || gamePaused || gameStopped || gameOver) {
        return;
    }

    e.preventDefault();
    movePlayerToCanvasX(getCanvasXFromTouch(e.touches[0]));
}, { passive: false });

function isColliding(a, b){
    return (
        a.x<b.x + b.width &&
        a.x+a.width > b.x &&
        a.y<b.y + b.height &&
        a.y+a.height > b.y
    );
}

let player = {
    x: x,
    y: y,
    width: playerWidth,
    height: playerHeight
};

function updatePlayerMetrics() {
    playerWidth = Math.max(46, Math.min(74, canvas.width * 0.16));
    playerHeight = Math.max(20, Math.min(30, canvas.height * 0.05));
    playerSpeed = Math.max(3.8, canvas.width * 0.0125);
    y = canvas.height - playerHeight - 12;

    x = Math.min(Math.max(0, x), canvas.width - playerWidth);

    player.width = playerWidth;
    player.height = playerHeight;
    player.y = y;
}

function getLargestHorizontalGap(intervals, width) {
    if (intervals.length === 0) {
        return { start: 0, end: width, size: width };
    }

    const sorted = intervals
        .map((segment) => ({
            start: Math.max(0, segment.start),
            end: Math.min(width, segment.end)
        }))
        .filter((segment) => segment.end > segment.start)
        .sort((a, b) => a.start - b.start);

    if (sorted.length === 0) {
        return { start: 0, end: width, size: width };
    }

    const merged = [];
    for (const segment of sorted) {
        const last = merged[merged.length - 1];
        if (!last || segment.start > last.end) {
            merged.push({ ...segment });
        } else {
            last.end = Math.max(last.end, segment.end);
        }
    }

    let best = { start: 0, end: merged[0].start, size: merged[0].start };
    let previousEnd = merged[0].end;

    for (let i = 1; i < merged.length; i++) {
        const gapStart = previousEnd;
        const gapEnd = merged[i].start;
        const gapSize = gapEnd - gapStart;
        if (gapSize > best.size) {
            best = { start: gapStart, end: gapEnd, size: gapSize };
        }
        previousEnd = Math.max(previousEnd, merged[i].end);
    }

    if (width - previousEnd > best.size) {
        best = { start: previousEnd, end: width, size: width - previousEnd };
    }

    return best;
}

function ensureEscapeLane() {
    const requiredGap = playerWidth + 18;
    const dangerTop = player.y - 170;
    const dangerBottom = player.y + player.height + 20;
    const dangerBlocks = blocks.filter(
        (block) => block.y + block.height >= dangerTop && block.y <= dangerBottom
    );

    if (dangerBlocks.length === 0) {
        return;
    }

    const intervals = dangerBlocks.map((block) => ({
        start: block.x,
        end: block.x + block.width
    }));

    const largestGap = getLargestHorizontalGap(intervals, canvas.width);
    if (largestGap.size >= requiredGap) {
        return;
    }

    const gapStart = Math.min(
        Math.max(x + playerWidth / 2 - requiredGap / 2, 0),
        canvas.width - requiredGap
    );
    const gapEnd = gapStart + requiredGap;
    const gapCenter = (gapStart + gapEnd) / 2;

    for (const block of dangerBlocks) {
        const blockStart = block.x;
        const blockEnd = block.x + block.width;

        if (blockEnd <= gapStart || blockStart >= gapEnd) {
            continue;
        }

        const shiftLeft = blockEnd - gapStart + 2;
        const shiftRight = gapEnd - blockStart + 2;

        if (block.x + block.width / 2 < gapCenter) {
            block.x -= shiftLeft;
        } else {
            block.x += shiftRight;
        }

        block.x = Math.max(0, Math.min(canvas.width - block.width, block.x));
    }
}

function drawHud() {
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function resetGame() {
    blocks = [];
    score = 0;
    runElapsedMs = 0;
    lastFrameTime = 0;
    gameStarted = true;
    gameOver = false;
    gamePaused = false;
    gameStopped = false;

    updatePlayerMetrics();
    x = canvas.width / 2 - playerWidth / 2;

    playSound(sounds.gameStart);
    startRunAudio();
    updateStartOverlayButton();
    updatePauseButton();
    updateHud();
    ensurePlayMinuteTicker();
    registerPlayIfNeeded();
}

function drawStartOverlay() {
    ctx.fillStyle = "rgba(8, 20, 28, 0.62)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 34px Space Grotesk";
    ctx.fillText("READY TO DODGE", 58, 274);

    ctx.font = "600 18px Space Grotesk";
    ctx.fillText("Press Start to begin", 118, 312);
}

function drawGameOver() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 40px Space Grotesk";
    ctx.fillText("GAME OVER", 72, 280);

    ctx.font = "600 20px Space Grotesk";
    ctx.fillText("Press Enter to Restart", 82, 320);
}

function drawPauseOverlay() {
    ctx.fillStyle = "rgba(8, 20, 28, 0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 38px Space Grotesk";
    ctx.fillText("PAUSED", 120, 290);

    ctx.font = "600 18px Space Grotesk";
    ctx.fillText("Tap Resume to continue", 110, 326);
}

function drawStoppedOverlay() {
    ctx.fillStyle = "rgba(8, 20, 28, 0.65)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 34px Space Grotesk";
    ctx.fillText("GAME STOPPED", 82, 286);

    ctx.font = "600 18px Space Grotesk";
    ctx.fillText("Press Enter to start a new run", 85, 323);
}

function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "#163a4f");
    grad.addColorStop(1, "#0b1f2d");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    for (let i = 40; i < canvas.height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i + (score % 40));
        ctx.lineTo(canvas.width, i + (score % 40));
        ctx.stroke();
    }
}

function drawPlayer() {
    playerBob += 0.08;
    const bobOffset = Math.sin(playerBob) * 1.5;
    const px = x;
    const py = y + bobOffset;
    const radius = Math.min(10, playerHeight * 0.35);

    const bodyGradient = ctx.createLinearGradient(px, py, px, py + playerHeight);
    bodyGradient.addColorStop(0, "#2ef2bd");
    bodyGradient.addColorStop(1, "#0ca478");

    ctx.shadowColor = "rgba(46, 242, 189, 0.4)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = bodyGradient;

    ctx.beginPath();
    ctx.moveTo(px + radius, py);
    ctx.lineTo(px + playerWidth - radius, py);
    ctx.quadraticCurveTo(px + playerWidth, py, px + playerWidth, py + radius);
    ctx.lineTo(px + playerWidth, py + playerHeight - radius);
    ctx.quadraticCurveTo(px + playerWidth, py + playerHeight, px + playerWidth - radius, py + playerHeight);
    ctx.lineTo(px + radius, py + playerHeight);
    ctx.quadraticCurveTo(px, py + playerHeight, px, py + playerHeight - radius);
    ctx.lineTo(px, py + radius);
    ctx.quadraticCurveTo(px, py, px + radius, py);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(7, 57, 56, 0.58)";
    ctx.fillRect(px + playerWidth * 0.18, py + playerHeight - 6, playerWidth * 0.64, 4);
}

function drawBlocks() {
    for (let block of blocks) {
        const theme = fireballThemes[block.themeIndex] || fireballThemes[0];
        const cx = block.x + block.radius;
        const cy = block.y + block.radius;
        const tailLength = block.height * 1.55;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(block.rotation);

        if (block.objectType === "crystal") {
            ctx.shadowColor = "rgba(122, 242, 255, 0.6)";
            ctx.shadowBlur = 14;
            const crystalGradient = ctx.createLinearGradient(0, -block.radius, 0, block.radius);
            crystalGradient.addColorStop(0, "#f4f8ff");
            crystalGradient.addColorStop(0.45, "#6ee8ff");
            crystalGradient.addColorStop(1, "#5a53d6");
            ctx.fillStyle = crystalGradient;

            ctx.beginPath();
            ctx.moveTo(0, -block.radius);
            ctx.lineTo(block.radius * 0.74, 0);
            ctx.lineTo(0, block.radius);
            ctx.lineTo(-block.radius * 0.74, 0);
            ctx.closePath();
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.strokeStyle = "rgba(237, 252, 255, 0.9)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
            continue;
        }

        if (block.objectType === "void") {
            ctx.shadowColor = "rgba(157, 77, 255, 0.58)";
            ctx.shadowBlur = 16;

            const voidGradient = ctx.createRadialGradient(0, 0, block.radius * 0.18, 0, 0, block.radius);
            voidGradient.addColorStop(0, "#151429");
            voidGradient.addColorStop(0.5, "#33265d");
            voidGradient.addColorStop(1, "#0c0a17");
            ctx.fillStyle = voidGradient;
            ctx.beginPath();
            ctx.arc(0, 0, block.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.strokeStyle = "rgba(191, 119, 255, 0.9)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, block.radius * 0.82, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = "rgba(211, 157, 255, 0.62)";
            ctx.beginPath();
            ctx.arc(block.radius * 0.18, -block.radius * 0.2, block.radius * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            continue;
        }

        if (block.objectType === "plasma") {
            ctx.shadowColor = "rgba(80, 255, 223, 0.58)";
            ctx.shadowBlur = 15;
            const plasmaGradient = ctx.createRadialGradient(0, 0, block.radius * 0.2, 0, 0, block.radius);
            plasmaGradient.addColorStop(0, "#e9fff8");
            plasmaGradient.addColorStop(0.45, "#74ffd4");
            plasmaGradient.addColorStop(1, "#149f8e");
            ctx.fillStyle = plasmaGradient;

            ctx.beginPath();
            for (let i = 0; i < 9; i++) {
                const angle = (Math.PI * 2 * i) / 9;
                const bulge = i % 2 === 0 ? 1.05 : 0.78;
                const px = Math.cos(angle) * block.radius * bulge;
                const py = Math.sin(angle) * block.radius * bulge;
                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.closePath();
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.strokeStyle = "rgba(214, 255, 245, 0.85)";
            ctx.lineWidth = 1.3;
            ctx.stroke();
            ctx.restore();
            continue;
        }

        const tailGradient = ctx.createLinearGradient(0, block.radius * 0.2, 0, -tailLength);
        tailGradient.addColorStop(0, theme.tail[0]);
        tailGradient.addColorStop(0.45, theme.tail[1]);
        tailGradient.addColorStop(1, theme.tail[2]);

        ctx.fillStyle = tailGradient;
        ctx.beginPath();
        ctx.moveTo(-block.radius * 0.52, block.radius * 0.3);
        ctx.quadraticCurveTo(0, -tailLength * 0.86, block.radius * 0.52, block.radius * 0.3);
        ctx.closePath();
        ctx.fill();

        const fireballGradient = ctx.createRadialGradient(
            -block.radius * 0.2,
            -block.radius * 0.25,
            block.radius * 0.12,
            0,
            0,
            block.radius
        );
        fireballGradient.addColorStop(0, theme.core[0]);
        fireballGradient.addColorStop(0.4, theme.core[1]);
        fireballGradient.addColorStop(0.72, theme.core[2]);
        fireballGradient.addColorStop(1, theme.core[3]);

        ctx.shadowColor = theme.glow;
        ctx.shadowBlur = 18;
        ctx.fillStyle = fireballGradient;

        ctx.beginPath();
        ctx.arc(0, 0, block.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = theme.highlight;
        ctx.beginPath();
        ctx.arc(-block.radius * 0.26, -block.radius * 0.24, block.radius * 0.22, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = theme.ring;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, block.radius * 0.82, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}

function loop(timestamp = performance.now()) {
    if (!gameStarted) {
        lastFrameTime = timestamp;
        drawBackground();
        if (gameStopped) {
            drawStoppedOverlay();
        } else {
            drawStartOverlay();
        }
        requestAnimationFrame(loop);
        return;
    }

    if(gameOver){
        lastFrameTime = timestamp;
        drawGameOver();
        requestAnimationFrame(loop);
        return;
    }

    player.x = x;
    player.y = y;

    drawBackground();

    if (gamePaused) {
        lastFrameTime = timestamp;
        drawPlayer();
        drawBlocks();
        drawHud();
        drawPauseOverlay();
        requestAnimationFrame(loop);
        return;
    }

    if (!lastFrameTime) {
        lastFrameTime = timestamp;
    }
    const deltaMs = Math.min(60, Math.max(0, timestamp - lastFrameTime));
    lastFrameTime = timestamp;
    runElapsedMs += deltaMs;

    if (Math.random() < getDifficultySettings().spawnRate) {
        spawnBlock();
    }

    if((keys["ArrowLeft"] || keys["a"] || keys["A"]) && x > 0){
        x -= playerSpeed;
    }
    if((keys["ArrowRight"] || keys["d"] || keys["D"]) && x + playerWidth < canvas.width){
        x += playerSpeed;
    }

    for(let block of blocks){
        block.y += block.speed;
        block.rotation += block.spin;
        block.wavePhase += block.waveSpeed;

        if (block.movementType === "zigzag") {
            block.x += Math.sin(block.wavePhase) * block.waveAmp;
        } else if (block.movementType === "drifter") {
            block.x += block.drift;
        }

        block.x = Math.max(0, Math.min(canvas.width - block.width, block.x));
    }

    ensureEscapeLane();

    for(let block of blocks){
        if(isColliding(player, block)){
            gameOver = true;
            syncBestScoreFromCurrentScore();
            playSound(sounds.hit);
            playSound(sounds.gameOver);
            stopRunAudio();
            break;
        }
    }

    blocks = blocks.filter(block => block.y < canvas.height);

    score++;
    if (score % 25 === 0) {
        pulseScore();
    }

    drawPlayer();
    drawBlocks();

    drawHud();
    updateHud();

    requestAnimationFrame(loop);
}

updateMusicButton();
updateStartOverlayButton();
updatePauseButton();
setDifficulty("low");
updatePlayerMetrics();
x = canvas.width / 2 - playerWidth / 2;
loadBestScore();
updateHud();
loadLocalStats();
renderCommunityStats();
refreshCommunityStats();
setInterval(() => {
    refreshCommunityStats();
}, STATS_REFRESH_INTERVAL_MS);
window.addEventListener("online", () => {
    refreshCommunityStats();
});
ensurePlayMinuteTicker();
loop();
