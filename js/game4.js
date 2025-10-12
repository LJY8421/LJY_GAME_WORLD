// 게임 상태 변수들
let canvas, ctx, nextCanvas, nextCtx;
let gameState = 'ready'; // 'ready', 'playing', 'paused', 'gameOver'
let gameInterval;
let dropTime = 0;
let lastTime = 0;

// 게임 보드
let board = [];
let currentPiece = null;
let nextPiece = null;

// 게임 설정
const GAME_CONFIG = {
    boardWidth: 10,
    boardHeight: 20,
    cellSize: 30
};

// 테트리스 블록들 (7가지 테트로미노)
const PIECES = [
    {
        shape: [
            [1, 1, 1, 1]
        ],
        color: '#00FFFF' // 하늘색 (I-블록)
    },
    {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#FFFF00' // 노란색 (O-블록)
    },
    {
        shape: [
            [0, 1, 0],
            [1, 1, 1]
        ],
        color: '#800080' // 보라색 (T-블록)
    },
    {
        shape: [
            [0, 1, 1],
            [1, 1, 0]
        ],
        color: '#00FF00' // 초록색 (S-블록)
    },
    {
        shape: [
            [1, 1, 0],
            [0, 1, 1]
        ],
        color: '#FF0000' // 빨간색 (Z-블록)
    },
    {
        shape: [
            [1, 0, 0],
            [1, 1, 1]
        ],
        color: '#FFA500' // 주황색 (J-블록)
    },
    {
        shape: [
            [0, 0, 1],
            [1, 1, 1]
        ],
        color: '#0000FF' // 파란색 (L-블록)
    }
];

// 게임 상태
let gameStats = {
    score: 0,
    level: 1,
    lines: 0,
    highScore: getStoredValue('tetrisHighScore', 0),
    maxLevel: getStoredValue('tetrisMaxLevel', 1),
    totalLines: getStoredValue('tetrisTotalLines', 0),
    totalGames: getStoredValue('tetrisTotalGames', 0),
    gamesCompleted: getStoredValue('tetrisGamesCompleted', 0),
    totalTetris: getStoredValue('tetrisTotalTetris', 0),
    dropInterval: 1000
};

// DOM 요소들
let elements = {};

// localStorage 대체 함수들 (브라우저 호환성)
function getStoredValue(key, defaultValue) {
    try {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem(key);
            return stored ? parseInt(stored) : defaultValue;
        }
    } catch (e) {
        console.warn('localStorage not available:', e);
    }
    return defaultValue;
}

function storeValue(key, value) {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, value.toString());
        }
    } catch (e) {
        console.warn('localStorage not available:', e);
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소들 초기화
    elements = {
        score: document.getElementById('score'),
        level: document.getElementById('level'),
        lines: document.getElementById('lines'),
        gameInfo: document.getElementById('gameInfo'),
        highScore: document.getElementById('highScore'),
        maxLevel: document.getElementById('maxLevel'),
        totalLines: document.getElementById('totalLines'),
        gameOverlay: document.getElementById('gameOverlay'),
        overlayTitle: document.getElementById('overlayTitle'),
        overlayMessage: document.getElementById('overlayMessage'),
        gameOverModal: document.getElementById('gameOverModal'),
        modalTitle: document.getElementById('modalTitle'),
        modalMessage: document.getElementById('modalMessage'),
        finalScore: document.getElementById('finalScore'),
        finalLevel: document.getElementById('finalLevel'),
        finalLines: document.getElementById('finalLines'),
        mobileControls: document.getElementById('mobileControls'),
        helpModal: document.getElementById('helpModal'),
        statsModal: document.getElementById('statsModal'),
        startBtn: document.getElementById('startBtn'),
        pauseBtn: document.getElementById('pauseBtn')
    };

    init();
    
    // 환영 메시지 순환
    cycleWelcomeMessages();
});

function cycleWelcomeMessages() {
    if (gameState !== 'ready') return;
    
    const messages = [
        '스페이스바 또는 시작 버튼을 눌러 시작하세요!',
        '방향키로 블록을 조작하세요!',
        'P키나 일시정지 버튼으로 일시정지할 수 있습니다.',
        'H키를 눌러 도움말을 확인하세요!'
    ];
    
    let currentMessageIndex = 0;
    
    const messageInterval = setInterval(() => {
        if (gameState !== 'ready') {
            clearInterval(messageInterval);
            return;
        }
        
        currentMessageIndex = (currentMessageIndex + 1) % messages.length;
        if (elements.gameInfo) {
            elements.gameInfo.textContent = messages[currentMessageIndex];
        }
    }, 3000);
}

// 초기화
function init() {
    canvas = document.getElementById('gameCanvas');
    nextCanvas = document.getElementById('nextCanvas');
    
    if (!canvas || !nextCanvas) {
        console.error('Canvas elements not found!');
        return;
    }
    
    ctx = canvas.getContext('2d');
    nextCtx = nextCanvas.getContext('2d');
    
    initializeGame();
    setupEventListeners();
    updateUI();
    updateButtons();
    
    // 첫 화면 그리기
    draw();
    drawNextPiece();
}

function initializeGame() {
    // 보드 초기화 (20x10)
    board = Array(GAME_CONFIG.boardHeight).fill(null).map(() => 
        Array(GAME_CONFIG.boardWidth).fill(0)
    );
    
    // 첫 번째 블록들 생성
    currentPiece = createPiece();
    nextPiece = createPiece();
    
    gameState = 'ready';
    dropTime = 0;
}

function createPiece() {
    const pieceData = PIECES[Math.floor(Math.random() * PIECES.length)];
    return {
        shape: pieceData.shape.map(row => [...row]), // 깊은 복사
        color: pieceData.color,
        x: Math.floor(GAME_CONFIG.boardWidth / 2) - Math.floor(pieceData.shape[0].length / 2),
        y: 0
    };
}

// 게임 제어 함수들
function startNewGame() {
    if (gameState === 'ready') {
        startGame();
    }
}

function startGame() {
    if (gameState === 'ready') {
        gameState = 'playing';
        gameStats.totalGames++;
        storeValue('tetrisTotalGames', gameStats.totalGames);
        
        if (elements.gameOverlay) {
            elements.gameOverlay.classList.add('hidden');
        }
        if (elements.gameInfo) {
            elements.gameInfo.textContent = '방향키로 블록을 조작하세요!';
        }
        
        updateButtons();
        lastTime = performance.now();
        gameLoop(lastTime);
    }
}

function pauseGame() {
    if (gameState === 'playing') {
        gameState = 'paused';
        
        if (elements.gameOverlay) {
            elements.gameOverlay.classList.remove('hidden');
        }
        if (elements.overlayTitle) {
            elements.overlayTitle.textContent = '⏸️ 게임 일시정지';
        }
        if (elements.overlayMessage) {
            elements.overlayMessage.textContent = '계속하기 버튼을 눌러 게임을 재개하세요';
        }
        if (elements.gameInfo) {
            elements.gameInfo.textContent = '게임이 일시정지되었습니다.';
        }
        
        updateButtons();
    } else if (gameState === 'paused') {
        resumeGame();
    }
}

function resumeGame() {
    if (gameState === 'paused') {
        gameState = 'playing';
        
        if (elements.gameOverlay) {
            elements.gameOverlay.classList.add('hidden');
        }
        if (elements.gameInfo) {
            elements.gameInfo.textContent = '방향키로 블록을 조작하세요!';
        }
        
        updateButtons();
        lastTime = performance.now();
        gameLoop(lastTime);
    }
}

function resetGame() {
    gameState = 'ready';
    gameStats.score = 0;
    gameStats.level = 1;
    gameStats.lines = 0;
    gameStats.dropInterval = 1000;
    
    if (elements.gameOverlay) {
        elements.gameOverlay.classList.remove('hidden');
    }
    if (elements.overlayTitle) {
        elements.overlayTitle.textContent = '🎮 게임 준비!';
    }
    if (elements.overlayMessage) {
        elements.overlayMessage.textContent = '방향키로 블록을 조작하세요';
    }
    if (elements.gameInfo) {
        elements.gameInfo.textContent = '스페이스바 또는 시작 버튼을 눌러 시작하세요!';
    }
    
    initializeGame();
    updateUI();
    updateButtons();
    draw();
    drawNextPiece();
    cycleWelcomeMessages();
}

// 버튼 상태 업데이트 함수
function updateButtons() {
    if (elements.startBtn) {
        if (gameState === 'ready') {
            elements.startBtn.textContent = '🚀 게임 시작';
            elements.startBtn.disabled = false;
        } else {
            elements.startBtn.textContent = '🚀 게임 시작';
            elements.startBtn.disabled = true;
        }
    }
    
    if (elements.pauseBtn) {
        if (gameState === 'ready') {
            elements.pauseBtn.textContent = '⏸️ 일시정지';
            elements.pauseBtn.disabled = true;
        } else if (gameState === 'playing') {
            elements.pauseBtn.textContent = '⏸️ 일시정지';
            elements.pauseBtn.disabled = false;
        } else if (gameState === 'paused') {
            elements.pauseBtn.textContent = '▶️ 계속하기';
            elements.pauseBtn.disabled = false;
        } else {
            elements.pauseBtn.textContent = '⏸️ 일시정지';
            elements.pauseBtn.disabled = true;
        }
    }
}

// 게임 루프
function gameLoop(time) {
    if (gameState !== 'playing') return;
    
    const deltaTime = time - lastTime;
    dropTime += deltaTime;
    
    if (dropTime >= gameStats.dropInterval) {
        if (!movePiece(0, 1)) {
            placePiece();
            const linesCleared = clearLines();
            spawnNewPiece();
            
            if (checkGameOver()) {
                gameOver();
                return;
            }
        }
        dropTime = 0;
    }
    
    draw();
    lastTime = time;
    requestAnimationFrame(gameLoop);
}

// 블록 이동 및 조작
function movePiece(dx, dy) {
    if (!currentPiece || !canMove(currentPiece, dx, dy)) {
        return false;
    }
    
    currentPiece.x += dx;
    currentPiece.y += dy;
    return true;
}

function canMove(piece, dx, dy) {
    const newX = piece.x + dx;
    const newY = piece.y + dy;
    
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const boardX = newX + x;
                const boardY = newY + y;
                
                // 경계 체크 및 충돌 체크
                if (boardX < 0 || boardX >= GAME_CONFIG.boardWidth ||
                    boardY >= GAME_CONFIG.boardHeight ||
                    (boardY >= 0 && board[boardY][boardX])) {
                    return false;
                }
            }
        }
    }
    return true;
}

function rotatePiece() {
    if (!currentPiece) return;
    
    const rotated = rotateMatrix(currentPiece.shape);
    const originalShape = currentPiece.shape;
    
    currentPiece.shape = rotated;
    
    // 회전 후 벽 킥 시도 (SRS 간소화 버전)
    const kicks = [
        [0, 0],   // 원래 위치
        [-1, 0],  // 왼쪽으로 이동
        [1, 0],   // 오른쪽으로 이동
        [0, -1],  // 위로 이동
        [-1, -1], // 왼쪽 위로
        [1, -1]   // 오른쪽 위로
    ];
    
    for (let kick of kicks) {
        if (canMove(currentPiece, kick[0], kick[1])) {
            currentPiece.x += kick[0];
            currentPiece.y += kick[1];
            return;
        }
    }
    
    // 회전할 수 없으면 원래 모양으로 되돌리기
    currentPiece.shape = originalShape;
}

function rotateMatrix(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));
    
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            rotated[x][rows - 1 - y] = matrix[y][x];
        }
    }
    return rotated;
}

function dropPiece() {
    if (!currentPiece) return;
    
    while (movePiece(0, 1)) {
        // 계속 아래로 이동
    }
    // 즉시 배치
    placePiece();
    clearLines();
    spawnNewPiece();
    
    if (checkGameOver()) {
        gameOver();
    }
}

function placePiece() {
    if (!currentPiece) return;
    
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.color;
                }
            }
        }
    }
}

function clearLines() {
    let linesCleared = 0;
    
    for (let y = GAME_CONFIG.boardHeight - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(GAME_CONFIG.boardWidth).fill(0));
            linesCleared++;
            y++; // 같은 라인을 다시 확인
        }
    }
    
    if (linesCleared > 0) {
        gameStats.lines += linesCleared;
        gameStats.score += calculateScore(linesCleared);
        
        // 테트리스 카운트
        if (linesCleared === 4) {
            gameStats.totalTetris++;
            storeValue('tetrisTotalTetris', gameStats.totalTetris);
        }
        
        // 레벨 계산: 10줄마다 레벨업
        const newLevel = Math.floor(gameStats.lines / 10) + 1;
        if (newLevel > gameStats.level) {
            gameStats.level = newLevel;
            // 레벨이 오를수록 속도 증가 (최소 50ms)
            gameStats.dropInterval = Math.max(50, 1000 - (gameStats.level - 1) * 80);
        }
        
        // 라인 클리어 효과
        createLineEffect();
        updateUI();
        
        // 특별한 피드백
        if (linesCleared >= 4) {
            if (elements.gameInfo) {
                elements.gameInfo.textContent = '🎉 테트리스! 완벽해요! 🎉';
                setTimeout(() => {
                    if (gameState === 'playing' && elements.gameInfo) {
                        elements.gameInfo.textContent = '방향키로 블록을 조작하세요!';
                    }
                }, 2000);
            }
        } else if (newLevel > gameStats.level - 1) {
            if (elements.gameInfo) {
                elements.gameInfo.textContent = `🚀 레벨 ${gameStats.level}! 속도 증가! 🚀`;
                setTimeout(() => {
                    if (gameState === 'playing' && elements.gameInfo) {
                        elements.gameInfo.textContent = '방향키로 블록을 조작하세요!';
                    }
                }, 1500);
            }
        }
    }
    
    return linesCleared;
}

function calculateScore(lines) {
    // 테트리스 표준 점수 시스템
    const scores = [0, 100, 300, 500, 800];
    return scores[lines] * gameStats.level;
}

function createLineEffect() {
    // 라인 클리어 시각적 효과
    if (canvas) {
        canvas.style.filter = 'brightness(1.3) drop-shadow(0 0 15px #00ffff)';
        setTimeout(() => {
            if (canvas) {
                canvas.style.filter = '';
            }
        }, 200);
    }
}

function spawnNewPiece() {
    currentPiece = nextPiece;
    nextPiece = createPiece();
    drawNextPiece();
}

function checkGameOver() {
    return currentPiece && !canMove(currentPiece, 0, 0);
}

function gameOver() {
    gameState = 'gameOver';
    gameStats.gamesCompleted++;
    storeValue('tetrisGamesCompleted', gameStats.gamesCompleted);
    
    // 최고점수 및 기록 업데이트
    let isNewRecord = false;
    if (gameStats.score > gameStats.highScore) {
        gameStats.highScore = gameStats.score;
        storeValue('tetrisHighScore', gameStats.highScore);
        isNewRecord = true;
    }
    
    if (gameStats.level > gameStats.maxLevel) {
        gameStats.maxLevel = gameStats.level;
        storeValue('tetrisMaxLevel', gameStats.maxLevel);
    }
    
    gameStats.totalLines += gameStats.lines;
    storeValue('tetrisTotalLines', gameStats.totalLines);
    
    // 모달 표시
    if (isNewRecord) {
        if (elements.modalTitle) {
            elements.modalTitle.textContent = '🏆 새로운 최고기록!';
            elements.modalTitle.style.color = '#ffff00';
        }
        if (elements.modalMessage) {
            elements.modalMessage.textContent = '축하합니다! 새로운 최고점수를 달성했습니다!';
        }
    } else {
        if (elements.modalTitle) {
            elements.modalTitle.textContent = '💀 게임 오버!';
            elements.modalTitle.style.color = '#ff0000';
        }
        if (elements.modalMessage) {
            elements.modalMessage.textContent = '더 이상 블록을 놓을 공간이 없습니다!';
        }
    }
    
    if (elements.finalScore) elements.finalScore.textContent = gameStats.score.toLocaleString();
    if (elements.finalLevel) elements.finalLevel.textContent = gameStats.level;
    if (elements.finalLines) elements.finalLines.textContent = gameStats.lines;
    if (elements.gameOverModal) elements.gameOverModal.style.display = 'flex';
    
    updateUI();
    updateButtons();
}

function closeModal() {
    if (elements.gameOverModal) {
        elements.gameOverModal.style.display = 'none';
    }
    resetGame();
}

// 렌더링 함수들
function draw() {
    if (!canvas || !ctx) return;
    
    // 캔버스 클리어
    ctx.fillStyle = 'rgba(0, 10, 20, 0.95)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 보드 그리기
    drawBoard();
    
    // 현재 블록 그리기
    if (currentPiece) {
        drawPiece(currentPiece);
    }
    
    // 그리드 그리기
    drawGrid();
}

function drawBoard() {
    for (let y = 0; y < GAME_CONFIG.boardHeight; y++) {
        for (let x = 0; x < GAME_CONFIG.boardWidth; x++) {
            if (board[y][x]) {
                drawCell(x, y, board[y][x]);
            }
        }
    }
}

function drawPiece(piece) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                drawCell(piece.x + x, piece.y + y, piece.color);
            }
        }
    }
}

function drawCell(x, y, color) {
    const pixelX = x * GAME_CONFIG.cellSize;
    const pixelY = y * GAME_CONFIG.cellSize;
    
    // 메인 색상
    ctx.fillStyle = color;
    ctx.fillRect(pixelX, pixelY, GAME_CONFIG.cellSize, GAME_CONFIG.cellSize);
    
    // 그라데이션 효과
    const gradient = ctx.createLinearGradient(
        pixelX, pixelY, 
        pixelX + GAME_CONFIG.cellSize, pixelY + GAME_CONFIG.cellSize
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(pixelX, pixelY, GAME_CONFIG.cellSize, GAME_CONFIG.cellSize);
    
    // 테두리
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(pixelX, pixelY, GAME_CONFIG.cellSize, GAME_CONFIG.cellSize);
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // 세로선
    for (let x = 0; x <= GAME_CONFIG.boardWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(x * GAME_CONFIG.cellSize, 0);
        ctx.lineTo(x * GAME_CONFIG.cellSize, canvas.height);
        ctx.stroke();
    }
    
    // 가로선
    for (let y = 0; y <= GAME_CONFIG.boardHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * GAME_CONFIG.cellSize);
        ctx.lineTo(canvas.width, y * GAME_CONFIG.cellSize);
        ctx.stroke();
    }
}

function drawNextPiece() {
    if (!nextCanvas || !nextCtx || !nextPiece) return;
    
    // 캔버스 클리어
    nextCtx.fillStyle = 'rgba(0, 10, 20, 0.95)';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    const cellSize = 20;
    const offsetX = (nextCanvas.width - nextPiece.shape[0].length * cellSize) / 2;
    const offsetY = (nextCanvas.height - nextPiece.shape.length * cellSize) / 2;
    
    for (let y = 0; y < nextPiece.shape.length; y++) {
        for (let x = 0; x < nextPiece.shape[y].length; x++) {
            if (nextPiece.shape[y][x]) {
                const pixelX = offsetX + x * cellSize;
                const pixelY = offsetY + y * cellSize;
                
                // 메인 색상
                nextCtx.fillStyle = nextPiece.color;
                nextCtx.fillRect(pixelX, pixelY, cellSize, cellSize);
                
                // 그라데이션 효과
                const gradient = nextCtx.createLinearGradient(
                    pixelX, pixelY, 
                    pixelX + cellSize, pixelY + cellSize
                );
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
                
                nextCtx.fillStyle = gradient;
                nextCtx.fillRect(pixelX, pixelY, cellSize, cellSize);
                
                // 테두리
                nextCtx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                nextCtx.lineWidth = 1;
                nextCtx.strokeRect(pixelX, pixelY, cellSize, cellSize);
            }
        }
    }
}

function updateUI() {
    if (elements.score) elements.score.textContent = gameStats.score.toLocaleString();
    if (elements.level) elements.level.textContent = gameStats.level;
    if (elements.lines) elements.lines.textContent = gameStats.lines;
    if (elements.highScore) elements.highScore.textContent = gameStats.highScore.toLocaleString();
    if (elements.maxLevel) elements.maxLevel.textContent = gameStats.maxLevel;
    if (elements.totalLines) elements.totalLines.textContent = gameStats.totalLines.toLocaleString();
}

// 모달 제어 함수들
function showHelp() {
    if (elements.helpModal) {
        elements.helpModal.style.display = 'flex';
    }
}

function closeHelp() {
    if (elements.helpModal) {
        elements.helpModal.style.display = 'none';
    }
}

function showStats() {
    // 통계 모달에 데이터 업데이트
    const avgScore = gameStats.totalGames > 0 ? Math.round(gameStats.score / gameStats.totalGames) : 0;
    
    const statsElements = {
        modalTotalGames: document.getElementById('modalTotalGames'),
        modalGamesCompleted: document.getElementById('modalGamesCompleted'),
        modalHighScore: document.getElementById('modalHighScore'),
        modalMaxLevel: document.getElementById('modalMaxLevel'),
        modalTotalLines: document.getElementById('modalTotalLines'),
        modalTotalTetris: document.getElementById('modalTotalTetris'),
        modalAvgScore: document.getElementById('modalAvgScore')
    };
    
    if (statsElements.modalTotalGames) statsElements.modalTotalGames.textContent = gameStats.totalGames;
    if (statsElements.modalGamesCompleted) statsElements.modalGamesCompleted.textContent = gameStats.gamesCompleted;
    if (statsElements.modalHighScore) statsElements.modalHighScore.textContent = gameStats.highScore.toLocaleString();
    if (statsElements.modalMaxLevel) statsElements.modalMaxLevel.textContent = gameStats.maxLevel;
    if (statsElements.modalTotalLines) statsElements.modalTotalLines.textContent = gameStats.totalLines.toLocaleString();
    if (statsElements.modalTotalTetris) statsElements.modalTotalTetris.textContent = gameStats.totalTetris;
    if (statsElements.modalAvgScore) statsElements.modalAvgScore.textContent = avgScore.toLocaleString();
    
    if (elements.statsModal) {
        elements.statsModal.style.display = 'flex';
    }
}

function closeStats() {
    if (elements.statsModal) {
        elements.statsModal.style.display = 'none';
    }
}

function resetStats() {
    if (confirm('정말로 모든 기록을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
        // 모든 통계 초기화
        gameStats.highScore = 0;
        gameStats.maxLevel = 1;
        gameStats.totalLines = 0;
        gameStats.totalGames = 0;
        gameStats.gamesCompleted = 0;
        gameStats.totalTetris = 0;
        
        // localStorage에서 삭제
        storeValue('tetrisHighScore', 0);
        storeValue('tetrisMaxLevel', 1);
        storeValue('tetrisTotalLines', 0);
        storeValue('tetrisTotalGames', 0);
        storeValue('tetrisGamesCompleted', 0);
        storeValue('tetrisTotalTetris', 0);
        
        // UI 업데이트
        updateUI();
        showStats(); // 통계 모달 다시 표시
        
        alert('모든 기록이 삭제되었습니다.');
    }
}

function goHome() {
    if (confirm('게임을 종료하고 메인 페이지로 돌아가시겠습니까?')) {
        // 메인 페이지로 이동 (파일명을 실제 메인페이지 파일명으로 수정하세요)
        window.location.href = 'index.html';
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 키보드 이벤트
    document.addEventListener('keydown', handleKeyDown);
    
    // 모바일 컨트롤 버튼
    const mobileButtons = document.querySelectorAll('.mobile-btn');
    mobileButtons.forEach(button => {
        button.addEventListener('click', handleMobileControl);
        button.addEventListener('touchstart', handleMobileControl, { passive: true });
    });
    
    // 포커스 관리 (게임이 백그라운드로 갈 때 일시정지)
    window.addEventListener('blur', () => {
        if (gameState === 'playing') {
            pauseGame();
        }
    });
    
    // ESC 키로 메인으로 돌아가기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            goHome();
        }
    });
}

function handleKeyDown(e) {
    // 모달이 열려있을 때는 해당 모달의 키만 처리
    if (elements.helpModal && elements.helpModal.style.display === 'flex') {
        if (e.key === 'Escape' || e.key === 'h' || e.key === 'H') {
            e.preventDefault();
            closeHelp();
        }
        return;
    }
    
    if (elements.statsModal && elements.statsModal.style.display === 'flex') {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeStats();
        }
        return;
    }
    
    if (elements.gameOverModal && elements.gameOverModal.style.display === 'flex') {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            closeModal();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            goHome();
        }
        return;
    }
    
    // 일시정지 상태에서의 조작 (우선 처리)
    if (gameState === 'paused') {
        if (e.key === 'p' || e.key === 'P') {
            e.preventDefault();
            resumeGame();
        } else if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            resetGame();
        } else if (e.key === 'h' || e.key === 'H') {
            e.preventDefault();
            showHelp();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            goHome();
        }
        return;
    }
    
    // 게임 시작 키 (스페이스바 또는 방향키) - ready 상태에서만
    if (gameState === 'ready' && 
        (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key))) {
        e.preventDefault();
        startGame();
        return;
    }
    
    // ready 상태에서의 다른 키 처리
    if (gameState === 'ready') {
        if (e.key === 'h' || e.key === 'H') {
            e.preventDefault();
            showHelp();
        } else if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            resetGame();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            goHome();
        }
        return;
    }
    
    // 게임 오버 상태에서는 리셋만 허용
    if (gameState === 'gameOver') {
        if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            closeModal();
        } else if (e.key === 'h' || e.key === 'H') {
            e.preventDefault();
            showHelp();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            goHome();
        }
        return;
    }
    
    // 게임 중 조작
    if (gameState === 'playing') {
        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                movePiece(-1, 0);
                break;
            case 'ArrowRight':
                e.preventDefault();
                movePiece(1, 0);
                break;
            case 'ArrowDown':
                e.preventDefault();
                movePiece(0, 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                rotatePiece();
                break;
            case ' ': // 스페이스바 - 즉시 낙하
                e.preventDefault();
                dropPiece();
                break;
            case 'p':
            case 'P':
                e.preventDefault();
                pauseGame();
                break;
            case 'r':
            case 'R':
                e.preventDefault();
                if (confirm('게임을 재시작하시겠습니까?')) {
                    resetGame();
                }
                break;
            case 'h':
            case 'H':
                e.preventDefault();
                pauseGame();
                showHelp();
                break;
            case 'Escape':
                e.preventDefault();
                goHome();
                break;
        }
    }
}

function handleMobileControl(e) {
    e.preventDefault();
    const action = e.target.getAttribute('data-action');
    
    // 게임 시작
    if (gameState === 'ready' && 
        ['left', 'right', 'down', 'rotate', 'drop'].includes(action)) {
        startGame();
        return;
    }
    
    switch(action) {
        case 'left':
            if (gameState === 'playing') movePiece(-1, 0);
            break;
        case 'right':
            if (gameState === 'playing') movePiece(1, 0);
            break;
        case 'down':
            if (gameState === 'playing') movePiece(0, 1);
            break;
        case 'rotate':
            if (gameState === 'playing') rotatePiece();
            break;
        case 'drop':
            if (gameState === 'playing') dropPiece();
            break;
        case 'pause':
            if (gameState === 'playing') {
                pauseGame();
            } else if (gameState === 'paused') {
                resumeGame();
            }
            break;
    }
}

// 터치 이벤트 방지 (모바일에서 스크롤 방지)
document.addEventListener('touchmove', function(e) {
    if (gameState === 'playing') {
        e.preventDefault();
    }
}, { passive: false });

// 컨텍스트 메뉴 방지
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// 브라우저 리사이즈 처리
window.addEventListener('resize', function() {
    // 모바일 기기에서 화면 방향 변경 시 UI 조정
    setTimeout(() => {
        if (canvas && nextCanvas) {
            draw();
            drawNextPiece();
        }
    }, 100);
});

// 페이지 언로드 시 게임 상태 저장
window.addEventListener('beforeunload', function() {
    if (gameState === 'playing') {
        pauseGame();
    }
});

// 전역 함수들 (HTML에서 호출)
window.startNewGame = startNewGame;
window.pauseGame = pauseGame;
window.resetGame = resetGame;
window.showHelp = showHelp;
window.closeHelp = closeHelp;
window.showStats = showStats;
window.closeStats = closeStats;
window.resetStats = resetStats;
window.goHome = goHome;
window.closeModal = closeModal;

// 디버그 및 개발자 도구 감지 (선택사항)
let devtools = {
    open: false,
    orientation: null
};

const threshold = 160;
setInterval(() => {
    if (window.outerHeight - window.innerHeight > threshold || 
        window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
            devtools.open = true;
            // 개발자 도구가 열렸을 때 게임 일시정지
            if (gameState === 'playing') {
                pauseGame();
            }
        }
    } else {
        devtools.open = false;
    }
}, 500);

// 성능 모니터링 (선택사항)
let performanceMonitor = {
    frameCount: 0,
    lastTime: performance.now(),
    fps: 60
};

function updatePerformance() {
    const now = performance.now();
    performanceMonitor.frameCount++;
    
    if (now - performanceMonitor.lastTime >= 1000) {
        performanceMonitor.fps = Math.round(
            (performanceMonitor.frameCount * 1000) / (now - performanceMonitor.lastTime)
        );
        performanceMonitor.frameCount = 0;
        performanceMonitor.lastTime = now;
        
        // FPS가 너무 낮으면 경고 (개발용)
        if (performanceMonitor.fps < 30 && gameState === 'playing') {
            console.warn(`Low FPS detected: ${performanceMonitor.fps}`);
        }
    }
}

// 게임 루프에 성능 모니터링 추가
const originalGameLoop = gameLoop;
gameLoop = function(time) {
    updatePerformance();
    return originalGameLoop.call(this, time);
}

// 페이지 숨김 시에도 게임 일시정지
document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState === 'playing') {
        pauseGame();
    }
});

// 에러 처리 개선
function safeExecute(fn, fallback = () => {}) {
    try {
        return fn();
    } catch (error) {
        console.error('Game error:', error);
        return fallback();
    }
}