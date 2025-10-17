// 게임 상태 변수들
let canvas, ctx;
let gameState = 'ready'; // 'ready', 'playing', 'paused', 'gameOver', 'bossWarning'
let animationId;

// 게임 객체들
let player, lasers = [], enemies = [], explosions = [], items = [], allies = [], bossBullets = [];

// 플레이어 업그레이드 상태
let playerUpgrades = {
    doubleLaser: false,
    doubleLaserEndTime: 0,
    tripleLaser: false,
    tripleLaserEndTime: 0,
    hasAlly: false,
    krasthusLaser: false,  // 크라스투스 레이저로 변경
    krasthusLaserEndTime: 0
};

// 게임 설정
const GAME_CONFIG = {
    playerWidth: 40,
    playerHeight: 30,
    playerSpeed: 6,
    laserWidth: 4,
    laserHeight: 15,
    laserSpeed: 6,
    enemyWidth: 35,
    enemyHeight: 25,
    enemySpeed: 2,
    enemySpawnRate: 1500,
    laserCooldown: 200
};
// 게임 설정을 동적으로 계산하는 함수 추가 
function getScaledConfig() {
    const baseWidth = 800;
    const scale = canvas.width / baseWidth;
    
    return {
        playerWidth: 40 * scale,
        playerHeight: 30 * scale,
        playerSpeed: 6 * scale,
        laserWidth: 4 * scale,
        laserHeight: 15 * scale,
        laserSpeed: 6 * scale,
        enemyWidth: 35 * scale,
        enemyHeight: 25 * scale,
        enemySpeed: 2 * scale,
        enemySpawnRate: 1500,
        laserCooldown: 200
    };
}
// 게임 상태
let gameStats = {
    score: 0,
    lives: 3,
    level: 1,
    highScore: localStorage.getItem('spaceshipHighScore') || 0,
    enemiesKilled: 0,
    combo: 0,
    maxCombo: 0
};

// 전체 통계 데이터
let allTimeStats = {
    totalGames: parseInt(localStorage.getItem('spaceshipTotalGames')) || 0,
    gamesCompleted: parseInt(localStorage.getItem('spaceshipGamesCompleted')) || 0,
    totalEnemiesKilled: parseInt(localStorage.getItem('spaceshipTotalEnemies')) || 0,
    bestLevel: parseInt(localStorage.getItem('spaceshipBestLevel')) || 1,
    maxComboRecord: parseInt(localStorage.getItem('spaceshipMaxCombo')) || 0
};

// 키 상태 및 타이밍
let keys = {
    left: false,
    right: false,
    space: false
};

let lastEnemySpawn = 0;
let lastLaserTime = 0;
let lastAllyLaserTime = 0;
let bossSpawned = {}; // 레벨별 보스 스폰 여부 추적
let currentBossType = '';
let bossDefeatedTime = 0; // 보스 처치 시간 추가

// DOM 요소들
const elements = {
    score: document.getElementById('score'),
    lives: document.getElementById('lives'),
    level: document.getElementById('level'),
    gameInfo: document.getElementById('gameInfo'),
    highScore: document.getElementById('highScore'),
    enemiesKilled: document.getElementById('enemiesKilled'),
    combo: document.getElementById('combo'),
    gameOverlay: document.getElementById('gameOverlay'),
    overlayTitle: document.getElementById('overlayTitle'),
    overlayMessage: document.getElementById('overlayMessage'),
    gameOverModal: document.getElementById('gameOverModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalMessage: document.getElementById('modalMessage'),
    finalScore: document.getElementById('finalScore'),
    finalLevel: document.getElementById('finalLevel'),
    finalEnemies: document.getElementById('finalEnemies'),
    helpModal: document.getElementById('helpModal'),
    statsModal: document.getElementById('statsModal')
};

// 폭발 효과 클래스
class Explosion {
    constructor(x, y, size = 1) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.particles = [];
        this.createParticles();
        this.life = 30;
    }
    
    createParticles() {
        const scale = canvas.width / 800;
        const particleCount = 15 * this.size;
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: (Math.random() - 0.5) * 8 * this.size * scale,
                vy: (Math.random() - 0.5) * 8 * this.size * scale,
                life: 30,
                maxLife: 30,
                color: `hsl(${Math.random() * 60 + 15}, 100%, 50%)`
            });
        }
    }
    
    update() {
        this.life--;
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.95;
            particle.vy *= 0.95;
            particle.life--;
        });
        
        this.particles = this.particles.filter(p => p.life > 0);
        return this.life > 0 && this.particles.length > 0;
    }
    
    draw() {
        const scale = canvas.width / 800;
        
        ctx.save();
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, 3 * this.size * scale, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
}

// 초기화
function init() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Cannot get canvas context');
        return;
    }
    
    // 모바일에서 스크롤 방지
    document.body.addEventListener('touchmove', (e) => {
        if (e.target.closest('.mobile-btn') || e.target === canvas) {
            e.preventDefault();
        }
    }, { passive: false });
    
    resizeCanvas();
    initializeGame();
    setupEventListeners();
    updateUI();
    gameLoop();
}

function resizeCanvas() {
    const container = canvas.parentElement;
    const maxWidth = Math.min(800, container.clientWidth - 40);
    const ratio = 500 / 800;
    
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    
    canvas.width = maxWidth;
    canvas.height = maxWidth * ratio;
    canvas.style.width = maxWidth + 'px';
    canvas.style.height = (maxWidth * ratio) + 'px';
    
    if (elements.gameOverlay) {
        elements.gameOverlay.style.width = maxWidth + 'px';
        elements.gameOverlay.style.height = (maxWidth * ratio) + 'px';
    }
    
    const scaleX = canvas.width / oldWidth;
    const scaleY = canvas.height / oldHeight;
    
    if (player && oldWidth > 0 && !isNaN(scaleX)) {
        player.x = player.x * scaleX;
        player.y = player.y * scaleY;
        player.width = player.width * scaleX;
        player.height = player.height * scaleY;
        
        allies.forEach(ally => {
            ally.x = ally.x * scaleX;
            ally.y = ally.y * scaleY;
            ally.width = ally.width * scaleX;
            ally.height = ally.height * scaleY;
            if (ally.targetX !== undefined) {
                ally.targetX = ally.targetX * scaleX;
                ally.targetY = ally.targetY * scaleY;
            }
        });
        
        enemies.forEach(enemy => {
            enemy.x = enemy.x * scaleX;
            enemy.y = enemy.y * scaleY;
            enemy.width = enemy.width * scaleX;
            enemy.height = enemy.height * scaleY;
        });
        
        lasers.forEach(laser => {
            laser.x = laser.x * scaleX;
            laser.y = laser.y * scaleY;
            laser.width = laser.width * scaleX;
            laser.height = laser.height * scaleY;
        });
        
        items.forEach(item => {
            item.x = item.x * scaleX;
            item.y = item.y * scaleY;
            item.width = item.width * scaleX;
            item.height = item.height * scaleY;
        });
        
        bossBullets.forEach(bullet => {
            bullet.x = bullet.x * scaleX;
            bullet.y = bullet.y * scaleY;
            bullet.width = bullet.width * scaleX;
            bullet.height = bullet.height * scaleY;
        });
        
        explosions.forEach(explosion => {
            explosion.x = explosion.x * scaleX;
            explosion.y = explosion.y * scaleY;
            explosion.size = explosion.size * scaleX;
            explosion.particles.forEach(particle => {
                particle.x = particle.x * scaleX;
                particle.y = particle.y * scaleY;
            });
        });
    }
}

function initializeGame() {
    const config = getScaledConfig();
    
    player = {
        x: canvas.width / 2 - config.playerWidth / 2,
        y: canvas.height - config.playerHeight - 15 * (canvas.width / 800),
        width: config.playerWidth,
        height: config.playerHeight
    };
    
    lasers = [];
    enemies = [];
    explosions = [];
    items = [];
    allies = [];
    bossBullets = [];
    bossSpawned = {};
    
    playerUpgrades = {
        doubleLaser: false,
        doubleLaserEndTime: 0,
        tripleLaser: false,
        tripleLaserEndTime: 0,
        hasAlly: false,
        krasthusLaser: false,
        krasthusLaserEndTime: 0
    };
    
    gameState = 'ready';
}
function setupEventListeners() {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    setupModalClickEvents();
    setupMobileControls(); // 추가
    
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resizeCanvas();
        }, 100);
    });
}
function setupMobileControls() {
    const btnLeft = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');
    const btnFire = document.getElementById('btnFire');
    
    if (!btnLeft || !btnRight || !btnFire) return;
    
    // 왼쪽 버튼
    btnLeft.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys.left = true;
    });
    
    btnLeft.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys.left = false;
    });
    
    btnLeft.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        keys.left = false;
    });
    
    // 오른쪽 버튼
    btnRight.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys.right = true;
    });
    
    btnRight.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys.right = false;
    });
    
    btnRight.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        keys.right = false;
    });
    
    // 발사 버튼
    btnFire.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys.space = true;
        
        if (gameState === 'ready') {
            startGame();
        } else if (gameState === 'bossWarning') {
            gameState = 'playing';
            elements.gameOverlay.classList.add('hidden');
            spawnBoss(currentBossType);
        }
    });
    
    btnFire.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys.space = false;
    });
    
    btnFire.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        keys.space = false;
    });
    
    // 마우스 이벤트도 추가 (데스크톱에서도 버튼 사용 가능)
    btnLeft.addEventListener('mousedown', () => keys.left = true);
    btnLeft.addEventListener('mouseup', () => keys.left = false);
    btnLeft.addEventListener('mouseleave', () => keys.left = false);
    
    btnRight.addEventListener('mousedown', () => keys.right = true);
    btnRight.addEventListener('mouseup', () => keys.right = false);
    btnRight.addEventListener('mouseleave', () => keys.right = false);
    
    btnFire.addEventListener('mousedown', () => {
        keys.space = true;
        if (gameState === 'ready') {
            startGame();
        } else if (gameState === 'bossWarning') {
            gameState = 'playing';
            elements.gameOverlay.classList.add('hidden');
            spawnBoss(currentBossType);
        }
    });
    btnFire.addEventListener('mouseup', () => keys.space = false);
    btnFire.addEventListener('mouseleave', () => keys.space = false);
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
        case 'ArrowLeft':
            keys.left = true;
            break;
        case 'ArrowRight':
            keys.right = true;
            break;
        case ' ':
            e.preventDefault();
            keys.space = true;
            if (gameState === 'ready') {
                startGame();
            } else if (gameState === 'bossWarning') {
                gameState = 'playing';
                elements.gameOverlay.classList.add('hidden');
                spawnBoss(currentBossType);
            }
            break;
        case 'p':
        case 'P':
            pauseGame();
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

function handleKeyUp(e) {
    switch(e.key) {
        case 'ArrowLeft':
            keys.left = false;
            break;
        case 'ArrowRight':
            keys.right = false;
            break;
        case ' ':
            keys.space = false;
            break;
    }
}

function startGame() {
    if (gameState === 'ready') {
        gameState = 'playing';
        
        allTimeStats.totalGames++;
        localStorage.setItem('spaceshipTotalGames', allTimeStats.totalGames);
        
        elements.gameOverlay.classList.add('hidden');
        elements.gameInfo.textContent = '좌우 키로 이동하고 스페이스바로 발사하세요!';
        lastEnemySpawn = Date.now();
    } else if (gameState === 'gameOver') {
        resetGame();
    }
}

function pauseGame() {
    if (gameState === 'playing') {
        gameState = 'paused';
        elements.gameOverlay.classList.remove('hidden');
        elements.overlayTitle.textContent = '⏸️ 게임 일시정지';
        elements.overlayMessage.textContent = 'P키를 눌러 계속하세요';
        elements.gameInfo.textContent = '게임이 일시정지되었습니다.';
    } else if (gameState === 'paused') {
        gameState = 'playing';
        elements.gameOverlay.classList.add('hidden');
        elements.gameInfo.textContent = '좌우 키로 이동하고 스페이스바로 발사하세요!';
    }
}

function resetGame() {
    gameState = 'ready';
    gameStats.score = 0;
    gameStats.lives = 3;
    gameStats.level = 1;
    gameStats.enemiesKilled = 0;
    gameStats.combo = 0;
    gameStats.maxCombo = 0;
    
    GAME_CONFIG.enemySpeed = 2;
    GAME_CONFIG.enemySpawnRate = 1500;
    
    elements.gameOverlay.classList.remove('hidden');
    elements.overlayTitle.textContent = '🎮 게임 준비!';
    elements.overlayMessage.textContent = '스페이스바를 눌러 게임을 시작하세요';
    elements.gameInfo.textContent = '스페이스바를 눌러 시작하세요!';
    
    initializeGame();
    updateUI();
}

function gameLoop() {
    update();
    updateExplosions();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

function update() {
    if (gameState !== 'playing') return;
    
    updatePlayer();
    
    if (keys.space) {
        shootLaser();
        shootAllyLaser();
    }
    
    spawnEnemies();
    updateLasers();
    updateEnemies();
    updateExplosions();
    updateItems();
    updateAllies();
    updateBossBullets();
    checkCollisions();
    checkLevelUp();
    updateUI();
}

function updatePlayer() {
    const config = getScaledConfig();
    
    if (keys.left && player.x > 0) {
        player.x -= config.playerSpeed;
    }
    if (keys.right && player.x < canvas.width - player.width) {
        player.x += config.playerSpeed;
    }
}

function shootLaser() {
    const config = getScaledConfig();
    const currentTime = Date.now();
    
    if (currentTime - lastLaserTime > config.laserCooldown) {
        if (playerUpgrades.tripleLaser && currentTime < playerUpgrades.tripleLaserEndTime) {
            const spacing = 12 * (canvas.width / 800);
            lasers.push(createLaser(player.x + player.width / 2 - config.laserWidth / 2 - spacing, 'triple'));
            lasers.push(createLaser(player.x + player.width / 2 - config.laserWidth / 2, 'triple'));
            lasers.push(createLaser(player.x + player.width / 2 - config.laserWidth / 2 + spacing, 'triple'));
        } else if (playerUpgrades.doubleLaser && currentTime < playerUpgrades.doubleLaserEndTime) {
            const spacing = 8 * (canvas.width / 800);
            lasers.push(createLaser(player.x + player.width / 2 - config.laserWidth / 2 - spacing, 'double'));
            lasers.push(createLaser(player.x + player.width / 2 - config.laserWidth / 2 + spacing, 'double'));
        } else {
            lasers.push(createLaser(player.x + player.width / 2 - config.laserWidth / 2, 'normal'));
        }
        lastLaserTime = currentTime;
    }
}
    // 크라스투스 레이저 효과 적용
function createLaser(x, type) {
    const config = getScaledConfig();
    const isKrasthus = playerUpgrades.krasthusLaser && Date.now() < playerUpgrades.krasthusLaserEndTime;
    
    return {
        x: x,
        y: player.y,
        width: isKrasthus ? config.laserWidth * 2.5 : config.laserWidth,
        height: config.laserHeight,
        speed: config.laserSpeed,
        type: type,
        isKrasthus: isKrasthus
    };
}

function shootAllyLaser() {
    if (!playerUpgrades.hasAlly || allies.length === 0) return;
    
    const config = getScaledConfig();
    const currentTime = Date.now();
    
    if (currentTime - lastAllyLaserTime > config.laserCooldown) {
        const isKrasthus = playerUpgrades.krasthusLaser && currentTime < playerUpgrades.krasthusLaserEndTime;
        const laserWidth = isKrasthus ? config.laserWidth * 2 : config.laserWidth;
        const spacing12 = 12 * (canvas.width / 800);
        const spacing8 = 8 * (canvas.width / 800);
        
        allies.forEach(ally => {
            let laserType = ally.color === 'purple' ? 'ally' : 'ally2';
            
            if (playerUpgrades.tripleLaser && currentTime < playerUpgrades.tripleLaserEndTime) {
                lasers.push({
                    x: ally.x + ally.width / 2 - laserWidth / 2 - spacing12,
                    y: ally.y,
                    width: laserWidth,
                    height: config.laserHeight,
                    speed: config.laserSpeed,
                    type: laserType,
                    isKrasthus: isKrasthus
                });
                lasers.push({
                    x: ally.x + ally.width / 2 - laserWidth / 2,
                    y: ally.y,
                    width: laserWidth,
                    height: config.laserHeight,
                    speed: config.laserSpeed,
                    type: laserType,
                    isKrasthus: isKrasthus
                });
                lasers.push({
                    x: ally.x + ally.width / 2 - laserWidth / 2 + spacing12,
                    y: ally.y,
                    width: laserWidth,
                    height: config.laserHeight,
                    speed: config.laserSpeed,
                    type: laserType,
                    isKrasthus: isKrasthus
                });
            } else if (playerUpgrades.doubleLaser && currentTime < playerUpgrades.doubleLaserEndTime) {
                lasers.push({
                    x: ally.x + ally.width / 2 - laserWidth / 2 - spacing8,
                    y: ally.y,
                    width: laserWidth,
                    height: config.laserHeight,
                    speed: config.laserSpeed,
                    type: laserType,
                    isKrasthus: isKrasthus
                });
                lasers.push({
                    x: ally.x + ally.width / 2 - laserWidth / 2 + spacing8,
                    y: ally.y,
                    width: laserWidth,
                    height: config.laserHeight,
                    speed: config.laserSpeed,
                    type: laserType,
                    isKrasthus: isKrasthus
                });
            } else {
                lasers.push({
                    x: ally.x + ally.width / 2 - laserWidth / 2,
                    y: ally.y,
                    width: laserWidth,
                    height: config.laserHeight,
                    speed: config.laserSpeed,
                    type: laserType,
                    isKrasthus: isKrasthus
                });
            }
        });
        lastAllyLaserTime = currentTime;
    }
}

function spawnEnemies() {
    const config = getScaledConfig();
    const currentTime = Date.now();
    
    if (currentTime - lastEnemySpawn > config.enemySpawnRate) {
        const hasBoss = enemies.some(enemy => enemy.type === 'boss' || enemy.type === 'midBoss');
        if (hasBoss) {
            return;
        }
        
        if (bossDefeatedTime > 0 && currentTime - bossDefeatedTime < 3000) {
            return;
        }
        
        if (gameStats.level % 10 === 0 && !bossSpawned[gameStats.level]) {
            startBossWarning('boss');
            return;
        } else if (gameStats.level % 5 === 0 && gameStats.level % 10 !== 0 && !bossSpawned[gameStats.level]) {
            startBossWarning('midBoss');
            return;
        }
        
        const rand = Math.random();
        let enemyType;
        
        if (rand < 0.5) {
            enemyType = 'normal';
        } else if (rand < 0.7) {
            enemyType = 'fast';
        } else if (rand < 0.85) {
            enemyType = 'tank';
        } else {
            enemyType = 'gray';
        }
        
        const enemy = createEnemy(enemyType);
        enemies.push(enemy);
        lastEnemySpawn = currentTime;
    }
}

function createEnemy(type) {
    const config = getScaledConfig();
    
    const enemy = {
        x: Math.random() * (canvas.width - config.enemyWidth),
        y: -config.enemyHeight,
        width: config.enemyWidth,
        height: config.enemyHeight,
        type: type,
        showHealthBar: false
    };
    
    switch (type) {
        case 'normal':
            enemy.speed = config.enemySpeed * 0.5;
            enemy.points = 10;
            enemy.hp = 1;
            enemy.maxHp = 1;
            break;
        case 'fast':
            enemy.speed = config.enemySpeed * 0.9;
            enemy.points = 20;
            enemy.hp = 1;
            enemy.maxHp = 1;
            enemy.width = config.enemyWidth * 1.1;
            enemy.height = config.enemyHeight * 1.1;
            break;
        case 'tank':
            enemy.speed = config.enemySpeed * 0.6;
            enemy.points = 40;
            enemy.hp = 4;
            enemy.maxHp = 4;
            enemy.width = config.enemyWidth * 1.3;
            enemy.height = config.enemyHeight * 1.3;
            break;
        case 'gray':
            enemy.speed = config.enemySpeed * 0.6;
            enemy.points = 15;
            enemy.hp = 3;
            enemy.maxHp = 3;
            break;
    }
    
    return enemy;
}
function startBossWarning(bossType) {
    gameState = 'bossWarning';
    currentBossType = bossType;
    
    // 기존 적들 폭발시키고 제거
    enemies.forEach(enemy => {
        let explosionSize = 1;
        if (enemy.type === 'tank') explosionSize = 1.5;
        else if (enemy.type === 'gray') explosionSize = 1.2;
        
        explosions.push(new Explosion(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            explosionSize
        ));
    });
    
    enemies.length = 0;
    
    elements.gameOverlay.classList.remove('hidden');
    
    if (bossType === 'boss') {
        elements.overlayTitle.textContent = '💀 보스 등장!';
        elements.overlayMessage.textContent = '스페이스바를 눌러 보스전을 시작하세요';
        elements.gameInfo.textContent = '🔥 보스가 등장합니다! 🔥';
    } else {
        elements.overlayTitle.textContent = '⚔️ 중간보스 등장!';
        elements.overlayMessage.textContent = '스페이스바를 눌러 중간보스전을 시작하세요';
        elements.gameInfo.textContent = '🔥 중간보스가 등장합니다! 🔥';
    }
    
    // 3초 후 자동으로 보스 스폰
    setTimeout(() => {
        if (gameState === 'bossWarning') {
            gameState = 'playing';
            elements.gameOverlay.classList.add('hidden');
            spawnBoss(bossType);
        }
    }, 3000);
}

function spawnBoss(bossType) {
    const config = getScaledConfig();
    bossSpawned[gameStats.level] = true;
    
    const boss = {
        x: canvas.width / 2 - config.enemyWidth * 1.5 / 2,
        y: -config.enemyHeight * 1.5,
        type: bossType,
        showHealthBar: true,
        lastShot: 0
    };
    
    if (bossType === 'boss') {
        const bossStage = Math.floor(gameStats.level / 10);
        
        boss.width = config.enemyWidth * 2.3;
        boss.height = config.enemyHeight * 2.3;
        boss.speed = config.enemySpeed * 0.1;
        boss.points = 120;
        boss.hp = Math.min(100, 20 + Math.floor((bossStage - 1) / 2) * 2);
        boss.maxHp = boss.hp;
        boss.shootCooldown = Math.max(400, 1500 - Math.floor((bossStage - 1) / 2) * 100);
        boss.bulletSpeed = Math.min(7, 4 + Math.floor((bossStage - 1) / 4) * 0.5) * (canvas.width / 800);
        boss.bulletCount = Math.min(12, 1 + Math.floor((bossStage - 1) / 2)); 
        boss.bossStage = bossStage;
        
        elements.gameInfo.textContent = `보스와의 결전입니다! (강화도: ${bossStage})`;
    } else {
        const midBossStage = Math.floor(gameStats.level / 10);
        
        boss.width = config.enemyWidth * 1.5;
        boss.height = config.enemyHeight * 1.5;
        boss.speed = config.enemySpeed * 0.2;
        boss.points = 80;
        boss.hp = Math.min(50, 12 + Math.floor(midBossStage / 2) * 1); 
        boss.maxHp = boss.hp;
        boss.shootCooldown = Math.max(1000, 2500 - Math.floor(midBossStage / 2) * 200);
        boss.bulletSpeed = Math.min(5, 4 + midBossStage * 0.2) * (canvas.width / 800);
        boss.bulletCount = Math.min(8, 1 + Math.floor(midBossStage / 2)); 
        boss.midBossStage = midBossStage;
        elements.gameInfo.textContent = `중간보스와의 대결입니다! (강화도: ${midBossStage})`;
    }
    
    enemies.push(boss);
}

function updateLasers() {
    lasers = lasers.filter(laser => {
        laser.y -= laser.speed;
        return laser.y > -laser.height;
    });
}

function updateEnemies() {
    enemies = enemies.filter(enemy => {
        enemy.y += enemy.speed;
        
        // 보스 공격 로직
        if ((enemy.type === 'boss' || enemy.type === 'midBoss') && enemy.y > 0) {
            const currentTime = Date.now();
            if (currentTime - enemy.lastShot > enemy.shootCooldown) {
                shootBossBullet(enemy);
                enemy.lastShot = currentTime;
            }
        }
        
        // 적이 화면 밖으로 나갔을 때 생명 처리
        if (enemy.y > canvas.height) {
            // 생명 감소
            if (enemy.type === 'boss' || enemy.type === 'midBoss') {
                gameStats.lives -= 2;
            } else {
                gameStats.lives--;
            }
            gameStats.combo = 0;
            
            // 플레이어 피격 효과 추가
            playerHitEffect();
            
            // 동료가 있으면 동료도 함께 희생
            if (allies.length > 0) {
                const sacrificeIndex = allies.length - 1;
                const sacrificeAlly = allies[sacrificeIndex];
                
                explosions.push(new Explosion(
                    sacrificeAlly.x + sacrificeAlly.width / 2,
                    sacrificeAlly.y + sacrificeAlly.height / 2,
                    1.2
                ));
                
                allies.splice(sacrificeIndex, 1);
                
                if (allies.length === 0) {
                    playerUpgrades.hasAlly = false;
                }
                
                elements.gameInfo.textContent = '동료 우주선이 함께 희생되었습니다!';
            } else {
                elements.gameInfo.textContent = '적이 지나갔습니다! 생명 감소!';
            }
            
            // 생명이 0 이하면 게임 오버
            if (gameStats.lives <= 0) {
                // 플레이어 사망 폭발 효과 추가
                explosions.push(new Explosion(
                    player.x + player.width / 2,
                    player.y + player.height / 2,
                    2.5
                ));
                gameOver();
            }
            
            return false; // 적 제거
        }
        
        return true;
    });
}

function shootBossBullet(boss) {
    const bulletSize = 10 * (canvas.width / 800);
    const bulletX = boss.x + boss.width / 2;
    const bulletY = boss.y + boss.height;
    const playerCenterX = player.x + player.width / 2;
    
    const dx = playerCenterX - bulletX;
    const dy = canvas.height - bulletY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const speed = boss.bulletSpeed || (4 * (canvas.width / 800));
    const bulletCount = boss.bulletCount || 1;
    
    if (boss.type === 'midBoss') {
        const vx = (dx / distance) * speed;
        const vy = (dy / distance) * speed;
        
        for (let i = 0; i < bulletCount; i++) {
            bossBullets.push({
                x: bulletX - bulletSize / 2,
                y: bulletY + (i * 15 * (canvas.width / 800)),
                width: bulletSize,
                height: bulletSize,
                vx: vx,
                vy: vy,
                bossType: boss.type
            });
        }
    } else {
        if (!boss.attackPattern) boss.attackPattern = 0;
        boss.attackPattern = (boss.attackPattern + 1) % 3;
        
        for (let i = 0; i < bulletCount; i++) {
            let offsetX = 0;
            let offsetVx, offsetVy;
            
            if (boss.attackPattern === 0) {
                const vx = (dx / distance) * speed;
                const vy = (dy / distance) * speed;
                
                if (bulletCount > 1) {
                    const angleOffset = (i - (bulletCount - 1) / 2) * 0.3;
                    const cos = Math.cos(angleOffset);
                    const sin = Math.sin(angleOffset);
                    offsetVx = vx * cos - vy * sin;
                    offsetVy = vx * sin + vy * cos;
                    offsetX = (i - (bulletCount - 1) / 2) * 15 * (canvas.width / 800);
                } else {
                    offsetVx = vx;
                    offsetVy = vy;
                }
            } else if (boss.attackPattern === 1) {
                const vx = (dx / distance) * speed;
                const vy = (dy / distance) * speed;
                offsetVx = vx;
                offsetVy = vy;
                offsetX = 0;
            } else {
                const randomAngle = Math.random() * Math.PI * 2;
                offsetVx = Math.cos(randomAngle) * speed;
                offsetVy = Math.sin(randomAngle) * speed;
                offsetX = (Math.random() - 0.5) * 30 * (canvas.width / 800);
            }
            
            bossBullets.push({
                x: bulletX - bulletSize / 2 + offsetX,
                y: bulletY,
                width: bulletSize,
                height: bulletSize,
                vx: offsetVx,
                vy: offsetVy,
                bossType: boss.type
            });
        }
    }
}

function updateBossBullets() {
    bossBullets = bossBullets.filter(bullet => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        if (bullet.x < -bullet.width || bullet.x > canvas.width || 
            bullet.y < -bullet.height || bullet.y > canvas.height) {
            return false;
        }
        
        return true;
    });
}

function updateExplosions() {
    explosions = explosions.filter(explosion => explosion.update());
}

function updateItems() {
    items = items.filter(item => {
        item.y += item.speed;
        
        if (item.y > canvas.height) {
            return false;
        }
        
        // 플레이어와 충돌 체크
        if (isColliding(player, item)) {
            applyItemEffect(item);
            return false;
        }
        
        // 동료 우주선과 충돌 체크
        for (let ally of allies) {
            if (isColliding(ally, item)) {
                applyItemEffect(item);
                return false;
            }
        }
        
        return true;
    });
    
    // 업그레이드 효과 시간 체크
    if (playerUpgrades.doubleLaser && Date.now() > playerUpgrades.doubleLaserEndTime) {
        playerUpgrades.doubleLaser = false;
    }
    
    if (playerUpgrades.tripleLaser && Date.now() > playerUpgrades.tripleLaserEndTime) {
        playerUpgrades.tripleLaser = false;
    }
    
    // 크라스투스 레이저 시간 체크
    if (playerUpgrades.krasthusLaser && Date.now() > playerUpgrades.krasthusLaserEndTime) {
        playerUpgrades.krasthusLaser = false;
    }
}

function updateAllies() {
    const scale = canvas.width / 800;
    
    if (playerUpgrades.hasAlly && allies.length > 0) {
        allies.forEach(ally => {
            if (ally.isMovingToPosition) {
                const dx = ally.targetX - ally.x;
                const dy = ally.targetY - ally.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 5 * scale) {
                    const speed = 6 * scale;
                    ally.x += (dx / distance) * speed;
                    ally.y += (dy / distance) * speed;
                } else {
                    ally.isMovingToPosition = false;
                    ally.x = ally.targetX;
                    ally.y = ally.targetY;
                }
            } else {
                let targetX, targetY;
                
                if (ally.side === 'left') {
                    targetX = player.x - 60 * scale;
                    targetY = player.y + 10 * scale;
                } else {
                    targetX = player.x + player.width + 60 * scale;
                    targetY = player.y + 10 * scale;
                }
                
                ally.x += (targetX - ally.x) * 0.1;
                ally.y += (targetY - ally.y) * 0.1;
            }
        });
    }
}

function applyItemEffect(item) {
    const config = getScaledConfig();
    const scale = canvas.width / 800;
    
    switch (item.type) {
        case 'doubleLaser':
            if (playerUpgrades.tripleLaser && Date.now() < playerUpgrades.tripleLaserEndTime) {
                return;
            }
            playerUpgrades.doubleLaser = true;
            playerUpgrades.doubleLaserEndTime = Date.now() + 15000;
            elements.gameInfo.textContent = '더블 레이저 획득! (15초간)';
            setTimeout(() => {
                if (gameState === 'playing') {
                    elements.gameInfo.textContent = '좌우 키로 이동하고 스페이스바로 발사하세요!';
                }
            }, 2000);
            break;
        case 'tripleLaser':
            playerUpgrades.tripleLaser = true;
            playerUpgrades.tripleLaserEndTime = Date.now() + 10000;
            playerUpgrades.doubleLaser = false;
            elements.gameInfo.textContent = '🔥 트리플 레이저 획득! (10초간) 🔥';
            setTimeout(() => {
                if (gameState === 'playing') {
                    elements.gameInfo.textContent = '좌우 키로 이동하고 스페이스바로 발사하세요!';
                }
            }, 2000);
            break;
        case 'extraLife':
            gameStats.lives += 3;
            
            if (allies.length < 2) {
                playerUpgrades.hasAlly = true;
                
                if (allies.length === 0) {
                    allies.push({
                        x: -100 * scale,
                        y: player.y + 10 * scale,
                        width: config.playerWidth * 0.8,
                        height: config.playerHeight * 0.8,
                        targetX: player.x - 60 * scale,
                        targetY: player.y + 10 * scale,
                        isMovingToPosition: true,
                        color: 'purple',
                        side: 'left'
                    });
                } else if (allies.length === 1) {
                    allies.push({
                        x: canvas.width + 100 * scale,
                        y: player.y + 10 * scale,
                        width: config.playerWidth * 0.8,
                        height: config.playerHeight * 0.8,
                        targetX: player.x + player.width + 60 * scale,
                        targetY: player.y + 10 * scale,
                        isMovingToPosition: true,
                        color: 'beige',
                        side: 'right'
                    });
                }
                
                if (allies.length === 1) {
                    elements.gameInfo.textContent = '❤️ 생명 +2, 동료 우주선 획득! ❤️';
                } else {
                    elements.gameInfo.textContent = '❤️ 생명 +2, 두 번째 동료 우주선 획득! ❤️';
                }
                
                setTimeout(() => {
                    if (gameState === 'playing') {
                        if (allies.length === 1) {
                            elements.gameInfo.textContent = '동료 우주선과 함께 싸우세요!';
                        } else {
                            elements.gameInfo.textContent = '두 동료 우주선과 함께 싸우세요!';
                        }
                    }
                }, 2000);
            } else {
                elements.gameInfo.textContent = '❤️ 생명 +2 획득! ❤️';
                setTimeout(() => {
                    if (gameState === 'playing') {
                        elements.gameInfo.textContent = '좌우 키로 이동하고 스페이스바로 발사하세요!';
                    }
                }, 2000);
            }
            break;
    }
}

function checkCollisions() {
    // 레이저와 적 충돌
    for (let i = lasers.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (isColliding(lasers[i], enemies[j])) {
                enemies[j].hp--;
                
                if (enemies[j].type === 'tank' || enemies[j].type === 'gray' || 
                    enemies[j].type === 'midBoss' || enemies[j].type === 'boss') {
                    enemies[j].showHealthBar = true;
                }
                
                lasers.splice(i, 1);
                
                if (enemies[j].hp <= 0) {
                    handleEnemyDeath(enemies[j], j);
                } else {
                    createHitEffect(enemies[j]);
                }
                
                break;
            }
        }
    }
    
    // 동료 우주선과 적 충돌
    for (let i = enemies.length - 1; i >= 0; i--) {
        for (let j = allies.length - 1; j >= 0; j--) {
            if (isColliding(allies[j], enemies[i])) {
                // 동료 우주선 폭발
                explosions.push(new Explosion(
                    allies[j].x + allies[j].width / 2,
                    allies[j].y + allies[j].height / 2,
                    1.2
                ));
                
                // 외계인 폭발
                let explosionSize = 1;
                if (enemies[i].type === 'tank') explosionSize = 1.5;
                else if (enemies[i].type === 'gray') explosionSize = 1.2;
                else if (enemies[i].type === 'midBoss') explosionSize = 2.5;
                else if (enemies[i].type === 'boss') explosionSize = 3.5;
                
                explosions.push(new Explosion(
                    enemies[i].x + enemies[i].width / 2,
                    enemies[i].y + enemies[i].height / 2,
                    explosionSize
                ));
                
                // 둘 다 제거
                allies.splice(j, 1);
                enemies.splice(i, 1);
                
                // 동료가 모두 사라졌으면 hasAlly false
                if (allies.length === 0) {
                    playerUpgrades.hasAlly = false;
                }
                
                elements.gameInfo.textContent = '동료 우주선이 적을 막아냈습니다!';
                
                break;
            }
        }
    }
    
    // 플레이어와 적 충돌 (동료가 있으면 동료가 먼저 희생)
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (isColliding(player, enemies[i])) {
            if (allies.length > 0) {
                // 동료가 있으면 동료가 대신 희생 (마지막 동료부터 = 베이지색부터)
                const sacrificeIndex = allies.length - 1;
                const sacrificeAlly = allies[sacrificeIndex];
                
                explosions.push(new Explosion(
                    sacrificeAlly.x + sacrificeAlly.width / 2,
                    sacrificeAlly.y + sacrificeAlly.height / 2,
                    1.2
                ));
                
                // 외계인도 폭발
                let explosionSize = 1;
                if (enemies[i].type === 'boss' || enemies[i].type === 'midBoss') explosionSize = 2;
                
                explosions.push(new Explosion(
                    enemies[i].x + enemies[i].width / 2,
                    enemies[i].y + enemies[i].height / 2,
                    explosionSize
                ));
                
                allies.splice(sacrificeIndex, 1); // 마지막 동료 제거
                enemies.splice(i, 1);
                gameStats.combo = 0;
                
                if (allies.length === 0) {
                    playerUpgrades.hasAlly = false;
                }
                
                elements.gameInfo.textContent = '동료 우주선이 당신을 구했습니다!';
                playerHitEffect();
            } else {
                // 동료가 없으면 기존 로직
                handlePlayerEnemyCollision(enemies[i], i);
            }
        }
    }
    
    // 보스 탄환과 플레이어 충돌
    for (let i = bossBullets.length - 1; i >= 0; i--) {
        if (isColliding(player, bossBullets[i])) {
            if (allies.length > 0) {
                // 동료가 있으면 동료가 대신 희생 (마지막 동료부터 = 베이지색부터)
                const sacrificeIndex = allies.length - 1;
                const sacrificeAlly = allies[sacrificeIndex];
                
                explosions.push(new Explosion(
                    sacrificeAlly.x + sacrificeAlly.width / 2,
                    sacrificeAlly.y + sacrificeAlly.height / 2,
                    1.2
                ));
                
                allies.splice(sacrificeIndex, 1);
                gameStats.combo = 0;
                
                if (allies.length === 0) {
                    playerUpgrades.hasAlly = false;
                }
                
                elements.gameInfo.textContent = '동료 우주선이 탄환을 막았습니다!';
                bossBullets.splice(i, 1);
                playerHitEffect();
            } else {
                handlePlayerBulletCollision(bossBullets[i], i);
            }
        }
    }
}

function handleEnemyDeath(enemy, index) {
    const config = getScaledConfig();
    const scale = canvas.width / 800;
    
    gameStats.score += enemy.points + (gameStats.combo * 3);
    gameStats.enemiesKilled++;
    gameStats.combo++;
    gameStats.maxCombo = Math.max(gameStats.maxCombo, gameStats.combo);
    
    allTimeStats.totalEnemiesKilled++;
    allTimeStats.maxComboRecord = Math.max(allTimeStats.maxComboRecord, gameStats.combo);
    localStorage.setItem('spaceshipTotalEnemies', allTimeStats.totalEnemiesKilled);
    localStorage.setItem('spaceshipMaxCombo', allTimeStats.maxComboRecord);
    
    if (enemy.type === 'gray') {
        items.push(createItem(enemy.x + enemy.width / 2 - 10 * scale, enemy.y + enemy.height / 2, 'doubleLaser'));
    }
    
    if (enemy.type === 'midBoss') {
        gameStats.lives += 1;
        playerUpgrades.krasthusLaser = true;
        playerUpgrades.krasthusLaserEndTime = Date.now() + 20000;
        
        elements.gameInfo.textContent = '⚔️ 중간보스 격파! 생명 +1, 크라스투스 레이저 획득! ⚔️';
        setTimeout(() => {
            if (gameState === 'playing') {
                elements.gameInfo.textContent = '크라스투스 레이저로 더욱 강력해졌습니다!';
            }
        }, 3000);
    }
    
    if (enemy.type === 'boss') {
        gameStats.lives += 1;
        
        playerUpgrades.tripleLaser = true;
        playerUpgrades.tripleLaserEndTime = Date.now() + 10000;
        playerUpgrades.doubleLaser = false;
        
        if (allies.length < 2) {
            playerUpgrades.hasAlly = true;
            
            if (allies.length === 0) {
                allies.push({
                    x: -100 * scale,
                    y: player.y + 10 * scale,
                    width: config.playerWidth * 0.8,
                    height: config.playerHeight * 0.8,
                    targetX: player.x - 60 * scale,
                    targetY: player.y + 10 * scale,
                    isMovingToPosition: true,
                    color: 'purple',
                    side: 'left'
                });
            } else if (allies.length === 1) {
                allies.push({
                    x: canvas.width + 100 * scale,
                    y: player.y + 10 * scale,
                    width: config.playerWidth * 0.8,
                    height: config.playerHeight * 0.8,
                    targetX: player.x + player.width + 60 * scale,
                    targetY: player.y + 10 * scale,
                    isMovingToPosition: true,
                    color: 'beige',
                    side: 'right'
                });
            }
        }
        
        bossDefeatedTime = Date.now();
        
        elements.gameInfo.textContent = '💀 보스 격파! 생명 +1, 트리플 레이저 & 동료 획득! 💀';
        setTimeout(() => {
            if (gameState === 'playing') {
                elements.gameInfo.textContent = '트리플 레이저와 동료 우주선으로 무적 상태!';
            }
        }, 3000);
    }
    
    // 폭발 효과 생성
    let explosionSize = 1;
    if (enemy.type === 'tank') explosionSize = 1.5;
    else if (enemy.type === 'gray') explosionSize = 1.2;
    else if (enemy.type === 'midBoss') explosionSize = 2.5;
    else if (enemy.type === 'boss') explosionSize = 3.5;
    
    explosions.push(new Explosion(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2,
        explosionSize
    ));
    
    enemies.splice(index, 1);
}

function createItem(x, y, type) {
    const scale = canvas.width / 800;
    
    const item = {
        x: x,
        y: y,
        speed: (type === 'extraLife' ? 2 : 3) * scale,
        type: type
    };
    
    if (type === 'doubleLaser' || type === 'tripleLaser') {
        item.width = 20 * scale;
        item.height = 20 * scale;
    } else {
        item.width = 24 * scale;
        item.height = 24 * scale;
    }
    
    return item;
}

function handlePlayerEnemyCollision(enemy, index) {
    let explosionSize = 1;
    if (enemy.type === 'boss' || enemy.type === 'midBoss') explosionSize = 2;
    
    explosions.push(new Explosion(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2,
        explosionSize
    ));
    
    if (enemy.type === 'boss' || enemy.type === 'midBoss') {
        gameStats.lives -= 2;
    } else {
        gameStats.lives--;
    }
    gameStats.combo = 0;
    
    if (playerUpgrades.hasAlly) {
        playerUpgrades.hasAlly = false;
        
        // 동료 우주선 폭발 효과
        if (allies.length > 0) {
            allies.forEach(ally => {
                explosions.push(new Explosion(
                    ally.x + ally.width / 2,
                    ally.y + ally.height / 2,
                    1.2
                ));
            });
        }
        
        allies = [];
        elements.gameInfo.textContent = '동료 우주선을 잃었습니다!';
    }
    
    enemies.splice(index, 1);
    playerHitEffect();
    
    if (gameStats.lives <= 0) {
        // 플레이어 사망 폭발 효과 추가
        explosions.push(new Explosion(
            player.x + player.width / 2,
            player.y + player.height / 2,
            2.5
        ));
        gameOver();
    }
}

function handlePlayerBulletCollision(bullet, index) {
    gameStats.lives--;
    gameStats.combo = 0;
    
    if (playerUpgrades.hasAlly) {
        playerUpgrades.hasAlly = false;
        
        // 동료 우주선 폭발 효과
        if (allies.length > 0) {
            allies.forEach(ally => {
                explosions.push(new Explosion(
                    ally.x + ally.width / 2,
                    ally.y + ally.height / 2,
                    1.2
                ));
            });
        }
        
        allies = [];
        elements.gameInfo.textContent = '동료 우주선을 잃었습니다!';
    }
    
    explosions.push(new Explosion(
        bullet.x + bullet.width / 2,
        bullet.y + bullet.height / 2,
        0.8
    ));
    
    bossBullets.splice(index, 1);
    playerHitEffect();
    
    if (gameStats.lives <= 0) {
        // 플레이어 사망 폭발 효과 추가
        explosions.push(new Explosion(
            player.x + player.width / 2,
            player.y + player.height / 2,
            2.5
        ));
        gameOver();
    }
}

function isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function createHitEffect(enemy) {
    enemy.hitEffect = 10;
}

function playerHitEffect() {
    canvas.style.filter = 'drop-shadow(0 0 20px #ffff00)';
    setTimeout(() => {
        canvas.style.filter = '';
    }, 200);
}

function checkLevelUp() {
    const newLevel = Math.floor(gameStats.score / 500) + 1;
    if (newLevel > gameStats.level) {
        gameStats.level = newLevel;
        
        if (gameStats.level > allTimeStats.bestLevel) {
            allTimeStats.bestLevel = gameStats.level;
            localStorage.setItem('spaceshipBestLevel', allTimeStats.bestLevel);
        }
        
        elements.gameInfo.textContent = `레벨 ${gameStats.level}!`;
        
        setTimeout(() => {
            if (gameState === 'playing') {
                elements.gameInfo.textContent = '좌우 키로 이동하고 스페이스바로 발사하세요!';
            }
        }, 2000);
    }
}

function gameOver() {
    gameState = 'gameOver';
    
    if (gameStats.score >= 100) {
        allTimeStats.gamesCompleted++;
        localStorage.setItem('spaceshipGamesCompleted', allTimeStats.gamesCompleted);
    }
    
    if (gameStats.score > gameStats.highScore) {
        gameStats.highScore = gameStats.score;
        localStorage.setItem('spaceshipHighScore', gameStats.highScore);
        elements.modalTitle.textContent = '🏆 새로운 최고점수!';
        elements.modalTitle.style.color = '#ffff00';
        elements.modalMessage.textContent = '축하합니다! 새로운 기록을 세웠습니다!';
    } else {
        elements.modalTitle.textContent = '💥 게임 오버';
        elements.modalTitle.style.color = '#ff0000';
        elements.modalMessage.textContent = '우주선이 파괴되었습니다. 다시 도전해보세요!';
    }
    
    elements.finalScore.textContent = gameStats.score;
    elements.finalLevel.textContent = gameStats.level;
    elements.finalEnemies.textContent = gameStats.enemiesKilled;
    // 1.5초 후에 게임 오버 모달 표시
    setTimeout(() => {
        elements.gameOverModal.style.display = 'flex';
    }, 1500);
    
    updateUI();
}

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
    const modalGamesCompleted = document.getElementById('modalGamesCompleted');
    const modalHighScore = document.getElementById('modalHighScore');
    const modalTotalEnemies = document.getElementById('modalTotalEnemies');
    const modalBestLevel = document.getElementById('modalBestLevel');
    const modalMaxCombo = document.getElementById('modalMaxCombo');
    
    if (modalTotalGames) modalTotalGames.textContent = allTimeStats.totalGames;
    if (modalGamesCompleted) modalGamesCompleted.textContent = allTimeStats.gamesCompleted;
    if (modalHighScore) modalHighScore.textContent = gameStats.highScore;
    if (modalTotalEnemies) modalTotalEnemies.textContent = allTimeStats.totalEnemiesKilled;
    if (modalBestLevel) modalBestLevel.textContent = allTimeStats.bestLevel;
    if (modalMaxCombo) modalMaxCombo.textContent = allTimeStats.maxComboRecord;
}

function resetStats() {
    if (confirm('정말로 모든 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        localStorage.removeItem('spaceshipHighScore');
        localStorage.removeItem('spaceshipTotalGames');
        localStorage.removeItem('spaceshipGamesCompleted');
        localStorage.removeItem('spaceshipTotalEnemies');
        localStorage.removeItem('spaceshipBestLevel');
        localStorage.removeItem('spaceshipMaxCombo');
        
        gameStats.highScore = 0;
        allTimeStats.totalGames = 0;
        allTimeStats.gamesCompleted = 0;
        allTimeStats.totalEnemiesKilled = 0;
        allTimeStats.bestLevel = 1;
        allTimeStats.maxComboRecord = 0;
        
        updateUI();
        updateStatsModal();
        
        alert('모든 기록이 삭제되었습니다!');
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const gradient = ctx.createRadialGradient(
        canvas.width/2, canvas.height/2, 0, 
        canvas.width/2, canvas.height/2, canvas.width
    );
    gradient.addColorStop(0, 'rgba(0, 10, 30, 0.9)');
    gradient.addColorStop(1, 'rgba(0, 5, 15, 0.95)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawStars();
    explosions.forEach(explosion => explosion.draw());
    drawPlayer();
    drawAllies();
    drawLasers();
    drawEnemies();
    drawItems();
    drawBossBullets();
    
    if (gameStats.combo > 1) {
        const scale = canvas.width / 800;
        ctx.fillStyle = '#ffff00';
        ctx.font = `bold ${18 * scale}px Orbitron`;
        ctx.textAlign = 'center';
        ctx.fillText(`COMBO x${gameStats.combo}!`, canvas.width/2, 30 * scale);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2 * scale;
        ctx.strokeText(`COMBO x${gameStats.combo}!`, canvas.width/2, 30 * scale);
    }
    
    drawUpgradeStatus();
}

function drawStars() {
    const scale = canvas.width / 800;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 80; i++) {
        const x = (i * 97) % canvas.width;
        const y = (Date.now() * 0.02 + i * 314) % canvas.height;
        const size = (Math.random() < 0.1 ? 2 : 1) * scale;
        ctx.fillRect(x, y, size, size);
    }
}

function drawPlayer() {
    if (gameState === 'gameOver') return;
    
    const scale = canvas.width / 800;
    
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 15 * scale;
    
    const centerX = player.x + player.width / 2;
    
    ctx.fillStyle = '#00FFFF';
    ctx.beginPath();
    ctx.moveTo(centerX, player.y);
    ctx.lineTo(player.x + 5 * scale, player.y + player.height);
    ctx.lineTo(player.x + player.width - 5 * scale, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(centerX, player.y + 5 * scale);
    ctx.lineTo(centerX - 8 * scale, player.y + player.height - 8 * scale);
    ctx.lineTo(centerX + 8 * scale, player.y + player.height - 8 * scale);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#0088FF';
    ctx.fillRect(player.x - 2 * scale, player.y + player.height * 0.6, 6 * scale, player.height * 0.3);
    ctx.fillRect(player.x + player.width - 4 * scale, player.y + player.height * 0.6, 6 * scale, player.height * 0.3);
    
    if (gameState === 'playing') {
        ctx.fillStyle = '#FF6600';
        const mainFlameHeight = (10 + Math.random() * 6) * scale;
        ctx.beginPath();
        ctx.moveTo(centerX - 6 * scale, player.y + player.height);
        ctx.lineTo(centerX, player.y + player.height + mainFlameHeight);
        ctx.lineTo(centerX + 6 * scale, player.y + player.height);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#FF8800';
        const sideFlameHeight = (6 + Math.random() * 3) * scale;
        ctx.fillRect(player.x - 1 * scale, player.y + player.height * 0.9, 4 * scale, sideFlameHeight);
        ctx.fillRect(player.x + player.width - 3 * scale, player.y + player.height * 0.9, 4 * scale, sideFlameHeight);
    }
    
    ctx.shadowBlur = 0;
}

function drawAllies() {
    if (!playerUpgrades.hasAlly) return;
    
    const scale = canvas.width / 800;
    
    allies.forEach(ally => {
        let mainColor, glowColor, flameColor;
        
        if (ally.color === 'purple') {
            mainColor = '#BB88FF';
            glowColor = '#BB88FF';
            flameColor = '#FF6600';
        } else {
            mainColor = '#F5E6B8';
            glowColor = '#F5E6B8';
            flameColor = '#FF6600';
        }
        
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 10 * scale;
        
        const centerX = ally.x + ally.width / 2;
        
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.moveTo(centerX, ally.y);
        ctx.lineTo(ally.x + 4 * scale, ally.y + ally.height);
        ctx.lineTo(ally.x + ally.width - 4 * scale, ally.y + ally.height);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(centerX, ally.y + 4 * scale);
        ctx.lineTo(centerX - 6 * scale, ally.y + ally.height - 6 * scale);
        ctx.lineTo(centerX + 6 * scale, ally.y + ally.height - 6 * scale);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = mainColor;
        ctx.fillRect(ally.x - 2 * scale, ally.y + ally.height * 0.6, 5 * scale, ally.height * 0.3);
        ctx.fillRect(ally.x + ally.width - 3 * scale, ally.y + ally.height * 0.6, 5 * scale, ally.height * 0.3);
        
        if (gameState === 'playing') {
            ctx.fillStyle = flameColor;
            const flameHeight = (8 + Math.random() * 4) * scale;
            ctx.beginPath();
            ctx.moveTo(centerX - 5 * scale, ally.y + ally.height);
            ctx.lineTo(centerX, ally.y + ally.height + flameHeight);
            ctx.lineTo(centerX + 5 * scale, ally.y + ally.height);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#FF8800';
            const sideFlameHeight = (5 + Math.random() * 2) * scale;
            ctx.fillRect(ally.x - 1 * scale, ally.y + ally.height * 0.9, 3 * scale, sideFlameHeight);
            ctx.fillRect(ally.x + ally.width - 2 * scale, ally.y + ally.height * 0.9, 3 * scale, sideFlameHeight);
        }
        
        ctx.shadowBlur = 0;
    });
}

function drawLasers() {
    const scale = canvas.width / 800;
    ctx.shadowBlur = 8 * scale;
    
    lasers.forEach(laser => {
        let fillColor, shadowColor;
        
        switch(laser.type) {
            case 'triple':
                fillColor = '#FFFFFF';
                shadowColor = '#FFFFFF';
                break;
            case 'double':
                fillColor = '#00FFFF';
                shadowColor = '#00FFFF';
                break;
            case 'ally':
                fillColor = '#BB88FF';
                shadowColor = '#BB88FF';
                break;
            case 'ally2':
                fillColor = '#F5E6B8';
                shadowColor = '#F5E6B8';
                break;
            default:
                fillColor = '#FF00FF';
                shadowColor = '#FF00FF';
                break;
        }
        
        if (laser.isKrasthus) {
            ctx.shadowBlur = 20 * scale;
            ctx.fillStyle = '#FF3333'; 
            ctx.shadowColor = '#FF3333';
            ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
            
            ctx.fillStyle = '#FF6666'; 
            ctx.shadowColor = '#FF6666';
            ctx.shadowBlur = 8 * scale;
            ctx.fillRect(laser.x + laser.width/4, laser.y, laser.width/2, laser.height);
        } else {
            ctx.fillStyle = fillColor;
            ctx.shadowColor = shadowColor;
            ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
        }
    });
    
    ctx.shadowBlur = 0;
}

function drawBossBullets() {
    const scale = canvas.width / 800;
    
    bossBullets.forEach(bullet => {
        let shadowColor, outerColor, innerColor;
        
        if (bullet.bossType === 'midBoss') {
            shadowColor = '#888888';
            outerColor = '#888888';
            innerColor = '#CCCCCC';
        } else {
            shadowColor = '#FFFFFF';
            outerColor = '#FFFFFF';
            innerColor = '#EEEEEE';
        }
        
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = 10 * scale;
        
        ctx.fillStyle = outerColor;
        ctx.beginPath();
        ctx.arc(bullet.x + bullet.width/2, bullet.y + bullet.height/2, bullet.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = innerColor;
        ctx.beginPath();
        ctx.arc(bullet.x + bullet.width/2, bullet.y + bullet.height/2, bullet.width/3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.shadowBlur = 0;
}

// drawEnemies 함수 수정
function drawEnemies() {
    const scale = canvas.width / 800;
    
    enemies.forEach(enemy => {
        if (enemy.hitEffect > 0) {
            enemy.hitEffect--;
            ctx.shadowBlur = 20 * scale;
        } else {
            ctx.shadowBlur = 10 * scale;
        }
        
        let shadowColor, fillColor;
        
        switch (enemy.type) {
            case 'normal':
                shadowColor = '#00FF00';
                fillColor = enemy.hitEffect > 0 ? '#FFFFFF' : '#88FF88';
                break;
            case 'fast':
                shadowColor = '#FFFF00';
                fillColor = enemy.hitEffect > 0 ? '#FFFFFF' : '#FFFF88';
                break;
            case 'tank':
                shadowColor = '#FF8800';
                fillColor = enemy.hitEffect > 0 ? '#FFFFFF' : '#FFAA66';
                break;
            case 'gray':
                shadowColor = '#00FFFF';
                fillColor = enemy.hitEffect > 0 ? '#FFFFFF' : '#88FFFF';
                break;
            case 'midBoss':
                shadowColor = '#888888';
                fillColor = enemy.hitEffect > 0 ? '#FFFFFF' : '#AAAAAA';
                break;
            case 'boss':
                shadowColor = '#FFFFFF';
                fillColor = enemy.hitEffect > 0 ? '#FFFF00' : '#FFFFFF';
                break;
        }
        
        ctx.shadowColor = shadowColor;
        ctx.fillStyle = fillColor;
        
        const centerX = enemy.x + enemy.width / 2;
        const centerY = enemy.y + enemy.height / 2;
        
        let bodySize = enemy.width * 0.25;
        if (enemy.type === 'tank') bodySize = enemy.width * 0.35;
        else if (enemy.type === 'gray') bodySize = enemy.width * 0.28;
        else if (enemy.type === 'midBoss') bodySize = enemy.width * 0.35;
        else if (enemy.type === 'boss') bodySize = enemy.width * 0.4;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, bodySize, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = fillColor;
        let lineWidth = 4 * scale;
        if (enemy.type === 'tank') lineWidth = 6 * scale;
        else if (enemy.type === 'gray') lineWidth = 5 * scale;
        else if (enemy.type === 'midBoss') lineWidth = 8 * scale;
        else if (enemy.type === 'boss') lineWidth = 10 * scale;
        
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        
        let tentacleCount = 5;
        if (enemy.type === 'tank') tentacleCount = 7;
        else if (enemy.type === 'gray') tentacleCount = 6;
        else if (enemy.type === 'midBoss') tentacleCount = 9;
        else if (enemy.type === 'boss') tentacleCount = 12;
        
        for(let i = 0; i < tentacleCount; i++) {
            const startX = centerX + (i - Math.floor(tentacleCount/2)) * enemy.width * 0.12;
            const startY = centerY + bodySize;
            const endX = startX + Math.sin(Date.now() * 0.01 + i) * 8 * scale;
            const endY = startY + enemy.height * 0.35;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(startX + Math.sin(Date.now() * 0.008 + i) * 10 * scale, startY + enemy.height * 0.17, endX, endY);
            ctx.stroke();
            
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            let endSize = 2 * scale;
            if (enemy.type === 'tank') endSize = 3 * scale;
            else if (enemy.type === 'midBoss') endSize = 4 * scale;
            else if (enemy.type === 'boss') endSize = 5 * scale;
            ctx.arc(endX, endY, endSize, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        ctx.fillStyle = '#FF0000';
        let eyeCount = 3;
        if (enemy.type === 'tank') eyeCount = 5;
        else if (enemy.type === 'gray') eyeCount = 4;
        else if (enemy.type === 'midBoss') eyeCount = 7;
        else if (enemy.type === 'boss') eyeCount = 9;
        
        for(let i = 0; i < eyeCount; i++) {
            const angle = (i / eyeCount) * Math.PI * 2 - Math.PI / 2;
            const eyeDistance = bodySize * 0.6;
            const eyeX = centerX + Math.cos(angle) * eyeDistance;
            const eyeY = centerY + Math.sin(angle) * eyeDistance * 0.5;
            
            ctx.beginPath();
            let eyeSize = 3 * scale;
            if (enemy.type === 'tank') eyeSize = 4 * scale;
            else if (enemy.type === 'gray') eyeSize = 3.5 * scale;
            else if (enemy.type === 'midBoss') eyeSize = 5 * scale;
            else if (enemy.type === 'boss') eyeSize = 6 * scale;
            ctx.arc(eyeX, eyeY, eyeSize, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        if ((enemy.type === 'tank' || enemy.type === 'gray' || enemy.type === 'midBoss' || enemy.type === 'boss') && enemy.showHealthBar) {
            drawHealthBar(enemy);
        }
    });
    ctx.shadowBlur = 0;
}

function drawItems() {
    const scale = canvas.width / 800;
    
    items.forEach(item => {
        ctx.save();
        
        switch (item.type) {
            case 'doubleLaser':
                const rotation = Date.now() * 0.01;
                ctx.translate(item.x + item.width/2, item.y + item.height/2);
                ctx.rotate(rotation);
                
                ctx.shadowColor = '#00FFFF';
                ctx.shadowBlur = 15 * scale;
                
                ctx.fillStyle = '#00FFFF';
                ctx.fillRect(-item.width/2, -item.height/2, item.width, item.height);
                
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(-6 * scale, -8 * scale, 3 * scale, 16 * scale);
                ctx.fillRect(3 * scale, -8 * scale, 3 * scale, 16 * scale);
                
                ctx.fillRect(-8 * scale, -10 * scale, 7 * scale, 4 * scale);
                ctx.fillRect(-8 * scale, 6 * scale, 7 * scale, 4 * scale);
                ctx.fillRect(1 * scale, -10 * scale, 7 * scale, 4 * scale);
                ctx.fillRect(1 * scale, 6 * scale, 7 * scale, 4 * scale);
                break;
                
            case 'tripleLaser':
                const rotation3 = Date.now() * 0.015;
                ctx.translate(item.x + item.width/2, item.y + item.height/2);
                ctx.rotate(rotation3);
                
                ctx.shadowColor = '#FFFFFF';
                ctx.shadowBlur = 25 * scale;
                
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(-item.width/2, -item.height/2, item.width, item.height);
                
                ctx.fillStyle = '#000000';
                ctx.fillRect(-8 * scale, -8 * scale, 2 * scale, 16 * scale);
                ctx.fillRect(0, -8 * scale, 2 * scale, 16 * scale);
                ctx.fillRect(8 * scale, -8 * scale, 2 * scale, 16 * scale);
                
                ctx.fillRect(-10 * scale, -10 * scale, 6 * scale, 3 * scale);
                ctx.fillRect(-10 * scale, 7 * scale, 6 * scale, 3 * scale);
                ctx.fillRect(-2 * scale, -10 * scale, 6 * scale, 3 * scale);
                ctx.fillRect(-2 * scale, 7 * scale, 6 * scale, 3 * scale);
                ctx.fillRect(6 * scale, -10 * scale, 6 * scale, 3 * scale);
                ctx.fillRect(6 * scale, 7 * scale, 6 * scale, 3 * scale);
                break;
                
            case 'extraLife':
                const rotation2 = Date.now() * 0.008;
                ctx.translate(item.x + item.width/2, item.y + item.height/2);
                ctx.rotate(rotation2);
                
                ctx.shadowColor = '#00FF00';
                ctx.shadowBlur = 20 * scale;
                
                ctx.fillStyle = '#00FF00';
                
                ctx.beginPath();
                ctx.arc(-item.width/4, -item.height/4, item.width/4, 0, Math.PI, true);
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(item.width/4, -item.height/4, item.width/4, 0, Math.PI, true);
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(-item.width/2, 0);
                ctx.lineTo(0, item.height/2);
                ctx.lineTo(item.width/2, 0);
                ctx.closePath();
                ctx.fill();
                
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(-item.width/6, -item.height/3, item.width/8, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        
        ctx.restore();
    });
}

function drawHealthBar(enemy) {
    const scale = canvas.width / 800;
    
    const barWidth = enemy.width;
    const barHeight = 6 * scale;
    const barX = enemy.x;
    const barY = enemy.y - 12 * scale;
    
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    const healthPercent = enemy.hp / enemy.maxHp;
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1 * scale;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
}
function drawUpgradeStatus() {
    const scale = canvas.width / 800;
    let yOffset = canvas.height - 10 * scale;
    
    if (playerUpgrades.tripleLaser && Date.now() < playerUpgrades.tripleLaserEndTime) {
        const timeLeft = Math.ceil((playerUpgrades.tripleLaserEndTime - Date.now()) / 1000);
        
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${14 * scale}px Orbitron`;
        ctx.textAlign = 'left';
        ctx.fillText(`트리플 레이저: ${timeLeft}초`, 10 * scale, yOffset);
        
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 2 * scale;
        ctx.strokeText(`트리플 레이저: ${timeLeft}초`, 10 * scale, yOffset);
        ctx.restore();
        
        yOffset -= 20 * scale;
    } else if (playerUpgrades.doubleLaser && Date.now() < playerUpgrades.doubleLaserEndTime) {
        const timeLeft = Math.ceil((playerUpgrades.doubleLaserEndTime - Date.now()) / 1000);
        
        ctx.save();
        ctx.fillStyle = '#00FFFF';
        ctx.font = `bold ${14 * scale}px Orbitron`;
        ctx.textAlign = 'left';
        ctx.fillText(`더블 레이저: ${timeLeft}초`, 10 * scale, yOffset);
        
        ctx.strokeStyle = '#97f0f7ff';
        ctx.lineWidth = 2 * scale;
        ctx.strokeText(`더블 레이저: ${timeLeft}초`, 10 * scale, yOffset);
        ctx.restore();
        
        yOffset -= 20 * scale;
    }
    
    if (playerUpgrades.krasthusLaser && Date.now() < playerUpgrades.krasthusLaserEndTime) {
        const timeLeft = Math.ceil((playerUpgrades.krasthusLaserEndTime - Date.now()) / 1000);
        
        ctx.save();
        ctx.fillStyle = '#FF6666';
        ctx.font = `bold ${14 * scale}px Orbitron`;
        ctx.textAlign = 'left';
        ctx.fillText(`크라스투스 레이저: ${timeLeft}초`, 10 * scale, yOffset);
        
        ctx.strokeStyle = '#DD3333';
        ctx.lineWidth = 2 * scale;
        ctx.strokeText(`크라스투스 레이저: ${timeLeft}초`, 10 * scale, yOffset);
        ctx.restore();
        
        yOffset -= 20 * scale;
    }
    
    if (playerUpgrades.hasAlly) {
        let allyText = '';
        if (allies.length === 1) {
            allyText = '동료 우주선 활성화 (1기)';
        } else if (allies.length === 2) {
            allyText = '동료 우주선 활성화 (2기)';
        }
        
        ctx.save();
        ctx.fillStyle = '#BB88FF';
        ctx.font = `bold ${14 * scale}px Orbitron`;
        ctx.textAlign = 'left';
        ctx.fillText(allyText, 10 * scale, yOffset);
        
        ctx.strokeStyle = '#9966CC';
        ctx.lineWidth = 2 * scale;
        ctx.strokeText(allyText, 10 * scale, yOffset);
        ctx.restore();
    }
}

function updateUI() {
    if (elements.score) elements.score.textContent = gameStats.score;
    if (elements.lives) elements.lives.textContent = gameStats.lives;
    if (elements.level) elements.level.textContent = gameStats.level;
    if (elements.highScore) elements.highScore.textContent = gameStats.highScore;
    if (elements.enemiesKilled) elements.enemiesKilled.textContent = gameStats.enemiesKilled;
    if (elements.combo) elements.combo.textContent = gameStats.combo;
}

function goHome() {
    if (confirm('게임을 종료하고 메인 페이지로 돌아가시겠습니까?')) {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        window.location.href = 'index.html';
    }
}

// 전역 함수들
window.startGame = startGame;
window.pauseGame = pauseGame;
window.resetGame = resetGame;
window.showHelp = showHelp;
window.showStats = showStats;
window.closeHelp = closeHelp;
window.closeStats = closeStats;
window.resetStats = resetStats;
window.goHome = goHome;
window.closeModal = closeModal;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    init();
    
    // 환영 메시지
    setTimeout(() => {
        if (gameState === 'ready' && elements.gameInfo) {
            elements.gameInfo.textContent = '좌우 키로 이동하고 스페이스바로 레이저를 발사하세요!';
        }
    }, 3000);
    
    // 키보드 도움말
    setTimeout(() => {
        if (gameState === 'ready' && elements.gameInfo) {
            elements.gameInfo.textContent = 'P키로 일시정지, R키로 재시작할 수 있습니다.';
        }
    }, 6000);
});

// 페이지 종료 시 애니메이션 정리
window.addEventListener('beforeunload', () => {
    if (animationId) {
        cancelAnimationFrame(animationId);
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