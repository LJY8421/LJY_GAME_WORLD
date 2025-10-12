// 게임 상태 변수들
let playerScore = 0;
let computerScore = 0;
let totalRounds = 0;
let playerWins = 0;
let currentWinStreak = 0;
let maxWinStreak = 0;
let isGameActive = true;
let gameStartTime = 0;

// 선택지 매핑
const choices = {
    rock: { emoji: '✊', name: '바위' },
    scissors: { emoji: '✌️', name: '가위' },
    paper: { emoji: '🖐️', name: '보' }
};

// 전체 통계 데이터
let allTimeStats = {
    totalGames: parseInt(localStorage.getItem('rpsTotalGames')) || 0,
    completedGames: parseInt(localStorage.getItem('rpsCompletedGames')) || 0,
    totalRounds: parseInt(localStorage.getItem('rpsTotalRounds')) || 0,
    totalWins: parseInt(localStorage.getItem('rpsTotalWins')) || 0,
    totalDraws: parseInt(localStorage.getItem('rpsTotalDraws')) || 0,
    maxStreakRecord: parseInt(localStorage.getItem('rpsMaxStreak')) || 0,
    choiceStats: {
        rock: parseInt(localStorage.getItem('rpsRockCount')) || 0,
        scissors: parseInt(localStorage.getItem('rpsScissorsCount')) || 0,
        paper: parseInt(localStorage.getItem('rpsPaperCount')) || 0
    }
};

// DOM 요소들
const elements = {
    playerScore: document.getElementById('playerScore'),
    computerScore: document.getElementById('computerScore'),
    playerChoice: document.getElementById('playerChoice'),
    computerChoice: document.getElementById('computerChoice'),
    result: document.getElementById('result'),
    roundInfo: document.getElementById('roundInfo'),
    totalRounds: document.getElementById('totalRounds'),
    winRate: document.getElementById('winRate'),
    winStreak: document.getElementById('winStreak'),
    playerSection: document.getElementById('playerSection'),
    computerSection: document.getElementById('computerSection'),
    gameOverModal: document.getElementById('gameOverModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalMessage: document.getElementById('modalMessage'),
    helpModal: document.getElementById('helpModal'),
    statsModal: document.getElementById('statsModal')
};

// 일시정지 상태 변수 추가
let isPaused = false;

// 일시정지 함수
function pauseGame() {
    if (!isGameActive) return; // 게임이 끝났으면 일시정지 불가
    
    isPaused = !isPaused;
    
    if (isPaused) {
        elements.result.textContent = '⏸️ 게임 일시정지 - 스페이스바로 재개';
        elements.result.className = 'result';
    } else {
        elements.result.textContent = '선택해 주세요!';
        elements.result.className = 'result';
    }
}

// 게임 플레이 메인 함수
function playGame(playerChoice) {
    if (!isGameActive || isPaused) return; // 일시정지 상태에서는 게임 진행 불가

    // 이미 진행 중인 라운드가 있는지 체크 (연속 클릭 방지)
    if (elements.result.textContent.includes('승리!') || 
        elements.result.textContent.includes('패배!') || 
        elements.result.textContent.includes('무승부!')) {
        return;
    }

    // 게임 시작 시간 기록
    if (totalRounds === 0) {
        gameStartTime = Date.now();
        allTimeStats.totalGames++;
        localStorage.setItem('rpsTotalGames', allTimeStats.totalGames);
    }

    // 선택 통계 업데이트
    allTimeStats.choiceStats[playerChoice]++;
    localStorage.setItem(`rps${playerChoice.charAt(0).toUpperCase() + playerChoice.slice(1)}Count`, allTimeStats.choiceStats[playerChoice]);

    const choiceKeys = Object.keys(choices);
    const computerChoice = choiceKeys[Math.floor(Math.random() * choiceKeys.length)];

    // 선택 애니메이션
    animateChoice(playerChoice, computerChoice);

    // 잠깐 대기 후 결과 표시
    setTimeout(() => {
        showResult(playerChoice, computerChoice);
    }, 500);
}

// 선택 애니메이션
function animateChoice(playerChoice, computerChoice) {
    // 선택 표시
    elements.playerChoice.textContent = choices[playerChoice].emoji;
    elements.computerChoice.textContent = choices[computerChoice].emoji;

    // 섹션 초기화
    elements.playerSection.classList.remove('winner', 'loser');
    elements.computerSection.classList.remove('winner', 'loser');
    elements.result.classList.remove('win', 'lose', 'draw');
}

// 결과 표시 및 처리
function showResult(playerChoice, computerChoice) {
    totalRounds++;
    allTimeStats.totalRounds++;
    localStorage.setItem('rpsTotalRounds', allTimeStats.totalRounds);
    
    let resultText, resultClass;

    // 승부 판정
    if (playerChoice === computerChoice) {
        resultText = `무승부! 둘 다 ${choices[playerChoice].name}를 선택했습니다! 🤝`;
        resultClass = 'draw';
        currentWinStreak = 0;
        allTimeStats.totalDraws++;
        localStorage.setItem('rpsTotalDraws', allTimeStats.totalDraws);
    } else if (isPlayerWin(playerChoice, computerChoice)) {
        playerScore++;
        playerWins++;
        allTimeStats.totalWins++;
        currentWinStreak++;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
        
        // 최고 연승 기록 업데이트
        if (currentWinStreak > allTimeStats.maxStreakRecord) {
            allTimeStats.maxStreakRecord = currentWinStreak;
            localStorage.setItem('rpsMaxStreak', allTimeStats.maxStreakRecord);
        }
        
        localStorage.setItem('rpsTotalWins', allTimeStats.totalWins);
        
        resultText = `승리! ${choices[playerChoice].name}가 ${choices[computerChoice].name}를 이깁니다! 🎉`;
        resultClass = 'win';
        
        elements.playerSection.classList.add('winner');
        elements.computerSection.classList.add('loser');
    } else {
        computerScore++;
        currentWinStreak = 0;
        
        resultText = `패배! ${choices[computerChoice].name}가 ${choices[playerChoice].name}를 이깁니다! 😢`;
        resultClass = 'lose';
        
        elements.playerSection.classList.add('loser');
        elements.computerSection.classList.add('winner');
    }

    // UI 업데이트
    updateUI(resultText, resultClass);

    // 게임 종료 체크 (5점 먼저 승리) - 즉시 게임 비활성화
    if (playerScore >= 5 || computerScore >= 5) {
        isGameActive = false; // 즉시 게임 비활성화
        setTimeout(() => {
            endGame();
        }, 2000);
    } else {
        // 다음 라운드를 위해 1.5초 후 결과 텍스트 초기화
        setTimeout(() => {
            if (isGameActive) { // 게임이 여전히 활성 상태일 때만
                elements.result.textContent = '선택해 주세요!';
                elements.result.className = 'result';
            }
        }, 1500);
    }
}

// 플레이어 승리 판정
function isPlayerWin(playerChoice, computerChoice) {
    return (
        (playerChoice === 'rock' && computerChoice === 'scissors') ||
        (playerChoice === 'paper' && computerChoice === 'rock') ||
        (playerChoice === 'scissors' && computerChoice === 'paper')
    );
}

// UI 업데이트
function updateUI(resultText, resultClass) {
    elements.playerScore.textContent = playerScore;
    elements.computerScore.textContent = computerScore;
    elements.result.textContent = resultText;
    elements.result.className = `result ${resultClass}`;
    elements.roundInfo.textContent = `라운드 ${totalRounds} | 먼저 5승하는 자가 승리!`;
    elements.totalRounds.textContent = totalRounds;
    elements.winRate.textContent = totalRounds > 0 ? Math.round((playerWins / totalRounds) * 100) + '%' : '0%';
    elements.winStreak.textContent = currentWinStreak;
}

// 게임 종료 처리
function endGame() {
    isGameActive = false;
    
    // 완료된 게임 수 증가
    allTimeStats.completedGames++;
    localStorage.setItem('rpsCompletedGames', allTimeStats.completedGames);
    
    if (playerScore >= 5) {
        elements.modalTitle.textContent = '🎉 우주 최강 승리! 🏆';
        elements.modalTitle.style.color = '#00ff00';
        elements.modalMessage.textContent = `축하합니다! ${playerScore}:${computerScore}로 승리하셨습니다!`;
    } else {
        elements.modalTitle.textContent = '😢 패배... 🤖';
        elements.modalTitle.style.color = '#ff0000';
        elements.modalMessage.textContent = `아쉽게도 ${computerScore}:${playerScore}로 패배했습니다. 다시 도전해보세요!`;
    }
    
    elements.gameOverModal.style.display = 'flex';
}

// 모달 닫기 및 게임 리셋
function closeModal() {
    elements.gameOverModal.style.display = 'none';
    resetGame();
}

// 게임 리셋
function resetGame() {
    playerScore = 0;
    computerScore = 0;
    totalRounds = 0;
    playerWins = 0;
    currentWinStreak = 0;
    isGameActive = true;
    gameStartTime = 0;

    elements.playerScore.textContent = '0';
    elements.computerScore.textContent = '0';
    elements.playerChoice.textContent = '❓';
    elements.computerChoice.textContent = '❓';
    elements.result.textContent = '선택해 주세요!';
    elements.result.className = 'result';
    elements.roundInfo.textContent = '라운드 1 | 먼저 5승하는 자가 승리!';
    elements.totalRounds.textContent = '0';
    elements.winRate.textContent = '0%';
    elements.winStreak.textContent = '0';

    // 섹션 초기화
    elements.playerSection.classList.remove('winner', 'loser');
    elements.computerSection.classList.remove('winner', 'loser');
}

// 도움말 창 열기
function showHelp() {
    if (elements.helpModal) {
        elements.helpModal.style.display = 'flex';
    }
}

// 도움말 창 닫기
function closeHelp() {
    if (elements.helpModal) {
        elements.helpModal.style.display = 'none';
    }
}

// 통계 창 열기
function showStats() {
    if (elements.statsModal) {
        updateStatsModal();
        elements.statsModal.style.display = 'flex';
    }
}

// 통계 창 닫기
function closeStats() {
    if (elements.statsModal) {
        elements.statsModal.style.display = 'none';
    }
}

// 통계 모달 데이터 업데이트
function updateStatsModal() {
    // 개인 기록
    const modalMaxStreak = document.getElementById('modalMaxStreak');
    const modalTotalWins = document.getElementById('modalTotalWins');
    const modalOverallWinRate = document.getElementById('modalOverallWinRate');
    
    if (modalMaxStreak) modalMaxStreak.textContent = allTimeStats.maxStreakRecord;
    if (modalTotalWins) modalTotalWins.textContent = allTimeStats.totalWins;
    
    // 전체 승률 계산
    const overallWinRate = allTimeStats.totalRounds > 0 ? 
        Math.round((allTimeStats.totalWins / allTimeStats.totalRounds) * 100) : 0;
    if (modalOverallWinRate) modalOverallWinRate.textContent = overallWinRate + '%';
    
    // 전체 통계
    const modalTotalGames = document.getElementById('modalTotalGames');
    const modalCompletedGames = document.getElementById('modalCompletedGames');
    const modalTotalRounds = document.getElementById('modalTotalRounds');
    const modalTotalDraws = document.getElementById('modalTotalDraws');
    
    if (modalTotalGames) modalTotalGames.textContent = allTimeStats.totalGames;
    if (modalCompletedGames) modalCompletedGames.textContent = allTimeStats.completedGames;
    if (modalTotalRounds) modalTotalRounds.textContent = allTimeStats.totalRounds;
    if (modalTotalDraws) modalTotalDraws.textContent = allTimeStats.totalDraws;
    
    // 선택 분석
    updateChoiceStats();
}

// 선택 분석 업데이트
function updateChoiceStats() {
    const totalChoices = allTimeStats.choiceStats.rock + allTimeStats.choiceStats.scissors + allTimeStats.choiceStats.paper;
    
    const rockCount = document.getElementById('rockCount');
    const scissorsCount = document.getElementById('scissorsCount');
    const paperCount = document.getElementById('paperCount');
    const rockRate = document.getElementById('rockRate');
    const scissorsRate = document.getElementById('scissorsRate');
    const paperRate = document.getElementById('paperRate');
    
    if (rockCount) rockCount.textContent = allTimeStats.choiceStats.rock + '회';
    if (scissorsCount) scissorsCount.textContent = allTimeStats.choiceStats.scissors + '회';
    if (paperCount) paperCount.textContent = allTimeStats.choiceStats.paper + '회';
    
    if (totalChoices > 0) {
        if (rockRate) rockRate.textContent = Math.round((allTimeStats.choiceStats.rock / totalChoices) * 100) + '%';
        if (scissorsRate) scissorsRate.textContent = Math.round((allTimeStats.choiceStats.scissors / totalChoices) * 100) + '%';
        if (paperRate) paperRate.textContent = Math.round((allTimeStats.choiceStats.paper / totalChoices) * 100) + '%';
    } else {
        if (rockRate) rockRate.textContent = '0%';
        if (scissorsRate) scissorsRate.textContent = '0%';
        if (paperRate) paperRate.textContent = '0%';
    }
}

// 모든 기록 삭제
function resetStats() {
    if (confirm('정말로 모든 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        // localStorage에서 모든 기록 삭제
        localStorage.removeItem('rpsTotalGames');
        localStorage.removeItem('rpsCompletedGames');
        localStorage.removeItem('rpsTotalRounds');
        localStorage.removeItem('rpsTotalWins');
        localStorage.removeItem('rpsTotalDraws');
        localStorage.removeItem('rpsMaxStreak');
        localStorage.removeItem('rpsRockCount');
        localStorage.removeItem('rpsScissorsCount');
        localStorage.removeItem('rpsPaperCount');
        
        // 메모리의 통계 데이터 초기화
        allTimeStats.totalGames = 0;
        allTimeStats.completedGames = 0;
        allTimeStats.totalRounds = 0;
        allTimeStats.totalWins = 0;
        allTimeStats.totalDraws = 0;
        allTimeStats.maxStreakRecord = 0;
        allTimeStats.choiceStats.rock = 0;
        allTimeStats.choiceStats.scissors = 0;
        allTimeStats.choiceStats.paper = 0;
        
        maxWinStreak = 0;
        
        // UI 업데이트
        updateStatsModal();
        
        alert('모든 기록이 삭제되었습니다!');
    }
}

// 모달 외부 클릭 시 닫기
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

// 메인 페이지로 이동
function goHome() {
    if (confirm('게임을 종료하고 메인 페이지로 돌아가시겠습니까?')) {
        window.location.href = 'index.html';
    }
}

// 키보드 이벤트 리스너
document.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case 'r':
        case '1':
            if (isGameActive) playGame('rock');
            break;
        case 'p':
        case '2':
            if (isGameActive) playGame('paper');
            break;
        case 's':
        case '3':
            if (isGameActive) playGame('scissors');
            break;
        case ' ': // 스페이스바로 일시정지
            e.preventDefault();
            pauseGame();
            break;
        case 'h':
            showHelp();
            break;
        case 'escape':
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
        case 'f5':
            if (e.ctrlKey) {
                e.preventDefault();
                resetGame();
            }
            break;
    }
});

// 터치 이벤트 지원 (모바일)
let touchStartY = 0;
let touchEndY = 0;

document.addEventListener('touchstart', e => {
    touchStartY = e.changedTouches[0].screenY;
});

document.addEventListener('touchend', e => {
    touchEndY = e.changedTouches[0].screenY;
    handleGesture();
});

function handleGesture() {
    if (touchEndY < touchStartY - 50) {
        // 위로 스와이프 - 랜덤 선택
        if (isGameActive) {
            const choices = ['rock', 'paper', 'scissors'];
            const randomChoice = choices[Math.floor(Math.random() * choices.length)];
            playGame(randomChoice);
        }
    }
}

// 게임 팁 표시
function showTips() {
    const tips = [
        "💡 키보드 단축키: R(바위), P(보), S(가위)",
        "💡 모바일은 위로 스와이프하면 랜덤 선택!",
        "💡 H키를 누르면 도움말을 볼 수 있어요",
        "💡 스페이스는 일시정지/재개가 가능해요",
        "💡 통계에서 당신의 패턴을 분석해보세요",
        "💡 키보드 단축키: 1(바위), 2(보), 3(가위)"
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    
    // 팁을 result 영역에 잠시 표시
    const originalText = elements.result.textContent;
    const originalClass = elements.result.className;
    
    elements.result.textContent = randomTip;
    elements.result.className = 'result';
    
    setTimeout(() => {
        elements.result.textContent = originalText;
        elements.result.className = originalClass;
    }, 3000);
}

// 초기화 시 환영 메시지
function showWelcomeMessage() {
    elements.result.textContent = '🧑🏻 AI와의 가위바위보에서 이겨보세요! 🤖';
    
    setTimeout(() => {
        elements.result.textContent = '선택해 주세요!';
    }, 2000);
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
    showWelcomeMessage();
    setupModalClickEvents();
    
    // 5초마다 팁 표시 (게임이 진행되지 않을 때)
    setInterval(() => {
        if (elements.result.textContent === '선택해 주세요!' && isGameActive) {
            showTips();
        }
    }, 10000);
});

// 사운드 효과 시뮬레이션 (실제 사운드는 없지만 시각적 피드백)
function playSound(type) {
    const body = document.body;
    
    switch(type) {
        case 'win':
            body.style.filter = 'hue-rotate(120deg)';
            setTimeout(() => body.style.filter = '', 200);
            break;
        case 'lose':
            body.style.filter = 'hue-rotate(-120deg)';
            setTimeout(() => body.style.filter = '', 200);
            break;
        case 'draw':
            body.style.filter = 'brightness(1.2)';
            setTimeout(() => body.style.filter = '', 200);
            break;
    }
}

// 고급 통계 추가
let gameHistory = [];

function addToHistory(playerChoice, computerChoice, result) {
    gameHistory.push({
        round: totalRounds,
        playerChoice,
        computerChoice,
        result,
        timestamp: new Date()
    });
    
    // 최근 10게임만 유지
    if (gameHistory.length > 10) {
        gameHistory.shift();
    }
}

// 컴퓨터 AI 패턴 (간단한 적응형 AI)
let playerChoiceHistory = [];

function getSmartComputerChoice() {
    if (playerChoiceHistory.length < 3) {
        // 초기에는 랜덤 선택
        const choices = ['rock', 'paper', 'scissors'];
        return choices[Math.floor(Math.random() * choices.length)];
    }
    
    // 플레이어의 최근 패턴 분석
    const recentChoices = playerChoiceHistory.slice(-3);
    const choiceCount = {
        rock: 0,
        paper: 0,
        scissors: 0
    };
    
    recentChoices.forEach(choice => {
        choiceCount[choice]++;
    });
    
    // 가장 많이 선택한 것에 대응
    let mostFrequent = 'rock';
    let maxCount = 0;
    
    for (let choice in choiceCount) {
        if (choiceCount[choice] > maxCount) {
            maxCount = choiceCount[choice];
            mostFrequent = choice;
        }
    }
    
    // 플레이어의 선호를 이기는 선택 (70% 확률)
    if (Math.random() < 0.7) {
        switch(mostFrequent) {
            case 'rock': return 'paper';
            case 'paper': return 'scissors';
            case 'scissors': return 'rock';
        }
    }
    
    // 30% 확률로 랜덤
    const choices = ['rock', 'paper', 'scissors'];
    return choices[Math.floor(Math.random() * choices.length)];
}

// 페이지 종료 시 정리
window.addEventListener('beforeunload', () => {
    // 게임이 진행 중이었다면 통계에 반영하지 않음
    if (totalRounds > 0 && (playerScore < 5 && computerScore < 5)) {
        // 미완료 게임은 통계에서 제외
        if (allTimeStats.totalGames > 0) {
            allTimeStats.totalGames--;
            localStorage.setItem('rpsTotalGames', allTimeStats.totalGames);
        }
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