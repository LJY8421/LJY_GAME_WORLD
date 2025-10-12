// 게임 상태 변수들
let gameState = 'ready'; // 'ready', 'waiting', 'active', 'finished', 'gameover', 'paused'
let startTime = 0;
let reactionTimeout = null;
let gameStats = {
    bestTime: null,
    attempts: 0,
    totalAttempts: getStoredValue('reactionTotalAttempts', 0),
    successAttempts: getStoredValue('reactionSuccessAttempts', 0),
    falseStarts: getStoredValue('reactionFalseStarts', 0),
    times: JSON.parse(getStoredValue('reactionTimes', '[]')),
    avgTime: null
};

// DOM 요소들
let elements = {};

// localStorage 대체 함수들
function getStoredValue(key, defaultValue) {
    try {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem(key);
            if (key === 'reactionTimes') {
                return stored || '[]';
            }
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
            if (typeof value === 'object') {
                localStorage.setItem(key, JSON.stringify(value));
            } else {
                localStorage.setItem(key, value.toString());
            }
        }
    } catch (e) {
        console.warn('localStorage not available:', e);
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소들 초기화
    elements = {
        bestTime: document.getElementById('bestTime'),
        avgTime: document.getElementById('avgTime'),
        attempts: document.getElementById('attempts'),
        gameInfo: document.getElementById('gameInfo'),
        reactionZone: document.getElementById('reactionZone'),
        reactionTitle: document.getElementById('reactionTitle'),
        reactionMessage: document.getElementById('reactionMessage'),
        reactionTime: document.getElementById('reactionTime'),
        resultModal: document.getElementById('resultModal'),
        resultTitle: document.getElementById('resultTitle'),
        resultTimeValue: document.getElementById('resultTimeValue'),
        resultMessage: document.getElementById('resultMessage'),
        resultRating: document.getElementById('resultRating'),
        gameOverModal: document.getElementById('gameOverModal'),
        gameOverMessage: document.getElementById('gameOverMessage'),
        gameOverAttempt: document.getElementById('gameOverAttempt'),
        gameOverFails: document.getElementById('gameOverFails'),
        statsModal: document.getElementById('statsModal'),
        totalAttempts: document.getElementById('totalAttempts'),
        successRate: document.getElementById('successRate'),
        recent5Avg: document.getElementById('recent5Avg'),
        detailTotalAttempts: document.getElementById('detailTotalAttempts'),
        detailSuccessAttempts: document.getElementById('detailSuccessAttempts'),
        detailFalseStarts: document.getElementById('detailFalseStarts'),
        detailBestTime: document.getElementById('detailBestTime'),
        detailAvgTime: document.getElementById('detailAvgTime'),
        helpModal: document.getElementById('helpModal'),
        detailedStatsModal: document.getElementById('detailedStatsModal'),
        startBtn: document.getElementById('startBtn'),
        pauseBtn: document.getElementById('pauseBtn')
    };

    init();
});

// 초기화
function init() {
    calculateStats();
    updateUI();
    updateButtons();
    setupEventListeners();
    
    // 환영 메시지 순환
    cycleWelcomeMessages();
}

function cycleWelcomeMessages() {
    if (gameState !== 'ready') return;
    
    const messages = [
        '게임 시작 버튼을 눌러 시작하세요!',
        'H키로 도움말, S키로 통계를 볼 수 있어요!',
        'R키로 리셋, ESC키로 메인으로 갈 수 있습니다.',
        '집중하고 초록색으로 바뀔 때까지 기다리세요!'
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
    }, 4000);
}

// 통계 계산
function calculateStats() {
    if (gameStats.times.length > 0) {
        gameStats.bestTime = Math.min(...gameStats.times);
        gameStats.avgTime = Math.round(gameStats.times.reduce((a, b) => a + b, 0) / gameStats.times.length);
    }
}

// 게임 시작 버튼 함수
function startNewGame() {
    if (gameState === 'ready') {
        startReactionTest();
    }
}

// 일시정지 함수
function pauseGame() {
    if (gameState === 'waiting' || gameState === 'active') {
        gameState = 'paused';
        
        if (reactionTimeout) {
            clearTimeout(reactionTimeout);
            reactionTimeout = null;
        }
        
        elements.reactionZone.className = 'reaction-zone paused';
        elements.reactionTitle.textContent = '⏸️ 일시정지';
        elements.reactionMessage.textContent = '계속하기 버튼을 눌러 재개하세요';
        elements.gameInfo.textContent = '게임이 일시정지되었습니다.';
        
        updateButtons();
    } else if (gameState === 'paused') {
        resumeGame();
    }
}

// 게임 재개
function resumeGame() {
    if (gameState === 'paused') {
        gameState = 'waiting';
        
        elements.reactionZone.className = 'reaction-zone waiting';
        elements.reactionTitle.textContent = '⏳ 기다리세요...';
        elements.reactionMessage.textContent = '화면이 초록색으로 바뀌면 클릭하세요!';
        elements.gameInfo.textContent = '잠깐... 초록색으로 바뀔 때까지 기다리세요!';
        
        // 새로운 랜덤 대기 시간 설정
        const waitTime = Math.random() * 5500 + 500;
        reactionTimeout = setTimeout(() => {
            if (gameState === 'waiting') {
                gameState = 'active';
                startTime = performance.now();
                elements.reactionZone.className = 'reaction-zone ready';
                elements.reactionTitle.textContent = '🚀 지금!';
                elements.reactionMessage.textContent = '빨리 클릭하세요!';
                elements.gameInfo.textContent = '지금! 빨리 클릭하세요!';
            }
        }, waitTime);
        
        updateButtons();
    }
}

// 버튼 상태 업데이트
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
        if (gameState === 'ready' || gameState === 'finished' || gameState === 'gameover') {
            elements.pauseBtn.textContent = '⏸️ 일시정지';
            elements.pauseBtn.disabled = true;
        } else if (gameState === 'waiting' || gameState === 'active') {
            elements.pauseBtn.textContent = '⏸️ 일시정지';
            elements.pauseBtn.disabled = false;
        } else if (gameState === 'paused') {
            elements.pauseBtn.textContent = '▶️ 계속하기';
            elements.pauseBtn.disabled = false;
        }
    }
}

// 게임 시작
function startReactionTest() {
    if (gameState !== 'ready') return;
    
    gameState = 'waiting';
    elements.reactionZone.className = 'reaction-zone waiting';
    elements.reactionTitle.textContent = '⏳ 기다리세요...';
    elements.reactionMessage.textContent = '화면이 초록색으로 바뀌면 클릭하세요!';
    elements.reactionTime.textContent = '';
    elements.gameInfo.textContent = '잠깐... 초록색으로 바뀔 때까지 기다리세요!';
    
    updateButtons();
    
    // 0.5초~6초 사이 더 넓은 랜덤 대기 (더 예측하기 어렵게)
    const waitTime = Math.random() * 5500 + 500;  // 500ms ~ 6000ms
    reactionTimeout = setTimeout(() => {
        if (gameState === 'waiting') {
            gameState = 'active';
            startTime = performance.now();
            elements.reactionZone.className = 'reaction-zone ready';
            elements.reactionTitle.textContent = '🚀 지금!';
            elements.reactionMessage.textContent = '빨리 클릭하세요!';
            elements.gameInfo.textContent = '지금! 빨리 클릭하세요!';
        }
    }, waitTime);
}

// 반응 처리
function handleReaction() {
    if (gameState === 'waiting') {
        // 게임오버 - 너무 빨리 클릭함
        clearTimeout(reactionTimeout);
        gameState = 'gameover';
        gameStats.totalAttempts++;
        gameStats.falseStarts++;
        
        elements.reactionZone.className = 'reaction-zone too-early';
        elements.reactionTitle.textContent = '💀 게임 오버!';
        elements.reactionMessage.textContent = '너무 성급했어요!';
        elements.gameInfo.textContent = '게임 오버! 초록색으로 바뀔 때까지 기다려야 해요!';
        
        storeValue('reactionTotalAttempts', gameStats.totalAttempts);
        storeValue('reactionFalseStarts', gameStats.falseStarts);
        
        updateButtons();
        
        // 게임오버 모달 표시
        setTimeout(() => {
            showGameOver();
        }, 1500);
        
        updateUI();
        
    } else if (gameState === 'active') {
        // 정상적인 반응
        const reactionTime = Math.round(performance.now() - startTime);
        gameState = 'finished';
        
        gameStats.totalAttempts++;
        gameStats.successAttempts++;
        gameStats.attempts++;
        gameStats.times.push(reactionTime);
        
        // 최근 10개만 유지
        if (gameStats.times.length > 10) {
            gameStats.times.shift();
        }
        
        calculateStats();
        
        // 결과 저장
        storeValue('reactionTotalAttempts', gameStats.totalAttempts);
        storeValue('reactionSuccessAttempts', gameStats.successAttempts);
        storeValue('reactionTimes', gameStats.times);
        
        updateButtons();
        showResult(reactionTime);
        updateUI();
        
    } else if (gameState === 'ready') {
        // 게임 시작
        startReactionTest();
    }
}

// 게임오버 모달 표시
function showGameOver() {
    const gameOverMessages = [
        '너무 성급했어요!',
        '인내심이 부족해요!',
        '조급함은 금물!',
        '기다림이 필요해요!',
        '참을성을 길러보세요!',
        '천천히 하세요!',
        '초록색을 기다려야 해요!'
    ];
    
    const randomMessage = gameOverMessages[Math.floor(Math.random() * gameOverMessages.length)];
    elements.gameOverMessage.textContent = randomMessage;
    elements.gameOverAttempt.textContent = gameStats.attempts + 1;
    elements.gameOverFails.textContent = gameStats.falseStarts;
    
    elements.gameOverModal.style.display = 'flex';
}

// 게임 재시도
function retryGame() {
    elements.gameOverModal.style.display = 'none';
    resetToReady();
    
    // 약간의 딜레이 후 자동으로 게임 시작
    setTimeout(() => {
        elements.gameInfo.textContent = '다시 도전해보세요!';
        setTimeout(() => {
            if (gameState === 'ready') {
                elements.gameInfo.textContent = '게임 시작 버튼을 눌러 시작하세요!';
            }
        }, 2000);
    }, 100);
}

// 결과 표시
function showResult(time) {
    elements.resultTimeValue.textContent = `${time}ms`;
    
    let rating, message, stars;
    
    if (time < 150) {
        rating = '완벽!';
        message = '인간의 한계를 뛰어넘는 반응속도입니다!';
        stars = '🌟🌟🌟🌟🌟🌟';
    } else if (time < 200) {
        rating = '훌륭함';
        message = '번개같은 반응속도입니다!';
        stars = '⭐⭐⭐⭐⭐';
    } else if (time < 250) {
        rating = '우수함';
        message = '매우 빠른 반응속도네요!';
        stars = '⭐⭐⭐⭐';
    } else if (time < 300) {
        rating = '보통';
        message = '괜찮은 반응속도입니다!';
        stars = '⭐⭐⭐';
    } else if (time < 400) {
        rating = '느림';
        message = '조금 더 집중해보세요!';
        stars = '⭐⭐';
    } else {
        rating = '매우 느림';
        message = '더 연습이 필요해요!';
        stars = '⭐';
    }
    
    elements.resultRating.innerHTML = `
        <div class="rating-stars">${stars}</div>
        <div class="rating-text">${rating}</div>
    `;
    elements.resultMessage.textContent = message;
    elements.resultModal.style.display = 'flex';
}

// 다음 라운드
function nextRound() {
    elements.resultModal.style.display = 'none';
    resetToReady();
}

// 준비 상태로 리셋
function resetToReady() {
    gameState = 'ready';
    elements.reactionZone.className = 'reaction-zone';
    elements.reactionTitle.textContent = '🎮 준비하세요!';
    elements.reactionMessage.textContent = '게임 시작 버튼을 눌러 시작하세요';
    elements.reactionTime.textContent = '';
    elements.gameInfo.textContent = '게임 시작 버튼을 눌러 시작하세요!';
    updateButtons();
}

// 게임 리셋
function resetGame() {
    if (reactionTimeout) {
        clearTimeout(reactionTimeout);
    }
    
    // 모든 모달 닫기
    elements.resultModal.style.display = 'none';
    elements.gameOverModal.style.display = 'none';
    if (elements.statsModal) elements.statsModal.style.display = 'none';
    if (elements.helpModal) elements.helpModal.style.display = 'none';
    if (elements.detailedStatsModal) elements.detailedStatsModal.style.display = 'none';
    
    gameStats.attempts = 0;
    calculateStats();
    updateUI();
    resetToReady();
    
    elements.gameInfo.textContent = '게임이 리셋되었습니다!';
    setTimeout(() => {
        if (gameState === 'ready') {
            elements.gameInfo.textContent = '게임 시작 버튼을 눌러 시작하세요!';
        }
    }, 2000);
}

// 도움말 표시
function showHelp() {
    if (elements.helpModal) {
        elements.helpModal.style.display = 'flex';
        // 게임 중이라면 일시정지 효과
        if (reactionTimeout) {
            clearTimeout(reactionTimeout);
        }
        if (gameState === 'waiting' || gameState === 'active') {
            gameState = 'paused';
            updateButtons();
        }
    }
}

// 도움말 닫기
function closeHelp() {
    if (elements.helpModal) {
        elements.helpModal.style.display = 'none';
    }
    
    // 일시정지 상태였다면 원래 상태로 복구하지 않고 ready로 리셋
    if (gameState === 'paused') {
        resetToReady();
    }
}

// 통계 표시 (기본)
function showStats() {
    updateStatsModal();
    if (elements.detailedStatsModal) {
        elements.detailedStatsModal.style.display = 'flex';
    }
}

// 상세 통계 닫기
function closeDetailedStats() {
    if (elements.detailedStatsModal) {
        elements.detailedStatsModal.style.display = 'none';
    }
}

// 통계 모달 닫기 (구 버전 호환)
function closeStatsModal() {
    closeDetailedStats();
}

// 모든 통계 삭제
function clearAllStats() {
    if (confirm('정말로 모든 기록을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
        gameStats = {
            bestTime: null,
            attempts: 0,
            totalAttempts: 0,
            successAttempts: 0,
            falseStarts: 0,
            times: [],
            avgTime: null
        };
        
        // localStorage에서 삭제
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('reactionTotalAttempts');
                localStorage.removeItem('reactionSuccessAttempts');
                localStorage.removeItem('reactionFalseStarts');
                localStorage.removeItem('reactionTimes');
            }
        } catch (e) {
            console.warn('localStorage not available:', e);
        }
        
        updateUI();
        updateStatsModal();
        
        elements.gameInfo.textContent = '모든 기록이 삭제되었습니다.';
        setTimeout(() => {
            if (gameState === 'ready') {
                elements.gameInfo.textContent = '게임 시작 버튼을 눌러 시작하세요!';
            }
        }, 2000);
        
        alert('모든 기록이 삭제되었습니다.');
    }
}

// 통계 삭제 (구 버전 호환)
function clearStats() {
    clearAllStats();
}

// 등급별 통계 계산
function calculateGradeStats() {
    let perfect = 0, excellent = 0, good = 0, average = 0, slow = 0, verySlow = 0;
    
    gameStats.times.forEach(time => {
        if (time < 150) perfect++;
        else if (time < 200) excellent++;
        else if (time < 250) good++;
        else if (time < 300) average++;
        else if (time < 400) slow++;
        else verySlow++;
    });
    
    return { perfect, excellent, good, average, slow, verySlow };
}

// UI 업데이트
function updateUI() {
    if (elements.bestTime) {
        elements.bestTime.textContent = gameStats.bestTime ? `${gameStats.bestTime}ms` : '-';
    }
    if (elements.avgTime) {
        elements.avgTime.textContent = gameStats.avgTime ? `${gameStats.avgTime}ms` : '-';
    }
    if (elements.attempts) {
        elements.attempts.textContent = gameStats.attempts;
    }
    if (elements.totalAttempts) {
        elements.totalAttempts.textContent = gameStats.totalAttempts;
    }
    
    const successRate = gameStats.totalAttempts > 0 ? 
        Math.round((gameStats.successAttempts / gameStats.totalAttempts) * 100) : 0;
    if (elements.successRate) {
        elements.successRate.textContent = `${successRate}%`;
    }
    
    const recent5Times = gameStats.times.slice(-5);
    const recent5Avg = recent5Times.length > 0 ? 
        Math.round(recent5Times.reduce((a, b) => a + b, 0) / recent5Times.length) : null;
    if (elements.recent5Avg) {
        elements.recent5Avg.textContent = recent5Avg ? `${recent5Avg}ms` : '-';
    }
}

// 통계 모달 업데이트
function updateStatsModal() {
    // 기본 통계
    const detailElements = {
        detailTotalAttempts: document.getElementById('detailTotalAttempts'),
        detailSuccessAttempts: document.getElementById('detailSuccessAttempts'),
        detailFalseStarts: document.getElementById('detailFalseStarts'),
        detailSuccessRate: document.getElementById('detailSuccessRate'),
        detailBestTime: document.getElementById('detailBestTime'),
        detailAvgTime: document.getElementById('detailAvgTime'),
        detailRecent5Avg: document.getElementById('detailRecent5Avg'),
        detailRecent10Avg: document.getElementById('detailRecent10Avg')
    };
    
    if (detailElements.detailTotalAttempts) {
        detailElements.detailTotalAttempts.textContent = gameStats.totalAttempts.toLocaleString();
    }
    if (detailElements.detailSuccessAttempts) {
        detailElements.detailSuccessAttempts.textContent = gameStats.successAttempts.toLocaleString();
    }
    if (detailElements.detailFalseStarts) {
        detailElements.detailFalseStarts.textContent = gameStats.falseStarts.toLocaleString();
    }
    
    const successRate = gameStats.totalAttempts > 0 ? 
        Math.round((gameStats.successAttempts / gameStats.totalAttempts) * 100) : 0;
    if (detailElements.detailSuccessRate) {
        detailElements.detailSuccessRate.textContent = `${successRate}%`;
    }
    
    if (detailElements.detailBestTime) {
        detailElements.detailBestTime.textContent = gameStats.bestTime ? `${gameStats.bestTime}ms` : '-';
    }
    if (detailElements.detailAvgTime) {
        detailElements.detailAvgTime.textContent = gameStats.avgTime ? `${gameStats.avgTime}ms` : '-';
    }
    
    // 최근 평균들
    const recent5Times = gameStats.times.slice(-5);
    const recent5Avg = recent5Times.length > 0 ? 
        Math.round(recent5Times.reduce((a, b) => a + b, 0) / recent5Times.length) : null;
    if (detailElements.detailRecent5Avg) {
        detailElements.detailRecent5Avg.textContent = recent5Avg ? `${recent5Avg}ms` : '-';
    }
    
    const recent10Times = gameStats.times.slice(-10);
    const recent10Avg = recent10Times.length > 0 ? 
        Math.round(recent10Times.reduce((a, b) => a + b, 0) / recent10Times.length) : null;
    if (detailElements.detailRecent10Avg) {
        detailElements.detailRecent10Avg.textContent = recent10Avg ? `${recent10Avg}ms` : '-';
    }
    
    // 등급별 통계
    const gradeStats = calculateGradeStats();
    const gradeElements = {
        perfectCount: document.getElementById('perfectCount'),
        excellentCount: document.getElementById('excellentCount'),
        goodCount: document.getElementById('goodCount'),
        averageCount: document.getElementById('averageCount'),
        slowCount: document.getElementById('slowCount'),
        verySlowCount: document.getElementById('verySlowCount')
    };
    
    if (gradeElements.perfectCount) gradeElements.perfectCount.textContent = `${gradeStats.perfect}회`;
    if (gradeElements.excellentCount) gradeElements.excellentCount.textContent = `${gradeStats.excellent}회`;
    if (gradeElements.goodCount) gradeElements.goodCount.textContent = `${gradeStats.good}회`;
    if (gradeElements.averageCount) gradeElements.averageCount.textContent = `${gradeStats.average}회`;
    if (gradeElements.slowCount) gradeElements.slowCount.textContent = `${gradeStats.slow}회`;
    if (gradeElements.verySlowCount) gradeElements.verySlowCount.textContent = `${gradeStats.verySlow}회`;
}

// 메인으로 이동
function goHome() {
    if (confirm('게임을 종료하고 메인 페이지로 돌아가시겠습니까?')) {
        window.location.href = 'index.html';
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 반응 구역 클릭
    if (elements.reactionZone) {
        elements.reactionZone.addEventListener('click', handleReaction);
        elements.reactionZone.addEventListener('touchstart', handleReaction, { passive: true });
    }
    
    // 키보드 이벤트
    document.addEventListener('keydown', handleKeyDown);
    
    // 포커스 관리 - 다른 창으로 갔을 때 일시정지
    window.addEventListener('blur', () => {
        if (gameState === 'waiting' || gameState === 'active') {
            pauseGame();
            elements.gameInfo.textContent = '창이 비활성화되어 게임이 일시정지되었습니다.';
        }
    });
    
    // 페이지 숨김 시에도 게임 일시정지
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && (gameState === 'waiting' || gameState === 'active')) {
            pauseGame();
            elements.gameInfo.textContent = '페이지가 숨겨져서 게임이 일시정지되었습니다.';
        }
    });
    
    // 모달 외부 클릭 시 닫기
    if (elements.resultModal) {
        elements.resultModal.addEventListener('click', (e) => {
            if (e.target === elements.resultModal) {
                nextRound();
            }
        });
    }
    
    if (elements.gameOverModal) {
        elements.gameOverModal.addEventListener('click', (e) => {
            if (e.target === elements.gameOverModal) {
                retryGame();
            }
        });
    }
    
    if (elements.helpModal) {
        elements.helpModal.addEventListener('click', (e) => {
            if (e.target === elements.helpModal) {
                closeHelp();
            }
        });
    }
    
    if (elements.detailedStatsModal) {
        elements.detailedStatsModal.addEventListener('click', (e) => {
            if (e.target === elements.detailedStatsModal) {
                closeDetailedStats();
            }
        });
    }
}

// 키보드 처리
function handleKeyDown(e) {
    // 모달이 열려있을 때 처리
    if (elements.helpModal && elements.helpModal.style.display === 'flex') {
        if (e.key === 'Escape' || e.key === 'h' || e.key === 'H' || e.key === 'Enter') {
            e.preventDefault();
            closeHelp();
        }
        return;
    }
    
    if (elements.detailedStatsModal && elements.detailedStatsModal.style.display === 'flex') {
        if (e.key === 'Escape' || e.key === 's' || e.key === 'S' || e.key === 'Enter') {
            e.preventDefault();
            closeDetailedStats();
        }
        return;
    }
    
    if (elements.resultModal && elements.resultModal.style.display === 'flex') {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            nextRound();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            goHome();
        }
        return;
    }
    
    if (elements.gameOverModal && elements.gameOverModal.style.display === 'flex') {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            retryGame();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            goHome();
        }
        return;
    }
    
    // 일반 게임 키 처리
    switch(e.key) {
        case ' ': // 스페이스바
        case 'Enter':
            e.preventDefault();
            if (gameState === 'ready') {
                startReactionTest();
            } else if (gameState === 'active' || gameState === 'waiting') {
                handleReaction();
            }
            break;
            
        case 'p':
        case 'P':
            e.preventDefault();
            if (gameState === 'waiting' || gameState === 'active' || gameState === 'paused') {
                pauseGame();
            }
            break;
            
        case 'r':
        case 'R':
            e.preventDefault();
            if (confirm('게임을 리셋하시겠습니까?')) {
                resetGame();
            }
            break;
            
        case 'h':
        case 'H':
            e.preventDefault();
            showHelp();
            break;
            
        case 's':
        case 'S':
            e.preventDefault();
            showStats();
            break;
            
        case 'Escape':
            e.preventDefault();
            goHome();
            break;
    }
}

// 전역 함수들 등록
window.startNewGame = startNewGame;
window.pauseGame = pauseGame;
window.resetGame = resetGame;
window.showHelp = showHelp;
window.closeHelp = closeHelp;
window.showStats = showStats;
window.closeDetailedStats = closeDetailedStats;
window.closeStatsModal = closeStatsModal;
window.clearAllStats = clearAllStats;
window.clearStats = clearStats;
window.goHome = goHome;
window.nextRound = nextRound;
window.retryGame = retryGame;

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
    setTimeout(() => {
        updateUI();
    }, 100);
});

// 페이지 언로드 시 게임 상태 저장
window.addEventListener('beforeunload', function() {
    if (reactionTimeout) {
        clearTimeout(reactionTimeout);
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