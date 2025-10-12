// 게임 상태 변수들
let gameState = 'ready'; // 'ready', 'playing', 'paused', 'gameOver', 'roundComplete'
let timer = null;

// 게임 설정
const GAME_CONFIG = {
    maxAttempts: 7,
    timeLimit: 60, // 초
    minNumber: 1,
    maxNumber: 100,
    pointsBase: 100,
    pointsTimeBonus: 2,
    pointsAttemptBonus: 10
};

// localStorage 대신 sessionStorage 사용 (더 안전함)
function getStoredValue(key, defaultValue) {
    try {
        return parseInt(sessionStorage.getItem(key)) || defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

function setStoredValue(key, value) {
    try {
        sessionStorage.setItem(key, value);
    } catch (e) {
        console.warn('Storage not available:', e);
    }
}

// 현재 라운드 상태
let currentRound = {
    targetNumber: 0,
    attempts: 0,
    timeLeft: GAME_CONFIG.timeLimit,
    guesses: []
};

// 게임 통계
let gameStats = {
    score: 0,
    round: 1,
    totalRounds: 0,
    totalAttempts: 0,
    correctGuesses: 0,
    highScore: getStoredValue('numberGuessHighScore', 0)
};

// 전체 통계 데이터
let allTimeStats = {
    totalGames: getStoredValue('numberGuessTotalGames', 0),
    totalRounds: getStoredValue('numberGuessTotalRounds', 0),
    successRounds: getStoredValue('numberGuessSuccessRounds', 0),
    bestRound: getStoredValue('numberGuessBestRound', 1),
    totalAttemptsAllTime: getStoredValue('numberGuessTotalAttempts', 0)
};

// DOM 요소들
const elements = {
    score: document.getElementById('score'),
    round: document.getElementById('round'),
    timeLeft: document.getElementById('timeLeft'),
    gameInfo: document.getElementById('gameInfo'),
    mysteryNumber: document.getElementById('mysteryNumber'),
    rangeInfo: document.getElementById('rangeInfo'),
    guessInput: document.getElementById('guessInput'),
    guessBtn: document.getElementById('guessBtn'),
    hintText: document.getElementById('hintText'),
    attemptsInfo: document.getElementById('attemptsInfo'),
    guessHistory: document.getElementById('guessHistory'),
    gameOverlay: document.getElementById('gameOverlay'),
    overlayTitle: document.getElementById('overlayTitle'),
    overlayMessage: document.getElementById('overlayMessage'),
    gameOverModal: document.getElementById('gameOverModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalMessage: document.getElementById('modalMessage'),
    finalScore: document.getElementById('finalScore'),
    finalRounds: document.getElementById('finalRounds'),
    averageAttempts: document.getElementById('averageAttempts'),
    highScore: document.getElementById('highScore'),
    totalRounds: document.getElementById('totalRounds'),
    accuracy: document.getElementById('accuracy'),
    helpModal: document.getElementById('helpModal'),
    statsModal: document.getElementById('statsModal')
};

// 스피너 증가 버튼 기능
function incrementValue() {
    const input = elements.guessInput;
    let currentValue = parseInt(input.value) || GAME_CONFIG.minNumber - 1;
    
    if (currentValue < GAME_CONFIG.maxNumber) {
        input.value = currentValue + 1;
        
        // 네온 효과 애니메이션
        const spinner = document.querySelector('.spinner-up');
        if (spinner) {
            spinner.style.animation = 'none';
            setTimeout(() => {
                spinner.style.animation = 'spinnerGlow 1.5s ease-in-out infinite';
            }, 10);
        }
    }
}

// 스피너 감소 버튼 기능
function decrementValue() {
    const input = elements.guessInput;
    let currentValue = parseInt(input.value) || GAME_CONFIG.maxNumber + 1;
    
    if (currentValue > GAME_CONFIG.minNumber) {
        input.value = currentValue - 1;
        
        // 네온 효과 애니메이션
        const spinner = document.querySelector('.spinner-down');
        if (spinner) {
            spinner.style.animation = 'none';
            setTimeout(() => {
                spinner.style.animation = 'spinnerGlow 1.5s ease-in-out infinite';
            }, 10);
        }
    }
}

// 키보드 화살표 키로도 조작 가능하게 하기
function handleSpinnerKeyDown(e) {
    if (e.target.id === 'guessInput') {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            incrementValue();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            decrementValue();
        }
    }
}

function handleKeyDown(e) {
    switch(e.key) {
        case 'r':
        case 'R':
            resetGame();
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
        case ' ':
            e.preventDefault();
            // 게임 상태에 따른 스페이스바 동작
            if (gameState === 'ready') {
                startGame(); // 게임 준비 상태에서 스페이스바로 시작
            } else if (gameState === 'playing') {
                pauseGame();
            } else if (gameState === 'paused') {
                pauseGame(); // 일시정지 해제
            }
            break;
    }
}

function setupEventListeners() {
    // 키보드 이벤트
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleSpinnerKeyDown);
    
    // 모달 외부 클릭 시 닫기
    setupModalClickEvents();
    
    // 입력 필드 엔터키 처리
    if (elements.guessInput) {
        elements.guessInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                makeGuess();
            }
        });
        
        // 입력 필드 숫자 검증
        elements.guessInput.addEventListener('input', validateInput);
    }
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

function validateInput() {
    if (!elements.guessInput) return;
    
    const value = parseInt(elements.guessInput.value);
    if (value < GAME_CONFIG.minNumber) {
        elements.guessInput.value = GAME_CONFIG.minNumber;
    } else if (value > GAME_CONFIG.maxNumber) {
        elements.guessInput.value = GAME_CONFIG.maxNumber;
    }
}

function startGame() {
    if (gameState === 'ready' || gameState === 'gameOver') {
        gameState = 'playing';
        
        // 게임 카운트 증가
        allTimeStats.totalGames++;
        setStoredValue('numberGuessTotalGames', allTimeStats.totalGames);
        
        initializeRound();
        startTimer();
        if (elements.gameOverlay) elements.gameOverlay.classList.add('hidden');
        if (elements.gameInfo) elements.gameInfo.textContent = '숫자를 입력하고 추측해보세요!';
        if (elements.guessInput) elements.guessInput.focus();
    }
}

function initializeRound() {
    currentRound = {
        targetNumber: Math.floor(Math.random() * (GAME_CONFIG.maxNumber - GAME_CONFIG.minNumber + 1)) + GAME_CONFIG.minNumber,
        attempts: 0,
        timeLeft: GAME_CONFIG.timeLimit,
        guesses: []
    };
    
    console.log('새 라운드 초기화:', currentRound.targetNumber); // 디버깅용
    
    // UI 초기화
    if (elements.mysteryNumber) elements.mysteryNumber.textContent = '❓❓❓';
    if (elements.guessHistory) elements.guessHistory.innerHTML = '';
    if (elements.hintText) elements.hintText.textContent = '힌트가 여기에 표시됩니다';
    if (elements.guessInput) {
        elements.guessInput.value = '';
        elements.guessInput.disabled = false;
    }
    if (elements.guessBtn) elements.guessBtn.disabled = false;
    
    // 타이머 색상 초기화
    if (elements.timeLeft) {
        elements.timeLeft.style.color = '#ffffff';
        elements.timeLeft.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.8)';
    }
    
    updateUI();
}

function startTimer() {
    if (timer) clearInterval(timer);
    
    timer = setInterval(() => {
        if (gameState === 'playing') {
            currentRound.timeLeft--;
            if (elements.timeLeft) elements.timeLeft.textContent = currentRound.timeLeft;
            
            // 시간 부족 경고
            if (currentRound.timeLeft <= 10 && currentRound.timeLeft > 0 && elements.timeLeft) {
                elements.timeLeft.style.color = '#ff0000';
                elements.timeLeft.style.textShadow = '0 0 10px rgba(255, 0, 0, 0.8)';
            }
            
            if (currentRound.timeLeft <= 0) {
                timeUp();
            }
        }
    }, 1000);
}

function pauseGame() {
    if (gameState === 'playing') {
        gameState = 'paused';
        if (elements.gameOverlay) elements.gameOverlay.classList.remove('hidden');
        if (elements.overlayTitle) elements.overlayTitle.textContent = '⏸️ 게임 일시정지';
        if (elements.overlayMessage) elements.overlayMessage.textContent = '스페이스바를 눌러 계속하세요';
        if (elements.gameInfo) elements.gameInfo.textContent = '게임이 일시정지되었습니다.';
    } else if (gameState === 'paused') {
        gameState = 'playing';
        if (elements.gameOverlay) elements.gameOverlay.classList.add('hidden');
        if (elements.gameInfo) elements.gameInfo.textContent = '숫자를 입력하고 추측해보세요!';
        if (elements.guessInput) elements.guessInput.focus();
    }
}

function makeGuess() {
    console.log('makeGuess 호출됨:', { gameState, disabled: elements.guessInput?.disabled });
    
    if (gameState !== 'playing' || !elements.guessInput || elements.guessInput.disabled) {
        console.log('makeGuess 중단:', { gameState, disabled: elements.guessInput?.disabled });
        return;
    }
    
    const guess = parseInt(elements.guessInput.value);
    console.log('추측 값:', guess, '타겟:', currentRound.targetNumber);
    
    // 입력 검증
    if (isNaN(guess) || guess < GAME_CONFIG.minNumber || guess > GAME_CONFIG.maxNumber) {
        showHint(`${GAME_CONFIG.minNumber}부터 ${GAME_CONFIG.maxNumber} 사이의 숫자를 입력하세요!`, 'warning');
        elements.guessInput.value = '';
        return;
    }
    
    // 중복 추측 확인
    if (currentRound.guesses.some(g => g.number === guess)) {
        showHint('이미 추측한 숫자입니다!', 'warning');
        elements.guessInput.value = '';
        return;
    }
    
    currentRound.attempts++;
    gameStats.totalAttempts++;
    allTimeStats.totalAttemptsAllTime++;
    setStoredValue('numberGuessTotalAttempts', allTimeStats.totalAttemptsAllTime);
    
    const isCorrect = guess === currentRound.targetNumber;
    const hint = getHint(guess, currentRound.targetNumber);
    
    console.log('추측 결과:', { isCorrect, hint, attempts: currentRound.attempts });
    
    // 추측 기록
    const guessData = {
        number: guess,
        hint: hint,
        isCorrect: isCorrect
    };
    currentRound.guesses.push(guessData);
    
    // UI 업데이트
    addGuessToHistory(guessData);
    showHint(hint, isCorrect ? 'correct' : 'hint');
    
    if (isCorrect) {
        console.log('정답! correctGuess 호출');
        correctGuess();
    } else if (currentRound.attempts >= GAME_CONFIG.maxAttempts) {
        console.log('기회 소진! wrongAnswer 호출');
        wrongAnswer();
    } else {
        elements.guessInput.value = '';
        elements.guessInput.focus();
    }
    
    updateUI();
}

function getHint(guess, target) {
    const diff = Math.abs(guess - target);
    
    if (guess === target) {
        return '🎉 정답입니다!';
    } else if (diff <= 5) {
        return guess < target ? '🔥 거의 다 왔어요! 조금 더 큰 수!' : '🔥 거의 다 왔어요! 조금 더 작은 수!';
    } else if (diff <= 10) {
        return guess < target ? '🌟 가까워요! 더 큰 수!' : '🌟 가까워요! 더 작은 수!';
    } else if (diff <= 20) {
        return guess < target ? '👆 더 큰 수입니다!' : '👇 더 작은 수입니다!';
    } else {
        return guess < target ? '⬆️ 훨씬 더 큰 수입니다!' : '⬇️ 훨씬 더 작은 수입니다!';
    }
}

function showHint(text, type) {
    if (elements.hintText) {
        elements.hintText.textContent = text;
        elements.hintText.className = `hint-text ${type}`;
    }
    
    // 애니메이션 효과
    if (type === 'correct' && elements.mysteryNumber) {
        elements.mysteryNumber.className = 'mystery-number correct-guess';
        setTimeout(() => {
            elements.mysteryNumber.className = 'mystery-number';
        }, 1000);
    } else if (type === 'warning' && elements.guessInput) {
        elements.guessInput.className = 'wrong-guess';
        setTimeout(() => {
            elements.guessInput.className = '';
        }, 500);
    }
}

function addGuessToHistory(guessData) {
    if (!elements.guessHistory) return;
    
    const guessElement = document.createElement('div');
    guessElement.className = 'guess-item';
    guessElement.innerHTML = `
        <span class="guess-number">${guessData.number}</span>
        <span class="guess-hint">${guessData.hint}</span>
    `;
    
    if (guessData.isCorrect) {
        guessElement.style.borderColor = '#00ff00';
        guessElement.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
    }
    
    elements.guessHistory.appendChild(guessElement);
    elements.guessHistory.scrollTop = elements.guessHistory.scrollHeight;
}

function correctGuess() {
    gameState = 'roundComplete';
    gameStats.correctGuesses++;
    allTimeStats.successRounds++;
    setStoredValue('numberGuessSuccessRounds', allTimeStats.successRounds);
    
    // 점수 계산
    const basePoints = GAME_CONFIG.pointsBase;
    const timeBonus = currentRound.timeLeft * GAME_CONFIG.pointsTimeBonus;
    const attemptBonus = (GAME_CONFIG.maxAttempts - currentRound.attempts + 1) * GAME_CONFIG.pointsAttemptBonus;
    const roundScore = basePoints + timeBonus + attemptBonus;
    
    gameStats.score += roundScore;
    
    // 정답 표시
    if (elements.mysteryNumber) elements.mysteryNumber.textContent = currentRound.targetNumber;
    if (elements.guessInput) elements.guessInput.disabled = true;
    if (elements.guessBtn) elements.guessBtn.disabled = true;
    
    clearInterval(timer);
    if (elements.timeLeft) {
        elements.timeLeft.style.color = '#ffffff';
        elements.timeLeft.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.8)';
    }
    
    if (elements.gameInfo) elements.gameInfo.textContent = `정답! ${roundScore}점 획득! 다음 라운드가 곧 시작됩니다.`;
    
    setTimeout(() => {
        nextRound();
    }, 2000);
}

function wrongAnswer() {
    gameState = 'gameOver';
    
    // 정답 공개
    if (elements.mysteryNumber) elements.mysteryNumber.textContent = currentRound.targetNumber;
    if (elements.guessInput) elements.guessInput.disabled = true;
    if (elements.guessBtn) elements.guessBtn.disabled = true;
    
    clearInterval(timer);
    
    showHint(`정답은 ${currentRound.targetNumber}이었습니다. 게임 종료!`, 'warning');
    
    setTimeout(() => {
        gameOver();
    }, 2000);
}

function timeUp() {
    gameState = 'gameOver';
    
    // 정답 공개
    if (elements.mysteryNumber) elements.mysteryNumber.textContent = currentRound.targetNumber;
    if (elements.guessInput) elements.guessInput.disabled = true;
    if (elements.guessBtn) elements.guessBtn.disabled = true;
    
    clearInterval(timer);
    if (elements.timeLeft) elements.timeLeft.textContent = '0';
    
    showHint(`시간 초과! 정답은 ${currentRound.targetNumber}이었습니다.`, 'warning');
    if (elements.gameInfo) elements.gameInfo.textContent = '시간이 다 되었습니다!';
    
    setTimeout(() => {
        gameOver();
    }, 2000);
}

function nextRound() {
    gameStats.round++;
    gameStats.totalRounds++;
    allTimeStats.totalRounds++;
    setStoredValue('numberGuessTotalRounds', allTimeStats.totalRounds);
    
    // 최고 라운드 업데이트
    if (gameStats.round > allTimeStats.bestRound) {
        allTimeStats.bestRound = gameStats.round;
        setStoredValue('numberGuessBestRound', allTimeStats.bestRound);
    }
    
    gameState = 'playing';
    
    if (elements.gameOverlay) elements.gameOverlay.classList.remove('hidden');
    if (elements.overlayTitle) elements.overlayTitle.textContent = `🚀 라운드 ${gameStats.round}`;
    if (elements.overlayMessage) elements.overlayMessage.textContent = '새로운 숫자를 준비했습니다!';
    
    setTimeout(() => {
        initializeRound();
        startTimer();
        if (elements.gameOverlay) elements.gameOverlay.classList.add('hidden');
        if (elements.gameInfo) elements.gameInfo.textContent = '숫자를 입력하고 추측해보세요!';
        if (elements.guessInput) elements.guessInput.focus();
    }, 1500);
}

function gameOver() {
    // 최고점수 업데이트
    if (gameStats.score > gameStats.highScore) {
        gameStats.highScore = gameStats.score;
        setStoredValue('numberGuessHighScore', gameStats.highScore);
        if (elements.modalTitle) {
            elements.modalTitle.textContent = '🏆 새로운 최고점수!';
            elements.modalTitle.style.color = '#ffff00';
        }
        if (elements.modalMessage) elements.modalMessage.textContent = '축하합니다! 새로운 기록을 세웠습니다!';
    } else {
        if (elements.modalTitle) {
            elements.modalTitle.textContent = '🔢 게임 종료';
            elements.modalTitle.style.color = '#ff0000';
        }
        if (elements.modalMessage) elements.modalMessage.textContent = '좋은 게임이었습니다! 다시 도전해보세요!';
    }
    
    const avgAttempts = gameStats.totalRounds > 0 ? (gameStats.totalAttempts / gameStats.totalRounds).toFixed(1) : 0;
    
    if (elements.finalScore) elements.finalScore.textContent = gameStats.score;
    if (elements.finalRounds) elements.finalRounds.textContent = gameStats.totalRounds;
    if (elements.averageAttempts) elements.averageAttempts.textContent = avgAttempts;
    if (elements.gameOverModal) elements.gameOverModal.style.display = 'flex';
    
    updateUI();
}

function resetGame() {
    gameState = 'ready';
    clearInterval(timer);
    
    // 게임 상태 초기화
    gameStats.score = 0;
    gameStats.round = 1;
    gameStats.totalRounds = 0;
    gameStats.totalAttempts = 0;
    gameStats.correctGuesses = 0;
    
    // 현재 라운드 초기화
    currentRound = {
        targetNumber: 0,
        attempts: 0,
        timeLeft: GAME_CONFIG.timeLimit,
        guesses: []
    };
    
    // UI 초기화
    if (elements.mysteryNumber) elements.mysteryNumber.textContent = '❓❓❓';
    if (elements.guessHistory) elements.guessHistory.innerHTML = '';
    if (elements.hintText) elements.hintText.textContent = '힌트가 여기에 표시됩니다';
    if (elements.guessInput) {
        elements.guessInput.value = '';
        elements.guessInput.disabled = false;
    }
    if (elements.guessBtn) elements.guessBtn.disabled = false;
    if (elements.timeLeft) {
        elements.timeLeft.style.color = '#ffffff';
        elements.timeLeft.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.8)';
    }
    
    if (elements.gameOverlay) elements.gameOverlay.classList.remove('hidden');
    if (elements.overlayTitle) elements.overlayTitle.textContent = '🎮 게임 준비!';
    if (elements.overlayMessage) elements.overlayMessage.textContent = '스페이스바나 시작 버튼을 눌러주세요';
    if (elements.gameInfo) elements.gameInfo.textContent = '1부터 100 사이의 숫자를 맞춰보세요!';
    
    updateUI();
}

function closeModal() {
    if (elements.gameOverModal) elements.gameOverModal.style.display = 'none';
    resetGame();
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
        updateStatsModal();
        elements.statsModal.style.display = 'flex';
    }
}

// 통계 모달 닫기
function closeStats() {
    if (elements.statsModal) {
        elements.statsModal.style.display = 'none';
    }
}

// 통계 모달 데이터 업데이트
function updateStatsModal() {
    const modalTotalGames = document.getElementById('modalTotalGames');
    const modalTotalRounds = document.getElementById('modalTotalRounds');
    const modalSuccessRounds = document.getElementById('modalSuccessRounds');
    const modalHighScore = document.getElementById('modalHighScore');
    const modalBestRound = document.getElementById('modalBestRound');
    const modalAvgAttempts = document.getElementById('modalAvgAttempts');
    const modalSuccessRate = document.getElementById('modalSuccessRate');
    
    if (modalTotalGames) modalTotalGames.textContent = allTimeStats.totalGames;
    if (modalTotalRounds) modalTotalRounds.textContent = allTimeStats.totalRounds;
    if (modalSuccessRounds) modalSuccessRounds.textContent = allTimeStats.successRounds;
    if (modalHighScore) modalHighScore.textContent = gameStats.highScore;
    if (modalBestRound) modalBestRound.textContent = allTimeStats.bestRound;
    
    // 평균 시도 횟수 계산
    const avgAttempts = allTimeStats.successRounds > 0 ? 
        (allTimeStats.totalAttemptsAllTime / allTimeStats.successRounds).toFixed(1) : 0;
    if (modalAvgAttempts) modalAvgAttempts.textContent = avgAttempts;
    
    // 성공률 계산
    const successRate = allTimeStats.totalRounds > 0 ? 
        Math.round((allTimeStats.successRounds / allTimeStats.totalRounds) * 100) : 0;
    if (modalSuccessRate) modalSuccessRate.textContent = successRate + '%';
}

// 모든 기록 삭제
function resetStats() {
    if (confirm('정말로 모든 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        // sessionStorage에서 모든 기록 삭제
        try {
            sessionStorage.removeItem('numberGuessHighScore');
            sessionStorage.removeItem('numberGuessTotalGames');
            sessionStorage.removeItem('numberGuessTotalRounds');
            sessionStorage.removeItem('numberGuessSuccessRounds');
            sessionStorage.removeItem('numberGuessBestRound');
            sessionStorage.removeItem('numberGuessTotalAttempts');
        } catch (e) {
            console.warn('Storage not available:', e);
        }
        
        // 메모리의 통계 데이터 초기화
        gameStats.highScore = 0;
        allTimeStats.totalGames = 0;
        allTimeStats.totalRounds = 0;
        allTimeStats.successRounds = 0;
        allTimeStats.bestRound = 1;
        allTimeStats.totalAttemptsAllTime = 0;
        
        // UI 업데이트
        updateUI();
        updateStatsModal();
        
        alert('모든 기록이 삭제되었습니다!');
    }
}

function updateUI() {
    if (elements.score) elements.score.textContent = gameStats.score;
    if (elements.round) elements.round.textContent = gameStats.round;
    if (elements.timeLeft) elements.timeLeft.textContent = currentRound.timeLeft;
    if (elements.attemptsInfo) elements.attemptsInfo.textContent = `시도 횟수: ${currentRound.attempts}/${GAME_CONFIG.maxAttempts}`;
    if (elements.highScore) elements.highScore.textContent = gameStats.highScore;
    if (elements.totalRounds) elements.totalRounds.textContent = gameStats.totalRounds;
    
    // 정확도 계산
    const accuracy = gameStats.totalRounds > 0 ? 
        Math.round((gameStats.correctGuesses / gameStats.totalRounds) * 100) : 0;
    if (elements.accuracy) elements.accuracy.textContent = accuracy + '%';
}

function showWelcomeMessage() {
    if (elements.gameOverlay) elements.gameOverlay.classList.remove('hidden');
    if (elements.overlayTitle) elements.overlayTitle.textContent = '🔢 숫자맞추기 게임';
    if (elements.overlayMessage) elements.overlayMessage.textContent = '1부터 100 사이의 숫자를 맞춰보세요!';
    if (elements.gameInfo) elements.gameInfo.textContent = '7번의 기회 안에 숫자를 맞춰야 합니다! 스페이스바나 시작 버튼을 눌러 시작하세요!';
}

function goHome() {
    if (confirm('게임을 종료하고 메인 페이지로 돌아가시겠습니까?')) {
        clearInterval(timer);
        window.location.href = 'index.html';
    }
}

// 초기화
function init() {
    setupEventListeners();
    updateUI();
    showWelcomeMessage();
}

// HTML 버튼에서 호출되는 전역 함수들
window.startGame = startGame;
window.pauseGame = pauseGame;
window.resetGame = resetGame;
window.makeGuess = makeGuess;
window.showHelp = showHelp;
window.showStats = showStats;
window.closeHelp = closeHelp;
window.closeStats = closeStats;
window.resetStats = resetStats;
window.goHome = goHome;
window.closeModal = closeModal;
window.incrementValue = incrementValue;
window.decrementValue = decrementValue;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    init();
});

// 페이지 종료 시 타이머 정리
window.addEventListener('beforeunload', () => {
    if (timer) {
        clearInterval(timer);
    }
});
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