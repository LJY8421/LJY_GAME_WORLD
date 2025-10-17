// 게임 상태 변수들
let canvas, ctx;
let gameState = 'ready'; // 'ready', 'playing', 'paused', 'gameOver'
let gameInterval;
let gameStartTime = 0;
let totalPlayTime = 0;

// 게임 객체들
let snake = [];
let foods = []; // 여러 음식을 위한 배열
let obstacles = []; // 장애물 배열
let direction = { x: 0, y: 0 };
let nextDirection = { x: 0, y: 0 };

// 게임 설정
const GAME_CONFIG = {
    gridSize: 20,
    canvasSize: 600
};

// 음식 타입 정의
const FOOD_TYPES = {
    APPLE: {
        type: 'apple',
        score: 10,
        lengthChange: 1,
        emoji: '🍎',
        duration: null, // 사라지지 않음
        speedEffect: null
    },
    GOLDEN: {
        type: 'golden',
        score: 20,
        lengthChange: 0,
        emoji: '🍏',
        duration: 5000, // 5초
        speedEffect: 'slow' // 속도 감소
    },
    POISON: {
        type: 'poison',
        score: -15,
        lengthChange: 2,
        emoji: '🍄',
        duration: 10000, // 10초
        speedEffect: 'freeze' // 1.5초 멈춤
    }
};

// 장애물 타입 정의
const OBSTACLE_TYPES = {
    STATIC: {
        type: 'static',
        color: '#666666',
        moving: false,
        getDuration: () => 15000 + Math.random() * 10000 // 15-25초 랜덤
    },
    MOVING: {
        type: 'moving',
        color: '#4488ff',
        moving: true,
        speed: 1000, // 1초마다 이동
        getDuration: () => 20000 + Math.random() * 15000 // 20-35초 랜덤
    }
};

// 게임 상태
let gameStats = {
    score: 0,
    snakeLength: 1,
    speed: 1,
    highScore: parseInt(localStorage.getItem('snakeHighScore')) || 0,
    maxLength: parseInt(localStorage.getItem('snakeMaxLength')) || 1,
    foodEaten: 0,
    gameSpeed: 200, // 초기 속도
    slowEffectTime: 0, // 속도 감소 효과 남은 시간
    freezeTime: 0 // 멈춤 효과 남은 시간
};

// 전체 통계 데이터
let allTimeStats = {
    totalGames: parseInt(localStorage.getItem('snakeTotalGames')) || 0,
    totalFood: parseInt(localStorage.getItem('snakeTotalFood')) || 0,
    totalPlayTime: parseInt(localStorage.getItem('snakePlayTime')) || 0,
    maxSpeed: parseInt(localStorage.getItem('snakeMaxSpeed')) || 1,
    totalSurvivalTime: parseInt(localStorage.getItem('snakeSurvivalTime')) || 0
};

// DOM 요소들
let elements = {};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    elements = {
        score: document.getElementById('score'),
        snakeLength: document.getElementById('snakeLength'),
        speed: document.getElementById('speed'),
        gameInfo: document.getElementById('gameInfo'),
        highScore: document.getElementById('highScore'),
        maxLength: document.getElementById('maxLength'),
        foodEaten: document.getElementById('foodEaten'),
        gameOverlay: document.getElementById('gameOverlay'),
        overlayTitle: document.getElementById('overlayTitle'),
        overlayMessage: document.getElementById('overlayMessage'),
        gameOverModal: document.getElementById('gameOverModal'),
        modalTitle: document.getElementById('modalTitle'),
        modalMessage: document.getElementById('modalMessage'),
        finalScore: document.getElementById('finalScore'),
        finalLength: document.getElementById('finalLength'),
        finalFood: document.getElementById('finalFood'),
        mobileControls: document.getElementById('mobileControls'),
        helpModal: document.getElementById('helpModal'),
        statsModal: document.getElementById('statsModal')
    };

    init();
});

// 초기화
function init() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    initializeGame();
    setupEventListeners();
    updateUI();
    draw();
}

function resizeCanvas() {
    if (!canvas) return;
    
    const container = canvas.parentElement;
    const maxSize = Math.min(600, container.clientWidth - 40);
    
    canvas.width = maxSize;
    canvas.height = maxSize;
    canvas.style.width = maxSize + 'px';
    canvas.style.height = maxSize + 'px';
    
    GAME_CONFIG.gridSize = maxSize / 30; // 30x30 그리드
}

function initializeGame() {
    const centerX = Math.floor((canvas.width / GAME_CONFIG.gridSize) / 2);
    const centerY = Math.floor((canvas.height / GAME_CONFIG.gridSize) / 2);
    
    snake = [{ x: centerX, y: centerY }];
    direction = { x: 0, y: 0 };
    nextDirection = { x: 0, y: 0 };
    foods = [];
    obstacles = [];
    
    // 기본 사과 생성
    generateFood(FOOD_TYPES.APPLE);
    
    gameState = 'ready';
}

function generateFood(foodType) {
    if (!canvas) return;
    
    const gridWidth = Math.floor(canvas.width / GAME_CONFIG.gridSize);
    const gridHeight = Math.floor(canvas.height / GAME_CONFIG.gridSize);
    
    let newFood;
    let attempts = 0;
    
    do {
        newFood = {
            x: Math.floor(Math.random() * gridWidth),
            y: Math.floor(Math.random() * gridHeight),
            ...foodType,
            createdAt: Date.now()
        };
        attempts++;
    } while (isPositionOccupied(newFood.x, newFood.y) && attempts < 50);
    
    if (attempts < 50) {
        foods.push(newFood);
        
        // 시간 제한이 있는 음식은 자동으로 제거
        if (newFood.duration) {
            setTimeout(() => {
                removeFood(newFood);
            }, newFood.duration);
        }
    }
}

function removeFood(targetFood) {
    foods = foods.filter(food => food !== targetFood);
}

function isPositionOccupied(x, y) {
    // 뱀의 위치 확인
    if (snake.some(segment => segment.x === x && segment.y === y)) {
        return true;
    }
    
    // 다른 음식의 위치 확인
    if (foods.some(food => food.x === x && food.y === y)) {
        return true;
    }
    
    // 장애물의 위치 확인
    if (obstacles.some(obstacle => obstacle.x === x && obstacle.y === y)) {
        return true;
    }
    
    return false;
}

function generateObstacle(obstacleType) {
    if (!canvas || obstacles.length >= 3) return;
    
    const gridWidth = Math.floor(canvas.width / GAME_CONFIG.gridSize);
    const gridHeight = Math.floor(canvas.height / GAME_CONFIG.gridSize);
    
    let newObstacle;
    let attempts = 0;
    
    do {
        newObstacle = {
            x: Math.floor(Math.random() * gridWidth),
            y: Math.floor(Math.random() * gridHeight),
            ...obstacleType,
            direction: obstacleType.moving ? { 
                x: Math.random() > 0.5 ? 1 : -1, 
                y: Math.random() > 0.5 ? 1 : -1 
            } : null,
            lastMoved: Date.now(),
            createdAt: Date.now(),
            duration: obstacleType.getDuration() // 랜덤 지속시간
        };
        attempts++;
    } while (isPositionOccupied(newObstacle.x, newObstacle.y) && attempts < 50);
    
    if (attempts < 50) {
        obstacles.push(newObstacle);
        
        // 랜덤 시간 후 장애물 제거하고 새로 생성
        setTimeout(() => {
            removeObstacle(newObstacle);
            // 2-5초 후 새로운 장애물 생성 시도
            const respawnDelay = 2000 + Math.random() * 3000; // 2-5초 랜덤
            setTimeout(() => {
                if (gameState === 'playing') {
                    // 같은 타입의 장애물 재생성 시도
                    if (obstacles.length < 3) {
                        generateObstacle(obstacleType);
                    }
                }
            }, respawnDelay);
        }, newObstacle.duration);
    }
}

function removeObstacle(targetObstacle) {
    obstacles = obstacles.filter(obstacle => obstacle !== targetObstacle);
}

function moveObstacles() {
    const now = Date.now();
    
    obstacles.forEach(obstacle => {
        if (obstacle.moving && now - obstacle.lastMoved > obstacle.speed) {
            const gridWidth = Math.floor(canvas.width / GAME_CONFIG.gridSize);
            const gridHeight = Math.floor(canvas.height / GAME_CONFIG.gridSize);
            
            // 새 위치 계산
            let newX = obstacle.x + obstacle.direction.x;
            let newY = obstacle.y + obstacle.direction.y;
            
            // 벽에 닿으면 방향 바꾸기
            if (newX < 0 || newX >= gridWidth) {
                obstacle.direction.x *= -1;
                newX = obstacle.x + obstacle.direction.x;
            }
            if (newY < 0 || newY >= gridHeight) {
                obstacle.direction.y *= -1;
                newY = obstacle.y + obstacle.direction.y;
            }
            
            // 다른 객체와 겹치지 않으면 이동
            if (!isPositionOccupiedExcept(newX, newY, obstacle)) {
                obstacle.x = newX;
                obstacle.y = newY;
            } else {
                // 겹치면 방향 바꾸기
                obstacle.direction.x = Math.random() > 0.5 ? 1 : -1;
                obstacle.direction.y = Math.random() > 0.5 ? 1 : -1;
            }
            
            obstacle.lastMoved = now;
        }
    });
}

function isPositionOccupiedExcept(x, y, exceptObject) {
    // 뱀의 위치 확인
    if (snake.some(segment => segment.x === x && segment.y === y)) {
        return true;
    }
    
    // 다른 음식의 위치 확인
    if (foods.some(food => food.x === x && food.y === y)) {
        return true;
    }
    
    // 다른 장애물의 위치 확인 (자기 자신 제외)
    if (obstacles.some(obstacle => obstacle !== exceptObject && obstacle.x === x && obstacle.y === y)) {
        return true;
    }
    
    return false;
}

// 게임 제어 함수들
function startGame() {
    if (gameState === 'ready') {
        // 게임 시작 버튼으로 시작할 때만 랜덤 방향 설정
        const directions = [
            { x: 0, y: -1 }, // 위
            { x: 0, y: 1 },  // 아래
            { x: -1, y: 0 }, // 왼쪽
            { x: 1, y: 0 }   // 오른쪽
        ];
        const randomDirection = directions[Math.floor(Math.random() * directions.length)];
        direction = { ...randomDirection };
        nextDirection = { ...randomDirection };
        
        gameState = 'playing';
        gameStartTime = Date.now();
        
        if (elements.gameOverlay) {
            elements.gameOverlay.classList.add('hidden');
        }
        if (elements.gameInfo) {
            elements.gameInfo.textContent = '방향키로 뱀을 조종하세요!';
        }
        
        gameInterval = setInterval(gameLoop, gameStats.gameSpeed);
        updateGameButton();
    }
}

function startNewGame() {
    if (gameState === 'ready') {
        startGame();
    }
}

function pauseGame() {
    if (gameState === 'playing') {
        gameState = 'paused';
        clearInterval(gameInterval);
        
        if (elements.gameOverlay) {
            elements.gameOverlay.classList.remove('hidden');
        }
        if (elements.overlayTitle) {
            elements.overlayTitle.textContent = '⏸️ 게임 일시정지';
        }
        if (elements.overlayMessage) {
            elements.overlayMessage.textContent = '스페이스바를 눌러 계속하세요';
        }
        if (elements.gameInfo) {
            elements.gameInfo.textContent = '게임이 일시정지되었습니다.';
        }
    }
}

function resumeGame() {
    if (gameState === 'paused') {
        gameState = 'playing';
        
        if (elements.gameOverlay) {
            elements.gameOverlay.classList.add('hidden');
        }
        if (elements.gameInfo) {
            elements.gameInfo.textContent = '방향키로 뱀을 조종하세요!';
        }
        
        gameInterval = setInterval(gameLoop, gameStats.gameSpeed);
    }
}

function resetGame() {
    clearInterval(gameInterval);
    
    if (gameStartTime > 0) {
        const sessionTime = Math.floor((Date.now() - gameStartTime) / 1000 / 60);
        totalPlayTime += sessionTime;
        allTimeStats.totalPlayTime += sessionTime;
        localStorage.setItem('snakePlayTime', allTimeStats.totalPlayTime);
    }
    
    gameState = 'ready';
    gameStats.score = 0;
    gameStats.snakeLength = 1;
    gameStats.speed = 1;
    gameStats.foodEaten = 0;
    gameStats.gameSpeed = 200;
    gameStats.slowEffectTime = 0;
    gameStats.freezeTime = 0;
    gameStartTime = 0;
    
    if (elements.gameOverlay) {
        elements.gameOverlay.classList.remove('hidden');
    }
    if (elements.overlayTitle) {
        elements.overlayTitle.textContent = '🎮 게임 준비!';
    }
    if (elements.overlayMessage) {
        elements.overlayMessage.textContent = '방향키를 눌러 뱀을 움직이세요';
    }
    if (elements.gameInfo) {
        elements.gameInfo.textContent = '방향키를 눌러 시작하세요!';
    }
    
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.classList.remove('game-over-shake');
    }
    
    initializeGame();
    updateUI();
    draw();
}

function gameLoop() {
    if (gameState !== 'playing') return;
    
    // 멈춤 효과 처리
    if (gameStats.freezeTime > 0) {
        gameStats.freezeTime -= gameStats.gameSpeed;
        // 멈춰있는 동안에는 게임 루프만 계속 돌고 뱀은 움직이지 않음
        updateUI();
        draw();
        return;
    }
    
    // 방향 업데이트
    direction = { ...nextDirection };
    
    // 속도 감소 효과 처리
    if (gameStats.slowEffectTime > 0) {
        gameStats.slowEffectTime -= gameStats.gameSpeed;
        if (gameStats.slowEffectTime <= 0) {
            // 속도 복구
            clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, gameStats.gameSpeed);
        }
    }
    
    // 뱀 이동
    const head = { ...snake[0] };
    head.x += direction.x;
    head.y += direction.y;
    
    // 벽 충돌 체크
    const gridWidth = Math.floor(canvas.width / GAME_CONFIG.gridSize);
    const gridHeight = Math.floor(canvas.height / GAME_CONFIG.gridSize);
    
    if (head.x < 0 || head.x >= gridWidth || head.y < 0 || head.y >= gridHeight) {
        gameOver();
        return;
    }
    
    // 자기 몸 충돌 체크
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }
    
    // 장애물 충돌 체크
    if (obstacles.some(obstacle => obstacle.x === head.x && obstacle.y === head.y)) {
        gameOver();
        return;
    }
    
    snake.unshift(head);
    
    // 음식 먹기 체크
    const eatenFoodIndex = foods.findIndex(food => food.x === head.x && food.y === head.y);
    if (eatenFoodIndex !== -1) {
        const eatenFood = foods[eatenFoodIndex];
        
        // 점수 및 길이 변경
        gameStats.score += eatenFood.score;
        gameStats.snakeLength += eatenFood.lengthChange;
        gameStats.foodEaten++;
        
        // 특수 효과 처리
        if (eatenFood.speedEffect === 'slow') {
            gameStats.slowEffectTime = 3000; // 3초간 속도 감소
            clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, gameStats.gameSpeed * 1.5);
        } else if (eatenFood.speedEffect === 'freeze') {
            gameStats.freezeTime = 1500; // 1.5초간 멈춤
        }
        
        // 음식 제거
        foods.splice(eatenFoodIndex, 1);
        
        // 전체 통계 업데이트
        allTimeStats.totalFood++;
        localStorage.setItem('snakeTotalFood', allTimeStats.totalFood);
        
        // 속도 증가 (5개마다)
        if (gameStats.foodEaten % 5 === 0) {
            gameStats.speed++;
            gameStats.gameSpeed = Math.max(80, gameStats.gameSpeed - 15);
            
            if (gameStats.speed > allTimeStats.maxSpeed) {
                allTimeStats.maxSpeed = gameStats.speed;
                localStorage.setItem('snakeMaxSpeed', allTimeStats.maxSpeed);
            }
            
            if (gameStats.slowEffectTime <= 0) {
                clearInterval(gameInterval);
                gameInterval = setInterval(gameLoop, gameStats.gameSpeed);
            }
        }
        
        // 새로운 기본 사과 생성 (스폰 확률 대폭 감소)
        const currentApples = foods.filter(f => f.type === 'apple').length;
        if (currentApples === 0) {
            // 기본 사과가 없을 때만 생성
            generateFood(FOOD_TYPES.APPLE);
        } else if (currentApples === 1 && gameStats.snakeLength > 15) {
            // 길이 15 이상일 때만 두 번째 사과 가능성 (20% 확률)
            if (Math.random() < 0.2) {
                generateFood(FOOD_TYPES.APPLE);
            }
        }
        
        // 특수 음식 생성 조건
        generateSpecialFoods();
        
        // 장애물 생성 조건
        generateObstaclesBasedOnLength();
        
        createFoodEffect();
    } else {
        // 음식을 먹지 않았으면 꼬리 제거 (독버섯의 경우 길이가 늘어나므로 조정)
        if (gameStats.snakeLength <= snake.length) {
            snake.pop();
        }
    }
    
    // 움직이는 장애물 이동
    moveObstacles();
    
    updateUI();
    draw();
}

function generateSpecialFoods() {
    // 길이 10 이상: 특수 음식 1개
    if (gameStats.snakeLength >= 10 && foods.filter(f => f.type !== 'apple').length === 0) {
        if (Math.random() < 0.25) { // 25% 확률
            const specialType = Math.random() < 0.7 ? FOOD_TYPES.GOLDEN : FOOD_TYPES.POISON;
            generateFood(specialType);
        }
    }
    
    // 길이 30 이상: 특수 음식 2개까지
    if (gameStats.snakeLength >= 30 && foods.filter(f => f.type !== 'apple').length < 2) {
        if (Math.random() < 0.15) { // 15% 확률
            const specialType = Math.random() < 0.6 ? FOOD_TYPES.GOLDEN : FOOD_TYPES.POISON;
            generateFood(specialType);
        }
    }
}

function generateObstaclesBasedOnLength() {
    // 장애물 개수가 이미 최대치면 추가 생성 안함
    if (obstacles.length >= 3) return;
    
    // 길이 15 이상: 고정 장애물 생성
    if (gameStats.snakeLength >= 15 && obstacles.length === 0) {
        generateObstacle(OBSTACLE_TYPES.STATIC);
        return; // 하나 생성했으면 이번 프레임에서는 추가 생성 안함
    }
    
    // 길이 20 이상: 움직이는 장애물 생성
    if (gameStats.snakeLength >= 20 && obstacles.filter(o => o.moving).length === 0) {
        if (Math.random() < 0.03) { // 확률을 낮춰서 매 프레임마다 체크하지 않도록
            generateObstacle(OBSTACLE_TYPES.MOVING);
            return;
        }
    }
    
    // 추가 장애물 생성 (최대 3개) - 확률을 더 낮춤
    if (gameStats.snakeLength >= 25 && obstacles.length < 2 && Math.random() < 0.002) {
        const obstacleType = Math.random() < 0.7 ? OBSTACLE_TYPES.STATIC : OBSTACLE_TYPES.MOVING;
        generateObstacle(obstacleType);
        return;
    }
    
    if (gameStats.snakeLength >= 35 && obstacles.length < 3 && Math.random() < 0.001) {
        const obstacleType = Math.random() < 0.6 ? OBSTACLE_TYPES.STATIC : OBSTACLE_TYPES.MOVING;
        generateObstacle(obstacleType);
    }
}

function createFoodEffect() {
    if (canvas) {
        canvas.style.filter = 'brightness(1.3) drop-shadow(0 0 10px #00ff00)';
        setTimeout(() => {
            canvas.style.filter = '';
        }, 150);
    }
}

function gameOver() {
    gameState = 'gameOver';
    clearInterval(gameInterval);
    
    if (gameStartTime > 0) {
        const sessionTime = Math.floor((Date.now() - gameStartTime) / 1000);
        const sessionMinutes = Math.floor(sessionTime / 60);
        allTimeStats.totalSurvivalTime += sessionTime;
        allTimeStats.totalPlayTime += sessionMinutes;
        localStorage.setItem('snakeSurvivalTime', allTimeStats.totalSurvivalTime);
        localStorage.setItem('snakePlayTime', allTimeStats.totalPlayTime);
    }
    
    // 게임 수 증가
    allTimeStats.totalGames++;
    localStorage.setItem('snakeTotalGames', allTimeStats.totalGames);
    
    // 최고점수 업데이트
    let isNewRecord = false;
    if (gameStats.score > gameStats.highScore) {
        gameStats.highScore = gameStats.score;
        localStorage.setItem('snakeHighScore', gameStats.highScore.toString());
        isNewRecord = true;
    }
    
    // 최대길이 업데이트
    if (gameStats.snakeLength > gameStats.maxLength) {
        gameStats.maxLength = gameStats.snakeLength;
        localStorage.setItem('snakeMaxLength', gameStats.maxLength.toString());
    }
    
    // 캔버스 흔들림 효과
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.classList.add('game-over-shake');
    }
    
    // 1.5초 후 모달 표시
    setTimeout(() => {
        if (canvas) {
            canvas.classList.remove('game-over-shake');
        }
        
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
                elements.modalMessage.textContent = '뱀이 벽이나 장애물에 부딪혔습니다!';
            }
        }
        
        if (elements.finalScore) elements.finalScore.textContent = gameStats.score;
        if (elements.finalLength) elements.finalLength.textContent = gameStats.snakeLength;
        if (elements.finalFood) elements.finalFood.textContent = gameStats.foodEaten;
        if (elements.gameOverModal) elements.gameOverModal.style.display = 'flex';
    }, 1500);
    
    updateUI();
}

function closeModal() {
    if (elements.gameOverModal) {
        elements.gameOverModal.style.display = 'none';
    }
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
    const modalHighScore = document.getElementById('modalHighScore');
    const modalMaxLength = document.getElementById('modalMaxLength');
    const modalMaxSpeed = document.getElementById('modalMaxSpeed');
    
    if (modalHighScore) modalHighScore.textContent = gameStats.highScore;
    if (modalMaxLength) modalMaxLength.textContent = gameStats.maxLength;
    if (modalMaxSpeed) modalMaxSpeed.textContent = allTimeStats.maxSpeed;
    
    const modalTotalGames = document.getElementById('modalTotalGames');
    const modalTotalFood = document.getElementById('modalTotalFood');
    const modalPlayTime = document.getElementById('modalPlayTime');
    
    if (modalTotalGames) modalTotalGames.textContent = allTimeStats.totalGames;
    if (modalTotalFood) modalTotalFood.textContent = allTimeStats.totalFood;
    if (modalPlayTime) modalPlayTime.textContent = allTimeStats.totalPlayTime + '분';
}

function resetStats() {
    if (confirm('정말로 모든 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        localStorage.removeItem('snakeHighScore');
        localStorage.removeItem('snakeMaxLength');
        localStorage.removeItem('snakeTotalGames');
        localStorage.removeItem('snakeTotalFood');
        localStorage.removeItem('snakePlayTime');
        localStorage.removeItem('snakeMaxSpeed');
        localStorage.removeItem('snakeSurvivalTime');
        
        gameStats.highScore = 0;
        gameStats.maxLength = 1;
        allTimeStats.totalGames = 0;
        allTimeStats.totalFood = 0;
        allTimeStats.totalPlayTime = 0;
        allTimeStats.maxSpeed = 1;
        allTimeStats.totalSurvivalTime = 0;
        
        updateUI();
        updateStatsModal();
        
        alert('모든 기록이 삭제되었습니다!');
    }
}

function draw() {
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 배경 그라디언트
    const gradient = ctx.createRadialGradient(
        canvas.width/2, canvas.height/2, 0,
        canvas.width/2, canvas.height/2, canvas.width/2
    );
    gradient.addColorStop(0, 'rgba(0, 20, 40, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 10, 20, 0.9)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawGrid();
    drawFoods();
    drawObstacles();
    drawSnake();
    
    if (gameState === 'ready') {
        drawCenterText('방향키를 눌러 시작!', '#00ffff');
    }
}

function drawGrid() {
    if (!ctx || !canvas) return;
    
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    const gridWidth = Math.floor(canvas.width / GAME_CONFIG.gridSize);
    const gridHeight = Math.floor(canvas.height / GAME_CONFIG.gridSize);
    
    for (let x = 0; x <= gridWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(x * GAME_CONFIG.gridSize, 0);
        ctx.lineTo(x * GAME_CONFIG.gridSize, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y <= gridHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * GAME_CONFIG.gridSize);
        ctx.lineTo(canvas.width, y * GAME_CONFIG.gridSize);
        ctx.stroke();
    }
}

function drawSnake() {
    if (!ctx || !snake.length) return;
    
    snake.forEach((segment, index) => {
        const x = segment.x * GAME_CONFIG.gridSize;
        const y = segment.y * GAME_CONFIG.gridSize;
        
        if (index === 0) {
            // 뱀 머리
            const headGradient = ctx.createRadialGradient(
                x + GAME_CONFIG.gridSize/2, y + GAME_CONFIG.gridSize/2, 0,
                x + GAME_CONFIG.gridSize/2, y + GAME_CONFIG.gridSize/2, GAME_CONFIG.gridSize/2
            );
            headGradient.addColorStop(0, '#00ff00');
            headGradient.addColorStop(1, '#008800');
            ctx.fillStyle = headGradient;
        } else {
            // 뱀 몸통
            const bodyGradient = ctx.createLinearGradient(x, y, x + GAME_CONFIG.gridSize, y + GAME_CONFIG.gridSize);
            const alpha = Math.max(0.3, 1 - (index * 0.05));
            bodyGradient.addColorStop(0, `rgba(0, 255, 0, ${alpha})`);
            bodyGradient.addColorStop(1, `rgba(0, 150, 0, ${alpha})`);
            ctx.fillStyle = bodyGradient;
        }
        
        ctx.fillRect(x + 1, y + 1, GAME_CONFIG.gridSize - 2, GAME_CONFIG.gridSize - 2);
        
        ctx.strokeStyle = index === 0 ? '#ffffff' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = index === 0 ? 2 : 1;
        ctx.strokeRect(x + 1, y + 1, GAME_CONFIG.gridSize - 2, GAME_CONFIG.gridSize - 2);
        
        // 머리에 눈 그리기
        if (index === 0) {
            ctx.fillStyle = '#ffffff';
            const eyeSize = GAME_CONFIG.gridSize * 0.15;
            const eyeOffset = GAME_CONFIG.gridSize * 0.25;
            
            let eyeX1, eyeY1, eyeX2, eyeY2;
            if (direction.x === 1) {
                eyeX1 = x + GAME_CONFIG.gridSize - eyeOffset;
                eyeY1 = y + eyeOffset;
                eyeX2 = x + GAME_CONFIG.gridSize - eyeOffset;
                eyeY2 = y + GAME_CONFIG.gridSize - eyeOffset;
            } else if (direction.x === -1) {
                eyeX1 = x + eyeOffset;
                eyeY1 = y + eyeOffset;
                eyeX2 = x + eyeOffset;
                eyeY2 = y + GAME_CONFIG.gridSize - eyeOffset;
            } else if (direction.y === -1) {
                eyeX1 = x + eyeOffset;
                eyeY1 = y + eyeOffset;
                eyeX2 = x + GAME_CONFIG.gridSize - eyeOffset;
                eyeY2 = y + eyeOffset;
            } else {
                eyeX1 = x + eyeOffset;
                eyeY1 = y + GAME_CONFIG.gridSize - eyeOffset;
                eyeX2 = x + GAME_CONFIG.gridSize - eyeOffset;
                eyeY2 = y + GAME_CONFIG.gridSize - eyeOffset;
            }
            
            ctx.beginPath();
            ctx.arc(eyeX1, eyeY1, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(eyeX2, eyeY2, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function drawFoods() {
    if (!ctx || !foods.length) return;
    
    const currentTime = Date.now(); // 한 번만 호출
    const time = currentTime * 0.005;
    
    foods.forEach(food => {
        const x = food.x * GAME_CONFIG.gridSize;
        const y = food.y * GAME_CONFIG.gridSize;
        
        // 애니메이션을 위한 시간 기반 크기 변화
        const baseScale = 0.8 + Math.sin(time + food.x + food.y) * 0.1; // 각 음식마다 다른 애니메이션
        
        // 시간 제한 음식의 경우 깜빡임 효과
        let scale = baseScale;
        if (food.duration) {
            const timeLeft = food.duration - (currentTime - food.createdAt);
            if (timeLeft < 2000) { // 2초 남으면 깜빡임
                const blink = Math.sin(currentTime * 0.02) > 0;
                if (!blink) return; // 깜빡임 중이면 건너뛰기
            }
            // 시간이 적게 남을수록 더 빠르게 애니메이션
            if (timeLeft < 3000) {
                scale = baseScale + Math.sin(time * 3) * 0.2;
            }
        }
        
        // 이모지로 음식 그리기
        const fontSize = GAME_CONFIG.gridSize * scale;
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillText(
            food.emoji, 
            x + GAME_CONFIG.gridSize/2, 
            y + GAME_CONFIG.gridSize/2
        );
    });
}

function drawObstacles() {
    if (!ctx || !obstacles.length) return;
    
    obstacles.forEach(obstacle => {
        const x = obstacle.x * GAME_CONFIG.gridSize;
        const y = obstacle.y * GAME_CONFIG.gridSize;
        
        if (obstacle.moving) {
            // 움직이는 장애물 (하늘색)
            const time = Date.now() * 0.005;
            const glow = Math.sin(time) * 0.3 + 0.7;
            
            const movingGradient = ctx.createRadialGradient(
                x + GAME_CONFIG.gridSize/2, y + GAME_CONFIG.gridSize/2, 0,
                x + GAME_CONFIG.gridSize/2, y + GAME_CONFIG.gridSize/2, GAME_CONFIG.gridSize/2
            );
            movingGradient.addColorStop(0, `rgba(100, 150, 255, ${glow})`);
            movingGradient.addColorStop(1, `rgba(50, 100, 200, ${glow})`);
            ctx.fillStyle = movingGradient;
        } else {
            // 고정 장애물 (회색)
            const staticGradient = ctx.createLinearGradient(x, y, x + GAME_CONFIG.gridSize, y + GAME_CONFIG.gridSize);
            staticGradient.addColorStop(0, '#888888');
            staticGradient.addColorStop(1, '#444444');
            ctx.fillStyle = staticGradient;
        }
        
        ctx.fillRect(x + 1, y + 1, GAME_CONFIG.gridSize - 2, GAME_CONFIG.gridSize - 2);
        
        // 테두리
        ctx.strokeStyle = obstacle.moving ? '#4488ff' : '#666666';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, GAME_CONFIG.gridSize - 2, GAME_CONFIG.gridSize - 2);
    });
}

function drawCenterText(text, color) {
    if (!ctx || !canvas) return;
    
    ctx.fillStyle = color;
    ctx.font = `${Math.floor(GAME_CONFIG.gridSize * 1.5)}px Orbitron`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(text, canvas.width/2, canvas.height/2);
    
    ctx.fillText(text, canvas.width/2, canvas.height/2);
}

function updateUI() {
    if (elements.score) elements.score.textContent = gameStats.score;
    if (elements.snakeLength) elements.snakeLength.textContent = gameStats.snakeLength;
    if (elements.speed) elements.speed.textContent = gameStats.speed;
    if (elements.highScore) elements.highScore.textContent = gameStats.highScore;
    if (elements.maxLength) elements.maxLength.textContent = gameStats.maxLength;
    if (elements.foodEaten) elements.foodEaten.textContent = gameStats.foodEaten;
}

function goHome() {
    if (confirm('게임을 종료하고 메인 페이지로 돌아가시겠습니까?')) {
        clearInterval(gameInterval);
        window.location.href = 'index.html';
    }
}


let touchStartX = 0, touchStartY = 0, touchEndX = 0, touchEndY = 0;
let isSwiping = false;

// 이벤트 리스너 설정
function setupEventListeners() {
    document.addEventListener('keydown', handleKeyDown);
    
    const mobileButtons = document.querySelectorAll('.mobile-btn');
    mobileButtons.forEach(button => {
        button.addEventListener('click', handleMobileControl);
        button.addEventListener('touchstart', handleMobileControl, { passive: true });
    });
    
    window.addEventListener('resize', resizeCanvas);
    setupModalClickEvents();
    
    // 터치 스와이프
    if (canvas) {
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
            isSwiping = true;
        }, { passive: false });
        
        canvas.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            e.preventDefault();
            
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
        }, { passive: false });
        
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (isSwiping) {
                handleSwipe();
                isSwiping = false;
            }
        }, { passive: false });
    }
}

function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 30;
    
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
    const isVertical = Math.abs(deltaY) > Math.abs(deltaX);
    
    if (isHorizontal && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
            changeDirection('right');
        } else {
            changeDirection('left');
        }
    } else if (isVertical && Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) {
            changeDirection('down');
        } else {
            changeDirection('up');
        }
    }
}

function setupModalClickEvents() {
    if (elements.helpModal) {
        elements.helpModal.addEventListener('click', (e) => {
            if (e.target === elements.helpModal) {
                closeHelp();
            }
        });
    }
    
    if (elements.statsModal) {
        elements.statsModal.addEventListener('click', (e) => {
            if (e.target === elements.statsModal) {
                closeStats();
            }
        });
    }
    
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
        case 'ArrowUp':
        case 'w':
        case 'W':
            e.preventDefault();
            changeDirection('up');
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            e.preventDefault();
            changeDirection('down');
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            e.preventDefault();
            changeDirection('left');
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            e.preventDefault();
            changeDirection('right');
            break;
        case ' ':
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

function handleMobileControl(e) {
    e.preventDefault();
    const direction = e.target.getAttribute('data-direction');
    
    if (direction === 'pause') {
        if (gameState === 'playing') {
            pauseGame();
        } else if (gameState === 'paused') {
            resumeGame();
        }
    } else {
        changeDirection(direction);
    }
}

function changeDirection(newDirection) {
    if (gameState === 'ready') {
        // 방향키로 게임 시작할 때는 해당 방향으로 시작
        switch(newDirection) {
            case 'up':
                direction = { x: 0, y: -1 };
                nextDirection = { x: 0, y: -1 };
                break;
            case 'down':
                direction = { x: 0, y: 1 };
                nextDirection = { x: 0, y: 1 };
                break;
            case 'left':
                direction = { x: -1, y: 0 };
                nextDirection = { x: -1, y: 0 };
                break;
            case 'right':
                direction = { x: 1, y: 0 };
                nextDirection = { x: 1, y: 0 };
                break;
        }
        
        // 게임 시작
        gameState = 'playing';
        gameStartTime = Date.now();
        
        if (elements.gameOverlay) {
            elements.gameOverlay.classList.add('hidden');
        }
        if (elements.gameInfo) {
            elements.gameInfo.textContent = '방향키로 뱀을 조종하세요!';
        }
        
        gameInterval = setInterval(gameLoop, gameStats.gameSpeed);
        updateGameButton();
        return;
    }
    
    // 게임 중 방향 변경
    switch(newDirection) {
        case 'up':
            if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
            break;
        case 'down':
            if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
            break;
        case 'left':
            if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
            break;
        case 'right':
            if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
            break;
    }
}

// 페이지 정리
window.addEventListener('beforeunload', () => {
    clearInterval(gameInterval);
    
    if (gameStartTime > 0) {
        const sessionTime = Math.floor((Date.now() - gameStartTime) / 1000 / 60);
        allTimeStats.totalPlayTime += sessionTime;
        localStorage.setItem('snakePlayTime', allTimeStats.totalPlayTime);
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState === 'playing') {
        pauseGame();
    }
});