const games = [
    {
        name: '가위바위보',
        icon: '✊✌️🖐️',
        description: 'AI와 가위바위보<br>대결을 펼쳐보세요!',
        id: 'rock-paper-scissors',
        page: 'game1.html'
    },
    {
        name: '벽돌깨기',
        icon: '🧱',
        description: '공을 튕겨서 모든<br>벽돌을 부수세요!',
        id: 'brick-breaker',
        page: 'game2.html'
    },
    {
        name: '스네이크',
        icon: '🐍',
        description: '뱀을 조종해서<br>먹이를 먹어보세요!',
        id: 'snake',
        page: 'game3.html'
    },
    {
        name: '테트리스',
        icon: '🟩',
        description: '블록을 쌓아서<br>라인을 완성하세요!',
        id: 'tetris',
        page: 'game4.html' 
    },
    {
        name: '반응속도',
        icon: '⚡',
        description: '빠른 반응속도를<br>테스트해보세요!',
        id: 'reaction',
        page: 'game5.html'
    },
    {
        name: '숫자맞추기',
        icon: '💯',
        description: '숨겨진 숫자를<br>추리해보세요!',
        id: 'number-guess',
        page: 'game6.html'
    },
    {
        name: '폭탄찾기',
        icon: '💣',
        description: '폭탄을 피해서<br>빠르게 탈출하세요!',
        id: 'bomb-finder',
        page: 'game7.html'
    },
    {
        name: '2048',
        icon: '🔢',
        description: '숫자를 합쳐서<br>2048을 만들어보세요!',
        id: '2048',
        page: 'game8.html'
    },
    {
        name: '외계인 잡기',
        icon: '👽🔫',
        description: '침입하는 외계인을<br>막아내고 지구를 구하세요!',
        id: 'alien-shooter',
        page: 'game9.html'
    },
    {
        name: '행성 피하기',
        icon: '🪐',
        description: '행성들을 피해<br>우주를 탐험하세요!',
        id: 'planet-dodge',
        page: 'game10.html'
    },
    {
        name: '스도쿠',
        icon: '🧩',
        description: '논리적 사고로<br>9x9 퍼즐을 완성하세요!',
        id: 'sudoku',
        page: 'game11.html'
    },
    {
        name: '우주선게임',
        icon: '🚀',
        description: '우주선을 조종해서<br>적들을 물리치세요!',
        id: 'spaceship',
        page: 'game12.html'
    },
    {
        name: '킥라니의 저주',
        icon: '🛴',
        description: '킥라니가 되어<br>도로를 주행하세요!',
        id: 'fake',
        page: 'game13.html'
    }
];

let currentIndex = 0;
const gameItems = document.querySelectorAll('.game-item');
const currentGameText = document.getElementById('currentGame');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const startBtn = document.getElementById('startBtn');

function updateCarousel() {
    gameItems.forEach((item, index) => {
        item.classList.remove('active', 'prev', 'next', 'hidden');
        
        const position = (index - currentIndex + games.length) % games.length;
        
        if (position === 0) {
            item.classList.add('active');
        } else if (position === 1) {
            item.classList.add('next');
        } else if (position === games.length - 1) {
            item.classList.add('prev');
        } else {
            item.classList.add('hidden');
        }
    });
    
    currentGameText.textContent = games[currentIndex].name;
}

function nextGame() {
    currentIndex = (currentIndex + 1) % games.length;
    updateCarousel();
}

function prevGame() {
    currentIndex = (currentIndex - 1 + games.length) % games.length;
    updateCarousel();
}

// 게임 시작 함수 
function startGame() {
    const currentGame = games[currentIndex];
    
    // 버튼 클릭 효과
    startBtn.style.transform = 'scale(0.95)';
    startBtn.innerHTML = '🚀 로딩 중... 🚀';
    
    // 구현된 게임들로 이동 
    if (currentGame.id === 'rock-paper-scissors' || 
        currentGame.id === 'brick-breaker' || 
        currentGame.id === 'snake' || 
        currentGame.id === 'tetris' || 
        currentGame.id === 'reaction' ||
        currentGame.id === 'number-guess' ||
        currentGame.id === 'bomb-finder' ||
        currentGame.id === '2048' ||
        currentGame.id === 'alien-shooter' ||
        currentGame.id === 'planet-dodge' ||
        currentGame.id === 'sudoku' ||
        currentGame.id === 'spaceship') {
        setTimeout(() => {
            window.location.href = currentGame.page;
        }, 500);
    } else {
        // 다른 게임들은 아직 구현되지 않음을 알림
        setTimeout(() => {
            alert(`${currentGame.name} 게임은 곧 출시됩니다! 😊\n다른 게임을 플레이 해주세요.`);
            startBtn.style.transform = 'scale(1)';
            startBtn.innerHTML = '🎮 게임 시작! 🎮';
        }, 500);
    }
}

// QR 코드 모달 기능
const qrBtn = document.getElementById('qrBtn');
const qrModal = document.getElementById('qrModal');
const qrClose = document.getElementById('qrClose');

// QR 버튼 클릭
qrBtn.addEventListener('click', () => {
    qrModal.style.display = 'flex';
    setTimeout(() => {
        qrModal.classList.add('fade-in');
    }, 10);
});

// 닫기 버튼 클릭
qrClose.addEventListener('click', closeQRModal);

// 모달 배경 클릭
qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) {
        closeQRModal();
    }
});

// ESC 키로 닫기
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && qrModal.classList.contains('fade-in')) {
        closeQRModal();
    }
});

function closeQRModal() {
    qrModal.classList.remove('fade-in');
    setTimeout(() => {
        qrModal.style.display = 'none';
    }, 400);
}

// 이벤트 리스너
nextBtn.addEventListener('click', nextGame);
prevBtn.addEventListener('click', prevGame);

// 게임 아이템 클릭 시 해당 게임으로 이동
gameItems.forEach((item, index) => {
    item.addEventListener('click', () => {
        currentIndex = index;
        updateCarousel();
    });
});

// 게임 시작 버튼
startBtn.addEventListener('click', startGame);

// 키보드 네비게이션
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        prevGame();
    } else if (e.key === 'ArrowRight') {
        nextGame();
    } else if (e.key === 'Enter') {
        startGame();
    }
});

// 초기화
updateCarousel();