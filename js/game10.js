// 게임 상태 관리
let gameState = 'ready'; // 'ready', 'playing', 'paused', 'gameOver'
let planetSpawnTimer = null;
let animationFrame = null;
let gameStartTime = 0;
let survivalTimer = null;

// 게임 설정
const GAME_CONFIG = {
    canvasWidth: 500,
    canvasHeight: 500,
    playerSize: 30,
    planetSize: 32,
    baseSpawnRate: 2000,
    minSpawnRate: 800,
    basePlanetSpeed: 2,
    pointsToLevelUp: 500,
    lifeRecoveryLevel: 10,
    dodgePoints: 10,
    levelBonus: 50,
    survivalPoints: 1
};

// 안전한 localStorage 접근
function safeLocalStorage(key, defaultValue) {
    try {
        const value = localStorage.getItem(key);
        return value !== null ? parseInt(value) : defaultValue;
    } catch (error) {
        console.warn('localStorage access failed:', error);
        return defaultValue;
    }
}

function safeSetLocalStorage(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.warn('localStorage save failed:', error);
    }
}

// 게임 통계
let gameStats = {
    score: 0,
    level: 1,
    highScore: safeLocalStorage('planetDodgeHighScore', 0),
    lives: 3,
    survivalTime: 0,
    lastLifeRecoveryLevel: 0
};

// 전체 통계
let allTimeStats = {
    totalGames: safeLocalStorage('planetDodgeTotalGames', 0),
    bestSurvivalTime: safeLocalStorage('planetDodgeBestTime', 0),
    bestLevel: safeLocalStorage('planetDodgeBestLevel', 1)
};

// 플레이어와 행성 배열
let player = {
    x: GAME_CONFIG.canvasWidth / 2,
    y: GAME_CONFIG.canvasHeight / 2,
    element: null
};

let planets = [];
let mouseX = 0;
let mouseY = 0;

// DOM 요소 참조
const elements = {
    score: document.getElementById('score'),
    level: document.getElementById('level'),
    lives: document.getElementById('lives'),
    survivalTimeDisplay: document.getElementById('survivalTimeDisplay'),
    gameInfo: document.getElementById('gameInfo'),
    highScore: document.getElementById('highScore'),
    survivalRate: document.getElementById('survivalRate'),
    bestLevel: document.getElementById('bestLevel'),
    gameCanvas: document.getElementById('gameCanvas'),
    gameOverlay: document.getElementById('gameOverlay'),
    overlayTitle: document.getElementById('overlayTitle'),
    overlayMessage: document.getElementById('overlayMessage'),
    gameOverModal: document.getElementById('gameOverModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalMessage: document.getElementById('modalMessage'),
    finalScore: document.getElementById('finalScore'),
    finalLevel: document.getElementById('finalLevel'),
    survivalTime: document.getElementById('survivalTime'),
    helpModal: document.getElementById('helpModal'),
    statsModal: document.getElementById('statsModal'),
    player: document.getElementById('player')
};

// 행성 타입 정의 (가중치 기반)
const planetTypes = [
    { emoji: '🪐', speed: 1.0, weight: 45, radius: 16 },  // 토성 - 보통 속도 (45%)
    { emoji: '🌕', speed: 0.7, weight: 35, radius: 14 },  // 달 - 느린 속도 (35%)
    { emoji: '⭐', speed: 1.5, weight: 30, radius: 12 },  // 별 - 빠른 속도 (30%)
    { emoji: '🛸', speed: 1.5, weight: 20, radius: 15 }   // UFO - 빠른 속도 (20%)
];

// ====== 초기화 함수 ======
function init() {
    setupEventListeners();
    updateUI();
    
// 모바일 대응
if (window.innerWidth <= 320) {
    GAME_CONFIG.canvasWidth = 260;
    GAME_CONFIG.canvasHeight = 260;
} else if (window.innerWidth <= 360) {
    GAME_CONFIG.canvasWidth = 280;
    GAME_CONFIG.canvasHeight = 280;
} else if (window.innerWidth <= 480) {
    GAME_CONFIG.canvasWidth = 300;
    GAME_CONFIG.canvasHeight = 300;
} else if (window.innerWidth <= 768) {
    GAME_CONFIG.canvasWidth = 350;
    GAME_CONFIG.canvasHeight = 350;
} else if (window.innerWidth <= 1024) {
    GAME_CONFIG.canvasWidth = 400;
    GAME_CONFIG.canvasHeight = 400;
} else if (window.innerWidth <= 1366) {
    GAME_CONFIG.canvasWidth = 450;
    GAME_CONFIG.canvasHeight = 450;
}
    
    player.element = elements.player;
    updatePlayerPosition();
    elements.gameInfo.textContent = '마우스나 터치로 우주선을 조종해서 행성을 피하세요!';
}

// ====== 이벤트 리스너 설정 ======
function setupEventListeners() {
    // 마우스 이벤트
    elements.gameCanvas.addEventListener('mousemove', handleMouseMove);
    elements.gameCanvas.addEventListener('click', handleCanvasClick);
    
    // 터치 이벤트 추가
    elements.gameCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    elements.gameCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    elements.gameCanvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // 키보드 이벤트
    document.addEventListener('keydown', handleKeyDown);
    
    // 모달 이벤트
    setupModalClickEvents();
    
    // 창 포커스 이벤트
    window.addEventListener('blur', () => {
        if (gameState === 'playing') {
            pauseGame();
        }
    });
    
    // 페이지 숨김 이벤트
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && gameState === 'playing') {
            pauseGame();
        }
    });
    
    // 페이지 종료 이벤트
    window.addEventListener('beforeunload', cleanupGame);
    
    // 리사이즈 이벤트
    window.addEventListener('resize', debounce(handleResize, 250));
}

function setupModalClickEvents() {
    [elements.helpModal, elements.statsModal, elements.gameOverModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
    });
}

// ====== 터치 이벤트 핸들러 ======
function handleTouchStart(e) {
    e.preventDefault();
    const rect = elements.gameCanvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
    
    if (gameState === 'ready') {
        startGame();
    } else if (gameState === 'playing') {
        updatePlayerPosition();
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    const rect = elements.gameCanvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
    
    if (gameState === 'playing') {
        updatePlayerPosition();
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
}

// ====== 기존 이벤트 핸들러 ======
function handleMouseMove(e) {
    const rect = elements.gameCanvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    if (gameState === 'playing') {
        updatePlayerPosition();
    }
}

function handleCanvasClick() {
    if (gameState === 'ready') {
        startGame();
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

function handleResize() {
    if (gameState === 'playing' && window.innerWidth <= 768) {
        pauseGame();
    }
}

// 디바운스 유틸리티 함수
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ====== 플레이어 관리 ======
function updatePlayerPosition() {
    const halfSize = GAME_CONFIG.playerSize / 2;
    player.x = Math.max(halfSize, Math.min(GAME_CONFIG.canvasWidth - halfSize, mouseX));
    player.y = Math.max(halfSize, Math.min(GAME_CONFIG.canvasHeight - halfSize, mouseY));
    
    if (player.element) {
        player.element.style.left = (player.x - halfSize) + 'px';
        player.element.style.top = (player.y - halfSize) + 'px';
    }
}

// ====== 게임 상태 관리 ======
function startGame() {
    if (gameState !== 'ready') return;
    
    gameState = 'playing';
    gameStartTime = Date.now();
    
    // 게임 통계 초기화
    gameStats.score = 0;
    gameStats.level = 1;
    gameStats.lives = 3;
    gameStats.survivalTime = 0;
    gameStats.lastLifeRecoveryLevel = 0;
    
    // 전체 통계 업데이트
    allTimeStats.totalGames++;
    safeSetLocalStorage('planetDodgeTotalGames', allTimeStats.totalGames);
    
    // 플레이어 위치 초기화
    player.x = GAME_CONFIG.canvasWidth / 2;
    player.y = GAME_CONFIG.canvasHeight / 2;
    updatePlayerPosition();
    
    // 우주선 폭발 효과 제거 (만약 있다면)
    const spaceship = player.element.querySelector('.spaceship');
    if (spaceship) {
        spaceship.classList.remove('exploding');
    }
    
    // 행성 배열 초기화
    planets = [];
    clearPlanets();
    
    // UI 업데이트
    elements.gameOverlay.classList.add('hidden');
    elements.gameCanvas.style.pointerEvents = 'auto';
    elements.gameInfo.textContent = '행성들이 나타났다! 우주선을 조종해서 피하세요!';
    
    // 생존 타이머 시작
    startSurvivalTimer();
    
    // 게임 루프 시작
    startPlanetSpawning();
    gameLoop();
    updateUI();
}

function pauseGame() {
    if (gameState !== 'playing') return;
    
    gameState = 'paused';
    cleanupTimers();
    
    elements.gameOverlay.classList.remove('hidden');
    elements.overlayTitle.textContent = '⏸️ 게임 일시정지';
    elements.overlayMessage.textContent = '스페이스바나 P키를 눌러 계속하세요';
    elements.gameInfo.textContent = '게임이 일시정지되었습니다.';
}

function resumeGame() {
    if (gameState !== 'paused') return;
    
    gameState = 'playing';
    elements.gameOverlay.classList.add('hidden');
    elements.gameInfo.textContent = '행성들이 나타났다! 우주선을 조종해서 피하세요!';
    
    startSurvivalTimer();
    startPlanetSpawning();
    gameLoop();
    updateUI();
}

function resetGame() {
    gameState = 'ready';
    cleanupTimers();
    
    // 통계 초기화
    gameStats.score = 0;
    gameStats.level = 1;
    gameStats.lives = 3;
    gameStats.survivalTime = 0;
    gameStats.lastLifeRecoveryLevel = 0;
    
    // 플레이어 위치 초기화
    player.x = GAME_CONFIG.canvasWidth / 2;
    player.y = GAME_CONFIG.canvasHeight / 2;
    updatePlayerPosition();
    
    // 우주선 폭발 효과 제거
    const spaceship = player.element.querySelector('.spaceship');
    if (spaceship) {
        spaceship.classList.remove('exploding');
    }
    
    // 행성 정리
    planets = [];
    clearPlanets();
    
    // UI 초기화
    elements.gameOverlay.classList.remove('hidden');
    elements.overlayTitle.textContent = '🎮 게임 준비!';
    elements.overlayMessage.textContent = '클릭하거나 스페이스바를 눌러 게임을 시작하세요';
    elements.gameInfo.textContent = '마우스나 터치로 우주선을 조종해서 행성을 피하세요!';
    elements.gameCanvas.style.pointerEvents = 'auto';
    
    // 충돌 효과 제거
    elements.gameCanvas.classList.remove('collision');
    
    updateUI();
}

// ====== 생존 타이머 ======
function startSurvivalTimer() {
    survivalTimer = setInterval(() => {
        if (gameState === 'playing') {
            gameStats.survivalTime++;
            gameStats.score += GAME_CONFIG.survivalPoints;
            
            // 레벨업 체크
            const requiredScore = GAME_CONFIG.pointsToLevelUp * gameStats.level;
            if (gameStats.score >= requiredScore) {
                levelUp(gameStats.level + 1);
            }
            
            updateUI();
        }
    }, 1000);
}

// ====== 행성 관리 ======
function startPlanetSpawning() {
    if (gameState !== 'playing') return;
    
    spawnPlanet();
    
    const currentLevel = gameStats.level;
    const spawnRate = Math.max(
        GAME_CONFIG.minSpawnRate,
        GAME_CONFIG.baseSpawnRate - (currentLevel - 1) * 100
    );
    
    planetSpawnTimer = setTimeout(startPlanetSpawning, spawnRate + Math.random() * 500);
}

function spawnPlanet() {
    if (gameState !== 'playing') return;
    
    // 가중치 기반 행성 타입 선택
    const totalWeight = planetTypes.reduce((sum, type) => sum + type.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedType = planetTypes[0];
    
    for (const type of planetTypes) {
        random -= type.weight;
        if (random <= 0) {
            selectedType = type;
            break;
        }
    }
    
    // 행성 시작 위치 결정 (화면 가장자리)
    const side = Math.floor(Math.random() * 4);
    let startX, startY, targetX, targetY;
    
    switch (side) {
        case 0: // 위에서 시작
            startX = Math.random() * GAME_CONFIG.canvasWidth;
            startY = -GAME_CONFIG.planetSize;
            targetX = Math.random() * GAME_CONFIG.canvasWidth;
            targetY = GAME_CONFIG.canvasHeight + GAME_CONFIG.planetSize;
            break;
        case 1: // 오른쪽에서 시작
            startX = GAME_CONFIG.canvasWidth + GAME_CONFIG.planetSize;
            startY = Math.random() * GAME_CONFIG.canvasHeight;
            targetX = -GAME_CONFIG.planetSize;
            targetY = Math.random() * GAME_CONFIG.canvasHeight;
            break;
        case 2: // 아래에서 시작
            startX = Math.random() * GAME_CONFIG.canvasWidth;
            startY = GAME_CONFIG.canvasHeight + GAME_CONFIG.planetSize;
            targetX = Math.random() * GAME_CONFIG.canvasWidth;
            targetY = -GAME_CONFIG.planetSize;
            break;
        case 3: // 왼쪽에서 시작
            startX = -GAME_CONFIG.planetSize;
            startY = Math.random() * GAME_CONFIG.canvasHeight;
            targetX = GAME_CONFIG.canvasWidth + GAME_CONFIG.planetSize;
            targetY = Math.random() * GAME_CONFIG.canvasHeight;
            break;
    }
    
    // 속도 계산
    const distance = Math.sqrt(Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2));
    
    // 레벨별 속도 배율 계산 (50레벨까지 제한)
    let levelSpeedMultiplier;
    if (gameStats.level <= 10) {
        levelSpeedMultiplier = 1 + (gameStats.level - 1) * 0.05;
    } else if (gameStats.level <= 25) {
        levelSpeedMultiplier = 1.5 + (gameStats.level - 10) * 0.05;
    } else if (gameStats.level <= 40) {
        levelSpeedMultiplier = 2.25 + (gameStats.level - 25) * 0.05;
    } else {
        const maxLevel = 50;
        const currentLevel = Math.min(gameStats.level, maxLevel);
        levelSpeedMultiplier = 3.0 + (currentLevel - 40) * 0.05;
    }
    
    const speed = GAME_CONFIG.basePlanetSpeed * selectedType.speed * levelSpeedMultiplier;
    
    // 행성 객체 생성
    const planet = {
        x: startX,
        y: startY,
        speedX: (targetX - startX) / distance * speed,
        speedY: (targetY - startY) / distance * speed,
        type: selectedType,
        element: null,
        id: Date.now() + Math.random()
    };
    
    // DOM 요소 생성
    const planetElement = document.createElement('div');
    planetElement.className = `planet ${getPlanetClass(selectedType.emoji)}`;
    planetElement.textContent = selectedType.emoji;
    planetElement.style.left = planet.x + 'px';
    planetElement.style.top = planet.y + 'px';
    planetElement.dataset.planetId = planet.id;
    
    elements.gameCanvas.appendChild(planetElement);
    planet.element = planetElement;
    planets.push(planet);
}

function getPlanetClass(emoji) {
    switch (emoji) {
        case '🪐': return 'saturn';
        case '⭐': return 'star';
        case '🌕': return 'moon';
        case '🛸': return 'ufo';
        default: return 'saturn';
    }
}

// ====== 게임 루프 ======
function gameLoop() {
    if (gameState !== 'playing') return;
    
    updatePlanets();
    checkCollisions();
    animationFrame = requestAnimationFrame(gameLoop);
}

function updatePlanets() {
    // 역순으로 순회하여 제거 시 인덱스 문제 방지
    for (let i = planets.length - 1; i >= 0; i--) {
        const planet = planets[i];
        if (!planet.element) {
            planets.splice(i, 1);
            continue;
        }
        
        // 행성 위치 업데이트
        planet.x += planet.speedX;
        planet.y += planet.speedY;
        
        planet.element.style.left = planet.x + 'px';
        planet.element.style.top = planet.y + 'px';
        
        // 화면을 벗어난 행성 제거 (피하기 성공)
        const margin = GAME_CONFIG.planetSize * 2;
        if (planet.x < -margin || planet.x > GAME_CONFIG.canvasWidth + margin ||
            planet.y < -margin || planet.y > GAME_CONFIG.canvasHeight + margin) {
            
            // 피하기 성공 처리
            gameStats.score += GAME_CONFIG.dodgePoints;
            
            // 레벨업 체크
            const requiredScore = GAME_CONFIG.pointsToLevelUp * gameStats.level;
            if (gameStats.score >= requiredScore) {
                levelUp(gameStats.level + 1);
            }
            
            planet.element.remove();
            planets.splice(i, 1);
        }
    }
}

// ====== 개선된 충돌 감지 ======
function checkCollisions() {
    const playerCenterX = player.x;
    const playerCenterY = player.y;
    
    // 역순으로 순회하여 제거 시 인덱스 문제 방지
    for (let i = planets.length - 1; i >= 0; i--) {
        const planet = planets[i];
        
        // 간단한 거리 체크로 먼저 필터링 (성능 최적화)
        const dx = Math.abs(planet.x - playerCenterX);
        const dy = Math.abs(planet.y - playerCenterY);
        
        // 대략적인 거리 체크로 불필요한 정밀 계산 방지
        if (dx < 50 && dy < 50) {
            if (isShipPlanetColliding(playerCenterX, playerCenterY, planet)) {
                handleCollision(planet, i);
                return; // 한 번에 하나의 충돌만 처리
            }
        }
    }
}

// 개선된 충돌 감지 함수 - 우주선과 행성의 실제 크기를 고려
function isShipPlanetColliding(shipX, shipY, planet) {
    const planetX = planet.x;
    const planetY = planet.y;
    const planetRadius = planet.type.radius;
    
    // 우주선 메인 몸체 (실제 보이는 크기에 맞게 조정)
    const shipBody = {
        x: shipX - 9,     // 우주선 몸체 너비 18px의 절반
        y: shipY - 12,    // 우주선 몸체 높이 24px의 절반
        width: 18,
        height: 20        // 날개 부분 제외하고 몸체만
    };
    
    // 원-사각형 충돌 감지 (더 정확한 계산)
    return isRectCircleColliding(shipBody, planetX, planetY, planetRadius);
}

function isRectCircleColliding(rect, circleX, circleY, radius) {
    // 사각형과 원의 충돌 감지 (개선된 버전)
    const rectCenterX = rect.x + rect.width / 2;
    const rectCenterY = rect.y + rect.height / 2;
    
    const distX = Math.abs(circleX - rectCenterX);
    const distY = Math.abs(circleY - rectCenterY);

    // 원이 사각형과 확실히 떨어져 있는 경우
    if (distX > (rect.width / 2 + radius)) { return false; }
    if (distY > (rect.height / 2 + radius)) { return false; }

    // 원이 사각형 안에 있거나 직선 거리에서 충돌하는 경우
    if (distX <= (rect.width / 2)) { return true; }
    if (distY <= (rect.height / 2)) { return true; }

    // 모서리 부분에서의 충돌 검사
    const dx = distX - rect.width / 2;
    const dy = distY - rect.height / 2;
    return (dx * dx + dy * dy <= (radius * radius));
}

function handleCollision(planet, planetIndex) {
    gameStats.lives--;
    
    // 새로운 충돌 효과 - 게임창 테두리 빨간색 + 흔들림
    showCanvasCollisionEffect();
    showCollisionEffect(planet.x, planet.y);
    
    if (gameStats.lives <= 0) {
        // 우주선 폭발 효과 추가
        showShipExplosion();
        
        setTimeout(() => {
            gameOver();
        }, 1500);
    } else {
        elements.gameInfo.textContent = `충돌! 남은 생명: ${gameStats.lives}개`;
        
        setTimeout(() => {
            if (gameState === 'playing') {
                elements.gameInfo.textContent = '조심하세요! 행성을 피해서 계속 진행하세요!';
            }
        }, 2000);
    }
    
    // 충돌한 행성 제거
    if (planet.element && planet.element.parentNode) {
        planet.element.remove();
    }
    planets.splice(planetIndex, 1);
    updateUI();
}

// ====== 충돌 효과 ======
function showCanvasCollisionEffect() {
    elements.gameCanvas.classList.add('collision');
    setTimeout(() => {
        elements.gameCanvas.classList.remove('collision');
    }, 500);
}

function showCollisionEffect(x, y) {
    const effect = document.createElement('div');
    effect.className = 'collision-effect';
    effect.textContent = '💥';
    effect.style.left = x + 'px';
    effect.style.top = y + 'px';
    
    elements.gameCanvas.appendChild(effect);
    
    setTimeout(() => {
        if (effect.parentNode) {
            effect.remove();
        }
    }, 800);
}

// ====== 우주선 폭발 효과 ======
function showShipExplosion() {
    const spaceship = player.element.querySelector('.spaceship');
    if (spaceship) {
        spaceship.classList.add('exploding');
    }
    
    // 추가 폭발 효과
    const explosion = document.createElement('div');
    explosion.className = 'explosion-effect';
    explosion.textContent = '💥';
    explosion.style.left = (player.x - 30) + 'px';
    explosion.style.top = (player.y - 30) + 'px';
    
    elements.gameCanvas.appendChild(explosion);
    
    setTimeout(() => {
        if (explosion.parentNode) {
            explosion.remove();
        }
    }, 1500);
}

function levelUp(newLevel) {
    gameStats.level = newLevel;
    
    // 최고 레벨 업데이트
    if (gameStats.level > allTimeStats.bestLevel) {
        allTimeStats.bestLevel = gameStats.level;
        safeSetLocalStorage('planetDodgeBestLevel', allTimeStats.bestLevel);
    }
    
    // 레벨업 보너스
    gameStats.score += GAME_CONFIG.levelBonus;
    
    // 생명 회복 체크
    if (gameStats.level > 0 && 
        gameStats.level % GAME_CONFIG.lifeRecoveryLevel === 0 && 
        gameStats.level !== gameStats.lastLifeRecoveryLevel && 
        gameStats.lives < 3) {
        gameStats.lives++;
        gameStats.lastLifeRecoveryLevel = gameStats.level;
        elements.gameInfo.textContent = `레벨 ${gameStats.level} 달성! 생명이 회복되었습니다!`;
        setTimeout(() => {
            if (gameState === 'playing') {
                elements.gameInfo.textContent = '잘하고 있어요! 계속 피해보세요!';
            }
        }, 2000);
    } else {
        showLevelUpEffect();
    }
}

function showLevelUpEffect() {
    elements.gameInfo.textContent = `레벨 ${gameStats.level}! 행성이 더 빨라집니다! 보너스 점수 +${GAME_CONFIG.levelBonus}!`;
    
    setTimeout(() => {
        if (gameState === 'playing') {
            elements.gameInfo.textContent = `레벨 ${gameStats.level}: 더 많은 행성이 빠르게 나타납니다!`;
        }
    }, 3000);
    
    // 레벨업 시각 효과
    elements.gameCanvas.style.filter = 'drop-shadow(0 0 20px rgba(255, 215, 0, 1))';
    setTimeout(() => {
        elements.gameCanvas.style.filter = '';
    }, 1500);
}

// ====== 게임 종료 ======
function gameOver() {
    gameState = 'gameOver';
    cleanupTimers();
    
    // 즉시 모든 상호작용 비활성화
    elements.gameCanvas.style.pointerEvents = 'none';
    
    // 최고점수 업데이트
    const isNewHighScore = gameStats.score > gameStats.highScore;
    if (isNewHighScore) {
        gameStats.highScore = Math.floor(gameStats.score);
        safeSetLocalStorage('planetDodgeHighScore', gameStats.highScore);
    }
    
    // 최고 생존 시간 업데이트
    if (gameStats.survivalTime > allTimeStats.bestSurvivalTime) {
        allTimeStats.bestSurvivalTime = gameStats.survivalTime;
        safeSetLocalStorage('planetDodgeBestTime', allTimeStats.bestSurvivalTime);
    }
    
    // 게임 종료 메시지 설정
    if (isNewHighScore) {
        elements.modalTitle.textContent = '🏆 새로운 최고점수!';
        elements.modalTitle.style.color = '#ffff00';
        elements.modalMessage.textContent = '새로운 최고점수를 달성했습니다!';
    } else {
        elements.modalTitle.textContent = '💔 게임 오버';
        elements.modalTitle.style.color = '#ff0000';
        elements.modalMessage.textContent = '행성과 충돌해서 우주선이 파괴되었습니다. 다시 도전해보세요!';
    }
    
    // 최종 결과 표시
    elements.finalScore.textContent = Math.floor(gameStats.score);
    elements.finalLevel.textContent = gameStats.level;
    elements.survivalTime.textContent = formatTime(gameStats.survivalTime);
    
    // 애니메이션 후 정리
    setTimeout(() => {
        clearPlanets();
        elements.gameCanvas.style.pointerEvents = 'auto';
        elements.gameOverModal.style.display = 'flex';
    }, 1000);
    
    updateUI();
}

// ====== 모달 관리 ======
function closeModal() {
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
    const modalTotalGames = document.getElementById('modalTotalGames');
    const modalHighScore = document.getElementById('modalHighScore');
    const modalBestTime = document.getElementById('modalBestTime');
    const modalBestLevel = document.getElementById('modalBestLevel');
    
    if (modalTotalGames) modalTotalGames.textContent = allTimeStats.totalGames;
    if (modalHighScore) modalHighScore.textContent = gameStats.highScore;
    if (modalBestTime) modalBestTime.textContent = formatTime(allTimeStats.bestSurvivalTime);
    if (modalBestLevel) modalBestLevel.textContent = allTimeStats.bestLevel;
}

function resetStats() {
    if (confirm('정말로 모든 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        try {
            localStorage.removeItem('planetDodgeHighScore');
            localStorage.removeItem('planetDodgeTotalGames');
            localStorage.removeItem('planetDodgeBestTime');
            localStorage.removeItem('planetDodgeBestLevel');
            
            gameStats.highScore = 0;
            allTimeStats.totalGames = 0;
            allTimeStats.bestSurvivalTime = 0;
            allTimeStats.bestLevel = 1;
            
            updateUI();
            updateStatsModal();
            alert('모든 기록이 삭제되었습니다!');
        } catch (error) {
            console.warn('Failed to reset stats:', error);
            alert('기록 삭제 중 오류가 발생했습니다.');
        }
    }
}

// ====== UI 업데이트 ======
function updateUI() {
    elements.score.textContent = Math.floor(gameStats.score);
    elements.level.textContent = gameStats.level;
    elements.highScore.textContent = gameStats.highScore;
    elements.bestLevel.textContent = allTimeStats.bestLevel;
    
    // 생존 시간 표시 업데이트
    if (elements.survivalTimeDisplay) {
        elements.survivalTimeDisplay.textContent = formatTime(gameStats.survivalTime);
    }
    
    // 생명 표시
    if (elements.lives) {
        const heartsDisplay = '❤️'.repeat(gameStats.lives) + '💔'.repeat(3 - gameStats.lives);
        elements.lives.textContent = heartsDisplay;
    }
    
    // 생존율 계산
    const survivalRate = allTimeStats.totalGames > 0 ? 
        Math.round(((allTimeStats.totalGames - (gameStats.lives === 0 ? 1 : 0)) / allTimeStats.totalGames) * 100) : 0;
    elements.survivalRate.textContent = survivalRate + '%';
}

// ====== 유틸리티 함수 ======
function formatTime(seconds) {
    if (seconds < 60) {
        return seconds + '초';
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}분 ${remainingSeconds}초`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        return `${hours}시간 ${minutes}분 ${remainingSeconds}초`;
    }
}

// ====== 개선된 정리 함수 ======
function clearPlanets() {
    // 역순으로 제거하여 인덱스 문제 방지
    for (let i = planets.length - 1; i >= 0; i--) {
        const planet = planets[i];
        if (planet.element) {
            // 애니메이션 중인 요소도 안전하게 제거
            planet.element.style.animation = 'none';
            if (planet.element.parentNode) {
                planet.element.parentNode.removeChild(planet.element);
            }
        }
    }
    planets.length = 0; // 배열 완전 초기화
    
    // 혹시 남은 행성 요소들도 정리
    const remainingPlanets = elements.gameCanvas.querySelectorAll('.planet');
    remainingPlanets.forEach(el => el.remove());
    
    // 충돌 이펙트도 정리
    const effects = elements.gameCanvas.querySelectorAll('.collision-effect, .explosion-effect');
    effects.forEach(el => el.remove());
}

function cleanupTimers() {
    if (planetSpawnTimer) {
        clearTimeout(planetSpawnTimer);
        planetSpawnTimer = null;
    }
    if (survivalTimer) {
        clearInterval(survivalTimer);
        survivalTimer = null;
    }
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
}

function cleanupGame() {
    cleanupTimers();
    clearPlanets();
}

function goHome() {
    if (confirm('게임을 종료하고 메인 페이지로 돌아가시겠습니까?')) {
        cleanupGame();
        window.location.href = 'index.html';
    }
}

// ====== 에러 핸들링 ======
window.addEventListener('error', function(e) {
    console.error('Game error:', e.error);
    // 치명적 에러 시 게임 상태 리셋
    if (gameState === 'playing') {
        gameState = 'gameOver';
        cleanupTimers();
        elements.gameInfo.textContent = '오류가 발생했습니다. 게임을 재시작해주세요.';
    }
});

// ====== 페이지 로드 시 초기화 ======
document.addEventListener('DOMContentLoaded', () => {
    init();
    
    setTimeout(() => {
        if (gameState === 'ready') {
            elements.gameInfo.textContent = '빠르게 움직이는 행성들을 피해보세요!';
        }
    }, 3000);
    
    setTimeout(() => {
        if (gameState === 'ready') {
            elements.gameInfo.textContent = 'R키로 재시작, ESC키로 메인으로 돌아갈 수 있습니다.';
        }
    }, 6000);
});