const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let x = 50;
let y = 50;

function loop() {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.height);

    x += 2;
    if (x > canvas.width) {
        x = 0;
    }
    ctx.fillRect(x, y, 100, 100);

    requestAnimationFrame(loop);
}

loop();