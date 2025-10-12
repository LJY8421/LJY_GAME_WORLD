// 게임 상태 변수들
let gameState = 'ready'; // 'ready', 'playing', 'paused', 'gameOver'
let gameTimer = null;
let alienTimer = null;

// 게임 설정 - 난이도 곡선을 더 완만하게 조정
const GAME_CONFIG = {
    gameTime: 60,
    baseAlienShowTime: 2000,  // 기본 외계인이 보이는 시간 (ms) - 더 여유롭게
    baseAlienHideTime: 1000,  // 기본 외계인이 숨어있는 시간 (ms)
    minAlienShowTime: 1000,   // 최소 보이는 시간 (너무 빨라지지 않도록)
    minAlienHideTime: 500,    // 최소 숨는 시간
    specialAlienChance: 0.15,
    trapAlienChance: 0.1,
    highValueScore: 15,
    lowValueScore: 8,
    specialScore: 50,
    timePenalty: 5,
    comboBonusMultiplier: 2,
    missPenalty: 10,
    trapPenalty: 25,
    earthPenalty: 50,
    maxSimultaneousAliens: 1
};

// 게임 상태
let gameStats = {
    score: 0,
    timeLeft: GAME_CONFIG.gameTime,
    level: 1,
    highScore: parseInt(localStorage.getItem('alienShooterHighScore')) || 0,
    hits: 0,
    misses: 0,
    combo: 0,
    maxCombo: 0,
    aliensDestroyed: 0,
    lives: 3,              // 목숨 시스템
    missCount: 0           // 누적 실수 카운터 (3번마다 목숨 감소)
};

// 전체 통계 데이터
let allTimeStats = {
    totalGames: parseInt(localStorage.getItem('alienShooterTotalGames')) || 0,
    gamesCompleted: parseInt(localStorage.getItem('alienShooterGamesCompleted')) || 0,
    totalAliensDestroyed: parseInt(localStorage.getItem('alienShooterTotalAliens')) || 0,
    bestLevel: parseInt(localStorage.getItem('alienShooterBestLevel')) || 1
};

// 게임 요소들
let holes = [];
let activeAliens = new Set();

// DOM 요소들
const elements = {
    score: document.getElementById('score'),
    timeLeft: document.getElementById('timeLeft'),
    level: document.getElementById('level'),
    gameInfo: document.getElementById('gameInfo'),
    highScore: document.getElementById('highScore'),
    accuracy: document.getElementById('accuracy'),
    combo: document.getElementById('combo'),
    lives: document.getElementById('lives'),        // 목숨 표시 요소
    gameGrid: document.getElementById('gameGrid'),
    gameOverlay: document.getElementById('gameOverlay'),
    overlayTitle: document.getElementById('overlayTitle'),
    overlayMessage: document.getElementById('overlayMessage'),
    gameOverModal: document.getElementById('gameOverModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalMessage: document.getElementById('modalMessage'),
    finalScore: document.getElementById('finalScore'),
    finalLevel: document.getElementById('finalLevel'),
    finalAccuracy: document.getElementById('finalAccuracy'),
    helpModal: document.getElementById('helpModal'),    // 도움말 모달
    statsModal: document.getElementById('statsModal')   // 통계 모달
};

// 외계인 이모지 배열
const alienTypes = ['👽', '🛸', '👾', '🧟‍♂️', '🧟‍♀️'];
const specialAliens = ['👽'];
const trapAliens = ['🪐', '🌙', '⭐'];
const earthAliens = ['🌏', '🌎', '🌍', '🚀', '🛰'];

// 현재 게임 설정을 계산하는 함수 (레벨에 따라)
function getCurrentGameConfig() {
    const level = gameStats.level;
    
    // 더 완만한 난이도 증가 곡선
    const showTimeReduction = Math.min(800, (level - 1) * 50); // 레벨당 50ms씩만 감소
    const hideTimeReduction = Math.min(400, (level - 1) * 25); // 레벨당 25ms씩만 감소
    
    return {
        alienShowTime: Math.max(
            GAME_CONFIG.minAlienShowTime, 
            GAME_CONFIG.baseAlienShowTime - showTimeReduction
        ),
        alienHideTime: Math.max(
            GAME_CONFIG.minAlienHideTime,
            GAME_CONFIG.baseAlienHideTime - hideTimeReduction
        ),
        specialAlienChance: Math.min(0.25, GAME_CONFIG.specialAlienChance + (level - 1) * 0.01),
        trapAlienChance: Math.min(0.25, GAME_CONFIG.trapAlienChance + (level - 1) * 0.015)
    };
}

// 초기화
function init() {
    createGameGrid();
    setupEventListeners();
    updateUI();
    
    // 초기 메시지
    elements.gameInfo.textContent = '외계인을 클릭해서 잡아보세요! 지구와 우주선, 행성은 피하세요!';
}

function createGameGrid() {
    elements.gameGrid.innerHTML = '';
    holes = [];
    
    // 6x6 그리드 생성
    for (let i = 0; i < 36; i++) {
        const hole = document.createElement('div');
        hole.className = 'hole';
        hole.dataset.index = i;
        
        // 구멍 클릭 이벤트 (빈 공간 클릭) - 이벤트 캡처 단계에서 처리
        hole.addEventListener('click', (e) => {
            if (gameState === 'playing' && e.target === hole) {
                handleHoleClick(i);
            }
        });
        
        elements.gameGrid.appendChild(hole);
        holes.push(hole);
    }
}

function setupEventListeners() {
    // 키보드 이벤트
    document.addEventListener('keydown', handleKeyDown);
    
    // 모달 외부 클릭 시 닫기
    setupModalClickEvents();
    
    // 윈도우 포커스 이벤트
    window.addEventListener('focus', () => {
        if (gameState === 'paused') {
            elements.gameInfo.textContent = '게임이 일시정지되었습니다. 스페이스바를 눌러 계속하세요.';
        }
    });
    
    window.addEventListener('blur', () => {
        if (gameState === 'playing') {
            pauseGame();
        }
    });
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
            } else if (gameState === 'playing') {
                pauseGame();
            } else if (gameState === 'paused') {
                resumeGame();
            }
            break;
        case 'p':
        case 'P':
            e.preventDefault();
            if (gameState === 'playing') {
                pauseGame();
            } else if (gameState === 'paused') {
                resumeGame();
            }
            break;
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
    }
}

function handleHoleClick(holeIndex) {
    if (gameState !== 'playing') return;
    
    // 빈 구멍 클릭 시 점수 감점
    gameStats.misses++;
    gameStats.combo = 0;
    gameStats.missCount++;
    gameStats.score = Math.max(0, gameStats.score - GAME_CONFIG.missPenalty);
    
    // 미스 이펙트 표시
    showHitEffect(holes[holeIndex], -GAME_CONFIG.missPenalty, false, true);
    
    // 3번 실수마다 목숨 감소
    if (gameStats.missCount >= 3) {
        loseLife();
        gameStats.missCount = 0; // 카운터 리셋
        elements.gameInfo.textContent = `3번 놓쳐서 목숨을 잃었습니다! 남은 목숨: ${gameStats.lives}개 💔`;
    } else {
        const remaining = 3 - gameStats.missCount;
        elements.gameInfo.textContent = `빗나갔다! ${remaining}번 더 놓치면 목숨을 잃어요! (총 실수: ${gameStats.missCount}/3)`;
    }
    
    setTimeout(() => {
        if (gameState === 'playing') {
            elements.gameInfo.textContent = '외계인들이 나타났다! 빨리 잡아라!';
        }
    }, 2000);
    
    updateUI();
}

function startGame() {
    if (gameState !== 'ready') return;
    
    gameState = 'playing';
    gameStats.timeLeft = GAME_CONFIG.gameTime;
    gameStats.score = 0;
    gameStats.level = 1;
    gameStats.hits = 0;
    gameStats.misses = 0;
    gameStats.combo = 0;
    gameStats.aliensDestroyed = 0;
    gameStats.lives = 3;                // 목숨 초기화
    gameStats.missCount = 0;            // 누적 실수 카운터 초기화
    
    // 게임 카운트 증가
    allTimeStats.totalGames++;
    localStorage.setItem('alienShooterTotalGames', allTimeStats.totalGames);
    
    elements.gameOverlay.classList.add('hidden');
    elements.gameInfo.textContent = '외계인들이 나타났다! 빨리 잡아라! 지구와 우주선은 피하세요!';
    
    // 게임 타이머 시작
    gameTimer = setInterval(updateGameTime, 1000);
    
    // 외계인 스폰 시작
    startAlienSpawning();
    
    updateUI();
}

function pauseGame() {
    if (gameState !== 'playing') return;
    
    gameState = 'paused';
    clearInterval(gameTimer);
    clearTimeout(alienTimer);
    
    elements.gameOverlay.classList.remove('hidden');
    elements.overlayTitle.textContent = '⏸️ 게임 일시정지';
    elements.overlayMessage.textContent = '스페이스바나 P키를 눌러 계속하세요';
    elements.gameInfo.textContent = '게임이 일시정지되었습니다.';
    
    // 모든 외계인 숨기기
    hideAllAliens();
}

function resumeGame() {
    if (gameState !== 'paused') return;
    
    gameState = 'playing';
    elements.gameOverlay.classList.add('hidden');
    elements.gameInfo.textContent = '외계인들이 나타났다! 빨리 잡아라! 지구와 우주선은 피하세요!';
    
    // 타이머 재시작
    gameTimer = setInterval(updateGameTime, 1000);
    startAlienSpawning();
    
    updateUI();
}

function resetGame() {
    gameState = 'ready';
    
    clearInterval(gameTimer);
    clearTimeout(alienTimer);
    
    gameStats.score = 0;
    gameStats.timeLeft = GAME_CONFIG.gameTime;
    gameStats.level = 1;
    gameStats.hits = 0;
    gameStats.misses = 0;
    gameStats.combo = 0;
    gameStats.aliensDestroyed = 0;
    gameStats.lives = 3;                // 목숨 초기화
    gameStats.missCount = 0;            // 누적 실수 카운터 초기화
    
    hideAllAliens();
    
    elements.gameOverlay.classList.remove('hidden');
    elements.overlayTitle.textContent = '🎮 게임 준비!';
    elements.overlayMessage.textContent = '스페이스바나 시작 버튼을 눌러 게임을 시작하세요';
    elements.gameInfo.textContent = '외계인을 클릭해서 잡아보세요! 지구와 우주선은 피하세요!';
    
    updateUI();
}

function startAlienSpawning() {
    if (gameState !== 'playing') return;
    
    const config = getCurrentGameConfig();
    
    // 현재 레벨에 따라 동시에 나올 외계인 개수 결정 (더 점진적으로)
    const aliensToSpawn = Math.min(4, Math.floor(gameStats.level / 4) + 1); // 4레벨마다 1마리씩 증가
    
    // 여러 외계인 스폰
    for (let i = 0; i < aliensToSpawn; i++) {
        setTimeout(() => {
            if (gameState === 'playing') {
                spawnAlien();
            }
        }, i * 400); // 0.4초 간격으로 스폰 (조금 더 여유있게)
    }
    
    // 다음 외계인 스폰 스케줄링 - 현재 설정 사용
    const baseDelay = config.alienHideTime;
    const randomDelay = Math.random() * 800; // 랜덤 딜레이도 조금 더 길게
    const spawnDelay = baseDelay + randomDelay;
    
    alienTimer = setTimeout(startAlienSpawning, spawnDelay);
}

function spawnAlien() {
    if (gameState !== 'playing') return;
    
    // 비어있는 구멍들 찾기
    const emptyHoles = holes.filter((hole, index) => !activeAliens.has(index));
    
    if (emptyHoles.length === 0) return;
    
    // 랜덤 구멍 선택
    const randomHole = emptyHoles[Math.floor(Math.random() * emptyHoles.length)];
    const holeIndex = parseInt(randomHole.dataset.index);
    
    const config = getCurrentGameConfig();
    
    // 외계인 타입 결정
    const alienTypeRoll = Math.random();
    let alienEmoji, alienType, isSpecial = false, isTrap = false, isEarth = false, isHighValue = false;
    
    if (alienTypeRoll < config.trapAlienChance * 0.6) {
        // 지구/행성 함정 외계인 (더 큰 감점)
        alienEmoji = earthAliens[Math.floor(Math.random() * earthAliens.length)];
        alienType = 'earth';
        isEarth = true;
        isTrap = true;
    } else if (alienTypeRoll < config.trapAlienChance) {
        // 일반 함정 외계인
        alienEmoji = trapAliens[Math.floor(Math.random() * trapAliens.length)];
        alienType = 'trap';
        isTrap = true;
    } else if (alienTypeRoll < config.trapAlienChance + config.specialAlienChance) {
        // 특수 외계인 (보너스)
        alienEmoji = specialAliens[Math.floor(Math.random() * specialAliens.length)];
        alienType = 'special';
        isSpecial = true;
    } else {
        // 일반 외계인 - 높은 가치 vs 낮은 가치 결정
        alienEmoji = alienTypes[Math.floor(Math.random() * alienTypes.length)];
        // 👽, 🛸는 고가치, 나머지는 저가치
        isHighValue = (alienEmoji === '👽' || alienEmoji === '🛸');
        alienType = isHighValue ? 'highValue' : 'lowValue';
    }
    
    // 외계인 생성
    const alien = document.createElement('div');
    alien.className = isSpecial ? 'alien special' : 
                     isTrap ? 'alien trap' : 'alien';
    alien.textContent = alienEmoji;
    alien.dataset.special = isSpecial;
    alien.dataset.trap = isTrap;
    alien.dataset.earth = isEarth;
    alien.dataset.highValue = isHighValue;
    alien.dataset.hole = holeIndex;
    alien.dataset.type = alienType;
    
    // 함정 외계인 스타일
    if (isTrap) {
        alien.style.filter = isEarth ? 
            'drop-shadow(0 0 10px rgba(255, 100, 100, 0.8))' : 
            'drop-shadow(0 0 8px rgba(255, 150, 0, 0.6))';
    } else if (isHighValue) {
        // 높은 가치 외계인은 살짝 황금빛
        alien.style.filter = 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.4))';
    }
    
    // 외계인 클릭 이벤트
    alien.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isTrap) {
            hitTrapAlien(holeIndex, isEarth);
        } else {
            hitAlien(holeIndex, isSpecial, isHighValue);
        }
    });
    
    // 구멍에 외계인 추가
    randomHole.appendChild(alien);
    activeAliens.add(holeIndex);
    
    // 일정 시간 후 외계인 숨기기 - 현재 레벨 설정 사용
    setTimeout(() => {
        hideAlien(holeIndex);
    }, config.alienShowTime);
}

function hitAlien(holeIndex, isSpecial, isHighValue) {
    if (gameState !== 'playing') return;
    
    const alien = holes[holeIndex].querySelector('.alien');
    if (!alien || alien.classList.contains('hit')) return;
    
    // 히트 애니메이션
    alien.classList.add('hit');
    
    // 성공 시 실수 카운터는 리셋하지 않음 (누적 방식이므로)
    
    // 점수 계산
    let points;
    if (isSpecial) {
        points = GAME_CONFIG.specialScore;
    } else if (isHighValue) {
        points = GAME_CONFIG.highValueScore; // 👽, 🛸 = 15점
    } else {
        points = GAME_CONFIG.lowValueScore;  // 👾, 🧟‍♂️, 🧟‍♀️ = 8점
    }
    
    // 콤보 보너스
    gameStats.combo++;
    gameStats.maxCombo = Math.max(gameStats.maxCombo, gameStats.combo);
    
    if (gameStats.combo > 1) {
        points += Math.floor(points * (gameStats.combo - 1) * 0.1);
    }
    
    gameStats.score += points;
    gameStats.hits++;
    gameStats.aliensDestroyed++;
    
    // 전체 통계 업데이트
    allTimeStats.totalAliensDestroyed++;
    localStorage.setItem('alienShooterTotalAliens', allTimeStats.totalAliensDestroyed);
    
    // 히트 이펙트 표시
    showHitEffect(holes[holeIndex], points, isSpecial, false);
    
    // 외계인 제거
    setTimeout(() => {
        hideAlien(holeIndex);
    }, 200);
    
    // 레벨업 체크 - 10마리마다 레벨업 (조금 더 여유롭게)
    if (gameStats.aliensDestroyed > 0 && gameStats.aliensDestroyed % 10 === 0) {
        levelUp();
    }
    
    updateUI();
}

function hitTrapAlien(holeIndex, isEarth) {
    if (gameState !== 'playing') return;
    
    const alien = holes[holeIndex].querySelector('.alien');
    if (!alien || alien.classList.contains('hit')) return;
    
    // 히트 애니메이션
    alien.classList.add('hit');
    
    // 점수 감점
    const penalty = isEarth ? GAME_CONFIG.earthPenalty : GAME_CONFIG.trapPenalty;
    gameStats.score = Math.max(0, gameStats.score - penalty);
    gameStats.misses++;
    gameStats.combo = 0;
    gameStats.missCount++;
    
    // 히트 이펙트 표시
    showHitEffect(holes[holeIndex], -penalty, false, true);
    
    // 3번 실수마다 목숨 감소
    if (gameStats.missCount >= 3) {
        loseLife();
        gameStats.missCount = 0; // 카운터 리셋
        if (isEarth) {
            elements.gameInfo.textContent = `지구를 공격해서 목숨을 잃었습니다! 남은 목숨: ${gameStats.lives}개 💔`;
        } else {
            elements.gameInfo.textContent = `함정에 빠져서 목숨을 잃었습니다! 남은 목숨: ${gameStats.lives}개 💔`;
        }
    } else {
        const remaining = 3 - gameStats.missCount;
        if (isEarth) {
            elements.gameInfo.textContent = `지구를 공격했다! ${remaining}번 더 놓치면 목숨을 잃어요! (총 실수: ${gameStats.missCount}/3) 💥`;
        } else {
            elements.gameInfo.textContent = `함정에 빠졌다! ${remaining}번 더 놓치면 목숨을 잃어요! (총 실수: ${gameStats.missCount}/3) ⚠️`;
        }
    }
    
    setTimeout(() => {
        if (gameState === 'playing') {
            elements.gameInfo.textContent = '외계인들이 나타났다! 빨리 잡아라! 지구와 우주선은 피하세요!';
        }
    }, 2500);
    
    // 외계인 제거
    setTimeout(() => {
        hideAlien(holeIndex);
    }, 300);
    
    updateUI();
}

function hideAlien(holeIndex) {
    const hole = holes[holeIndex];
    const alien = hole.querySelector('.alien');
    
    if (alien) {
        alien.remove();
    }
    
    activeAliens.delete(holeIndex);
}

function hideAllAliens() {
    holes.forEach((hole, index) => {
        const alien = hole.querySelector('.alien');
        if (alien) {
            alien.remove();
        }
        activeAliens.delete(index);
    });
}

function showHitEffect(hole, points, isSpecial, isMiss) {
    const effect = document.createElement('div');
    effect.className = 'hit-effect';
    effect.textContent = points > 0 ? `+${points}` : `${points}`;
    
    if (isMiss || points < 0) {
        effect.style.color = '#ff0000';
        effect.style.fontSize = '2.5rem';
    } else if (isSpecial) {
        effect.style.color = '#ffff00';
    } else {
        effect.style.color = '#00ff00';
    }
    
    const rect = hole.getBoundingClientRect();
    const gameRect = elements.gameGrid.getBoundingClientRect();
    
    effect.style.left = (rect.left - gameRect.left + rect.width / 2) + 'px';
    effect.style.top = (rect.top - gameRect.top + rect.height / 2) + 'px';
    
    elements.gameGrid.appendChild(effect);
    
    setTimeout(() => {
        if (effect.parentNode) {
            effect.remove();
        }
    }, 800);
}

function levelUp() {
    gameStats.level++;
    
    // 최고 레벨 업데이트
    if (gameStats.level > allTimeStats.bestLevel) {
        allTimeStats.bestLevel = gameStats.level;
        localStorage.setItem('alienShooterBestLevel', allTimeStats.bestLevel);
    }
    
    // 시간 보너스
    gameStats.timeLeft += 8;  // 레벨업시 8초 추가
    
    showLevelUpEffect();
}

function showLevelUpEffect() {
    const config = getCurrentGameConfig();
    const maxAliens = Math.min(4, Math.floor(gameStats.level / 4) + 1);
    
    elements.gameInfo.textContent = `🎉 레벨 ${gameStats.level}! 시간 +8초! 동시 외계인 최대 ${maxAliens}마리!`;
    
    // 현재 게임 속도 정보도 표시
    const showTime = (config.alienShowTime / 1000).toFixed(1);
    setTimeout(() => {
        elements.gameInfo.textContent = `레벨 ${gameStats.level}: 외계인 표시시간 ${showTime}초`;
    }, 2000);
    
    setTimeout(() => {
        if (gameState === 'playing') {
            elements.gameInfo.textContent = '외계인들이 조금 더 빨라졌지만 여전히 잡을 수 있어요!';
        }
    }, 4000);
    
    // 레벨업 이펙트
    elements.gameGrid.style.filter = 'drop-shadow(0 0 20px rgba(255, 215, 0, 1))';
    setTimeout(() => {
        elements.gameGrid.style.filter = '';
    }, 2000);
}

function updateGameTime() {
    if (gameState !== 'playing') return;
    
    gameStats.timeLeft--;
    
    if (gameStats.timeLeft <= 0) {
        gameOver('timeUp'); // 시간 종료
    } else if (gameStats.timeLeft <= 10) {
        elements.timeLeft.style.color = '#ff0000';
        elements.timeLeft.style.animation = 'glow 0.5s ease-in-out infinite alternate';
    }
    
    updateUI();
}

// 목숨을 잃는 함수
function loseLife() {
    gameStats.lives--;
    
    if (gameStats.lives <= 0) {
        gameOver('livesLost'); // 목숨 소진으로 게임 오버
    } else {
        // 목숨 감소 시각적 효과
        if (elements.lives) {
            elements.lives.style.color = '#ff0000';
            elements.lives.style.animation = 'glow 0.5s ease-in-out 3';
            setTimeout(() => {
                if (elements.lives) {
                    elements.lives.style.color = '#ffffff';
                    elements.lives.style.animation = '';
                }
            }, 1500);
        }
    }
}

function gameOver(reason = 'timeUp') {
    gameState = 'gameOver';
    
    clearInterval(gameTimer);
    clearTimeout(alienTimer);
    hideAllAliens();
    
    // 게임 완료 여부 업데이트 (시간이 다 된 경우만 완료로 간주)
    if (reason === 'timeUp') {
        allTimeStats.gamesCompleted++;
        localStorage.setItem('alienShooterGamesCompleted', allTimeStats.gamesCompleted);
    }
    
    // 최고점수 업데이트
    const isNewHighScore = gameStats.score > gameStats.highScore;
    if (isNewHighScore) {
        gameStats.highScore = gameStats.score;
        localStorage.setItem('alienShooterHighScore', gameStats.highScore);
    }
    
    // 게임 종료 이유에 따른 메시지 설정
    if (reason === 'livesLost') {
        // 목숨을 모두 잃어서 게임 오버
        if (isNewHighScore) {
            elements.modalTitle.textContent = '💔 아쉬운 최고점수!';
            elements.modalTitle.style.color = '#ff6600';
            elements.modalMessage.textContent = '목숨을 모두 잃었지만 새로운 최고점수를 달성했습니다! 지구를 구하지 못해 아쉽네요...';
        } else {
            elements.modalTitle.textContent = '💔 지구 방어 실패';
            elements.modalTitle.style.color = '#ff0000';
            elements.modalMessage.textContent = '목숨을 모두 잃어 지구를 구하지 못했습니다. 다시 도전해보세요!';
        }
    } else {
        // 시간이 다 되어서 게임 종료
        if (isNewHighScore) {
            elements.modalTitle.textContent = '🏆 새로운 최고점수!';
            elements.modalTitle.style.color = '#ffff00';
            elements.modalMessage.textContent = '시간이 다 되었지만 최선을 다해 지구를 지켰습니다! 새로운 최고점수 달성!';
        } else {
            elements.modalTitle.textContent = '🛡️ 지구 방어 완료!';
            elements.modalTitle.style.color = '#00ffff';
            elements.modalMessage.textContent = '시간이 다 되었지만 최선을 다해 지구를 방어했습니다! 수고하셨습니다!';
        }
    }
    
    // 최종 통계 계산
    const accuracy = gameStats.hits + gameStats.misses > 0 ? 
        Math.round((gameStats.hits / (gameStats.hits + gameStats.misses)) * 100) : 0;
    
    elements.finalScore.textContent = gameStats.score;
    elements.finalLevel.textContent = gameStats.level;
    elements.finalAccuracy.textContent = accuracy + '%';
    
    elements.gameOverModal.style.display = 'flex';
    updateUI();
}

function closeModal() {
    elements.gameOverModal.style.display = 'none';
    resetGame();
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
    // 전체 통계 업데이트
    const modalTotalGames = document.getElementById('modalTotalGames');
    const modalGamesCompleted = document.getElementById('modalGamesCompleted');
    const modalHighScore = document.getElementById('modalHighScore');
    const modalTotalAliens = document.getElementById('modalTotalAliens');
    const modalBestLevel = document.getElementById('modalBestLevel');
    
    if (modalTotalGames) modalTotalGames.textContent = allTimeStats.totalGames;
    if (modalGamesCompleted) modalGamesCompleted.textContent = allTimeStats.gamesCompleted;
    if (modalHighScore) modalHighScore.textContent = gameStats.highScore;
    if (modalTotalAliens) modalTotalAliens.textContent = allTimeStats.totalAliensDestroyed;
    if (modalBestLevel) modalBestLevel.textContent = allTimeStats.bestLevel;
}

// 모든 기록 삭제
function resetStats() {
    if (confirm('정말로 모든 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        // localStorage에서 모든 기록 삭제
        localStorage.removeItem('alienShooterHighScore');
        localStorage.removeItem('alienShooterTotalGames');
        localStorage.removeItem('alienShooterGamesCompleted');
        localStorage.removeItem('alienShooterTotalAliens');
        localStorage.removeItem('alienShooterBestLevel');
        
        // 메모리의 통계 데이터 초기화
        gameStats.highScore = 0;
        allTimeStats.totalGames = 0;
        allTimeStats.gamesCompleted = 0;
        allTimeStats.totalAliensDestroyed = 0;
        allTimeStats.bestLevel = 1;
        
        // UI 업데이트
        updateUI();
        updateStatsModal();
        
        alert('모든 기록이 삭제되었습니다!');
    }
}

function updateUI() {
    elements.score.textContent = gameStats.score;
    elements.timeLeft.textContent = gameStats.timeLeft;
    elements.level.textContent = gameStats.level;
    elements.highScore.textContent = gameStats.highScore;
    elements.combo.textContent = gameStats.combo;
    
    // 목숨 표시 (하트 이모지로)
    if (elements.lives) {
        const heartsDisplay = '❤️'.repeat(gameStats.lives) + '💔'.repeat(3 - gameStats.lives);
        elements.lives.textContent = heartsDisplay;
    }
    
    // 명중률 계산
    const accuracy = gameStats.hits + gameStats.misses > 0 ? 
        Math.round((gameStats.hits / (gameStats.hits + gameStats.misses)) * 100) : 0;
    elements.accuracy.textContent = accuracy + '%';
    
    // 시간 색상 초기화
    if (gameStats.timeLeft > 10) {
        elements.timeLeft.style.color = '#ffffff';
        elements.timeLeft.style.animation = '';
    }
}

function goHome() {
    if (confirm('게임을 종료하고 메인 페이지로 돌아가시겠습니까?')) {
        clearInterval(gameTimer);
        clearTimeout(alienTimer);
        window.location.href = 'index.html';
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    init();
    
    // 환영 메시지
    setTimeout(() => {
        if (gameState === 'ready') {
            elements.gameInfo.textContent = '빠르게 나타나는 외계인들을 클릭해서 잡으세요! 지구와 우주선은 피하세요!';
        }
    }, 3000);
    
    // 키보드 도움말
    setTimeout(() => {
        if (gameState === 'ready') {
            elements.gameInfo.textContent = 'R키로 재시작, ESC키로 메인으로 돌아갈 수 있습니다. 함정을 조심하세요!';
        }
    }, 6000);
});

// 페이지 종료 시 타이머 정리
window.addEventListener('beforeunload', () => {
    clearInterval(gameTimer);
    clearTimeout(alienTimer);
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