const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let playerWidth = 100;
let playerHeight = 100;
let x = 50;
let y = canvas.height - playerHeight-10;
let vx = 2;
let gameOver = false;
let score = 0;
let bestScore = 0;

let blocks = [];
let keys = {};

function spawnBlock() {
    blocks.push({
        x: Math.random() * (canvas.width-30),
        y: -30,
        width: 30,
        height: 30,
        speed: 3
    });
}

document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

function isColliding(a, b){
    return (
        a.x<b.x + b.width &&
        a.x+a.width > b.x &&
        a.y<b.y + b.height &&
        a.y+a.height > b.y
    );
}

let player = {
    x: x,
    y: y,
    width: 100,
    height: 100
};

function drawHud() {
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score, 10, 30);

    ctx.font = "16px Arial";
    ctx.fillText("Best: " + bestScore, 10, 50);
}

function resetGame() {
    blocks = [];
    score = 0;
    gameOver = false;

    x = canvas.width / 2 - 50;
}

function drawGameOver() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.font = "40px Arial";
    ctx.fillText("GAME OVER", 60, 280);

    ctx.font = "20px Arial";
    ctx.fillText("Press Enter to Restart", 70, 320);
}

function loop() {
    if(gameOver){
        if (keys["Enter"]) {
            resetGame();
        }

        drawGameOver();
        requestAnimationFrame(loop);
        return;
    }

    player.x = x;
    player.y = y;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if(Math.random() < 0.02){
        spawnBlock();
    }

    if(keys["ArrowLeft"] && x>0){
        x-=5;
    }
    if(keys["ArrowRight"] && x+100 < canvas.width){
        x+=5;
    }

    for(let block of blocks){
        block.y += block.speed;

        if(isColliding(player, block)){
            gameOver = true;
            bestScore = Math.max(bestScore, score);
        }
    }

    blocks = blocks.filter(block => block.y < canvas.height);

    score++;

    ctx.fillStyle = "lime";
    ctx.fillRect(x, y, 100, 100);

    ctx.fillStyle = "red";
    for(let block of blocks){
        ctx.fillRect(block.x, block.y, block.width, block.height);
    }

    drawHud();

    requestAnimationFrame(loop);
}

loop();
