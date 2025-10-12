// 게임 상태 변수들
let canvas, ctx;
let gameState = 'ready';
let animationId;
let gameStartTime = 0;

// 게임 객체들
let paddle, balls = [], bricks = [];

// 게임 설정
const GAME_CONFIG = {
    paddleWidth: 100,
    paddleHeight: 15,
    paddleSpeed: 8,
    ballRadius: 8,
    ballSpeed: 3,
    maxBallSpeed: 6,
    ballSpeedIncrease: 0.2,
    brickRows: 6,
    brickCols: 10,
    brickWidth: 70,
    brickHeight: 20,
    brickPadding: 5,
    brickOffsetTop: 60,
    brickOffsetLeft: 35,
    maxBalls: 5,
    multiBallChance: 0.30,
    pinkBrickChance: 0.40,
    blackBrickChance: 0.35,
    brownBrickChance: 0.25,
    rainbowBrickChance: 0.20
};

// 게임 상태
let gameStats = {
    score: 0,
    lives: 3,
    level: 1,
    highScore: parseInt(localStorage.getItem('brickBreakerHighScore')) || 0,
    bricksLeft: 0,
    combo: 0,
    maxCombo: 0,
    bricksDestroyed: 0,
    activeBalls: 1,
    paddleExpandTimer: 0,
    ballSizeTimer: 0,
    originalPaddleWidth: GAME_CONFIG.paddleWidth,
    lastBonusLifeLevel: 0,
    totalSpecialBricksCreated: 0
};

// 전체 통계 데이터
let allTimeStats = {
    totalGames: parseInt(localStorage.getItem('brickBreakerTotalGames')) || 0,
    gamesCompleted: parseInt(localStorage.getItem('brickBreakerGamesCompleted')) || 0,
    totalBricksDestroyed: parseInt(localStorage.getItem('brickBreakerTotalBricks')) || 0,
    bestLevel: parseInt(localStorage.getItem('brickBreakerBestLevel')) || 1,
    maxComboRecord: parseInt(localStorage.getItem('brickBreakerMaxCombo')) || 0,
    totalPlayTime: parseInt(localStorage.getItem('brickBreakerPlayTime')) || 0
};

// 키 상태
let keys = { left: false, right: false };

// 메시지 관리
let messageTimeout = null;

// DOM 요소들
const elements = {
    score: document.getElementById('score'),
    lives: document.getElementById('lives'),
    level: document.getElementById('level'),
    gameInfo: document.getElementById('gameInfo'),
    highScore: document.getElementById('highScore'),
    bricksLeft: document.getElementById('bricksLeft'),
    combo: document.getElementById('combo'),
    gameOverlay: document.getElementById('gameOverlay'),
    overlayTitle: document.getElementById('overlayTitle'),
    overlayMessage: document.getElementById('overlayMessage'),
    gameOverModal: document.getElementById('gameOverModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalMessage: document.getElementById('modalMessage'),
    finalScore: document.getElementById('finalScore'),
    finalLevel: document.getElementById('finalLevel'),
    helpModal: document.getElementById('helpModal'),
    statsModal: document.getElementById('statsModal')
};

// 메시지 표시 함수
function setGameMessage(message, duration = 3000) {
    if (messageTimeout) {
        clearTimeout(messageTimeout);
    }
    
    elements.gameInfo.textContent = message;
    
    if (duration > 0) {
        messageTimeout = setTimeout(() => {
            if (gameState === 'playing') {
                elements.gameInfo.textContent = '좌우 키로 패들을 움직이세요!';
            }
        }, duration);
    }
}

// 초기화
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    initializeGame();
    setupEventListeners();
    updateUI();
    gameLoop();
}

function resizeCanvas() {
    const container = canvas.parentElement;
    const windowWidth = window.innerWidth;
    
    // 모바일/태블릿/데스크톱에 따라 다른 크기 적용
    let maxWidth;
    if (windowWidth <= 480) {
        // 모바일: 화면 폭의 95% 사용
        maxWidth = Math.min(windowWidth * 0.95, 450);
    } else if (windowWidth <= 768) {
        // 태블릿: 화면 폭의 90% 사용
        maxWidth = Math.min(windowWidth * 0.9, 600);
    } else {
        // 데스크톱: 최대 800px
        maxWidth = Math.min(800, container.clientWidth - 40);
    }
    
    const ratio = 500 / 800;
    
    canvas.width = maxWidth;
    canvas.height = maxWidth * ratio;
    canvas.style.width = maxWidth + 'px';
    canvas.style.height = (maxWidth * ratio) + 'px';
    
    // 게임 객체들의 위치도 비율에 맞게 재조정
    if (paddle) {
        paddle.x = Math.min(paddle.x, canvas.width - paddle.width);
        paddle.y = canvas.height - paddle.height - 10;
        
        balls.forEach(ball => {
            if (!ball.launched) {
                ball.x = paddle.x + paddle.width / 2;
                ball.y = canvas.height - 30;
            }
        });
    }
}

function initializeGame() {
    // 캔버스 크기에 비례하여 패들 크기 조정
    const scale = canvas.width / 800;
    const paddleWidth = GAME_CONFIG.paddleWidth * scale;
    const paddleHeight = GAME_CONFIG.paddleHeight * scale;
    
    paddle = {
        x: canvas.width / 2 - paddleWidth / 2,
        y: canvas.height - paddleHeight - 10,
        width: paddleWidth,
        height: paddleHeight
    };
    
    // 원래 패들 너비 저장 (스케일 적용)
    gameStats.originalPaddleWidth = paddleWidth;
    
    resetBalls();
    createBricks();
    gameState = 'ready';
    gameStats.activeBalls = 1;
}

function resetBalls() {
    // 캔버스 크기에 비례하여 공 크기 조정
    const scale = canvas.width / 800;
    const ballRadius = GAME_CONFIG.ballRadius * scale;
    
    balls = [{
        x: canvas.width / 2,
        y: canvas.height - 30 * scale,
        dx: 0,
        dy: 0,
        radius: ballRadius,
        launched: false,
        active: true
    }];
    gameStats.activeBalls = 1;
}

function createBricks() {
    bricks = [];
    const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'];
    const points = [35, 30, 25, 20, 15, 10];
    
    // 캔버스 크기에 비례하여 벽돌 크기 조정
    const scale = canvas.width / 800;
    const brickWidth = GAME_CONFIG.brickWidth * scale;
    const brickHeight = GAME_CONFIG.brickHeight * scale;
    const brickPadding = GAME_CONFIG.brickPadding * scale;
    const brickOffsetTop = GAME_CONFIG.brickOffsetTop * scale;
    const brickOffsetLeft = GAME_CONFIG.brickOffsetLeft * scale;
    
    for (let row = 0; row < GAME_CONFIG.brickRows; row++) {
        for (let col = 0; col < GAME_CONFIG.brickCols; col++) {
            bricks.push({
                x: col * (brickWidth + brickPadding) + brickOffsetLeft,
                y: row * (brickHeight + brickPadding) + brickOffsetTop,
                width: brickWidth,
                height: brickHeight,
                visible: true,
                color: colors[row],
                points: points[row],
                isPink: false,
                isBlack: false,
                isBrownMultiHit: false,
                isRainbow: false,
                hits: 0,
                maxHits: 1,
                blinkTimer: 0,
                crackLevel: 0,
                rainbowHue: 0,
                cracks: [],
                hasBeenSpecial: false
            });
        }
    }
    
    gameStats.totalSpecialBricksCreated = 0;
    gameStats.bricksLeft = bricks.filter(brick => brick.visible).length;
}

// 크랙 패턴 미리 생성 함수들
function generateCrackPattern(brick) {
    brick.cracks = [];
    for (let i = 0; i < 5; i++) {
        brick.cracks.push({
            startX: brick.x + (brick.width / 5) * (i + 1),
            startY: brick.y + Math.random() * brick.height,
            endX: brick.x + (brick.width / 5) * (i + 1) + Math.random() * 20 - 10,
            endY: brick.y + brick.height - Math.random() * brick.height
        });
    }
}

function generateRainbowCrackPattern(brick) {
    brick.cracks = [];
    for (let i = 0; i < 10; i++) {
        brick.cracks.push({
            startX: brick.x + (brick.width / 10) * (i + 1),
            startY: brick.y + Math.random() * brick.height,
            midX: brick.x + brick.width/2 + Math.random() * 20 - 10,
            midY: brick.y + brick.height/2,
            endX: brick.x + brick.width - (brick.width / 10) * (i + 1),
            endY: brick.y + brick.height - Math.random() * brick.height
        });
    }
}

function addNewBallAutomatically() {
    if (balls.length < GAME_CONFIG.maxBalls) {
        const scale = canvas.width / 800;
        const ballRadius = gameStats.ballSizeTimer > 0 ? 
            Math.min((GAME_CONFIG.ballRadius + 6) * scale, 16 * scale) : GAME_CONFIG.ballRadius * scale;
        
        const angle = (Math.random() * Math.PI/3) + Math.PI/3;
        const speed = GAME_CONFIG.ballSpeed * scale;
        const newBall = {
            x: paddle.x + paddle.width / 2,
            y: paddle.y - ballRadius,
            dx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
            dy: -Math.sin(angle) * speed,
            radius: ballRadius,
            launched: true,
            active: true
        };
        
        balls.push(newBall);
        gameStats.activeBalls = balls.filter(ball => ball.active).length;
    }
}

function increaseBallSize() {
    const scale = canvas.width / 800;
    gameStats.ballSizeTimer = 900; // 15초
    balls.forEach(ball => {
        if (ball.active) {
            ball.radius = Math.min((GAME_CONFIG.ballRadius + 6) * scale, 16 * scale);
        }
    });
}

function expandPaddle() {
    const expandedWidth = Math.min(canvas.width * 0.6, 250);
    paddle.width = expandedWidth;
    gameStats.paddleExpandTimer = 600; // 10초
    
    if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }
}

function addCanvasBorderGlow(color) {
    const canvas = document.getElementById('gameCanvas');
    
    canvas.classList.remove('brick-glow');

    // 무지개 벽돌 특별 처리
    if (color === '#FF00FF') {
        // 무지개 효과: 여러 색상을 순서대로 변경
        const rainbowColors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'];
        let colorIndex = 0;
        
        const rainbowInterval = setInterval(() => {
            canvas.style.setProperty('--glow-color', rainbowColors[colorIndex]);
            canvas.classList.remove('brick-glow');
            setTimeout(() => canvas.classList.add('brick-glow'), 10);
            
            colorIndex++;
            if (colorIndex >= rainbowColors.length) {
                clearInterval(rainbowInterval);
                canvas.classList.remove('brick-glow');
            }
        }, 80); // 0.08초마다 색상 변경
        
        return;
    }

    // 일반 벽돌 처리
    canvas.style.setProperty('--glow-color', color);
    canvas.classList.add('brick-glow');
    
    setTimeout(() => {
        canvas.classList.remove('brick-glow');
    }, 300);
}

function setupEventListeners() {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    // 화면 크기 변경 시 캔버스 크기 조정 및 게임 객체 재배치
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resizeCanvas();
            // 게임 중이면 일시정지
            if (gameState === 'playing') {
                pauseGame();
            }
        }, 250);
    });
    
    // 화면 방향 변경 감지
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            resizeCanvas();
            if (gameState === 'playing') {
                pauseGame();
            }
        }, 300);
    });
    
    [elements.helpModal, elements.statsModal, elements.gameOverModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    if (modal === elements.gameOverModal) resetGame();
                }
            });
        }
    });
}

function handleKeyDown(e) {
    switch(e.key) {
        case 'ArrowLeft': keys.left = true; break;
        case 'ArrowRight': keys.right = true; break;
        case ' ':
            e.preventDefault();
            if (gameState === 'ready') launchBall();
            else if (gameState === 'playing' || gameState === 'paused') pauseGame();
            break;
        case 'r': case 'R': resetGame(); break;
        case 'h': case 'H': showHelp(); break;
        case 'Escape':
            if (elements.helpModal?.style.display === 'flex') closeHelp();
            else if (elements.statsModal?.style.display === 'flex') closeStats();
            else if (elements.gameOverModal?.style.display === 'flex') closeModal();
            else goHome();
            break;
    }
}

function handleKeyUp(e) {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
}

function handleMouseMove(e) {
    if (gameState === 'playing' || gameState === 'ready') {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, mouseX - paddle.width / 2));
        
        balls.forEach(ball => {
            if (!ball.launched && ball.active) {
                ball.x = paddle.x + paddle.width / 2;
            }
        });
    }
}

function handleCanvasClick(e) {
    if (gameState === 'ready') launchBall();
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    
    paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, touchX - paddle.width / 2));
    
    balls.forEach(ball => {
        if (!ball.launched && ball.active) {
            ball.x = paddle.x + paddle.width / 2;
        }
    });
}

function handleTouchStart(e) {
    e.preventDefault();
    if (gameState === 'ready') launchBall();
}

function launchBall() {
    const scale = canvas.width / 800;
    const speed = GAME_CONFIG.ballSpeed * scale;
    
    balls.forEach(ball => {
        if (!ball.launched && ball.active) {
            const angle = (Math.random() * Math.PI/3) + Math.PI/3;
            ball.dx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
            ball.dy = -Math.sin(angle) * speed;
            ball.launched = true;
        }
    });
    
    if (gameState === 'ready') {
        gameState = 'playing';
        gameStartTime = Date.now();
        elements.gameOverlay.classList.add('hidden');
        setGameMessage('좌우 키로 패들을 움직이세요!', 0);
    }
}

function startGame() {
    if (gameState === 'ready') {
        launchBall();
    } else if (gameState === 'gameOver' || gameState === 'levelComplete') {
        resetGame();
    }
}

function pauseGame() {
    if (gameState === 'playing') {
        gameState = 'paused';
        elements.gameOverlay.classList.remove('hidden');
        elements.overlayTitle.textContent = '⏸️ 게임 일시정지';
        elements.overlayMessage.textContent = '스페이스바를 눌러 계속하세요';
        setGameMessage('게임이 일시정지되었습니다.', 0);
    } else if (gameState === 'paused') {
        gameState = 'playing';
        elements.gameOverlay.classList.add('hidden');
        setGameMessage('좌우 키로 패들을 움직이세요!', 0);
    }
}

function resetGame() {
    if (gameStartTime > 0) {
        const sessionTime = Math.floor((Date.now() - gameStartTime) / 1000 / 60);
        allTimeStats.totalPlayTime += sessionTime;
        localStorage.setItem('brickBreakerPlayTime', allTimeStats.totalPlayTime);
    }
    
    gameState = 'ready';
    gameStats.score = 0;
    gameStats.lives = 3;
    gameStats.level = 1;
    gameStats.combo = 0;
    gameStats.bricksDestroyed = 0;
    gameStats.activeBalls = 1;
    gameStats.paddleExpandTimer = 0;
    gameStats.ballSizeTimer = 0;
    gameStats.lastBonusLifeLevel = 0;
    gameStartTime = 0;
    
    if (messageTimeout) {
        clearTimeout(messageTimeout);
        messageTimeout = null;
    }
    
    GAME_CONFIG.ballSpeed = 3;
    
    elements.gameOverlay.classList.remove('hidden');
    elements.overlayTitle.textContent = '🎮 게임 준비!';
    elements.overlayMessage.textContent = '스페이스바를 눌러 공을 발사하세요';
    setGameMessage('스페이스바를 눌러 시작하세요!', 0);
    
    initializeGame();
    updateUI();
}

function gameLoop() {
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

function update() {
    if (gameState !== 'playing') return;
    
    const scale = canvas.width / 800;
    const paddleSpeed = GAME_CONFIG.paddleSpeed * scale;
    
    // 패들 이동
    if (keys.left && paddle.x > 0) paddle.x -= paddleSpeed;
    if (keys.right && paddle.x < canvas.width - paddle.width) paddle.x += paddleSpeed;
    
    // 모든 공 업데이트
    balls.forEach(ball => {
        if (!ball.active) return;
        
        if (!ball.launched) {
            ball.x = paddle.x + paddle.width / 2;
            return;
        }
        
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        // 벽과 충돌 체크
        if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
            ball.dx = -ball.dx;
        }
        if (ball.y - ball.radius < 0) {
            ball.dy = -ball.dy;
        }
        
        // 패들과 충돌 체크
        if (ball.y + ball.radius > paddle.y && 
            ball.x > paddle.x && ball.x < paddle.x + paddle.width && ball.dy > 0) {
            const hitPos = (ball.x - paddle.x) / paddle.width;
            const angle = (hitPos - 0.5) * Math.PI/3;
            const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            ball.dx = speed * Math.sin(angle);
            ball.dy = -speed * Math.cos(angle);
            
            if (Math.abs(ball.dy) < 2 * scale) {
                ball.dy = ball.dy > 0 ? 2 * scale : -2 * scale;
            }
        }
        
        // 공이 바닥에 떨어짐
        if (ball.y + ball.radius > canvas.height) {
            ball.active = false;
            gameStats.activeBalls = balls.filter(b => b.active).length;
            
            if (gameStats.activeBalls <= 0) {
                gameStats.lives--;
                gameStats.combo = 0;
                
                if (gameStats.lives <= 0) {
                    gameOver();
                    return;
                } else {
                    resetBalls();
                    gameState = 'ready';
                    elements.gameOverlay.classList.remove('hidden');
                    elements.overlayTitle.textContent = '💥 모든 공을 놓쳤습니다!';
                    elements.overlayMessage.textContent = `남은 생명: ${gameStats.lives}개. 스페이스바로 다시 시작하세요`;
                    setGameMessage(`생명이 하나 줄었습니다! 남은 생명: ${gameStats.lives}개`, 0);
                }
            }
        }
    });
    
    // 타이머 업데이트
    if (gameStats.paddleExpandTimer > 0) {
        gameStats.paddleExpandTimer--;
        if (gameStats.paddleExpandTimer === 0) {
            paddle.width = gameStats.originalPaddleWidth;
            if (paddle.x + paddle.width > canvas.width) {
                paddle.x = canvas.width - paddle.width;
            }
        }
    }

    if (gameStats.ballSizeTimer > 0) {
        gameStats.ballSizeTimer--;
        if (gameStats.ballSizeTimer === 0) {
            const scale = canvas.width / 800;
            balls.forEach(ball => {
                if (ball.active) ball.radius = GAME_CONFIG.ballRadius * scale;
            });
        }
    }

    // 특수 벽돌 효과 업데이트
    bricks.forEach(brick => {
        if (brick.isBlack && brick.visible) {
            brick.blinkTimer++;
            if (brick.blinkTimer >= 120) {
                brick.visible = false;
                brick.blinkTimer = 0;
            }
        } else if (brick.isBlack && !brick.visible) {
            brick.blinkTimer++;
            if (brick.blinkTimer >= 150) {
                brick.visible = true;
                brick.blinkTimer = 0;
            }
        }
    });
    
    // 벽돌과 충돌 체크
    balls.forEach(ball => {
        if (!ball.active || !ball.launched) return;
        
        for (let brick of bricks) {
            if (brick.visible && 
                ball.x + ball.radius > brick.x && 
                ball.x - ball.radius < brick.x + brick.width &&
                ball.y + ball.radius > brick.y && 
                ball.y - ball.radius < brick.y + brick.height) {
                
                ball.dy = -ball.dy;
                
                // 다중타격 벽돌 처리
                if (brick.isBrownMultiHit || brick.isRainbow) {
                    brick.hits++;
                    brick.crackLevel = Math.floor((brick.hits / brick.maxHits) * (brick.cracks.length));
                    
                    if (brick.hits >= brick.maxHits) {
                        brick.visible = false;
                        
                        if (brick.isRainbow) {
                            expandPaddle();
                            setGameMessage('무지개 벽돌 파괴! 패들이 확장되었습니다!');
                        } else {
                            increaseBallSize();
                            setGameMessage('갈색 벽돌 파괴! 공이 커졌습니다!');
                        }
                    }
                } else {
                    brick.visible = false;
                }
                
                if (!brick.visible) {
                    gameStats.score += brick.points + (gameStats.combo * 5);
                    gameStats.combo++;
                    gameStats.maxCombo = Math.max(gameStats.maxCombo, gameStats.combo);
                    gameStats.bricksLeft--;
                    gameStats.bricksDestroyed++;
                    
                    allTimeStats.totalBricksDestroyed++;
                    localStorage.setItem('brickBreakerTotalBricks', allTimeStats.totalBricksDestroyed);
                    
                    addCanvasBorderGlow(brick.color);

                    if (gameStats.combo > allTimeStats.maxComboRecord) {
                        allTimeStats.maxComboRecord = gameStats.combo;
                        localStorage.setItem('brickBreakerMaxCombo', allTimeStats.maxComboRecord);
                    }
                    
                    // 특수 벽돌 생성 체크
                    if (!brick.isPink && !brick.isBlack && !brick.isBrownMultiHit && !brick.isRainbow && 
                        !brick.hasBeenSpecial && gameStats.totalSpecialBricksCreated < 10) {
                        
                        let specialBrickCreated = false;
                        
                        let possibleSpecials = [];
                        if (gameStats.level >= 7) possibleSpecials.push('pink');
                        if (gameStats.level >= 10) possibleSpecials.push('black');  
                        if (gameStats.level >= 12) possibleSpecials.push('brown');
                        if (gameStats.level >= 15) possibleSpecials.push('rainbow');
                        
                        possibleSpecials.forEach(type => {
                            if (!specialBrickCreated) {
                                let shouldCreate = false;
                                
                                switch(type) {
                                    case 'pink':
                                        shouldCreate = Math.random() < GAME_CONFIG.pinkBrickChance;
                                        break;
                                    case 'black':
                                        shouldCreate = Math.random() < GAME_CONFIG.blackBrickChance;
                                        break;
                                    case 'brown':
                                        shouldCreate = Math.random() < GAME_CONFIG.brownBrickChance;
                                        break;
                                    case 'rainbow':
                                        shouldCreate = Math.random() < GAME_CONFIG.rainbowBrickChance;
                                        break;
                                }
                                
                                if (shouldCreate) {
                                    brick.visible = true;
                                    brick.hasBeenSpecial = true;
                                    gameStats.bricksLeft++;
                                    gameStats.totalSpecialBricksCreated++;
                                    specialBrickCreated = true;
                                    
                                    switch(type) {
                                        case 'pink':
                                            brick.isPink = true;
                                            brick.color = '#FF69B4';
                                            brick.points = 30;
                                            setGameMessage('벽돌이 분홍색으로 변했습니다!', 2000);
                                            break;
                                        case 'black':
                                            brick.isBlack = true;
                                            brick.color = '#2F2F2F';
                                            brick.points = 40;
                                            setGameMessage('벽돌이 검정색으로 변했습니다!', 2000);
                                            break;
                                        case 'brown':
                                            brick.isBrownMultiHit = true;
                                            brick.color = '#8B4513';
                                            brick.points = 45;
                                            brick.maxHits = 5;
                                            brick.hits = 0;
                                            generateCrackPattern(brick);
                                            setGameMessage('벽돌이 갈색으로 변했습니다!', 2000);
                                            break;
                                        case 'rainbow':
                                            brick.isRainbow = true;
                                            brick.color = '#FF00FF';
                                            brick.points = 50;
                                            brick.maxHits = 10;
                                            brick.hits = 0;
                                            generateRainbowCrackPattern(brick);
                                            setGameMessage('벽돌이 무지개색으로 변했습니다!', 2000);
                                            break;
                                    }
                                }
                            }
                        });
                    }
                    
                    // 멀티볼 체크
                    if (!brick.isPink && !brick.isBlack && !brick.isBrownMultiHit && !brick.isRainbow && 
                        gameStats.level >= 3 && balls.length < GAME_CONFIG.maxBalls && 
                        Math.random() < GAME_CONFIG.multiBallChance) {
                        addNewBallAutomatically();
                        setGameMessage(`벽돌 파괴! 새 공 추가! 현재 공: ${balls.length}개`, 2000);
                    }
                }
                
                break;
            }
        }
    });
    
    if (gameStats.bricksLeft <= 0) {
        levelComplete();
    }
    
    updateUI();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 배경 그라데이션
    const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width);
    gradient.addColorStop(0, 'rgba(0, 20, 40, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 10, 20, 0.9)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 벽돌 그리기
    bricks.forEach(brick => {
        if (!brick.visible) return;
        
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(brick.x, brick.y, brick.width, 3);
        
        // 특수 벽돌 표시
        drawSpecialBrickEffects(brick);
    });
    
    // 패들 그리기
    const paddleGradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
    paddleGradient.addColorStop(0, '#00ffff');
    paddleGradient.addColorStop(1, '#0088aa');
    ctx.fillStyle = paddleGradient;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
    
    // 모든 공 그리기
    balls.forEach((ball, index) => {
        if (!ball.active) return;
        
        const ballGradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius);
        ballGradient.addColorStop(0, '#ffffff');
        ballGradient.addColorStop(1, index === 0 ? '#00ffff' : '#dddddd');
        
        ctx.fillStyle = ballGradient;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        if (ball.launched && gameState === 'playing') {
            ctx.strokeStyle = index === 0 ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ball.x - ball.dx * 3, ball.y - ball.dy * 3);
            ctx.lineTo(ball.x, ball.y);
            ctx.stroke();
        }
    });
    
    // UI 표시
    const scale = canvas.width / 800;
    if (gameStats.combo > 1) {
        ctx.fillStyle = '#ffcc00';
        ctx.font = `${20 * scale}px Orbitron`;
        ctx.textAlign = 'center';
        ctx.fillText(`COMBO x${gameStats.combo}`, canvas.width/2, 40 * scale);
        ctx.strokeStyle = '#cc8800';
        ctx.lineWidth = 2;
        ctx.strokeText(`COMBO x${gameStats.combo}`, canvas.width/2, 40 * scale);
    }
    
    if (gameStats.activeBalls > 1) {
        ctx.fillStyle = '#00ff00';
        ctx.font = `${16 * scale}px Orbitron`;
        ctx.textAlign = 'right';
        ctx.fillText(`공 x${gameStats.activeBalls}`, canvas.width - 20 * scale, 30 * scale);
    }
}

function drawSpecialBrickEffects(brick) {
    if (brick.isPink) {
        ctx.strokeStyle = '#FF1493';
        ctx.lineWidth = 1;
        ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
    }
    
    if (brick.isBlack) {
        if (brick.blinkTimer > 30) {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
            ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        }
    }
    
    if (brick.isBrownMultiHit) {
        ctx.strokeStyle = '#CD853F';
        ctx.lineWidth = 1;
        ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
        
        if (brick.crackLevel > 0 && brick.cracks.length > 0) {
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 1;
            
            for (let i = 0; i < brick.crackLevel; i++) {
                if (i < brick.cracks.length) {
                    const crack = brick.cracks[i];
                    ctx.beginPath();
                    ctx.moveTo(crack.startX, crack.startY);
                    ctx.lineTo(crack.endX, crack.endY);
                    ctx.stroke();
                }
            }
        }
    }

    if (brick.isRainbow) {
        ctx.strokeStyle = '#FF00FF';
        ctx.lineWidth = 1;
        ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
        
        if (brick.crackLevel > 0 && brick.cracks.length > 0) {
            for (let i = 0; i < brick.crackLevel; i++) {
                if (i < brick.cracks.length) {
                    const crack = brick.cracks[i];
                    const crackHue = (brick.rainbowHue + i * 40) % 360;
                    ctx.strokeStyle = `hsl(${crackHue}, 100%, 60%)`;
                    ctx.lineWidth = 2;
                    
                    ctx.beginPath();
                    ctx.moveTo(crack.startX, crack.startY);
                    ctx.quadraticCurveTo(crack.midX, crack.midY, crack.endX, crack.endY);
                    ctx.stroke();
                }
            }
        }
    }
}

function levelComplete() {
    gameState = 'levelComplete';
    gameStats.level++;
    
    const bonus = gameStats.lives * 100 + gameStats.maxCombo * 50;
    gameStats.score += bonus;
    
    if (gameStats.level > allTimeStats.bestLevel) {
        allTimeStats.bestLevel = gameStats.level;
        localStorage.setItem('brickBreakerBestLevel', allTimeStats.bestLevel);
    }
    
    elements.gameOverlay.classList.remove('hidden');
    elements.overlayTitle.textContent = '🎉 레벨 완료!';
    elements.overlayMessage.textContent = `레벨 ${gameStats.level - 1} 완료! 보너스 점수: ${bonus}점`;
    setGameMessage(`축하합니다! 레벨 ${gameStats.level - 1}을 완료했습니다!`, 0);
    
    setTimeout(() => {
        nextLevel();
    }, 2000);
}

function nextLevel() {
    // 10렙마다 생명 1개 추가
    const bonusLifeLevel = Math.floor(gameStats.level / 10) * 10;
    if (bonusLifeLevel > 0 && bonusLifeLevel > gameStats.lastBonusLifeLevel) {
        gameStats.lives++;
        gameStats.lastBonusLifeLevel = bonusLifeLevel;
        
        elements.overlayTitle.textContent = `🎁 레벨 ${gameStats.level} 달성!`;
        elements.overlayMessage.textContent = `보너스 생명 획득! (현재 생명: ${gameStats.lives}개)`;
        setGameMessage(`레벨 ${gameStats.level} 달성! 보너스 생명을 획득했습니다! (현재 생명: ${gameStats.lives}개)`, 0);
        
        setTimeout(() => {
            proceedToNextLevel();
        }, 3000);
        return;
    }
    
    proceedToNextLevel();
}

function proceedToNextLevel() {
    const scale = canvas.width / 800;
    
    if (gameStats.level >= 5 && GAME_CONFIG.ballSpeed < GAME_CONFIG.maxBallSpeed) {
        GAME_CONFIG.ballSpeed = Math.min(GAME_CONFIG.maxBallSpeed, GAME_CONFIG.ballSpeed + GAME_CONFIG.ballSpeedIncrease);
    }
    
    balls.forEach(ball => {
        if (ball.active && ball.launched) {
            const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            const targetSpeed = GAME_CONFIG.ballSpeed * scale;
            const ratio = targetSpeed / currentSpeed;
            ball.dx *= ratio;
            ball.dy *= ratio;
        }
    });
    
    createBricks();
    resetBalls();
    gameStats.combo = 0;
    
    gameState = 'ready';
    elements.overlayTitle.textContent = `🚀 레벨 ${gameStats.level}`;
    elements.overlayMessage.textContent = '스페이스바를 눌러 계속하세요!';
    
    // 레벨별 특별 메시지
    let levelMessage = `레벨 ${gameStats.level} 시작!`;
    
    if (gameStats.level === 3) {
        levelMessage = `레벨 ${gameStats.level} 시작! 이제 멀티볼을 얻을 수 있습니다! (30% 확률)`;
    } else if (gameStats.level === 5) {
        levelMessage = `레벨 ${gameStats.level} 시작! 이제부터 속도가 증가합니다!`;
    } else if (gameStats.level === 7) {
        levelMessage = `레벨 ${gameStats.level} 시작! 분홍 벽돌이 벽돌 파괴시 생성됩니다! (40% 확률)`;
    } else if (gameStats.level === 10) {
        levelMessage = `레벨 ${gameStats.level} 시작! 검정 벽돌이 등장합니다! (35% 확률, 깜빡임)`;
    } else if (gameStats.level === 12) {
        levelMessage = `레벨 ${gameStats.level} 시작! 갈색 벽돌이 등장합니다! (25% 확률, 5타격)`;
    } else if (gameStats.level === 15) {
        levelMessage = `레벨 ${gameStats.level} 시작! 무지개 벽돌이 등장합니다! (20% 확률, 10타격)`;
    } else if (gameStats.level > 15) {
        const speedText = GAME_CONFIG.ballSpeed >= GAME_CONFIG.maxBallSpeed ? '최고속도!' : `속도: ${GAME_CONFIG.ballSpeed.toFixed(1)}`;
        levelMessage = `레벨 ${gameStats.level} 시작! ${speedText}`;
    }
    
    setGameMessage(levelMessage, 0);
    updateUI();
}

function gameOver() {
    gameState = 'gameOver';
    
    if (gameStartTime > 0) {
        const sessionTime = Math.floor((Date.now() - gameStartTime) / 1000 / 60);
        allTimeStats.totalPlayTime += sessionTime;
        localStorage.setItem('brickBreakerPlayTime', allTimeStats.totalPlayTime);
    }
    
    allTimeStats.totalGames++;
    localStorage.setItem('brickBreakerTotalGames', allTimeStats.totalGames);
    
    if (gameStats.level > 1) {
        allTimeStats.gamesCompleted++;
        localStorage.setItem('brickBreakerGamesCompleted', allTimeStats.gamesCompleted);
    }
    
    if (gameStats.score > gameStats.highScore) {
        gameStats.highScore = gameStats.score;
        localStorage.setItem('brickBreakerHighScore', gameStats.highScore);
        elements.modalTitle.textContent = '🏆 새로운 최고점수!';
        elements.modalTitle.style.color = '#ffff00';
        elements.modalMessage.textContent = '축하합니다! 새로운 기록을 세웠습니다!';
    } else {
        elements.modalTitle.textContent = '💥 게임 오버';
        elements.modalTitle.style.color = '#ff0000';
        elements.modalMessage.textContent = '모든 생명을 잃었습니다. 다시 도전해보세요!';
    }
    
    elements.finalScore.textContent = gameStats.score;
    elements.finalLevel.textContent = gameStats.level;
    elements.gameOverModal.style.display = 'flex';
    
    updateUI();
}

function closeModal() {
    elements.gameOverModal.style.display = 'none';
    resetGame();
}

function showHelp() {
    if (elements.helpModal) elements.helpModal.style.display = 'flex';
}

function closeHelp() {
    if (elements.helpModal) elements.helpModal.style.display = 'none';
}

function showStats() {
    if (elements.statsModal) {
        updateStatsModal();
        elements.statsModal.style.display = 'flex';
    }
}

function closeStats() {
    if (elements.statsModal) elements.statsModal.style.display = 'none';
}

function updateStatsModal() {
    const updates = {
        modalHighScore: gameStats.highScore,
        modalBestLevel: allTimeStats.bestLevel,
        modalMaxCombo: allTimeStats.maxComboRecord,
        modalTotalGames: allTimeStats.totalGames,
        modalGamesCompleted: allTimeStats.gamesCompleted,
        modalTotalBricks: allTimeStats.totalBricksDestroyed,
        modalPlayTime: allTimeStats.totalPlayTime + '분',
        modalAvgScore: allTimeStats.totalGames > 0 ? Math.round(gameStats.highScore / Math.max(1, allTimeStats.totalGames)) : 0
    };
    
    Object.entries(updates).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}

function resetStats() {
    if (confirm('정말로 모든 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        const keys = ['brickBreakerHighScore', 'brickBreakerTotalGames', 'brickBreakerGamesCompleted', 
                     'brickBreakerTotalBricks', 'brickBreakerBestLevel', 'brickBreakerMaxCombo', 'brickBreakerPlayTime'];
        keys.forEach(key => localStorage.removeItem(key));
        
        gameStats.highScore = 0;
        Object.assign(allTimeStats, {
            totalGames: 0, gamesCompleted: 0, totalBricksDestroyed: 0,
            bestLevel: 1, maxComboRecord: 0, totalPlayTime: 0
        });
        
        updateUI();
        updateStatsModal();
        alert('모든 기록이 삭제되었습니다!');
    }
}

function updateUI() {
    const updates = {
        score: gameStats.score,
        lives: gameStats.lives,
        level: gameStats.level,
        highScore: gameStats.highScore,
        bricksLeft: gameStats.bricksLeft,
        combo: gameStats.combo
    };
    
    Object.entries(updates).forEach(([key, value]) => {
        if (elements[key]) elements[key].textContent = value;
    });
}

function goHome() {
    if (confirm('게임을 종료하고 메인 페이지로 돌아가시겠습니까?')) {
        if (animationId) cancelAnimationFrame(animationId);
        window.location.href = 'index.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    init();
    
    setTimeout(() => {
        if (gameState === 'ready') {
            setGameMessage('좌우 키나 마우스로 패들을 조작하세요!', 0);
        }
    }, 3000);
    
    setTimeout(() => {
        if (gameState === 'ready') {
            setGameMessage('H키로 도움말, R키로 재시작, ESC키로 메인으로 돌아갈 수 있습니다.', 0);
        }
    }, 6000);
});

window.addEventListener('beforeunload', () => {
    if (animationId) cancelAnimationFrame(animationId);
    
    if (messageTimeout) {
        clearTimeout(messageTimeout);
    }
    
    if (gameStartTime > 0) {
        const sessionTime = Math.floor((Date.now() - gameStartTime) / 1000 / 60);
        allTimeStats.totalPlayTime += sessionTime;
        localStorage.setItem('brickBreakerPlayTime', allTimeStats.totalPlayTime);
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState === 'playing') {
        pauseGame();
    }
});

function safeExecute(fn, fallback = () => {}) {
    try {
        return fn();
    } catch (error) {
        console.error('Game error:', error);
        return fallback();
    }
}