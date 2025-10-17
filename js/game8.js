// 게임 상태 변수들
let gameBoard = [];
let gameSize = 4;
let gameMode = 'square'; // 'square' 또는 'hex'
let gameState = 'menu'; // 'menu', 'ready', 'playing', 'paused', 'gameOver', 'won'
let score = 0;
let bestScore = 0;
let moveCount = 0;
let bestTile = 2;
let gameStartTime = null;
let gameTimer = null;
let hasWon = false;
let isPaused = false;
let isAnimating = false; // 애니메이션 진행 중 여부

// 게임 목표 설정
const gameTargets = {
    3: 512,
    4: 2048,
    5: 4096,
    6: 8192,
    7: 16384,
    8: 32768,
    hex: 2048
};

// 통계 데이터
let gameStats = {
    totalGames: parseInt(localStorage.getItem('2048TotalGames')) || 0,
    wonGames: parseInt(localStorage.getItem('2048WonGames')) || 0,
    totalScore: parseInt(localStorage.getItem('2048TotalScore')) || 0,
    bestTile: parseInt(localStorage.getItem('2048BestTile')) || 2,
    totalTime: parseInt(localStorage.getItem('2048TotalTime')) || 0
};

// DOM 요소들
const elements = {
    gameBoard: document.getElementById('gameBoard'),
    score: document.getElementById('score'),
    highScore: document.getElementById('highScore'),
    target: document.getElementById('target'),
    gameInfo: document.getElementById('gameInfo'),
    moveCount: document.getElementById('moveCount'),
    bestTile: document.getElementById('bestTile'),
    gameTime: document.getElementById('gameTime'),
    gameOverlay: document.getElementById('gameOverlay'),
    overlayTitle: document.getElementById('overlayTitle'),
    overlayMessage: document.getElementById('overlayMessage'),
    gameOverModal: document.getElementById('gameOverModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalMessage: document.getElementById('modalMessage'),
    finalScore: document.getElementById('finalScore'),
    finalBestTile: document.getElementById('finalBestTile'),
    finalMoves: document.getElementById('finalMoves'),
    finalTime: document.getElementById('finalTime'),
    helpModal: document.getElementById('helpModal'),
    statsModal: document.getElementById('statsModal'),
    hexControls: document.getElementById('hexControls'),
    pauseBtn: document.getElementById('pauseBtn')
};

// 터치 관련 변수
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

// 육각형 모드용 좌표 설정
const hexCoords = [
    {row: 0, positions: [{x: 2, y: 0}, {x: 3, y: 0}, {x: 4, y: 0}]},
    {row: 1, positions: [{x: 1, y: 1}, {x: 2, y: 1}, {x: 3, y: 1}, {x: 4, y: 1}]},
    {row: 2, positions: [{x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}, {x: 3, y: 2}, {x: 4, y: 2}]},
    {row: 3, positions: [{x: 1, y: 3}, {x: 2, y: 3}, {x: 3, y: 3}, {x: 4, y: 3}]},
    {row: 4, positions: [{x: 2, y: 4}, {x: 3, y: 4}, {x: 4, y: 4}]}
];

// 초기화 함수
function init() {
    bestScore = parseInt(localStorage.getItem('2048HighScore')) || 0;
    setupEventListeners();
    setupButtonEvents();
    setupModalButtonEvents();
    updateBoardClass();
    updateUI();
    showInitialDifficultySelection();
}

function setupEventListeners() {
    document.addEventListener('keydown', handleKeyDown);
    setupModalClickEvents();
    setupTouchEvents();
    setupMouseDragEvents();
    setupMobileControls();
}

function setupButtonEvents() {
    document.addEventListener('click', handleButtonClick);
}

function handleButtonClick(e) {
    const button = e.target.closest('.control-btn');
    if (!button) return;
    
    const buttonText = button.textContent.trim();
    
    if (buttonText.includes('도움말')) {
        showHelp();
    } else if (buttonText.includes('통계 보기')) {
        showStats();
    }
}

function setupModalClickEvents() {
    [elements.helpModal, elements.statsModal, elements.gameOverModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modal);
                }
            });
        }
    });
}

function setupModalButtonEvents() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('.control-btn') && e.target.closest('.modal-buttons')) {
            const buttonText = e.target.textContent.trim();
            if (buttonText.includes('다시 하기')) {
                restartGame();
            } else if (buttonText.includes('메인으로')) {
                goHome();
            }
        }
    });
}

function setupTouchEvents() {
    if (elements.gameBoard) {
        elements.gameBoard.addEventListener('touchstart', handleTouchStart, {passive: false});
        elements.gameBoard.addEventListener('touchend', handleTouchEnd, {passive: false});
    }
}
let mouseStartX = 0;
let mouseStartY = 0;
let isMouseDown = false;

function setupMouseDragEvents() {
    if (elements.gameBoard) {
        elements.gameBoard.addEventListener('mousedown', handleMouseDown);
        elements.gameBoard.addEventListener('mousemove', handleMouseMove);
        elements.gameBoard.addEventListener('mouseup', handleMouseUp);
        elements.gameBoard.addEventListener('mouseleave', handleMouseLeave);
    }
}

function handleMouseDown(e) {
    if (gameState !== 'playing' || isAnimating) return;
    isMouseDown = true;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
}

function handleMouseMove(e) {
    // 드래그 중 시각적 피드백 필요하면 여기에 추가
}

function handleMouseUp(e) {
    if (!isMouseDown) return;
    isMouseDown = false;
    
    const mouseEndX = e.clientX;
    const mouseEndY = e.clientY;
    
    const deltaX = mouseEndX - mouseStartX;
    const deltaY = mouseEndY - mouseStartY;
    const minDragDistance = 50;
    
    if (Math.abs(deltaX) > minDragDistance || Math.abs(deltaY) > minDragDistance) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0) {
                handleMove('right');
            } else {
                handleMove('left');
            }
        } else {
            if (deltaY > 0) {
                handleMove('down');
            } else {
                handleMove('up');
            }
        }
    }
}

function handleMouseLeave(e) {
    isMouseDown = false;
}
function setupMobileControls() {
    const mobileButtons = document.querySelectorAll('.mobile-btn');
    mobileButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const direction = btn.dataset.direction;
            handleMove(direction);
        });
    });
}

function selectDifficulty(difficulty) {
    if (difficulty === 'hex') {
        gameMode = 'hex';
        gameSize = 5;
        if (elements.hexControls) elements.hexControls.style.display = 'block';
    } else {
        gameMode = 'square';
        gameSize = parseInt(difficulty);
        if (elements.hexControls) elements.hexControls.style.display = 'none';
    }
    
    updateBoardClass();
    if (elements.target) elements.target.textContent = gameTargets[difficulty] || 2048;
    
    prepareGame();
}

function updateBoardClass() {
    if (elements.gameBoard) {
        elements.gameBoard.className = `game-board size-${gameMode === 'hex' ? 'hex' : gameSize}`;
    }
}

// 게임 시작 버튼 - 순수하게 게임 시작만 담당
function startNewGame() {
    if (gameState === 'menu') {
        // 메뉴 상태에서는 난이도를 먼저 선택하라고 안내
        if (elements.gameInfo) elements.gameInfo.textContent = '먼저 난이도를 선택해주세요!';
        return;
    } else if (gameState === 'ready') {
        // 준비 상태에서는 게임 시작
        beginGame();
    }
    // playing, paused, gameOver, won 상태에서는 아무것도 하지 않음
}

function resetGame() {
    if (gameState === 'menu') {
        return;
    }
    
    gameState = 'ready';
    score = 0;
    moveCount = 0;
    bestTile = 2;
    hasWon = false;
    isPaused = false;
    isAnimating = false;
    gameStartTime = null;
    
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    
    prepareGame();
}

function showInitialDifficultySelection() {
    gameBoard = [];
    for (let i = 0; i < gameSize; i++) {
        gameBoard[i] = [];
        for (let j = 0; j < gameSize; j++) {
            gameBoard[i][j] = 0;
        }
    }
    
    if (gameMode === 'hex') {
        drawHexBoard();
    } else {
        drawSquareBoard();
    }
    
    gameState = 'menu';
    updateMainGameButton();
    if (elements.gameOverlay) elements.gameOverlay.classList.remove('hidden');
    if (elements.overlayTitle) elements.overlayTitle.textContent = '🎯 난이도를 선택하세요!';
    if (elements.overlayMessage) {
        elements.overlayMessage.innerHTML = `
            <div class="difficulty-buttons">
                <button class="difficulty-btn" onclick="selectDifficulty('3')">
                    <span>🟢 초급</span><br>
                    <small>3×3, 목표: 512</small>
                </button>
                <button class="difficulty-btn" onclick="selectDifficulty('4')">
                    <span>🟡 중급</span><br>
                    <small>4×4, 목표: 2048</small>
                </button>
                <button class="difficulty-btn" onclick="selectDifficulty('5')">
                    <span>🟠 고급</span><br>
                    <small>5×5, 목표: 4096</small>
                </button>
                <button class="difficulty-btn" onclick="selectDifficulty('6')">
                    <span>🔴 최고급</span><br>
                    <small>6×6, 목표: 8192</small>
                </button>
                <button class="difficulty-btn" onclick="selectDifficulty('7')">
                    <span>🟣 극한급</span><br>
                    <small>7×7, 목표: 16384</small>
                </button>
                <button class="difficulty-btn" onclick="selectDifficulty('8')">
                    <span>⚫ 초월급</span><br>
                    <small>8×8, 목표: 32768</small>
                </button>
                <button class="difficulty-btn hex-mode" onclick="selectDifficulty('hex')">
                    <span>⭐ 육각형</span><br>
                    <small>특별 모드, 목표: 2048</small>
                </button>
            </div>
        `;
    }
    if (elements.gameInfo) elements.gameInfo.textContent = '게임을 시작할 난이도를 선택하세요!';
}

function prepareGame() {
    gameState = 'ready';
    score = 0;
    moveCount = 0;
    bestTile = 2;
    hasWon = false;
    isPaused = false;
    isAnimating = false;
    gameStartTime = null;
    
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    
    initializeBoard();
    addRandomTile();
    addRandomTile();
    
    updateUI();
    updateMainGameButton();
    updatePauseButton();
    
    if (elements.gameOverlay) elements.gameOverlay.classList.remove('hidden');
    if (elements.overlayTitle) elements.overlayTitle.textContent = '🎮 게임 준비 완료!';
    if (elements.overlayMessage) elements.overlayMessage.innerHTML = '<p>스페이스바나 게임 시작 버튼을 눌러 시작하세요!</p>';
    if (elements.gameInfo) elements.gameInfo.textContent = '스페이스바나 게임 시작 버튼을 눌러 시작하세요!';
}

function beginGame() {
    if (gameState === 'ready') {
        gameState = 'playing';
        gameStartTime = Date.now();
        
        gameStats.totalGames++;
        localStorage.setItem('2048TotalGames', gameStats.totalGames);
        
        if (elements.gameOverlay) elements.gameOverlay.classList.add('hidden');
        if (elements.gameInfo) {
            elements.gameInfo.textContent = gameMode === 'hex' ? 
                '화살표 키, WASD, Q, E 키로 조작하세요!' : 
                '화살표 키나 WASD로 조작하세요!';
        }
        
        startTimer();
        updateMainGameButton();
        updatePauseButton();
    } else if (gameState === 'menu') {
        if (elements.gameInfo) elements.gameInfo.textContent = '먼저 난이도를 선택해주세요!';
    } else {
        resetGame();
    }
}

function restartGame() {
    if (elements.gameOverModal) elements.gameOverModal.style.display = 'none';
    
    const currentDifficulty = gameMode === 'hex' ? 'hex' : gameSize;
    const difficultyKey = `2048Best${currentDifficulty}`;
    const currentBest = parseInt(localStorage.getItem(difficultyKey)) || 0;
    
    if (score > currentBest) {
        localStorage.setItem(difficultyKey, score);
    }
    
    prepareGame();
}

function initializeBoard() {
    if (gameMode === 'hex') {
        initializeHexBoard();
    } else {
        initializeSquareBoard();
    }
}

function initializeSquareBoard() {
    gameBoard = [];
    for (let i = 0; i < gameSize; i++) {
        gameBoard[i] = [];
        for (let j = 0; j < gameSize; j++) {
            gameBoard[i][j] = 0;
        }
    }
    drawSquareBoard();
}

function initializeHexBoard() {
    gameBoard = [];
    for (let i = 0; i < 5; i++) {
        gameBoard[i] = [];
        for (let j = 0; j < 5; j++) {
            gameBoard[i][j] = 0;
        }
    }
    drawHexBoard();
}

function drawSquareBoard() {
    if (!elements.gameBoard) return;
    elements.gameBoard.innerHTML = '';
    
    for (let i = 0; i < gameSize; i++) {
        for (let j = 0; j < gameSize; j++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${i}-${j}`;
            elements.gameBoard.appendChild(tile);
        }
    }
    
    updateDisplay();
}

function drawHexBoard() {
    if (!elements.gameBoard) return;
    elements.gameBoard.innerHTML = '';
    
    hexCoords.forEach((rowData, rowIndex) => {
        const hexRow = document.createElement('div');
        hexRow.className = 'hex-row';
        
        if (rowIndex === 0 || rowIndex === 4) {
            hexRow.style.marginLeft = '25px';
            hexRow.style.marginRight = '25px';
        } else if (rowIndex === 1 || rowIndex === 3) {
            hexRow.style.marginLeft = '12.5px';
            hexRow.style.marginRight = '12.5px';
        }
        
        rowData.positions.forEach(pos => {
            const tile = document.createElement('div');
            tile.className = 'hex-tile';
            tile.id = `tile-${pos.y}-${pos.x}`;
            hexRow.appendChild(tile);
        });
        
        elements.gameBoard.appendChild(hexRow);
    });
    
    updateDisplay();
}

function addRandomTile() {
    const emptyCells = getEmptyCells();
    if (emptyCells.length === 0) return false;
    
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    
    gameBoard[randomCell.row][randomCell.col] = value;
    
    // 새 타일에 애니메이션 적용
    setTimeout(() => {
        const tile = document.getElementById(`tile-${randomCell.row}-${randomCell.col}`);
        if (tile) {
            tile.classList.add('tile-new');
            setTimeout(() => {
                tile.classList.remove('tile-new');
            }, 300);
        }
    }, 10);
    
    return true;
}

function getEmptyCells() {
    const emptyCells = [];
    
    if (gameMode === 'hex') {
        hexCoords.forEach(rowData => {
            rowData.positions.forEach(pos => {
                if (gameBoard[pos.y][pos.x] === 0) {
                    emptyCells.push({row: pos.y, col: pos.x});
                }
            });
        });
    } else {
        for (let i = 0; i < gameSize; i++) {
            for (let j = 0; j < gameSize; j++) {
                if (gameBoard[i][j] === 0) {
                    emptyCells.push({row: i, col: j});
                }
            }
        }
    }
    
    return emptyCells;
}

function updateDisplay() {
    if (gameMode === 'hex') {
        updateHexDisplay();
    } else {
        updateSquareDisplay();
    }
}

function updateSquareDisplay() {
    for (let i = 0; i < gameSize; i++) {
        for (let j = 0; j < gameSize; j++) {
            const tile = document.getElementById(`tile-${i}-${j}`);
            if (tile) {
                const value = gameBoard[i][j];
                tile.textContent = value === 0 ? '' : value;
                tile.className = `tile ${value === 0 ? '' : 'tile-' + value}`;
                
                if (value > bestTile) {
                    bestTile = value;
                }
            }
        }
    }
}

function updateHexDisplay() {
    hexCoords.forEach(rowData => {
        rowData.positions.forEach(pos => {
            const tile = document.getElementById(`tile-${pos.y}-${pos.x}`);
            if (tile) {
                const value = gameBoard[pos.y][pos.x];
                tile.textContent = value === 0 ? '' : value;
                tile.className = `hex-tile ${value === 0 ? '' : 'tile-' + value}`;
                
                if (value > bestTile) {
                    bestTile = value;
                }
            }
        });
    });
}

// 개선된 간단한 애니메이션 함수 - 값이 있는 타일만 이동
function animateTileMovements(movements, mergedTiles, originalBoard) {
    return new Promise(resolve => {
        // 실제로 움직일 타일들만 선별
        const movingTiles = new Map();
        
        movements.forEach(movement => {
            const originalValue = originalBoard[movement.from.row][movement.from.col];
            const fromTile = document.getElementById(`tile-${movement.from.row}-${movement.from.col}`);
            
            // 원본에 값이 있고, 현재 DOM에도 값이 표시되어 있는 경우만
            if (originalValue !== 0 && fromTile && fromTile.textContent.trim() !== '') {
                const toTile = document.getElementById(`tile-${movement.to.row}-${movement.to.col}`);
                if (toTile) {
                    const fromRect = fromTile.getBoundingClientRect();
                    const toRect = toTile.getBoundingClientRect();
                    
                    const deltaX = toRect.left - fromRect.left;
                    const deltaY = toRect.top - fromRect.top;
                    
                    // 실제로 위치가 변경되는 경우만 애니메이션
                    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
                        movingTiles.set(fromTile, {deltaX, deltaY, movement});
                    }
                }
            }
        });
        
        // 선별된 타일들만 애니메이션 적용
        movingTiles.forEach(({deltaX, deltaY}, tile) => {
            tile.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            tile.style.zIndex = '10';
            tile.style.transition = 'transform 0.15s ease-out';
            tile.classList.add('tile-moving');
        });
        
        // 애니메이션 완료 후 정리
        setTimeout(() => {
            // 이동된 타일들만 정리
            movingTiles.forEach((_, tile) => {
                tile.style.transform = '';
                tile.style.zIndex = '';
                tile.style.transition = '';
                tile.classList.remove('tile-moving');
            });
            
            // 보드 상태 업데이트
            updateDisplay();
            
            // 합병된 타일에 펄스 효과
            mergedTiles.forEach(pos => {
                const tile = document.getElementById(`tile-${pos.row}-${pos.col}`);
                if (tile && tile.textContent.trim() !== '') {
                    tile.classList.add('tile-merged');
                    setTimeout(() => {
                        tile.classList.remove('tile-merged');
                    }, 250);
                }
            });
            
            resolve();
        }, 160);
    });
}

function handleKeyDown(e) {
    if (e.key === 'Escape') {
        if (elements.helpModal && elements.helpModal.style.display === 'flex') {
            closeHelp();
            return;
        }
        if (elements.statsModal && elements.statsModal.style.display === 'flex') {
            closeStats();
            return;
        }
        if (elements.gameOverModal && elements.gameOverModal.style.display === 'flex') {
            restartGame();
            return;
        }
        goHome();
        return;
    }
    
    if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        showHelp();
        return;
    }
    
    if (elements.helpModal && elements.helpModal.style.display === 'flex' || 
        elements.statsModal && elements.statsModal.style.display === 'flex' || 
        elements.gameOverModal && elements.gameOverModal.style.display === 'flex') {
        return;
    }
    
    if (gameState === 'ready' && e.key === ' ') {
        e.preventDefault();
        beginGame();
        return;
    }
    
    if ((gameState === 'playing' || gameState === 'paused') && e.key === ' ') {
        e.preventDefault();
        pauseGame();
        return;
    }
    
    if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        resetGame();
        return;
    }
    
    if (gameState !== 'playing' || isAnimating) return;
    
    e.preventDefault();
    
    switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            handleMove('up');
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            handleMove('down');
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            handleMove('left');
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            handleMove('right');
            break;
        case 'q':
        case 'Q':
            if (gameMode === 'hex') {
                handleMove('upleft');
            }
            break;
        case 'e':
        case 'E':
            if (gameMode === 'hex') {
                handleMove('upright');
            }
            break;
    }
}

function handleTouchStart(e) {
    if (gameState !== 'playing' || isAnimating) return;
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}

function handleTouchEnd(e) {
    if (gameState !== 'playing' || isAnimating) return;
    e.preventDefault();
    const touch = e.changedTouches[0];
    touchEndX = touch.clientX;
    touchEndY = touch.clientY;
    
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 50;
    
    if (Math.abs(deltaX) > minSwipeDistance || Math.abs(deltaY) > minSwipeDistance) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0) {
                handleMove('right');
            } else {
                handleMove('left');
            }
        } else {
            if (deltaY > 0) {
                handleMove('down');
            } else {
                handleMove('up');
            }
        }
    }
}

// 이동 처리 함수
async function handleMove(direction) {
    if (gameState !== 'playing' || isAnimating) return;
    
    isAnimating = true;
    
    // 원본 보드 상태 저장
    const originalBoard = gameBoard.map(row => [...row]);
    
    const result = gameMode === 'hex' ? 
        calculateHexMove(direction) : 
        calculateSquareMove(direction);
    
    if (result.moved) {
        moveCount++;
        score += result.scoreGained;
        
        // 애니메이션 실행
        await animateTileMovements(result.movements, result.mergedTiles, originalBoard);
        
        // 새 타일 추가
        addRandomTile();
        updateUI();
        
        const target = gameTargets[gameMode === 'hex' ? 'hex' : gameSize];
        if (!hasWon && bestTile >= target) {
            showWinMessage();
        }
        
        if (isGameOver()) {
            setTimeout(() => {
                showGameOver();
            }, 300);
        }
    }
    
    isAnimating = false;
}

// 사각형 보드 이동 계산 함수
function calculateSquareMove(direction) {
    const movements = [];
    const mergedTiles = [];
    let scoreGained = 0;
    let moved = false;
    
    const originalBoard = gameBoard.map(row => [...row]);
    const newBoard = gameBoard.map(row => [...row]);
    
    for (let i = 0; i < gameSize; i++) {
        let line;
        let lineIndices;
        
        switch (direction) {
            case 'left':
                line = newBoard[i];
                lineIndices = Array.from({length: gameSize}, (_, j) => ({row: i, col: j}));
                break;
            case 'right':
                line = newBoard[i].slice().reverse();
                lineIndices = Array.from({length: gameSize}, (_, j) => ({row: i, col: gameSize - 1 - j}));
                break;
            case 'up':
                line = [];
                lineIndices = [];
                for (let j = 0; j < gameSize; j++) {
                    line.push(newBoard[j][i]);
                    lineIndices.push({row: j, col: i});
                }
                break;
            case 'down':
                line = [];
                lineIndices = [];
                for (let j = gameSize - 1; j >= 0; j--) {
                    line.push(newBoard[j][i]);
                    lineIndices.push({row: j, col: i});
                }
                break;
        }
        
        const result = processLineWithMovements(line, lineIndices, originalBoard);
        scoreGained += result.scoreGained;
        moved = moved || result.moved;
        movements.push(...result.movements);
        mergedTiles.push(...result.mergedTiles);
        
        // 보드 업데이트
        result.newLine.forEach((value, index) => {
            const pos = lineIndices[index];
            newBoard[pos.row][pos.col] = value;
        });
    }
    
    gameBoard = newBoard;
    return {moved, movements, mergedTiles, scoreGained};
}

// 육각형 보드 이동 계산
function calculateHexMove(direction) {
    const hexDirections = {
        'up': {dr: -1, dc: 0},
        'down': {dr: 1, dc: 0},
        'left': {dr: 0, dc: -1},
        'right': {dr: 0, dc: 1},
        'upleft': {dr: -1, dc: -1},
        'upright': {dr: -1, dc: 1}
    };
    
    if (!hexDirections[direction]) return {moved: false, movements: [], mergedTiles: [], scoreGained: 0};
    
    const movements = [];
    const mergedTiles = [];
    let scoreGained = 0;
    let moved = false;
    
    const originalBoard = gameBoard.map(row => [...row]);
    const newBoard = gameBoard.map(row => [...row]);
    const validCells = [];
    
    hexCoords.forEach(rowData => {
        rowData.positions.forEach(pos => {
            validCells.push({row: pos.y, col: pos.x});
        });
    });
    
    const {dr, dc} = hexDirections[direction];
    validCells.sort((a, b) => {
        if (dr !== 0) return dr > 0 ? b.row - a.row : a.row - b.row;
        if (dc !== 0) return dc > 0 ? b.col - a.col : a.col - b.col;
        return 0;
    });
    
    validCells.forEach(cell => {
        const value = originalBoard[cell.row][cell.col];
        if (value === 0) return;
        
        let currentRow = cell.row;
        let currentCol = cell.col;
        const originalPos = {row: currentRow, col: currentCol};
        
        while (true) {
            const nextRow = currentRow + dr;
            const nextCol = currentCol + dc;
            
            if (!isValidHexPosition(nextRow, nextCol)) break;
            
            if (newBoard[nextRow][nextCol] === 0) {
                newBoard[nextRow][nextCol] = value;
                newBoard[currentRow][currentCol] = 0;
                currentRow = nextRow;
                currentCol = nextCol;
                moved = true;
            } else if (newBoard[nextRow][nextCol] === value && 
                      newBoard[nextRow][nextCol] === originalBoard[nextRow][nextCol]) {
                newBoard[nextRow][nextCol] = value * 2;
                newBoard[currentRow][currentCol] = 0;
                scoreGained += value * 2;
                mergedTiles.push({row: nextRow, col: nextCol});
                currentRow = nextRow;
                currentCol = nextCol;
                moved = true;
                break;
            } else {
                break;
            }
        }
        
        if (currentRow !== originalPos.row || currentCol !== originalPos.col) {
            movements.push({
                from: originalPos,
                to: {row: currentRow, col: currentCol}
            });
        }
    });
    
    gameBoard = newBoard;
    return {moved, movements, mergedTiles, scoreGained};
}

// 라인 처리 함수
function processLineWithMovements(line, lineIndices, originalBoard) {
    const movements = [];
    const mergedTiles = [];
    let scoreGained = 0;
    let moved = false;
    
    // 0이 아닌 값들만 수집
    const nonZeroItems = [];
    line.forEach((value, index) => {
        if (value !== 0) {
            nonZeroItems.push({
                value: value,
                originalIndex: index,
                originalPos: lineIndices[index]
            });
        }
    });
    
    const newLine = new Array(line.length).fill(0);
    let newLineIndex = 0;
    
    // 합병 및 이동 처리
    for (let i = 0; i < nonZeroItems.length; i++) {
        const currentItem = nonZeroItems[i];
        
        if (i < nonZeroItems.length - 1 && 
            currentItem.value === nonZeroItems[i + 1].value) {
            // 합병 가능
            const nextItem = nonZeroItems[i + 1];
            const newValue = currentItem.value * 2;
            newLine[newLineIndex] = newValue;
            scoreGained += newValue;
            
            // 첫 번째 타일 이동
            const targetPos = lineIndices[newLineIndex];
            const originalValue1 = originalBoard[currentItem.originalPos.row][currentItem.originalPos.col];
            if (originalValue1 !== 0 && 
                (currentItem.originalPos.row !== targetPos.row || 
                 currentItem.originalPos.col !== targetPos.col)) {
                movements.push({
                    from: currentItem.originalPos,
                    to: targetPos
                });
            }
            
            // 두 번째 타일 이동
            const originalValue2 = originalBoard[nextItem.originalPos.row][nextItem.originalPos.col];
            if (originalValue2 !== 0 && 
                (nextItem.originalPos.row !== targetPos.row || 
                 nextItem.originalPos.col !== targetPos.col)) {
                movements.push({
                    from: nextItem.originalPos,
                    to: targetPos
                });
            }
            
            mergedTiles.push(targetPos);
            i++; // 다음 타일 건너뛰기
        } else {
            // 단순 이동
            newLine[newLineIndex] = currentItem.value;
            const targetPos = lineIndices[newLineIndex];
            
            const originalValue = originalBoard[currentItem.originalPos.row][currentItem.originalPos.col];
            if (originalValue !== 0 && 
                (currentItem.originalPos.row !== targetPos.row || 
                 currentItem.originalPos.col !== targetPos.col)) {
                movements.push({
                    from: currentItem.originalPos,
                    to: targetPos
                });
            }
        }
        newLineIndex++;
    }
    
    // 이동 여부 확인
    for (let i = 0; i < line.length; i++) {
        if (line[i] !== newLine[i]) {
            moved = true;
            break;
        }
    }
    
    return {newLine, movements, mergedTiles, scoreGained, moved};
}

function isValidHexPosition(row, col) {
    return hexCoords.some(rowData => 
        rowData.positions.some(pos => pos.y === row && pos.x === col)
    );
}

function isGameOver() {
    if (getEmptyCells().length > 0) return false;
    
    if (gameMode === 'hex') {
        return !canMergeHex();
    } else {
        return !canMergeSquare();
    }
}

function canMergeSquare() {
    for (let i = 0; i < gameSize; i++) {
        for (let j = 0; j < gameSize; j++) {
            const current = gameBoard[i][j];
            
            if (j < gameSize - 1 && current === gameBoard[i][j + 1]) {
                return true;
            }
            
            if (i < gameSize - 1 && current === gameBoard[i + 1][j]) {
                return true;
            }
        }
    }
    return false;
}

function canMergeHex() {
    const directions = [
        {dr: -1, dc: 0}, {dr: 1, dc: 0},
        {dr: 0, dc: -1}, {dr: 0, dc: 1},
        {dr: -1, dc: -1}, {dr: -1, dc: 1}
    ];
    
    for (let rowData of hexCoords) {
        for (let pos of rowData.positions) {
            const current = gameBoard[pos.y][pos.x];
            if (current === 0) continue;
            
            for (let {dr, dc} of directions) {
                const newRow = pos.y + dr;
                const newCol = pos.x + dc;
                
                if (isValidHexPosition(newRow, newCol) && 
                    gameBoard[newRow][newCol] === current) {
                    return true;
                }
            }
        }
    }
    return false;
}

function showWinMessage() {
    hasWon = true;
    gameState = 'won';
    
    if (elements.overlayTitle) elements.overlayTitle.textContent = '🎉 축하합니다!';
    if (elements.overlayMessage) elements.overlayMessage.textContent = `${gameTargets[gameMode === 'hex' ? 'hex' : gameSize]}을 달성했습니다!`;
    if (elements.gameOverlay) elements.gameOverlay.classList.remove('hidden');
    if (elements.gameInfo) elements.gameInfo.textContent = '목표를 달성했습니다! 계속 플레이할 수 있습니다.';
    
    gameStats.wonGames++;
    localStorage.setItem('2048WonGames', gameStats.wonGames);
    
    setTimeout(() => {
        if (elements.gameOverlay) elements.gameOverlay.classList.add('hidden');
        gameState = 'playing';
        if (elements.gameInfo) elements.gameInfo.textContent = '계속해서 더 큰 숫자에 도전해보세요!';
    }, 3000);
}

function showGameOver() {
    gameState = 'gameOver';
    
    if (elements.modalTitle) {
        elements.modalTitle.textContent = '💥 게임 오버';
        elements.modalTitle.style.color = '#ff0000';
    }
    if (elements.modalMessage) elements.modalMessage.textContent = '더 이상 움직일 수 없습니다!';
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('2048HighScore', bestScore);
        if (elements.modalTitle) {
            elements.modalTitle.textContent = '🏆 새로운 최고점수!';
            elements.modalTitle.style.color = '#ffff00';
        }
        if (elements.modalMessage) elements.modalMessage.textContent = '축하합니다! 새로운 기록을 세웠습니다!';
    }
    
    if (bestTile > gameStats.bestTile) {
        gameStats.bestTile = bestTile;
        localStorage.setItem('2048BestTile', gameStats.bestTile);
    }
    
    gameStats.totalScore += score;
    localStorage.setItem('2048TotalScore', gameStats.totalScore);
    
    const gameTime = Date.now() - gameStartTime;
    gameStats.totalTime += gameTime;
    localStorage.setItem('2048TotalTime', gameStats.totalTime);
    
    if (elements.finalScore) elements.finalScore.textContent = score;
    if (elements.finalBestTile) elements.finalBestTile.textContent = bestTile;
    if (elements.finalMoves) elements.finalMoves.textContent = moveCount;
    if (elements.finalTime) elements.finalTime.textContent = formatTime(gameTime);
    
    if (elements.gameOverModal) elements.gameOverModal.style.display = 'flex';
}

// 간소화된 버튼 업데이트 - 게임 시작 버튼은 시작만
function updateMainGameButton() {
    const startButton = document.querySelector('button[onclick="startNewGame()"]');
    if (startButton) {
        if (gameState === 'menu' || gameState === 'ready') {
            startButton.textContent = '🚀 게임 시작';
            startButton.disabled = false;
        } else {
            // playing, paused, gameOver, won 상태에서는 비활성화
            startButton.textContent = '🚀 게임 시작';
            startButton.disabled = true;
        }
    }
}

function updatePauseButton() {
    if (!elements.pauseBtn) return;
    
    if (gameState === 'ready' || gameState === 'menu') {
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

function pauseGame() {
    if (gameState === 'playing') {
        gameState = 'paused';
        isPaused = true;
        if (gameTimer) {
            clearInterval(gameTimer);
            gameTimer = null;
        }
        
        if (elements.gameOverlay) elements.gameOverlay.classList.remove('hidden');
        if (elements.overlayTitle) elements.overlayTitle.textContent = '⏸️ 게임 일시정지';
        if (elements.overlayMessage) elements.overlayMessage.textContent = '일시정지 버튼을 눌러 계속하세요';
        if (elements.gameInfo) elements.gameInfo.textContent = '게임이 일시정지되었습니다.';
        
    } else if (gameState === 'paused') {
        gameState = 'playing';
        isPaused = false;
        startTimer();
        if (elements.gameOverlay) elements.gameOverlay.classList.add('hidden');
        if (elements.gameInfo) elements.gameInfo.textContent = '게임 진행 중...';
    }
    
    updateMainGameButton();
    updatePauseButton();
}

function startTimer() {
    if (gameTimer) clearInterval(gameTimer);
    
    gameTimer = setInterval(() => {
        if (gameStartTime && gameState === 'playing') {
            const elapsed = Date.now() - gameStartTime;
            if (elements.gameTime) elements.gameTime.textContent = formatTime(elapsed);
        }
    }, 1000);
}

function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else {
        return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
}

function updateUI() {
    if (elements.score) elements.score.textContent = score;
    if (elements.highScore) elements.highScore.textContent = bestScore;
    if (elements.moveCount) elements.moveCount.textContent = moveCount;
    if (elements.bestTile) elements.bestTile.textContent = bestTile;
}

function closeModal(modal) {
    if (modal) {
        modal.style.display = 'none';
    } else {
        if (elements.gameOverModal) elements.gameOverModal.style.display = 'none';
        resetGame();
    }
}

function showHelp() {
    if (elements.helpModal) elements.helpModal.style.display = 'flex';
}

function closeHelp() {
    closeModal(elements.helpModal);
}

function showStats() {
    updateStatsModal();
    if (elements.statsModal) elements.statsModal.style.display = 'flex';
}

function closeStats() {
    closeModal(elements.statsModal);
}

function updateStatsModal() {
    const avgScore = gameStats.totalGames > 0 ? Math.round(gameStats.totalScore / gameStats.totalGames) : 0;
    
    const modalTotalGames = document.getElementById('modalTotalGames');
    const modalWonGames = document.getElementById('modalWonGames');
    const modalHighScore = document.getElementById('modalHighScore');
    const modalBestTile = document.getElementById('modalBestTile');
    const modalAvgScore = document.getElementById('modalAvgScore');
    const modalTotalTime = document.getElementById('modalTotalTime');
    
    if (modalTotalGames) modalTotalGames.textContent = gameStats.totalGames;
    if (modalWonGames) modalWonGames.textContent = gameStats.wonGames;
    if (modalHighScore) modalHighScore.textContent = bestScore;
    if (modalBestTile) modalBestTile.textContent = gameStats.bestTile;
    if (modalAvgScore) modalAvgScore.textContent = avgScore;
    if (modalTotalTime) modalTotalTime.textContent = formatTime(gameStats.totalTime);
    
    const modalBest3 = document.getElementById('modalBest3');
    const modalBest4 = document.getElementById('modalBest4');
    const modalBest5 = document.getElementById('modalBest5');
    const modalBest6 = document.getElementById('modalBest6');
    const modalBest7 = document.getElementById('modalBest7');
    const modalBest8 = document.getElementById('modalBest8');
    const modalBestHex = document.getElementById('modalBestHex');
    
    if (modalBest3) modalBest3.textContent = localStorage.getItem('2048Best3') || '기록 없음';
    if (modalBest4) modalBest4.textContent = localStorage.getItem('2048Best4') || '기록 없음';
    if (modalBest5) modalBest5.textContent = localStorage.getItem('2048Best5') || '기록 없음';
    if (modalBest6) modalBest6.textContent = localStorage.getItem('2048Best6') || '기록 없음';
    if (modalBest7) modalBest7.textContent = localStorage.getItem('2048Best7') || '기록 없음';
    if (modalBest8) modalBest8.textContent = localStorage.getItem('2048Best8') || '기록 없음';
    if (modalBestHex) modalBestHex.textContent = localStorage.getItem('2048BestHex') || '기록 없음';
}

function resetStats() {
    if (confirm('정말로 모든 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        localStorage.removeItem('2048HighScore');
        localStorage.removeItem('2048TotalGames');
        localStorage.removeItem('2048WonGames');
        localStorage.removeItem('2048TotalScore');
        localStorage.removeItem('2048BestTile');
        localStorage.removeItem('2048TotalTime');
        localStorage.removeItem('2048Best3');
        localStorage.removeItem('2048Best4');
        localStorage.removeItem('2048Best5');
        localStorage.removeItem('2048Best6');
        localStorage.removeItem('2048Best7');
        localStorage.removeItem('2048Best8');
        localStorage.removeItem('2048BestHex');
        
        bestScore = 0;
        gameStats = {
            totalGames: 0,
            wonGames: 0,
            totalScore: 0,
            bestTile: 2,
            totalTime: 0
        };
        
        updateUI();
        updateStatsModal();
        
        alert('모든 기록이 삭제되었습니다!');
    }
}

function changeDifficulty() {
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    showInitialDifficultySelection();
}

function goHome() {
    if (confirm('게임을 종료하고 메인 페이지로 돌아가시겠습니까?')) {
        if (gameTimer) {
            clearInterval(gameTimer);
        }
        window.location.href = 'index.html';
    }
}

// 전역 함수로 HTML에서 호출 가능하게 설정
window.startNewGame = startNewGame;
window.resetGame = resetGame;
window.selectDifficulty = selectDifficulty;
window.changeDifficulty = changeDifficulty;
window.showHelp = showHelp;
window.closeHelp = closeHelp;
window.showStats = showStats;
window.closeStats = closeStats;
window.resetStats = resetStats;
window.goHome = goHome;
window.closeModal = closeModal;
window.restartGame = restartGame;
window.pauseGame = pauseGame;

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', init);

// 페이지 숨김 시 타이머 관리
window.addEventListener('beforeunload', () => {
    if (gameTimer) {
        clearInterval(gameTimer);
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameTimer) {
        clearInterval(gameTimer);
    } else if (!document.hidden && gameStartTime && gameState === 'playing') {
        startTimer();
    }
});