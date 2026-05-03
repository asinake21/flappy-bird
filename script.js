/**
 * University of Technology - Computer Graphics Course (CG101)
 * Final Project: Interactive 2D Game
 * Student Name: [Student Name Placeholder]
 * Date: April 2026
 * 
 * DESCRIPTION:
 * This project is a 2D side-scrolling game using the HTML5 Canvas API.
 * It demonstrates core graphics concepts like rendering, physics, 
 * collision detection, and parallax scrolling.
 */

// --- GLOBAL VARIABLES ---
var canvas = document.getElementById('gameCanvas');
var ctx = canvas.getContext('2d');
var score_text = document.getElementById('score-text');
var finalScoreDisplay = document.getElementById('final-score');
var bestScoreDisplay = document.getElementById('best-score');

// UI Panels
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game state
var gameState = 'START'; // can be START, PLAYING, or OVER
var score = 0;
var highScore = localStorage.getItem('my_flappy_highscore') || 0;
var frames = 0;

// Physics settings (made these global so they are easy to change)
// GRAVITY: CG CONCEPT - Applying a constant acceleration downwards
let gravity_force = 0.22; // increased for better feel
let jump_power = -4.2; // increased for better control
let scrollSpeed = 3.0;

// Screen shake variables
var shake_timer = 0;
var shake_intensity = 5;

// --- DYNAMIC RESIZING ---
// This makes sure the canvas always fits the window
function resize_canvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log("Canvas resized to: " + canvas.width + "x" + canvas.height);
}
window.addEventListener('resize', resize_canvas);
resize_canvas(); // call it once at start

// --- GAME OBJECTS ---

// THE BIRD
var bird = {
    x: 100,
    y: canvas.height / 2,
    radius: 15,
    velocity: 0,
    rotation: 0,

    // update bird physics
    update: function () {
        if (gameState === 'START') {
            // just hover up and down on start screen
            // ANIMATION CONCEPT: Using Sine wave for periodic motion
            this.y = (canvas.height / 2) + Math.sin(frames * 0.1) * 15;
            return;
        }

        // Apply gravity
        // PHYSICS CONCEPT: velocity += acceleration
        this.velocity += gravity_force;
        this.y += this.velocity;

        // BIRD ROTATION (CG CONCEPT: Transformation - Rotating based on velocity)
        // this makes it look like it's diving down or jumping up
        this.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.velocity * 0.1));

        // collision with ground
        if (this.y + this.radius > canvas.height - 50) {
            this.y = canvas.height - 50 - this.radius;
            end_game(); // we hit the floor
        }

        // collision with ceiling
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.velocity = 0;
        }
    },

    // draw the bird
    draw: function () {
        ctx.save(); // save the current state

        // TRANSFORMATION: Move coordinate system to bird center
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // draw simple bird body
        ctx.fillStyle = "#f1c40f"; // yellow
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.stroke();

        // --- THE WING (Restored) ---
        let wingAngle = Math.sin(frames * 0.2) * 0.6;
        ctx.save();
        ctx.translate(-5, 2);
        ctx.rotate(wingAngle);
        ctx.fillStyle = "#fef9e7"; 
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-this.radius, -this.radius, -this.radius * 1.2, 0);
        ctx.quadraticCurveTo(-this.radius, this.radius * 0.5, 0, 0);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // draw eye
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(7, -5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(9, -5, 2, 0, Math.PI * 2);
        ctx.fill();

        // draw beak
        ctx.fillStyle = "#e67e22"; // orange
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(20, 5);
        ctx.lineTo(10, 10);
        ctx.fill();
        ctx.stroke();

        ctx.restore(); // restore to previous state
    },

    jump: function () {
        this.velocity = jump_power;
        // spawn some particles for effect
        for (let i = 0; i < 5; i++) {
            spawn_particle(this.x, this.y);
        }
    }
};

// PIPES
var pipes = [];
var pipe_timer = 0;
var pipeWidth = 70;
var pipeGap = 170;

function createPipe() {
    // randomized gap position
    let minPipeHeight = 50;
    let maxPipeHeight = canvas.height - 150 - pipeGap - minPipeHeight;
    let randomY = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;

    pipes.push({
        x: canvas.width,
        top: randomY,
        bottom: canvas.height - 100 - (randomY + pipeGap),
        passed: false
    });
}

function update_pipes() {
    if (gameState !== 'PLAYING') return;

    pipe_timer++;
    if (pipe_timer > 120) { // every 120 frames spawn a new pipe
        createPipe();
        pipe_timer = 0;
    }

    for (var i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= scrollSpeed;

        // COLLISION DETECTION: CG CONCEPT - AABB (Axis-Aligned Bounding Box)
        // Note: I'm using a smaller hitbox for the bird to be "forgiving"
        let birdHitboxSize = 10; // smaller than radius (15)

        // check if bird is within pipe x range
        if (bird.x + birdHitboxSize > pipes[i].x && bird.x - birdHitboxSize < pipes[i].x + pipeWidth) {
            // check if bird is hitting top or bottom pipe
            if (bird.y - birdHitboxSize < pipes[i].top || bird.y + birdHitboxSize > canvas.height - 100 - pipes[i].bottom) {
                console.log("Hit a pipe!");
                end_game();
            }
        }

        // check if we passed the pipe to update score
        if (!pipes[i].passed && bird.x > pipes[i].x + pipeWidth) {
            score++;
            pipes[i].passed = true;
            score_text.innerText = score;
            console.log("Score updated: " + score);
        }

        // remove pipes that are off screen
        if (pipes[i].x + pipeWidth < 0) {
            pipes.splice(i, 1);
        }
    }
}

function draw_pipes() {
    ctx.fillStyle = "#2ecc71"; // nice green
    ctx.strokeStyle = "#27ae60"; // darker green for border
    ctx.lineWidth = 3;

    for (var i = 0; i < pipes.length; i++) {
        // draw top pipe
        ctx.fillRect(pipes[i].x, 0, pipeWidth, pipes[i].top);
        ctx.strokeRect(pipes[i].x, 0, pipeWidth, pipes[i].top);

        // draw bottom pipe
        let bottomY = canvas.height - 100 - pipes[i].bottom;
        ctx.fillRect(pipes[i].x, bottomY, pipeWidth, pipes[i].bottom + 100);
        ctx.strokeRect(pipes[i].x, bottomY, pipeWidth, pipes[i].bottom + 100);

        // TODO: add caps to pipes later to make them look better
    }
}

// BACKGROUND (PARALLAX)
// CG CONCEPT: Parallax Scrolling - Layers moving at different speeds to show depth
var clouds = [];
var mountains = [];

function init_parallax() {
    // clouds
    for (let i = 0; i < 5; i++) {
        clouds.push({ x: Math.random() * canvas.width, y: Math.random() * 200, speed: 0.5, size: 40 + Math.random() * 40 });
    }
    // mountains
    for (let i = 0; i < 3; i++) {
        mountains.push({ x: i * (canvas.width / 2), y: canvas.height - 150, width: canvas.width / 1.5, height: 100 + Math.random() * 100, speed: 1 });
    }
}
init_parallax();

function draw_parallax() {
    // draw clouds (slow)
    clouds.forEach(c => {
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
        
        // DRAW FLUFFY CLOUD (Multiple overlapping circles)
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 0.5, c.y - c.size * 0.2, c.size * 0.7, 0, Math.PI * 2);
        ctx.arc(c.x - c.size * 0.5, c.y - c.size * 0.2, c.size * 0.7, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 0.8, c.y + c.size * 0.2, c.size * 0.5, 0, Math.PI * 2);
        ctx.arc(c.x - c.size * 0.8, c.y + c.size * 0.2, c.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (gameState === 'PLAYING') c.x -= c.speed;
        if (c.x + c.size * 2 < 0) c.x = canvas.width + c.size * 2;
    });

    // draw mountains (faster than clouds, slower than ground)
    ctx.fillStyle = "#34495e";
    mountains.forEach(m => {
        ctx.beginPath();
        ctx.moveTo(m.x, canvas.height - 100);
        ctx.lineTo(m.x + m.width / 2, canvas.height - 100 - m.height);
        ctx.lineTo(m.x + m.width, canvas.height - 100);
        ctx.fill();
        if (gameState === 'PLAYING') m.x -= m.speed;
        if (m.x + m.width < 0) m.x = canvas.width;
    });
}

// PARTICLES
var particles = [];
function spawn_particle(x, y) {
    particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 1.0,
        color: "white"
    });
}

function update_particles() {
    for (var i = particles.length - 1; i >= 0; i--) {
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;
        particles[i].life -= 0.02;
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function draw_particles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
}

// --- GAME LOGIC FUNCTIONS ---

function start_game() {
    console.log("Starting game...");
    gameState = 'PLAYING';
    score = 0;
    score_text.innerText = "0";
    pipes = [];
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
}

function end_game() {
    if (gameState === 'OVER') return;
    gameState = 'OVER';
    console.log("Game over! Final score: " + score);

    // SCREEN SHAKE: effect for hitting something
    shake_timer = shake_intensity;

    // highscore logic
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('my_flappy_highscore', highScore);
    }

    finalScoreDisplay.innerText = score;
    bestScoreDisplay.innerText = highScore;
    gameOverScreen.classList.remove('hidden');
}

// INPUT HANDLING
window.addEventListener('keydown', function (e) {
    // Basic space handling for original project feel
    if (e.code === 'Space' || e.code === 'Tab') {
        e.preventDefault(); // added this for Tab support as requested earlier
        if (gameState === 'PLAYING') {
            bird.jump();
        } else if (gameState === 'START') {
            start_game();
        } else if (gameState === 'OVER') {
            start_game();
        }
    }
});

canvas.addEventListener('mousedown', function () {
    if (gameState === 'PLAYING') {
        bird.jump();
    } else if (gameState === 'START') {
        start_game();
    } else if (gameState === 'OVER') {
        start_game();
    }
});

// Touch support for responsiveness
canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    if (gameState === 'PLAYING') {
        bird.jump();
    } else if (gameState === 'START') {
        start_game();
    } else if (gameState === 'OVER') {
        start_game();
    }
}, { passive: false });

startBtn.addEventListener('click', start_game);
restartBtn.addEventListener('click', start_game);

// --- MAIN LOOP ---
// CG CONCEPT: Animation Loop - Using requestAnimationFrame to sync with monitor refresh rate
function main_loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // handle screen shake
    ctx.save();
    if (shake_timer > 0) {
        var dx = (Math.random() - 0.5) * shake_timer * 2;
        var dy = (Math.random() - 0.5) * shake_timer * 2;
        ctx.translate(dx, dy);
        shake_timer -= 0.5;
    }

    // DRAW STUFF
    // background first
    draw_parallax();

    // ground (simple)
    ctx.fillStyle = "#e1d995";
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
    ctx.fillStyle = "#2ecc71";
    ctx.fillRect(0, canvas.height - 100, canvas.width, 20);

    // obstacles
    update_pipes();
    draw_pipes();

    // effects
    update_particles();
    draw_particles();

    // player
    bird.update();
    bird.draw();

    ctx.restore(); // restore screen shake

    frames++;
    requestAnimationFrame(main_loop);
}

// kick off the loop!
main_loop();
console.log("Game engine loaded.");
