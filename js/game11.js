// 게임 상태 변수들
let gameBoard = [];
let solutionBoard = [];
let givenCells = [];
let selectedCell = null;
let gameState = 'menu'; // 'menu', 'ready', 'playing', 'paused', 'completed', 'gameOver'
let currentDifficulty = '';
let gameStartTime = null;
let gameTimer = null;
let hintsLeft = 3;
let maxLives = 3;
let currentLives = 3;
let isPaused = false;
let errorCount = 0;
let isMobile = window.innerWidth <= 480;

// 난이도별 설정 (6단계로 확장)
const difficultySettings = {
    easy: { name: '초급', clues: 35, maxClues: 38, maxHints: 3, maxLives: 3, emoji: '🟢' },
    medium: { name: '중급', clues: 31, maxClues: 34, maxHints: 2, maxLives: 3, emoji: '🟡' },
    hard: { name: '고급', clues: 27, maxClues: 30, maxHints: 1, maxLives: 3, emoji: '🟠' },
    expert: { name: '최고급', clues: 23, maxClues: 26, maxHints: 1, maxLives: 2, emoji: '🔴' },
    extreme: { name: '극한급', clues: 19, maxClues: 22, maxHints: 0, maxLives: 2, emoji: '🟣' },
    transcendent: { name: '초월급', clues: 15, maxClues: 18, maxHints: 0, maxLives: 1, emoji: '⚫' }
};

// 통계 데이터
let gameStats = {
    totalGames: parseInt(localStorage.getItem('sudokuTotalGames')) || 0,
    totalCompleted: parseInt(localStorage.getItem('sudokuTotalCompleted')) || 0,
    totalPlayTime: parseInt(localStorage.getItem('sudokuTotalPlayTime')) || 0,
    totalHints: parseInt(localStorage.getItem('sudokuTotalHints')) || 0
};

// DOM 요소들
const elements = {
    difficulty: document.getElementById('difficulty'),
    gameTime: document.getElementById('gameTime'),
    bestTime: document.getElementById('bestTime'),
    hintsLeft: document.getElementById('hintsLeft'),
    lives: document.getElementById('lives'),
    gameInfo: document.getElementById('gameInfo'),
    sudokuBoard: document.getElementById('sudokuBoard'),
    gameOverlay: document.getElementById('gameOverlay'),
    overlayTitle: document.getElementById('overlayTitle'),
    overlayMessage: document.getElementById('overlayMessage'),
    completeModal: document.getElementById('completeModal'),
    gameOverModal: document.getElementById('gameOverModal'),
    helpModal: document.getElementById('helpModal'),
    statsModal: document.getElementById('statsModal'),
    pauseBtn: document.getElementById('pauseBtn'),
    totalCompleted: document.getElementById('totalCompleted'),
    avgTime: document.getElementById('avgTime'),
    completionRate: document.getElementById('completionRate'),
    mobileInput: document.getElementById('mobileInput')
};

// 3x3 박스별 색상 패턴 계산 함수
function getBoxType(row, col) {
    const boxRow = Math.floor(row / 3);
    const boxCol = Math.floor(col / 3);
    return (boxRow + boxCol) % 2 === 0 ? 'box-light' : 'box-dark';
}

// 3x3 박스 경계선 확인 함수
function needsThickBorder(index) {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const needsRight = col === 2 || col === 5;
    const needsBottom = row === 2 || row === 5;
    return { right: needsRight, bottom: needsBottom };
}

// 모바일 감지 함수
function checkMobile() {
    isMobile = window.innerWidth <= 480;
}

// 초기화 함수
function init() {
    checkMobile();
    setupEventListeners();
    createBoard();
    setupMobileInput();
    showDifficultySelection();
    updateUI();
    updateMainStats();
}

function setupEventListeners() {
    document.addEventListener('keydown', handleKeyDown);
    setupModalClickEvents();
    window.addEventListener('resize', checkMobile);
}

function setupModalClickEvents() {
    [elements.completeModal, elements.gameOverModal, elements.helpModal, elements.statsModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modal);
                }
            });
        }
    });
}

// 모바일 입력 설정
function setupMobileInput() {
    if (elements.mobileInput) {
        elements.mobileInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value >= 1 && value <= 9 && selectedCell !== null) {
                inputNumber(value);
                e.target.value = ''; // 입력 후 비우기
            } else if (e.target.value !== '') {
                e.target.value = ''; // 잘못된 입력 지우기
            }
        });

        // 포커스 시 기존 값 지우기
        elements.mobileInput.addEventListener('focus', (e) => {
            e.target.value = '';
        });

        // 숫자 외 입력 방지
        elements.mobileInput.addEventListener('keypress', (e) => {
            if (!/[1-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete') {
                e.preventDefault();
            }
        });
    }
}

function createBoard() {
    elements.sudokuBoard.innerHTML = '';
    
    for (let i = 0; i < 81; i++) {
        const cell = document.createElement('div');
        const row = Math.floor(i / 9);
        const col = i % 9;
        
        cell.className = 'sudoku-cell';
        cell.dataset.index = i;
        
        // 3x3 박스별 색상 적용
        const boxType = getBoxType(row, col);
        cell.classList.add(boxType);
        
        // 3x3 박스 경계선 적용
        const borders = needsThickBorder(i);
        if (borders.right) cell.classList.add('border-right-thick');
        if (borders.bottom) cell.classList.add('border-bottom-thick');
        
        cell.addEventListener('click', () => selectCell(i));
        elements.sudokuBoard.appendChild(cell);
    }
}

function selectCell(index) {
    if (gameState !== 'playing') return;
    if (givenCells[index]) return;
    
    // 이전 선택 해제
    if (selectedCell !== null) {
        document.querySelector(`[data-index="${selectedCell}"]`).classList.remove('selected');
    }
    
    selectedCell = index;
    document.querySelector(`[data-index="${index}"]`).classList.add('selected');
    
    // 모바일에서 셀 선택 시 입력창 포커스
    if (isMobile && elements.mobileInput) {
        elements.mobileInput.focus();
    }
}

function showDifficultySelection() {
    gameState = 'menu';
    elements.gameOverlay.classList.remove('hidden');
    elements.overlayTitle.textContent = '🎯 난이도 선택!';
    elements.overlayMessage.innerHTML = `
        <div class="difficulty-buttons">
            <button class="difficulty-btn" onclick="selectDifficulty('easy')">
                <span>🟢 초급</span><br>
                <small>쉬운 퍼즐 (생명 3개, 힌트 3개)</small>
            </button>
            <button class="difficulty-btn" onclick="selectDifficulty('medium')">
                <span>🟡 중급</span><br>
                <small>보통 퍼즐 (생명 3개, 힌트 2개)</small>
            </button>
            <button class="difficulty-btn" onclick="selectDifficulty('hard')">
                <span>🟠 고급</span><br>
                <small>어려운 퍼즐 (생명 3개, 힌트 1개)</small>
            </button>
            <button class="difficulty-btn" onclick="selectDifficulty('expert')">
                <span>🔴 최고급</span><br>
                <small>매우 어려운 퍼즐 (생명 2개, 힌트 1개)</small>
            </button>
            <button class="difficulty-btn" onclick="selectDifficulty('extreme')">
                <span>🟣 극한급</span><br>
                <small>극한 퍼즐 (생명 2개, 힌트 0개)</small>
            </button>
            <button class="difficulty-btn" onclick="selectDifficulty('transcendent')">
                <span>⚫ 초월급</span><br>
                <small>초월 퍼즐 (생명 1개, 힌트 0개)</small>
            </button>
        </div>
    `;
    elements.gameInfo.textContent = '원하는 난이도를 선택하세요!';
}

function selectDifficulty(difficulty) {
    currentDifficulty = difficulty;
    hintsLeft = difficultySettings[difficulty].maxHints;
    maxLives = difficultySettings[difficulty].maxLives;
    currentLives = maxLives;
    prepareGame();
}

function prepareGame() {
    gameState = 'ready';
    gameStartTime = null;
    isPaused = false;
    selectedCell = null;
    errorCount = 0;
    
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    
    generatePuzzle();
    updateUI();
    updatePauseButton();
    
    elements.gameOverlay.classList.remove('hidden');
    elements.overlayTitle.textContent = '🎮 게임 준비 완료!';
    elements.overlayMessage.innerHTML = '<p>게임 시작 버튼을 클릭하거나 스페이스바를 눌러 시작하세요!</p>';
    elements.gameInfo.textContent = '게임 시작 버튼을 클릭하거나 스페이스바를 눌러 시작하세요!';
}

function startGame() {
    if (gameState === 'ready') {
        gameState = 'playing';
        gameStartTime = Date.now();
        
        // 통계 업데이트 - 게임 시작
        gameStats.totalGames++;
        localStorage.setItem('sudokuTotalGames', gameStats.totalGames);
        
        elements.gameOverlay.classList.add('hidden');
        
        if (isMobile) {
            elements.gameInfo.textContent = '셀을 터치하여 선택한 후 숫자를 입력하세요!';
        } else {
            elements.gameInfo.textContent = '숫자를 선택하여 빈 셀을 채워보세요!';
        }
        
        startTimer();
        updatePauseButton();
        updateMainStats();
    } else if (gameState === 'gameOver') {
        resetGame();
    }
}

function generatePuzzle() {
    // 완성된 스도쿠 보드 생성
    solutionBoard = generateCompleteSudoku();
    
    // 게임 보드 복사 및 셀 제거
    gameBoard = solutionBoard.map(row => [...row]);
    givenCells = new Array(81).fill(false);
    
    // 난이도에 따른 랜덤한 힌트 개수 결정
    const minClues = difficultySettings[currentDifficulty].clues;
    const maxClues = difficultySettings[currentDifficulty].maxClues;
    const cluesCount = Math.floor(Math.random() * (maxClues - minClues + 1)) + minClues;
    
    const cellsToKeep = [];
    
    // 모든 셀 인덱스 생성
    for (let i = 0; i < 81; i++) {
        cellsToKeep.push(i);
    }
    
    // 랜덤하게 섞기
    for (let i = cellsToKeep.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cellsToKeep[i], cellsToKeep[j]] = [cellsToKeep[j], cellsToKeep[i]];
    }
    
    // 지정된 개수의 셀만 유지
    for (let i = 0; i < cluesCount; i++) {
        const index = cellsToKeep[i];
        givenCells[index] = true;
    }
    
    // 나머지 셀들은 0으로 설정
    for (let i = 0; i < 81; i++) {
        if (!givenCells[i]) {
            const row = Math.floor(i / 9);
            const col = i % 9;
            gameBoard[row][col] = 0;
        }
    }
    
    updateDisplay();
}

function generateCompleteSudoku() {
    const board = Array(9).fill().map(() => Array(9).fill(0));
    
    function isValid(board, row, col, num) {
        // 행 검사
        for (let x = 0; x < 9; x++) {
            if (board[row][x] === num) return false;
        }
        
        // 열 검사
        for (let x = 0; x < 9; x++) {
            if (board[x][col] === num) return false;
        }
        
        // 3x3 박스 검사
        const startRow = row - row % 3;
        const startCol = col - col % 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[i + startRow][j + startCol] === num) return false;
            }
        }
        
        return true;
    }
    
    function solveSudoku(board) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) {
                    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                    
                    // 숫자 순서 랜덤화
                    for (let i = numbers.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
                    }
                    
                    for (let num of numbers) {
                        if (isValid(board, row, col, num)) {
                            board[row][col] = num;
                            
                            if (solveSudoku(board)) {
                                return true;
                            }
                            
                            board[row][col] = 0;
                        }
                    }
                    
                    return false;
                }
            }
        }
        return true;
    }
    
    solveSudoku(board);
    return board;
}

function updateDisplay() {
    for (let i = 0; i < 81; i++) {
        const row = Math.floor(i / 9);
        const col = i % 9;
        const cell = document.querySelector(`[data-index="${i}"]`);
        const value = gameBoard[row][col];
        
        cell.textContent = value === 0 ? '' : value;
        
        // 상태별 클래스 재설정
        const boxType = getBoxType(row, col);
        const borders = needsThickBorder(i);
        
        cell.className = 'sudoku-cell';
        cell.classList.add(boxType);
        if (borders.right) cell.classList.add('border-right-thick');
        if (borders.bottom) cell.classList.add('border-bottom-thick');
        
        if (givenCells[i]) {
            cell.classList.add('given');
        }
        
        if (selectedCell === i) {
            cell.classList.add('selected');
        }
    }
}

function startTimer() {
    if (gameTimer) clearInterval(gameTimer);
    
    gameTimer = setInterval(() => {
        if (gameStartTime && gameState === 'playing') {
            const elapsed = Date.now() - gameStartTime;
            elements.gameTime.textContent = formatTime(elapsed);
        }
    }, 1000);
}

function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
        return `${hours}시간 ${minutes}분 ${seconds}초`;
    } else if (minutes > 0) {
        return `${minutes}분 ${seconds}초`;
    } else {
        return `${seconds}초`;
    }
}

function inputNumber(num) {
    if (gameState !== 'playing' || selectedCell === null) return;
    if (givenCells[selectedCell]) return;
    
    const row = Math.floor(selectedCell / 9);
    const col = selectedCell % 9;
    
    // 기존 값과 같으면 무시
    if (gameBoard[row][col] === num) return;
    
    gameBoard[row][col] = num;
    updateDisplay();
    
    // 충돌 검사
    const hasConflict = checkConflicts();
    
    // 오류 시 생명 감소
    if (hasConflict) {
        currentLives--;
        errorCount++;
        elements.gameInfo.textContent = `잘못된 숫자입니다! 생명이 감소했습니다. (${currentLives}/${maxLives})`;
        
        if (currentLives <= 0) {
            gameOver();
            return;
        }
        
        setTimeout(() => {
            if (gameState === 'playing') {
                if (isMobile) {
                    elements.gameInfo.textContent = '셀을 터치하여 선택한 후 숫자를 입력하세요!';
                } else {
                    elements.gameInfo.textContent = '숫자를 선택하여 빈 셀을 채워보세요!';
                }
            }
        }, 2000);
    }
    
    // 완성 검사
    if (isPuzzleComplete()) {
        setTimeout(() => {
            completePuzzle();
        }, 500);
    }
    
    updateUI();
}

function clearCell() {
    if (gameState !== 'playing' || selectedCell === null) return;
    if (givenCells[selectedCell]) return;
    
    const row = Math.floor(selectedCell / 9);
    const col = selectedCell % 9;
    
    gameBoard[row][col] = 0;
    updateDisplay();
    checkConflicts();
}

function checkConflicts() {
    // 모든 셀의 오류 클래스 제거
    document.querySelectorAll('.sudoku-cell').forEach(cell => {
        cell.classList.remove('error', 'conflict');
    });
    
    let hasConflicts = false;
    
    for (let i = 0; i < 81; i++) {
        const row = Math.floor(i / 9);
        const col = i % 9;
        const value = gameBoard[row][col];
        
        if (value === 0) continue;
        
        const cell = document.querySelector(`[data-index="${i}"]`);
        
        // 행, 열, 박스 내 중복 검사
        if (hasConflictInRowColBox(row, col, value)) {
            cell.classList.add('error');
            hasConflicts = true;
        }
    }
    
    return hasConflicts;
}

function hasConflictInRowColBox(targetRow, targetCol, value) {
    // 행 검사
    for (let col = 0; col < 9; col++) {
        if (col !== targetCol && gameBoard[targetRow][col] === value) {
            return true;
        }
    }
    
    // 열 검사
    for (let row = 0; row < 9; row++) {
        if (row !== targetRow && gameBoard[row][targetCol] === value) {
            return true;
        }
    }
    
    // 3x3 박스 검사
    const startRow = Math.floor(targetRow / 3) * 3;
    const startCol = Math.floor(targetCol / 3) * 3;
    
    for (let row = startRow; row < startRow + 3; row++) {
        for (let col = startCol; col < startCol + 3; col++) {
            if ((row !== targetRow || col !== targetCol) && gameBoard[row][col] === value) {
                return true;
            }
        }
    }
    
    return false;
}

function isPuzzleComplete() {
    // 모든 셀이 채워져 있는지 확인
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (gameBoard[row][col] === 0) return false;
        }
    }
    
    // 충돌이 없는지 확인
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (hasConflictInRowColBox(row, col, gameBoard[row][col])) {
                return false;
            }
        }
    }
    
    return true;
}

function completePuzzle() {
    gameState = 'completed';
    
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    
    const completionTime = Date.now() - gameStartTime;
    const usedHintsCount = difficultySettings[currentDifficulty].maxHints - hintsLeft;
    
    // 통계 업데이트
    gameStats.totalCompleted++;
    gameStats.totalPlayTime += completionTime;
    gameStats.totalHints += usedHintsCount;
    localStorage.setItem('sudokuTotalCompleted', gameStats.totalCompleted);
    localStorage.setItem('sudokuTotalPlayTime', gameStats.totalPlayTime);
    localStorage.setItem('sudokuTotalHints', gameStats.totalHints);
    
    // 최고 기록 확인 및 업데이트
    const bestKey = `sudokuBest${currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)}`;
    const currentBest = localStorage.getItem(bestKey);
    let isNewRecord = false;
    
    if (!currentBest || completionTime < parseInt(currentBest)) {
        localStorage.setItem(bestKey, completionTime);
        isNewRecord = true;
    }
    
    // 완료 모달 표시
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const finalTime = document.getElementById('finalTime');
    const finalDifficulty = document.getElementById('finalDifficulty');
    const usedHints = document.getElementById('usedHints');
    const remainingLives = document.getElementById('remainingLives');
    const recordMessage = document.getElementById('recordMessage');
    
    modalTitle.textContent = isNewRecord ? '🏆 새로운 기록!' : '🎉 퍼즐 완료!';
    modalMessage.textContent = isNewRecord ? 
        '축하합니다! 새로운 최고 기록을 세웠습니다!' : 
        '축하합니다! 퍼즐을 성공적으로 완성했습니다!';
    
    finalTime.textContent = formatTime(completionTime);
    finalDifficulty.textContent = difficultySettings[currentDifficulty].name;
    usedHints.textContent = usedHintsCount;
    remainingLives.textContent = currentLives;
    recordMessage.textContent = isNewRecord ? '🌟 신기록 달성! 🌟' : '';
    
    updateUI();
    updateMainStats();
    elements.completeModal.style.display = 'flex';
}

function gameOver() {
    gameState = 'gameOver';
    
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    
    const playTime = gameStartTime ? Date.now() - gameStartTime : 0;
    const usedHintsCount = difficultySettings[currentDifficulty].maxHints - hintsLeft;
    
    // 게임 오버 모달 표시
    const gameOverTime = document.getElementById('gameOverTime');
    const gameOverDifficulty = document.getElementById('gameOverDifficulty');
    const gameOverHints = document.getElementById('gameOverHints');
    
    if (gameOverTime) gameOverTime.textContent = formatTime(playTime);
    if (gameOverDifficulty) gameOverDifficulty.textContent = difficultySettings[currentDifficulty].name;
    if (gameOverHints) gameOverHints.textContent = usedHintsCount;
    
    elements.gameInfo.textContent = '게임 오버! 모든 생명을 잃었습니다.';
    elements.gameOverModal.style.display = 'flex';
    
    updateMainStats();
}

function getHint() {
    if (gameState !== 'playing' || hintsLeft <= 0 || selectedCell === null) return;
    if (givenCells[selectedCell]) return;
    
    const row = Math.floor(selectedCell / 9);
    const col = selectedCell % 9;
    
    // 이미 올바른 숫자가 입력되어 있다면 힌트 불필요
    if (gameBoard[row][col] === solutionBoard[row][col]) return;
    
    // 힌트 제공
    gameBoard[row][col] = solutionBoard[row][col];
    hintsLeft--;
    
    // 힌트 효과 표시
    const cell = document.querySelector(`[data-index="${selectedCell}"]`);
    cell.classList.add('hint');
    
    setTimeout(() => {
        cell.classList.remove('hint');
    }, 2000);
    
    updateDisplay();
    updateUI();
    
    elements.gameInfo.textContent = `힌트를 사용했습니다! (남은 힌트: ${hintsLeft}개)`;
    
    setTimeout(() => {
        if (gameState === 'playing') {
            if (isMobile) {
                elements.gameInfo.textContent = '셀을 터치하여 선택한 후 숫자를 입력하세요!';
            } else {
                elements.gameInfo.textContent = '숫자를 선택하여 빈 셀을 채워보세요!';
            }
        }
    }, 2000);
    
    // 완성 검사
    if (isPuzzleComplete()) {
        setTimeout(() => {
            completePuzzle();
        }, 500);
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
        
        elements.gameOverlay.classList.remove('hidden');
        elements.overlayTitle.textContent = '⏸️ 게임 일시정지';
        elements.overlayMessage.textContent = '계속하기 버튼을 클릭하거나 스페이스바를 눌러 게임을 재개하세요';
        elements.gameInfo.textContent = '게임이 일시정지되었습니다.';
        
    } else if (gameState === 'paused') {
        gameState = 'playing';
        isPaused = false;
        startTimer();
        elements.gameOverlay.classList.add('hidden');
        elements.gameInfo.textContent = '게임을 계속하세요!';
    }
    
    updatePauseButton();
}

function resetGame() {
    gameState = 'ready';
    errorCount = 0;
    
    elements.gameOverlay.classList.remove('hidden');
    elements.overlayTitle.textContent = '🎮 게임 준비!';
    elements.overlayMessage.textContent = '게임 시작 버튼을 클릭하거나 스페이스바를 눌러 시작하세요';
    elements.gameInfo.textContent = '게임 시작 버튼을 클릭하거나 스페이스바를 눌러 시작하세요!';
    
    if (currentDifficulty) {
        hintsLeft = difficultySettings[currentDifficulty].maxHints;
        maxLives = difficultySettings[currentDifficulty].maxLives;
        currentLives = maxLives;
        generatePuzzle();
    } else {
        showDifficultySelection();
    }
    
    updateUI();
    updatePauseButton();
}

function updatePauseButton() {
    if (elements.pauseBtn) {
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
        if (elements.completeModal && elements.completeModal.style.display === 'flex') {
            closeModal(elements.completeModal);
            return;
        }
        if (elements.gameOverModal && elements.gameOverModal.style.display === 'flex') {
            closeModal(elements.gameOverModal);
            return;
        }
        goHome();
        return;
    }
    
    // H키로 도움말 열기 (모든 상태에서 가능)
    if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        showHelp();
        return;
    }
    
    // 모달이 열려있으면 다른 키 입력 무시
    if ((elements.helpModal && elements.helpModal.style.display === 'flex') || 
        (elements.statsModal && elements.statsModal.style.display === 'flex') ||
        (elements.completeModal && elements.completeModal.style.display === 'flex') ||
        (elements.gameOverModal && elements.gameOverModal.style.display === 'flex')) {
        return;
    }
    
    if (gameState === 'ready' && e.key === ' ') {
        e.preventDefault();
        startGame();
        return;
    }
    
    if ((gameState === 'playing' || gameState === 'paused') && e.key === ' ') {
        e.preventDefault();
        pauseGame();
        return;
    }
    
    if (gameState !== 'playing') return;
    
    e.preventDefault();
    
    // 데스크톱에서만 키보드 입력 허용
    if (!isMobile) {
        // 숫자 입력
        if (e.key >= '1' && e.key <= '9') {
            inputNumber(parseInt(e.key));
        }
        
        // 셀 지우기
        if (e.key === 'Delete' || e.key === 'Backspace') {
            clearCell();
        }
        
        // 화살표 키로 셀 이동
        if (selectedCell !== null) {
            const row = Math.floor(selectedCell / 9);
            const col = selectedCell % 9;
            let newRow = row, newCol = col;
            
            switch(e.key) {
                case 'ArrowUp':
                    newRow = Math.max(0, row - 1);
                    break;
                case 'ArrowDown':
                    newRow = Math.min(8, row + 1);
                    break;
                case 'ArrowLeft':
                    newCol = Math.max(0, col - 1);
                    break;
                case 'ArrowRight':
                    newCol = Math.min(8, col + 1);
                    break;
            }
            
            if (newRow !== row || newCol !== col) {
                selectCell(newRow * 9 + newCol);
            }
        }
    }
}

function updateUI() {
    if (elements.difficulty) elements.difficulty.textContent = currentDifficulty ? difficultySettings[currentDifficulty].name : '-';
    if (elements.hintsLeft) elements.hintsLeft.textContent = hintsLeft;
    if (elements.lives) elements.lives.textContent = currentLives;
    
    // 최고 기록 표시
    if (currentDifficulty) {
        const bestKey = `sudokuBest${currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)}`;
        const bestTime = localStorage.getItem(bestKey);
        if (elements.bestTime) elements.bestTime.textContent = bestTime ? formatTime(parseInt(bestTime)) : '-';
    } else {
        if (elements.bestTime) elements.bestTime.textContent = '-';
    }
}

function updateMainStats() {
    const completionRate = gameStats.totalGames > 0 ? 
        Math.round((gameStats.totalCompleted / gameStats.totalGames) * 100) : 0;
    const avgTime = gameStats.totalCompleted > 0 ? 
        gameStats.totalPlayTime / gameStats.totalCompleted : 0;
    
    if (elements.totalCompleted) elements.totalCompleted.textContent = gameStats.totalCompleted;
    if (elements.avgTime) elements.avgTime.textContent = avgTime > 0 ? formatTime(avgTime) : '-';
    if (elements.completionRate) elements.completionRate.textContent = `${completionRate}%`;
}

function changeDifficulty() {
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    showDifficultySelection();
}

function restartGame() {
    elements.completeModal.style.display = 'none';
    resetGame();
}

function selectNewDifficulty() {
    elements.completeModal.style.display = 'none';
    changeDifficulty();
}

function closeGameOver() {
    elements.gameOverModal.style.display = 'none';
    resetGame();
}

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
    if (elements.statsModal) {
        updateStatsModal();
        elements.statsModal.style.display = 'flex';
    }
}

function closeStats() {
    if (elements.statsModal) {
        elements.statsModal.style.display = 'none';
    }
}

function updateStatsModal() {
    const avgTime = gameStats.totalCompleted > 0 ? 
        Math.round(gameStats.totalPlayTime / gameStats.totalCompleted) : 0;
    const completionRate = gameStats.totalGames > 0 ? 
        Math.round((gameStats.totalCompleted / gameStats.totalGames) * 100) : 0;
    
    const modalTotalGames = document.getElementById('modalTotalGames');
    const modalTotalCompleted = document.getElementById('modalTotalCompleted');
    const modalTotalPlayTime = document.getElementById('modalTotalPlayTime');
    const modalAvgTime = document.getElementById('modalAvgTime');
    const modalTotalHints = document.getElementById('modalTotalHints');
    const modalCompletionRate = document.getElementById('modalCompletionRate');
    
    if (modalTotalGames) modalTotalGames.textContent = gameStats.totalGames;
    if (modalTotalCompleted) modalTotalCompleted.textContent = gameStats.totalCompleted;
    if (modalTotalPlayTime) modalTotalPlayTime.textContent = formatTime(gameStats.totalPlayTime);
    if (modalAvgTime) modalAvgTime.textContent = avgTime > 0 ? formatTime(avgTime) : '-';
    if (modalTotalHints) modalTotalHints.textContent = gameStats.totalHints;
    if (modalCompletionRate) modalCompletionRate.textContent = `${completionRate}%`;
    
    // 난이도별 최고 기록 업데이트
    const difficulties = ['easy', 'medium', 'hard', 'expert', 'extreme', 'transcendent'];
    difficulties.forEach(diff => {
        const bestKey = `sudokuBest${diff.charAt(0).toUpperCase() + diff.slice(1)}`;
        const elementId = `best${diff.charAt(0).toUpperCase() + diff.slice(1)}`;
        const bestTime = localStorage.getItem(bestKey);
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = bestTime ? formatTime(parseInt(bestTime)) : '기록 없음';
        }
    });
}

function resetStats() {
    if (confirm('정말로 모든 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        const keys = [
            'sudokuTotalGames', 'sudokuTotalCompleted', 'sudokuTotalPlayTime', 'sudokuTotalHints',
            'sudokuBestEasy', 'sudokuBestMedium', 'sudokuBestHard', 
            'sudokuBestExpert', 'sudokuBestExtreme', 'sudokuBestTranscendent'
        ];
        
        keys.forEach(key => localStorage.removeItem(key));
        
        gameStats = {
            totalGames: 0,
            totalCompleted: 0,
            totalPlayTime: 0,
            totalHints: 0
        };
        
        updateUI();
        updateMainStats();
        updateStatsModal();
        
        alert('모든 기록이 삭제되었습니다!');
    }
}

function closeModal(modal) {
    if (modal) {
        modal.style.display = 'none';
    }
    
    if (modal === elements.completeModal) {
        resetGame();
    } else if (modal === elements.gameOverModal) {
        resetGame();
    }
}

function goHome() {
    if (confirm('게임을 종료하고 메인 페이지로 돌아가시겠습니까?')) {
        if (gameTimer) {
            clearInterval(gameTimer);
        }
        window.location.href = 'index.html';
    }
}

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

// 화면 크기 변경 감지
window.addEventListener('resize', () => {
    checkMobile();
});

// 전역 함수로 HTML에서 호출 가능하게 설정
window.selectDifficulty = selectDifficulty;
window.startGame = startGame;
window.pauseGame = pauseGame;
window.getHint = getHint;
window.resetGame = resetGame;
window.changeDifficulty = changeDifficulty;
window.showHelp = showHelp;
window.showStats = showStats;
window.closeHelp = closeHelp;
window.closeStats = closeStats;
window.resetStats = resetStats;
window.restartGame = restartGame;
window.selectNewDifficulty = selectNewDifficulty;
window.closeGameOver = closeGameOver;
window.goHome = goHome;
window.inputNumber = inputNumber;
window.clearCell = clearCell;