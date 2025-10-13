// 게임 설정
const DIFFICULTIES = {
    easy: { rows: 9, cols: 9, mines: 10, name: '초급' },
    medium: { rows: 16, cols: 16, mines: 40, name: '중급' },
    hard: { rows: 16, cols: 30, mines: 99, name: '고급' }
};

// 게임 상태
let gameState = 'menu'; // 'menu', 'ready', 'playing', 'paused', 'won', 'lost'
let gameBoard = [];
let currentDifficulty = 'medium';
let gameConfig = DIFFICULTIES.medium;

// 게임 통계
let gameStats = {
    timer: 0,
    minesLeft: 0,
    flagsUsed: 0,
    cellsRevealed: 0,
    totalSafeCells: 0,
    startTime: 0,
    timerInterval: null,
    firstClick: true,
    pausedTime: 0
};

// 저장된 통계
let savedStats = {
    bestTimes: {
        easy: parseInt(localStorage.getItem('minesBestEasy')) || 999,
        medium: parseInt(localStorage.getItem('minesBestMedium')) || 999,
        hard: parseInt(localStorage.getItem('minesBestHard')) || 999
    },
    totalGames: parseInt(localStorage.getItem('minesTotalGames')) || 0,
    gamesWon: parseInt(localStorage.getItem('minesGamesWon')) || 0
};

// DOM 요소들
const elements = {
    timer: document.getElementById('timer'),
    minesLeft: document.getElementById('minesLeft'),
    flagsUsed: document.getElementById('flagsUsed'),
    gameInfo: document.getElementById('gameInfo'),
    gameBoard: document.getElementById('gameBoard'),
    gameOverlay: document.getElementById('gameOverlay'),
    overlayTitle: document.getElementById('overlayTitle'),
    overlayMessage: document.getElementById('overlayMessage'),
    gameOverModal: document.getElementById('gameOverModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalMessage: document.getElementById('modalMessage'),
    finalTime: document.getElementById('finalTime'),
    finalDifficulty: document.getElementById('finalDifficulty'),
    bestTime: document.getElementById('bestTime'),
    winRate: document.getElementById('winRate'),
    totalGames: document.getElementById('totalGames'),
    helpModal: document.getElementById('helpModal'),
    statsModal: document.getElementById('statsModal'),
    pauseBtn: document.getElementById('pauseBtn')
};

// 초기화
function init() {
    setupEventListeners();
    updateUI();
    showDifficultySelection();
}

function setupEventListeners() {
    // 키보드 이벤트
    document.addEventListener('keydown', handleKeyDown);
    
    // 모달 외부 클릭 시 닫기
    setupModalClickEvents();
    
    // 우클릭 방지 (게임보드에서만)
    elements.gameBoard.addEventListener('contextmenu', e => e.preventDefault());
}

function setupModalClickEvents() {
    // 도움말 모달
    if (elements.helpModal) {
        elements.helpModal.addEventListener('click', (e) => {
            if (e.target === elements.helpModal) {
                closeHelp();
            }
        });
    }
    
    // 통계 모달
    if (elements.statsModal) {
        elements.statsModal.addEventListener('click', (e) => {
            if (e.target === elements.statsModal) {
                closeStats();
            }
        });
    }
    
    // 게임 오버 모달
    if (elements.gameOverModal) {
        elements.gameOverModal.addEventListener('click', (e) => {
            if (e.target === elements.gameOverModal) {
                closeModal();
            }
        });
    }
}

function handleKeyDown(e) {
    switch(e.key) {
        case ' ':
            e.preventDefault();
            if (gameState === 'ready') {
                startGame();
            } else if (gameState === 'playing' || gameState === 'paused') {
                pauseGame();
            }
            break;
        case 'r':
        case 'R':
            if (gameState !== 'menu') {
                resetGame();
            }
            break;
        case 'h':
        case 'H':
            showHelp();
            break;
        case 'Escape':
            // ESC키로 모든 모달 닫기
            if (elements.helpModal && elements.helpModal.style.display === 'flex') {
                closeHelp();
            } else if (elements.statsModal && elements.statsModal.style.display === 'flex') {
                closeStats();
            } else if (elements.gameOverModal && elements.gameOverModal.style.display === 'flex') {
                closeModal();
            } else {
                goHome();
            }
            break;
    }
}

// 난이도 선택
function selectDifficulty(difficulty) {
    currentDifficulty = difficulty;
    gameConfig = DIFFICULTIES[difficulty];
    
    // 게임 준비 상태로 변경
    setTimeout(() => {
        prepareGame();
    }, 200);
}

function showDifficultySelection() {
    gameState = 'menu';
    elements.gameOverlay.classList.remove('hidden');
    elements.overlayTitle.textContent = '🎯 난이도 선택!';
    elements.overlayMessage.innerHTML = `
        <div class="difficulty-buttons">
            <button class="difficulty-btn" onclick="selectDifficulty('easy')">
                <span>🟢 초급</span><br>
                <small>9×9, 10개 폭탄</small>
            </button>
            <button class="difficulty-btn" onclick="selectDifficulty('medium')">
                <span>🟡 중급</span><br>
                <small>16×16, 40개 폭탄</small>
            </button>
            <button class="difficulty-btn" onclick="selectDifficulty('hard')">
                <span>🔴 고급</span><br>
                <small>16×30, 99개 폭탄</small>
            </button>
        </div>
    `;
    elements.gameInfo.textContent = '원하는 난이도를 선택하세요!';
    updateMainGameButton();
    updatePauseButton();
}

function changeDifficulty() {
    if (gameStats.timerInterval) {
        clearInterval(gameStats.timerInterval);
        gameStats.timerInterval = null;
    }
    showDifficultySelection();
}

// 게임 준비
function prepareGame() {
    gameState = 'ready';
    gameStats.firstClick = true;
    gameStats.timer = 0;
    gameStats.minesLeft = gameConfig.mines;
    gameStats.flagsUsed = 0;
    gameStats.cellsRevealed = 0;
    gameStats.totalSafeCells = gameConfig.rows * gameConfig.cols - gameConfig.mines;
    gameStats.startTime = 0;
    gameStats.pausedTime = 0;
    
    if (gameStats.timerInterval) {
        clearInterval(gameStats.timerInterval);
        gameStats.timerInterval = null;
    }
    
    // 게임보드 생성
    createBoard();
    
    // 준비 완료 오버레이 표시
    elements.gameOverlay.classList.remove('hidden');
    elements.overlayTitle.textContent = '🎮 게임 준비 완료!';
    elements.overlayMessage.innerHTML = '<p>스페이스바나 게임 시작 버튼을 눌러 시작하세요!</p>';
    elements.gameInfo.textContent = '스페이스바나 게임 시작 버튼을 눌러 시작하세요!';
    
    updateUI();
    updateMainGameButton();
    updatePauseButton();
}

// 게임 시작 버튼 함수
function startNewGame() {
    if (gameState === 'menu') {
        // 메뉴 상태에서는 난이도를 먼저 선택하라고 안내
        elements.gameInfo.textContent = '먼저 난이도를 선택해주세요!';
        return;
    } else if (gameState === 'ready') {
        // 준비 상태에서는 게임 시작
        startGame();
    }
    // playing, paused, won, lost 상태에서는 아무것도 하지 않음
}

// 게임 시작
function startGame() {
    if (gameState === 'ready') {
        gameState = 'playing';
        elements.gameOverlay.classList.add('hidden');
        elements.gameInfo.textContent = '첫 번째 클릭은 항상 안전합니다!';
        updateMainGameButton();
        updatePauseButton();
    }
}

// 게임 리셋
function resetGame() {
    if (gameState === 'menu') {
        return;
    }
    
    if (gameStats.timerInterval) {
        clearInterval(gameStats.timerInterval);
        gameStats.timerInterval = null;
    }
    
    prepareGame();
}

function createBoard() {
    gameBoard = [];
    elements.gameBoard.innerHTML = '';
    
    // 난이도별 셀 크기 설정
    let cellSize = '30px';
    let fontSize = '1rem';
    let gap = '2px';
    let padding = '15px';
    
    // 768px 이하에서는 더 작은 크기 사용
    if (window.innerWidth <= 768) {
        if (currentDifficulty === 'hard') {
            cellSize = '18px';  // 더 작게
            fontSize = '0.7rem';
            gap = '1px';
            padding = '8px';
        } else if (currentDifficulty === 'medium') {
            cellSize = '20px';
            fontSize = '0.75rem';
            gap = '1px';
            padding = '8px';
        } else if (currentDifficulty === 'easy') {
            cellSize = '24px';
            fontSize = '0.8rem';
            gap = '1px';
            padding = '8px';
        }
    } else if (currentDifficulty === 'hard') {
        cellSize = '22px';
        fontSize = '0.8rem';
    } else if (currentDifficulty === 'medium') {
        cellSize = '25px';
        fontSize = '0.9rem';
    }
    
    // CSS 설정
    elements.gameBoard.style.gridTemplateColumns = `repeat(${gameConfig.cols}, ${cellSize})`;
    elements.gameBoard.style.gap = gap;
    elements.gameBoard.style.padding = padding;
    
    // 보드 생성
    for (let row = 0; row < gameConfig.rows; row++) {
        gameBoard[row] = [];
        for (let col = 0; col < gameConfig.cols; col++) {
            const cell = {
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0
            };
            
            gameBoard[row][col] = cell;
            
            // DOM 요소 생성
            const cellElement = document.createElement('div');
            cellElement.className = 'cell';
            cellElement.style.width = cellSize;
            cellElement.style.height = cellSize;
            cellElement.style.fontSize = fontSize;
            cellElement.dataset.row = row;
            cellElement.dataset.col = col;
            
            // 이벤트 리스너
            cellElement.addEventListener('click', () => {
                // 클릭 피드백 효과
                cellElement.style.transform = 'scale(0.95)';
                cellElement.style.transition = 'transform 0.1s ease';
                setTimeout(() => {
                    cellElement.style.transform = '';
                }, 100);
                
                handleCellClick(row, col);
            });
            cellElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                // 우클릭 피드백 효과
                cellElement.style.transform = 'scale(0.95)';
                cellElement.style.transition = 'transform 0.1s ease';
                setTimeout(() => {
                    cellElement.style.transform = '';
                }, 100);
                
                handleCellRightClick(row, col);
            });
            
            elements.gameBoard.appendChild(cellElement);
        }
    }
}

function placeMines(excludeRow, excludeCol) {
    let minesPlaced = 0;
    
    while (minesPlaced < gameConfig.mines) {
        const row = Math.floor(Math.random() * gameConfig.rows);
        const col = Math.floor(Math.random() * gameConfig.cols);
        
        // 첫 클릭 위치와 주변은 제외
        if (!gameBoard[row][col].isMine && !(row === excludeRow && col === excludeCol)) {
            const neighbors = getNeighbors(row, col);
            const isNearFirstClick = neighbors.some(n => n.row === excludeRow && n.col === excludeCol);
            
            if (!isNearFirstClick) {
                gameBoard[row][col].isMine = true;
                minesPlaced++;
            }
        }
    }
    
    // 주변 폭탄 개수 계산
    calculateNumbers();
}

function calculateNumbers() {
    for (let row = 0; row < gameConfig.rows; row++) {
        for (let col = 0; col < gameConfig.cols; col++) {
            if (!gameBoard[row][col].isMine) {
                const neighbors = getNeighbors(row, col);
                gameBoard[row][col].neighborMines = neighbors.filter(n => 
                    gameBoard[n.row][n.col].isMine
                ).length;
            }
        }
    }
}

function getNeighbors(row, col) {
    const neighbors = [];
    for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
            if (r >= 0 && r < gameConfig.rows && 
                c >= 0 && c < gameConfig.cols && 
                !(r === row && c === col)) {
                neighbors.push({row: r, col: c});
            }
        }
    }
    return neighbors;
}

// 게임 플레이
function handleCellClick(row, col) {
    if (gameState !== 'playing') return;
    
    const cell = gameBoard[row][col];
    if (cell.isRevealed || cell.isFlagged) return;
    
    // 첫 클릭
    if (gameStats.firstClick) {
        placeMines(row, col);
        startTimer();
        gameStats.firstClick = false;
        elements.gameInfo.textContent = '게임 진행 중... 조심하세요!';
    }
    
    // 폭탄 클릭
    if (cell.isMine) {
        gameOver(false, row, col);
        return;
    }
    
    // 셀 열기
    revealCell(row, col);
    
    // 승리 확인
    checkWin();
    updateUI();
}

function handleCellRightClick(row, col) {
    if (gameState !== 'playing') return;
    
    const cell = gameBoard[row][col];
    if (cell.isRevealed) return;
    
    // 깃발 토글
    cell.isFlagged = !cell.isFlagged;
    
    if (cell.isFlagged) {
        gameStats.flagsUsed++;
        gameStats.minesLeft--;
    } else {
        gameStats.flagsUsed--;
        gameStats.minesLeft++;
    }
    
    updateCellDisplay(row, col);
    updateUI();
}

function revealCell(row, col) {
    const cell = gameBoard[row][col];
    if (cell.isRevealed || cell.isFlagged) return;
    
    cell.isRevealed = true;
    gameStats.cellsRevealed++;
    updateCellDisplay(row, col);
    
    // 빈 칸이면 주변도 열기
    if (cell.neighborMines === 0) {
        const neighbors = getNeighbors(row, col);
        neighbors.forEach(n => revealCell(n.row, n.col));
    }
}

function updateCellDisplay(row, col) {
    const cell = gameBoard[row][col];
    const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    
    if (cell.isFlagged) {
        cellElement.className = 'cell flagged';
        cellElement.textContent = '🚩';
        // 깃발 배경을 노간색으로
        cellElement.style.background = 'linear-gradient(145deg, rgba(255, 255, 0, 0.9), rgba(200, 200, 0, 0.8))';
    } else if (cell.isRevealed) {
        cellElement.className = 'cell revealed';
        
        // 열린 칸의 배경색을 중간 톤 회색으로 변경하여 확실히 구분
        cellElement.style.background = 'linear-gradient(145deg, rgba(85, 85, 85, 0.9), rgba(65, 65, 65, 0.9))';
        cellElement.style.borderColor = 'rgba(130, 130, 130, 0.6)';
        
        if (cell.isMine) {
            cellElement.classList.add('mine');
            cellElement.textContent = '💣';
        } else if (cell.neighborMines > 0) {
            cellElement.classList.add(`number-${cell.neighborMines}`);
            cellElement.textContent = cell.neighborMines;
        } else {
            cellElement.textContent = '';
            // 빈 칸은 조금 더 어두운 중간 회색으로
            cellElement.style.background = 'linear-gradient(145deg, rgba(75, 75, 75, 0.9), rgba(55, 55, 55, 0.9))';
        }
    } else {
        cellElement.className = 'cell';
        cellElement.textContent = '';
        // 기본 스타일 복원
        cellElement.style.background = '';
        cellElement.style.borderColor = '';
    }
}

// 타이머
function startTimer() {
    gameStats.startTime = Date.now() - gameStats.pausedTime;
    gameStats.timerInterval = setInterval(() => {
        gameStats.timer = Math.floor((Date.now() - gameStats.startTime) / 1000);
        updateTimerDisplay();
    }, 100);
}

function updateTimerDisplay() {
    elements.timer.textContent = String(gameStats.timer).padStart(3, '0');
}

// 일시정지
function pauseGame() {
    if (gameState === 'playing') {
        gameState = 'paused';
        if (gameStats.timerInterval) {
            clearInterval(gameStats.timerInterval);
            gameStats.timerInterval = null;
        }
        gameStats.pausedTime = Date.now() - gameStats.startTime;
        
        elements.gameOverlay.classList.remove('hidden');
        elements.overlayTitle.textContent = '⏸️ 게임 일시정지';
        elements.overlayMessage.innerHTML = '<p>스페이스바나 일시정지 버튼을 눌러 계속하세요</p>';
        elements.gameInfo.textContent = '게임이 일시정지되었습니다.';
        
    } else if (gameState === 'paused') {
        gameState = 'playing';
        startTimer();
        elements.gameOverlay.classList.add('hidden');
        elements.gameInfo.textContent = '게임 진행 중... 조심하세요!';
    }
    
    updateMainGameButton();
    updatePauseButton();
}

// 메인 게임 버튼 업데이트
function updateMainGameButton() {
    const startButton = document.querySelector('button[onclick="startNewGame()"]');
    if (startButton) {
        if (gameState === 'menu' || gameState === 'ready') {
            startButton.textContent = '🚀 게임 시작';
            startButton.disabled = false;
        } else {
            // playing, paused, won, lost 상태에서는 비활성화
            startButton.textContent = '🚀 게임 시작';
            startButton.disabled = true;
        }
    }
}

// 일시정지 버튼 업데이트
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

// 게임 종료
function checkWin() {
    if (gameStats.cellsRevealed === gameStats.totalSafeCells) {
        gameOver(true);
    }
}

function gameOver(won, hitRow = -1, hitCol = -1) {
    gameState = won ? 'won' : 'lost';
    if (gameStats.timerInterval) {
        clearInterval(gameStats.timerInterval);
        gameStats.timerInterval = null;
    }
    
    // 통계 업데이트
    savedStats.totalGames++;
    if (won) {
        savedStats.gamesWon++;
        // 최고 기록 업데이트
        if (gameStats.timer < savedStats.bestTimes[currentDifficulty]) {
            savedStats.bestTimes[currentDifficulty] = gameStats.timer;
            localStorage.setItem(`minesBest${currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)}`, gameStats.timer);
        }
        
        // 승리시 올바른 깃발들을 진한 초록색으로 표시
        for (let row = 0; row < gameConfig.rows; row++) {
            for (let col = 0; col < gameConfig.cols; col++) {
                const cell = gameBoard[row][col];
                const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell.isFlagged && cell.isMine) {
                    // 올바른 깃발 - 진한 초록색
                    cellElement.style.background = 'linear-gradient(145deg, rgba(34, 139, 34, 0.9), rgba(0, 100, 0, 0.8))';
                }
            }
        }
        
        // 승리시 바로 모달 표시
        showGameOverModal(won);
    } else {
        // 패배시 폭탄들을 하나씩 보여준 후 모달 표시
        revealAllMinesSequentially(hitRow, hitCol);
    }
    
    // 통계 저장
    localStorage.setItem('minesTotalGames', savedStats.totalGames);
    localStorage.setItem('minesGamesWon', savedStats.gamesWon);
    
    updateUI();
    updateMainGameButton();
    updatePauseButton();
}

function revealAllMinesSequentially(hitRow, hitCol) {
    const allMines = [];
    let skipAnimation = false;
    let skipHandler;
    
    // 모든 폭탄 위치 수집
    for (let row = 0; row < gameConfig.rows; row++) {
        for (let col = 0; col < gameConfig.cols; col++) {
            const cell = gameBoard[row][col];
            if (cell.isMine && !cell.isFlagged) {
                allMines.push({row, col, isHit: row === hitRow && col === hitCol});
            }
        }
    }
    
    // 깃발 색상 처리
    for (let row = 0; row < gameConfig.rows; row++) {
        for (let col = 0; col < gameConfig.cols; col++) {
            const cell = gameBoard[row][col];
            const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell.isFlagged) {
                if (cell.isMine) {
                    // 올바른 깃발 - 진한 초록색
                    cellElement.style.background = 'linear-gradient(145deg, rgba(34, 139, 34, 0.9), rgba(0, 100, 0, 0.8))';
                } else {
                    // 잘못된 깃발 - 주황색
                    cellElement.style.background = 'linear-gradient(145deg, rgba(255, 165, 0, 0.9), rgba(200, 120, 0, 0.8))';
                }
            }
        }
    }
    
    // 클릭으로 스킵할 수 있도록 이벤트 리스너 추가
    skipHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        skipAnimation = true;
        
        // 이벤트 리스너 제거
        document.removeEventListener('click', skipHandler);
        elements.gameBoard.removeEventListener('click', skipHandler);
        
        // 모든 폭탄을 즉시 표시
        allMines.forEach(mine => {
            const cell = gameBoard[mine.row][mine.col];
            const cellElement = document.querySelector(`[data-row="${mine.row}"][data-col="${mine.col}"]`);
            
            cell.isRevealed = true;
            cellElement.className = 'cell revealed mine';
            cellElement.textContent = '💣';
            
            if (mine.isHit) {
                cellElement.classList.add('mine-hit');
            }
        });
        
        // 1.5초 후 모달 표시
        setTimeout(() => {
            showGameOverModal(false);
        }, 1500);
    };
    
    // 약간의 지연 후 이벤트 리스너 추가 (현재 클릭 이벤트와 충돌 방지)
    setTimeout(() => {
        document.addEventListener('click', skipHandler);
        elements.gameBoard.addEventListener('click', skipHandler);
    }, 100);
    
    let currentMineIndex = 0;
    
    function showNextMine() {
        if (skipAnimation) return;
        
        if (currentMineIndex < allMines.length) {
            const mine = allMines[currentMineIndex];
            const cell = gameBoard[mine.row][mine.col];
            const cellElement = document.querySelector(`[data-row="${mine.row}"][data-col="${mine.col}"]`);
            
            cell.isRevealed = true;
            cellElement.className = 'cell revealed mine';
            cellElement.textContent = '💣';
            
            // 클릭한 폭탄은 특별 표시
            if (mine.isHit) {
                cellElement.classList.add('mine-hit');
            }
            
            currentMineIndex++;
            
            // 다음 폭탄을 200ms 후에 표시
            setTimeout(showNextMine, 200);
        } else {
            // 이벤트 리스너 제거
            document.removeEventListener('click', skipHandler);
            elements.gameBoard.removeEventListener('click', skipHandler);
            
            // 모든 폭탄을 보여준 후 2초 뒤에 게임 오버 모달 표시
            setTimeout(() => {
                if (!skipAnimation) {
                    showGameOverModal(false);
                }
            }, 2000);
        }
    }
    
    // 첫 번째 폭탄 표시 시작
    showNextMine();
}

function showGameOverModal(won) {
    elements.gameOverModal.style.display = 'flex';
    
    if (won) {
        elements.modalTitle.textContent = '🎉 게임 승리!';
        elements.modalMessage.textContent = '축하합니다! 모든 폭탄을 피해 성공했습니다!';
    } else {
        elements.modalTitle.textContent = '💥 게임 오버';
        elements.modalMessage.textContent = '폭탄을 터뜨렸습니다. 다시 도전해보세요!';
    }
    
    elements.finalTime.textContent = String(gameStats.timer).padStart(3, '0');
    elements.finalDifficulty.textContent = gameConfig.name;
}

function closeModal() {
    elements.gameOverModal.style.display = 'none';
    resetGame();
}

// UI 업데이트
function updateUI() {
    elements.timer.textContent = String(gameStats.timer).padStart(3, '0');
    elements.minesLeft.textContent = gameStats.minesLeft;
    elements.flagsUsed.textContent = gameStats.flagsUsed;
    
    // 통계 업데이트
    elements.bestTime.textContent = savedStats.bestTimes[currentDifficulty] === 999 ? '---' : savedStats.bestTimes[currentDifficulty];
    elements.totalGames.textContent = savedStats.totalGames;
    
    const winRate = savedStats.totalGames > 0 ? Math.round((savedStats.gamesWon / savedStats.totalGames) * 100) : 0;
    elements.winRate.textContent = winRate + '%';
}

// 도움말 모달 열기
function showHelp() {
    if (elements.helpModal) {
        elements.helpModal.style.display = 'flex';
    }
}

// 도움말 모달 닫기
function closeHelp() {
    if (elements.helpModal) {
        elements.helpModal.style.display = 'none';
    }
}

// 통계 모달 열기
function showStats() {
    if (elements.statsModal) {
        // 통계 데이터 업데이트
        const winRate = savedStats.totalGames > 0 ? Math.round((savedStats.gamesWon / savedStats.totalGames) * 100) : 0;
        
        document.getElementById('modalTotalGames').textContent = savedStats.totalGames + '게임';
        document.getElementById('modalGamesWon').textContent = savedStats.gamesWon + '게임';
        document.getElementById('modalWinRate').textContent = winRate + '%';
        
        document.getElementById('modalBestEasy').textContent = 
            savedStats.bestTimes.easy === 999 ? '기록 없음' : savedStats.bestTimes.easy + '초';
        document.getElementById('modalBestMedium').textContent = 
            savedStats.bestTimes.medium === 999 ? '기록 없음' : savedStats.bestTimes.medium + '초';
        document.getElementById('modalBestHard').textContent = 
            savedStats.bestTimes.hard === 999 ? '기록 없음' : savedStats.bestTimes.hard + '초';
        
        elements.statsModal.style.display = 'flex';
    }
}

// 통계 모달 닫기
function closeStats() {
    if (elements.statsModal) {
        elements.statsModal.style.display = 'none';
    }
}

// 통계 리셋 함수
function resetStats() {
    if (confirm('정말로 모든 게임 기록을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
        // localStorage 초기화
        localStorage.removeItem('minesBestEasy');
        localStorage.removeItem('minesBestMedium');
        localStorage.removeItem('minesBestHard');
        localStorage.removeItem('minesTotalGames');
        localStorage.removeItem('minesGamesWon');
        
        // savedStats 초기화
        savedStats.bestTimes.easy = 999;
        savedStats.bestTimes.medium = 999;
        savedStats.bestTimes.hard = 999;
        savedStats.totalGames = 0;
        savedStats.gamesWon = 0;
        
        alert('모든 게임 기록이 삭제되었습니다.');
        
        // UI 업데이트
        updateUI();
        
        // 통계 모달이 열려있다면 데이터 새로고침
        if (elements.statsModal && elements.statsModal.style.display === 'flex') {
            showStats();
        }
    }
}

// 메인으로 돌아가기
function goHome() {
    if (confirm('게임을 종료하고 메인 페이지로 돌아가시겠습니까?')) {
        if (gameStats.timerInterval) {
            clearInterval(gameStats.timerInterval);
            gameStats.timerInterval = null;
        }
        
        // 모든 모달 닫기
        if (elements.gameOverModal) elements.gameOverModal.style.display = 'none';
        if (elements.helpModal) elements.helpModal.style.display = 'none';
        if (elements.statsModal) elements.statsModal.style.display = 'none';
        
        // index.html로 이동
        window.location.href = 'index.html';
    }
}

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', init);

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