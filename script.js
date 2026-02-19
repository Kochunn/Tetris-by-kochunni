document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('tetris');
    const context = canvas.getContext('2d');
    const nextCanvas = document.getElementById('next');
    const nextContext = nextCanvas.getContext('2d');

    const scoreElement = document.getElementById('score');
    const highScoreElement = document.getElementById('highScore');
    const linesElement = document.getElementById('lines');
    const levelElement = document.getElementById('level');

    const pauseButton = document.getElementById('pause');
    const resumeButton = document.getElementById('resume');
    const restartButton = document.getElementById('restart');
    const restartModal = document.getElementById('restart-modal');
    const restartYesButton = document.getElementById('restart-yes');
    const restartNoButton = document.getElementById('restart-no');
    const gameOverModal = document.getElementById('game-over-modal');
    const tryAgainButton = document.getElementById('try-again-btn');
    const playGround = new Image();// playground image
    

    let COLS = 10;
    let ROWS = 20;
    let BLOCK_SIZE = 30;
    let xOffset = 0;
    let yOffset = 0;

    const COLORS = {
        'I': 'cyan',
        'O': 'yellow',
        'T': 'purple',
        'L': 'orange',
        'J': 'blue',
        'S': 'green',
        'Z': 'red'
    };

    const SHAPES = {
        'I': [[1, 1, 1, 1]],
        'O': [[1, 1], [1, 1]],
        'T': [[0, 1, 0], [1, 1, 1]],
        'L': [[1, 0, 0], [1, 1, 1]],
        'J': [[0, 0, 1], [1, 1, 1]],
        'S': [[0, 1, 1], [1, 1, 0]],
        'Z': [[1, 1, 0], [0, 1, 1]]
    };

    let board = createBoard();
    let currentPiece;
    let nextPiece;
    let score = 0;
    let highScore = localStorage.getItem('highScore') || 0;
    let lines = 0;
    let level = 1;
    let dropInterval = 1200;
    let paused = false;
    let gameOver = false;
    let lastTime = 0;
    let dropCounter = 0;
    let animationFrameId;

    const images = {};

    function loadImages() {
        const imageSources = [
            'cyan-squares.png', 'yellow-squares.png', 'purple-squares.png', 
            'orange-squares.png', 'blue-squares.png', 'green-squares.png', 'red-squares.png'
        ];
        let loadedCount = 0;
        imageSources.forEach(src => {
            const img = new Image();
            const colorName = src.split('-')[0];
            img.src = `resources/shape-pieces/${src}`;
            img.onload = () => {
                images[colorName] = img;
                loadedCount++;
                if (loadedCount === imageSources.length) {
                    init();
                    draw();
                }
            };
        });
    }

    function createBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    function spawnPiece() {
        const pieces = 'IOTLJSZ';
        const type = nextPiece ? nextPiece.type : pieces[pieces.length * Math.random() | 0];
        
        currentPiece = {
            matrix: SHAPES[type],
            type: type,
            x: Math.floor(COLS / 2) - Math.floor(SHAPES[type][0].length / 2),
            y: 0
        };

        const nextType = pieces[pieces.length * Math.random() | 0];
        nextPiece = {
            matrix: SHAPES[nextType],
            type: nextType,
            x: 0,
            y: 0
        };

        if (checkCollision(currentPiece)) {
            gameOver = true;
            paused = true;
            updateHighScore();
            gameOverModal.style.display = 'flex';
        }
    }

    function checkCollision(piece) {
        for (let y = 0; y < piece.matrix.length; y++) {
            for (let x = 0; x < piece.matrix[y].length; x++) {
                if (piece.matrix[y][x] === 0) {
                    continue;
                }

                let newX = piece.x + x;
                let newY = piece.y + y;

                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }

                if (newY < 0) {
                    continue;
                }

                if (board[newY][newX] !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    function resizeCanvas() {
        if (window.innerWidth <= 768) {
            canvas.height = 660; // mobile
            const initialWidth = 300; // from HTML attribute
            canvas.width = initialWidth;
            
            COLS = 10;
            ROWS = 22;
            BLOCK_SIZE = canvas.width / COLS;
            yOffset = (canvas.height - (ROWS * BLOCK_SIZE)) / 2;
            xOffset = 0;

            nextCanvas.width = 90;
            nextCanvas.height = 86;
            playGround.src = 'resources/playground-backgrounds/playground-mobile.png';// playground-mobile.

        } else {
            canvas.height = 610; // PC
            canvas.width = 850;
            
            ROWS = 23;
            BLOCK_SIZE = canvas.height / ROWS;
            COLS = Math.floor(canvas.width / BLOCK_SIZE);
            
            xOffset = (canvas.width - (COLS * BLOCK_SIZE)) / 2;
            yOffset = 0;

            nextCanvas.width = 120;
            nextCanvas.height = 120;
            playGround.src = 'resources/playground-backgrounds/playground-pc.png';//playground-pc.
        }
    }
    window.addEventListener('resize', () => {
        localStorage.removeItem('gameState'); // Invalidate saved state on resize
        init(); // Re-initialize the game with new dimensions
    });


    let bgLoaded = false;//boolean
    playGround.onload = function() {
        bgLoaded = true;
        draw(); // only draw after image fully loads
    };

    playGround.onerror = function() {
        console.log("Background image failed to load");
        bgLoaded = false;
    };
//////////////////////////////////////
    function draw() {

    if (bgLoaded) {
        context.drawImage(playGround, 0, 0, canvas.width, canvas.height);
    } else {
        // Fallback color
        context.fillStyle = '#000';
        context.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawBoard();

    if (currentPiece) {
        drawPiece(currentPiece, context);
    }

    nextContext.fillStyle = '#2a2a2a';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (nextPiece) {
        drawPiece(nextPiece, nextContext, true);
    }

    updateUI();
}



    function drawBoard() {
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (board[y][x]) {
                    const colorName = board[y][x];
                    if (images[colorName]) {
                        context.drawImage(images[colorName], xOffset + x * BLOCK_SIZE, yOffset + y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    }
                }
            }
        }
    }

    function drawPiece(piece, ctx, isPreview = false) {
        const colorName = COLORS[piece.type];
        if (!images[colorName]) return;

        if (isPreview) {
            const previewBlockSize = Math.floor(Math.min(nextCanvas.width / 4, nextCanvas.height / 4));
            const previewX = (nextCanvas.width - piece.matrix[0].length * previewBlockSize) / 2;
            const previewY = (nextCanvas.height - piece.matrix.length * previewBlockSize) / 2;

            piece.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        ctx.drawImage(
                            images[colorName],
                            previewX + x * previewBlockSize,
                            previewY + y * previewBlockSize,
                            previewBlockSize,
                            previewBlockSize
                        );
                    }
                });
            });
        } else {
            piece.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        ctx.drawImage(
                            images[colorName],
                            xOffset + (piece.x + x) * BLOCK_SIZE,
                            yOffset + (piece.y + y) * BLOCK_SIZE,
                            BLOCK_SIZE,
                            BLOCK_SIZE
                        );
                    }
                });
            });
        }
    }

    function gameLoop(time = 0) {
        if (!paused) {
            const deltaTime = time - lastTime;
            lastTime = time;

            dropCounter += deltaTime;
            if (dropCounter > dropInterval) {
                softDrop();
            }
            draw();
        }
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    function softDrop() {
        currentPiece.y++;
        if (checkCollision(currentPiece)) {
            currentPiece.y--;
            mergePiece();
            spawnPiece();
            clearLines();
        }
        dropCounter = 0;
    }

    function mergePiece() {
        currentPiece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + currentPiece.y][x + currentPiece.x] = COLORS[currentPiece.type];
                }
            });
        });
    }

    function clearLines() {
        let linesCleared = 0;
        outer: for (let y = ROWS - 1; y > 0; --y) {
            for (let x = 0; x < COLS; ++x) {
                if (board[y][x] === 0) {
                    continue outer;
                }
            }

            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            ++y;
            linesCleared++;
        }
        
        if (linesCleared > 0) {
            lines += linesCleared;
            updateScore(linesCleared);
        }
    }
    
    function updateScore(cleared) {
        const linePoints = [0, 100, 300, 500, 800];
        score += linePoints[cleared] * level;
        
        while (lines >= level * 10) {
            level++;
            dropInterval = Math.max(100, 1200 - (level - 1) * 50);
        }
        updateHighScore();
    }
    
    function updateHighScore() {
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('highScore', highScore);
        }
    }

    function updateUI() {
        scoreElement.innerText = score;
        highScoreElement.innerText = highScore;
        linesElement.innerText = lines;
        levelElement.innerText = level;
    }

    function rotate() {
        const matrix = currentPiece.matrix;
        const N = matrix.length;
        const M = matrix[0].length;
        const newMatrix = Array.from({ length: M }, () => Array(N).fill(0));
        
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < M; x++) {
                newMatrix[x][N - 1 - y] = matrix[y][x];
            }
        }
        
        const oldX = currentPiece.x;
        currentPiece.matrix = newMatrix;
        
        // Wall kick
        let offset = 1;
        while (checkCollision(currentPiece)) {
            currentPiece.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > newMatrix[0].length) {
                currentPiece.matrix = matrix; // Revert rotation
                currentPiece.x = oldX; // Revert position
                return;
            }
        }
    }

    function hardDrop() {
        while (!checkCollision(currentPiece)) {
            currentPiece.y++;
        }
        currentPiece.y--;
        mergePiece();
        spawnPiece();
        clearLines();
        dropCounter = 0;
    }
    
    function move(dir) {
        currentPiece.x += dir;
        if (checkCollision(currentPiece)) {
            currentPiece.x -= dir;
        }
    }

    document.addEventListener('keydown', event => {
        if (gameOver) return;

        const gameKeys = [
            'ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp',
            'Shift', ' ', // Space for pause
            'a', 'd', 's', 'w' // WASD support
        ];
        
        if (gameKeys.includes(event.key)) {
            event.preventDefault();
        }

        // Move left
        if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
            move(-1);
        } 
        // Move right
        else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
            move(1);
        } 
        // Soft drop
        else if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
            softDrop();
        } 
        // Rotate
        else if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
            rotate();
        } 
        // Hard drop (both Shift keys)
        else if (event.key === 'Shift' || event.key === 'ShiftLeft' || event.key === 'ShiftRight') {
            hardDrop();
        } 
        // Pause / Resume
        else if (event.key === ' ') {
            if (paused) resumeGame(); else pauseGame();
        }
    });


    pauseButton.addEventListener('click', () => pauseGame());
    resumeButton.addEventListener('click', () => resumeGame());
    restartButton.addEventListener('click', () => {
        restartModal.style.display = 'flex';
        if (!paused) {
            pauseGame();
        }
    });

    restartYesButton.addEventListener('click', () => {
        localStorage.removeItem('gameState');
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        restartModal.style.display = 'none';
        init();
        resumeGame();
    });

    restartNoButton.addEventListener('click', () => {
        restartModal.style.display = 'none';
        if (paused && !gameOver) {
            resumeGame();
        }
    });

    tryAgainButton.addEventListener('click', () => {
        gameOverModal.style.display = 'none';
        localStorage.removeItem('gameState');
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        init();
        resumeGame();
    });

    // Mobile controls
    const rotateBtn = document.getElementById('rotate-btn');
    const leftBtn = document.getElementById('left-btn');
    const downBtn = document.getElementById('down-btn');
    const rightBtn = document.getElementById('right-btn');
    const dropDownBtn = document.getElementById('drop-down-btn');

    if (rotateBtn) {
        let moveInterval;
        const startMove = (action) => {
            if (!paused && !gameOver) {
                action();
                moveInterval = setInterval(action, 100); // Adjust the interval for speed
            }
        };

        const stopMove = () => {
            clearInterval(moveInterval);
        };

        rotateBtn.addEventListener('click', () => {
            if (!paused && !gameOver) rotate();
        });

        leftBtn.addEventListener('touchstart', () => startMove(() => move(-1)));
        leftBtn.addEventListener('touchend', stopMove);
        leftBtn.addEventListener('touchcancel', stopMove);

        rightBtn.addEventListener('touchstart', () => startMove(() => move(1)));
        rightBtn.addEventListener('touchend', stopMove);
        rightBtn.addEventListener('touchcancel', stopMove);

        downBtn.addEventListener('touchstart', () => startMove(softDrop));
        downBtn.addEventListener('touchend', stopMove);
        downBtn.addEventListener('touchcancel', stopMove);
        
        dropDownBtn.addEventListener('click', () => {
            if (!paused && !gameOver) hardDrop();
        });
    }

    function pauseGame() {
        if (!gameOver) {
            paused = true;
            pauseButton.style.display = 'none';
            resumeButton.style.display = 'inline-block';
            saveGame();
        }
    }

    function resumeGame() {
        if (gameOver) return;
        paused = false;
        pauseButton.style.display = 'inline-block';
        resumeButton.style.display = 'none';
        gameLoop(lastTime);
    }
    
    function saveGame() {
        const gameState = {
            board,
            currentPiece,
            nextPiece,
            score,
            highScore,
            lines,
            level,
            dropInterval,
            paused,
            gameOver,
            COLS,
            ROWS
        };
        localStorage.setItem('gameState', JSON.stringify(gameState));
    }
    
    function loadGame() {
        const savedState = localStorage.getItem('gameState');
        if (savedState) {
            const gameState = JSON.parse(savedState);

            // Check if dimensions match the current game configuration
            if (gameState.COLS !== COLS || gameState.ROWS !== ROWS) {
                localStorage.removeItem('gameState');
                return false;
            }

            board = gameState.board;
            currentPiece = gameState.currentPiece;
            nextPiece = gameState.nextPiece;
            score = gameState.score;
            highScore = gameState.highScore;
            lines = gameState.lines;
            level = gameState.level;
            dropInterval = gameState.dropInterval;
            paused = gameState.paused;
            gameOver = gameState.gameOver;
            
            if (gameOver) {
                paused = true;
                gameOverModal.style.display = 'flex';
            }
            
            if (paused) {
                pauseButton.style.display = 'none';
                resumeButton.style.display = 'inline-block';
            }
            return true;
        }
        return false;
    }

    window.addEventListener('beforeunload', () => {
        if(!gameOver) {
            saveGame();
        }
    });

    function init() {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        resizeCanvas();
        board = createBoard();
        score = 0;
        lines = 0;
        level = 1;
        dropInterval = 1200;
        gameOver = false;
        paused = false;
        
        const wasLoaded = loadGame();
        
        if(!wasLoaded) {
            spawnPiece(); // this will set both current and next
        }

        updateUI();
        
        if (paused) {
            draw(); // Draw the loaded state
        } else {
             gameLoop();
        }
    }

    loadImages();
});
