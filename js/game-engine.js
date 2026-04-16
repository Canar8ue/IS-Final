/**
 * Bird Hunt - Game Engine v4 (Secret Rainbow Level)
 * High-fidelity retro Canvas implementation.
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiScore = document.getElementById('ui-score');
const uiAmmo = document.getElementById('ui-ammo');
const uiLevel = document.getElementById('ui-level');
const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');

// Level Configuration
const LEVELS = {
    1: { name: 'Spring', sky: '#87CEEB', grass: '#2d5a27', tree: '#ffc0cb', birds: 12, ammo: 18, speed: 0.12 },
    2: { name: 'Summer', sky: '#00BFFF', grass: '#1e3d1a', tree: '#228B22', birds: 15, ammo: 18, speed: 0.16 },
    3: { name: 'Autumn', sky: '#FF8C00', grass: '#808000', tree: '#D2691E', birds: 20, ammo: 22, speed: 0.20 },
    4: { name: 'Winter', sky: '#B0C4DE', grass: '#FFFFFF', tree: '#E0FFFF', birds: 25, ammo: 25, speed: 0.25 },
    5: { name: 'RAINBOW SECRET', sky: 'rainbow', grass: 'rainbow', tree: 'rainbow', birds: 40, ammo: 45, speed: 0.35 }
};

// Game State
let gameState = {
    active: false,
    score: 0,
    ammo: 0,
    level: 1,
    birds: [],
    popups: [],
    lastTime: 0,
    spawnTimer: 0,
    birdsSpawned: 0,
    birdsKilled: 0,
    escapedBirds: 0, // NEW: Track escapes for penalty
    isClearing: false,
    rainbowHue: 0 // NEW: For secret level colors
};

const game = {
    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        canvas.addEventListener('mousedown', (e) => this.shoot(e));
        this.render(0);
    },

    resize() {
        const rect = canvas.parentNode.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    },

    start() {
        gameState = {
            active: true,
            score: 0,
            ammo: LEVELS[1].ammo,
            level: 1,
            birds: [],
            popups: [],
            lastTime: performance.now(),
            spawnTimer: 0,
            birdsSpawned: 0,
            birdsKilled: 0,
            escapedBirds: 0,
            isClearing: false,
            rainbowHue: 0
        };
        startScreen.style.display = 'none';
        gameoverScreen.style.display = 'none';
        
        const winScreen = document.getElementById('win-screen');
        if(winScreen) winScreen.style.display = 'none';
        
        this.updateUI();
        requestAnimationFrame((t) => this.loop(t));
    },

    over() {
        gameState.active = false;
        gameoverScreen.style.display = 'flex';
        document.getElementById('final-score').innerText = gameState.score;
    },

    win(isRainbow = false) {
        gameState.active = false;
        let winScreen = document.getElementById('win-screen');
        if (!winScreen) {
            winScreen = document.createElement('div');
            winScreen.id = 'win-screen';
            winScreen.className = 'game-overlay';
            winScreen.style.backgroundColor = isRainbow ? 'rgba(0,0,0,0.9)' : 'rgba(22, 119, 255, 0.95)';
            winScreen.style.color = 'white';
            winScreen.innerHTML = `
                <h2 class="fw-900 mb-2">${isRainbow ? 'RAINBOW MASTER CLEARED!' : 'GAME CLEARED!'}</h2>
                <p class="mb-4">${isRainbow ? 'You are a true ShopBird Legend.' : 'You have survived all seasons. Professional Developer Rank achieved.'}</p>
                <h3 class="display-6 fw-900 mb-4">Final Score: <span id="win-score">0</span></h3>
                <button class="btn btn-light py-3 px-5 fw-800" onclick="game.start()">PLAY AGAIN</button>
            `;
            document.getElementById('game-container').appendChild(winScreen);
        }
        winScreen.style.display = 'flex';
        document.getElementById('win-score').innerText = gameState.score;
    },

    updateUI() {
        uiScore.innerText = String(gameState.score).padStart(4, '0');
        uiAmmo.innerText = Math.max(0, gameState.ammo);
        const config = LEVELS[gameState.level];
        uiLevel.innerText = `${gameState.level} (${config.name})`;
    },

    shoot(e) {
        if (!gameState.active || gameState.isClearing) return;
        if (gameState.ammo <= 0) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        gameState.ammo--;
        let hitBird = null;

        for (let i = gameState.birds.length - 1; i >= 0; i--) {
            const bird = gameState.birds[i];
            if (bird.state === 'flying' && bird.isHit(x, y)) {
                hitBird = bird;
                break;
            }
        }

        if (hitBird) {
            hitBird.kill();
            const points = 100 * gameState.level;
            gameState.score += points;
            gameState.birdsKilled++;
            gameState.popups.push(new Popup(x, y, `+${points}`));
        }

        this.updateUI();

        // Game Over logic
        if (gameState.ammo === 0) {
            setTimeout(() => {
                const activeOnScreen = gameState.birds.filter(b => b.state === 'flying').length;
                if (activeOnScreen > 0 || gameState.birdsSpawned < LEVELS[gameState.level].birds) {
                    this.over();
                }
            }, 1200);
        }
    },

    loop(timestamp) {
        if (!gameState.active) {
            this.render(0);
            return;
        }

        const dt = timestamp - gameState.lastTime;
        gameState.lastTime = timestamp;

        if (gameState.level === 5) {
            gameState.rainbowHue = (gameState.rainbowHue + dt * 0.1) % 360;
        }

        this.update(dt);
        this.render(dt);

        requestAnimationFrame((t) => this.loop(t));
    },

    update(dt) {
        const config = LEVELS[gameState.level];

        // Spawning
        gameState.spawnTimer += dt;
        if (gameState.birdsSpawned < config.birds && gameState.spawnTimer > 1000) {
            gameState.birds.push(new Bird(config.speed));
            gameState.birdsSpawned++;
            gameState.spawnTimer = 0;
        }

        // Entities
        gameState.birds.forEach((bird, i) => {
            bird.update(dt);
            if (bird.offscreen) {
                // Check if it escaped without being hit
                if (bird.state === 'flying') {
                    gameState.escapedBirds++;
                    gameState.popups.push(new Popup(bird.x, bird.y, `ESCAPED -500`, '#ff4d4f'));
                }
                gameState.birds.splice(i, 1);
            }
        });

        gameState.popups.forEach((p, i) => {
            p.update(dt);
            if (p.life <= 0) gameState.popups.splice(i, 1);
        });

        // Level Completion
        if (gameState.birdsSpawned >= config.birds && gameState.birds.length === 0 && !gameState.isClearing) {
            this.levelComplete();
        }
    },

    levelComplete() {
        gameState.isClearing = true;
        
        // Bonus Calculation: (Ammo * 250) - (Escaped * 500)
        let ammoBonus = (gameState.ammo * 250);
        let escapedPenalty = (gameState.escapedBirds * 500);
        let finalBonus = Math.max(0, ammoBonus - escapedPenalty);
        
        if (finalBonus > 0) {
            gameState.popups.push(new Popup(canvas.width/2, canvas.height/2, `BONUS +${finalBonus}`, '#faad14'));
            gameState.score += finalBonus;
            this.updateUI();
        } else if (escapedPenalty > 0) {
            gameState.popups.push(new Popup(canvas.width/2, canvas.height/2, `PENALTY -${escapedPenalty}`, '#ff4d4f'));
        }

        setTimeout(() => {
            if (gameState.level === 4) {
                // CHECK FOR SECRET LEVEL UNLOCK (Score >= 22,500)
                if (gameState.score >= 22500) {
                    this.goToLevel(5);
                } else {
                    this.win();
                }
            } else if (gameState.level === 5) {
                this.win(true);
            } else {
                this.goToLevel(gameState.level + 1);
            }
        }, 2500);
    },

    goToLevel(lv) {
        gameState.level = lv;
        gameState.birdsSpawned = 0;
        gameState.birdsKilled = 0;
        gameState.escapedBirds = 0;
        gameState.ammo = LEVELS[lv].ammo;
        gameState.spawnTimer = -2000;
        gameState.isClearing = false;
        this.updateUI();
    },

    render(dt) {
        const config = LEVELS[gameState.level];
        
        // Sky
        if (config.sky === 'rainbow') {
            ctx.fillStyle = `hsl(${gameState.rainbowHue}, 60%, 40%)`;
        } else {
            ctx.fillStyle = config.sky;
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Landscape
        this.drawLandscape(config);

        // Birds & Popups
        gameState.birds.forEach(b => b.draw());
        gameState.popups.forEach(p => p.draw());

        // Foreground
        if (config.grass === 'rainbow') {
            ctx.fillStyle = `hsl(${(gameState.rainbowHue + 180) % 360}, 60%, 30%)`;
        } else {
            ctx.fillStyle = config.grass;
        }
        ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
        
        if (gameState.level === 4) {
            this.drawSnow();
        }
    },

    drawLandscape(config) {
        // Clouds
        ctx.fillStyle = gameState.level === 4 || gameState.level === 5 ? '#fff' : 'rgba(255,255,255,0.7)';
        this.drawPixelObj(200, 100, [[0,1,1,0],[1,1,1,1],[0,1,1,0]], 15);
        this.drawPixelObj(canvas.width - 300, 80, [[1,1,0],[1,1,1],[1,1,0]], 12);
        
        // Contextual Trees
        const treeGrid = [[0,0,1,0,0],[0,1,1,1,0],[0,1,1,1,0],[1,1,1,1,1],[0,0,1,0,0]];

        for(let i=100; i<canvas.width; i+=250) {
            // Trunk
            ctx.fillStyle = '#5d4037';
            this.drawPixelObj(i+16, canvas.height - 80, [[1],[1],[1]], 16);
            // Foliage
            if (config.tree === 'rainbow') {
                ctx.fillStyle = `hsl(${(gameState.rainbowHue + i/5) % 360}, 70%, 50%)`;
            } else {
                ctx.fillStyle = config.tree;
            }
            this.drawPixelObj(i, canvas.height - 140, treeGrid, 16);
        }
    },

    drawSnow() {
        ctx.fillStyle = '#fff';
        for(let i=0; i<20; i++) {
            ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, 4, 4);
        }
    },

    drawPixelObj(x, y, grid, size) {
        grid.forEach((row, ri) => {
            row.forEach((cell, ci) => {
                if (cell) ctx.fillRect(x + ci * size, y + ri * size, size, size);
            });
        });
    }
};

class Bird {
    constructor(speed) {
        this.size = 8;
        this.x = Math.random() < 0.5 ? -50 : canvas.width + 50;
        this.y = Math.random() * (canvas.height - 250) + 50;
        this.dir = this.x < 0 ? 1 : -1;
        this.speed = speed + (Math.random() * 0.05);
        this.state = 'flying';
        this.frame = 0;
        this.frameTime = 0;
        
        // Seasonal / Rainbow Bird Colors
        if (gameState.level === 5) {
            this.color = `hsl(${Math.random() * 360}, 80%, 60%)`;
        } else {
            const colors = gameState.level === 4 ? ['#ffffff', '#b0c4de'] : ['#1677ff', '#ff4d4f', '#722ed1'];
            this.color = colors[Math.floor(Math.random()*colors.length)];
        }
    }

    update(dt) {
        if (this.state === 'flying') {
            this.x += this.dir * this.speed * dt;
            this.y += Math.sin(this.x * 0.02) * 3;
            this.frameTime += dt;
            if (this.frameTime > 120) {
                this.frame = (this.frame + 1) % 2;
                this.frameTime = 0;
            }
            if ((this.dir === 1 && this.x > canvas.width + 100) || 
                (this.dir === -1 && this.x < -100)) this.offscreen = true;
        } else if (this.state === 'falling') {
            this.y += 0.6 * dt;
            if (this.y > canvas.height) this.offscreen = true;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.dir === -1) ctx.scale(-1, 1);

        if (gameState.level === 5) {
            ctx.fillStyle = `hsl(${(gameState.rainbowHue + this.x) % 360}, 100%, 50%)`;
        } else {
            ctx.fillStyle = this.color;
        }
        
        // Pixel Body
        const body = [[0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]];
        game.drawPixelObj(-16, -16, body, 8);

        // Wings
        ctx.fillStyle = '#fff';
        if (this.state === 'flying') {
            const wing = this.frame === 0 ? [[1,1],[1,1]] : [[0,0],[1,1],[1,1]];
            game.drawPixelObj(-8, this.frame === 0 ? -32 : 8, wing, 8);
        }

        // Beak
        ctx.fillStyle = '#faad14';
        ctx.fillRect(16, -4, 8, 8);

        ctx.restore();
    }

    isHit(mx, my) {
        return Math.abs(this.x - mx) < 40 && Math.abs(this.y - my) < 40;
    }

    kill() {
        this.state = 'falling';
    }
}

class Popup {
    constructor(x, y, text, color = '#1677ff') {
        this.x = x; this.y = y; this.text = text; this.color = color;
        this.life = 1500;
    }
    update(dt) { 
        this.life -= dt; 
        this.y -= 0.06 * dt; 
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life/1500);
        ctx.font = 'bold 24px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1.0;
    }
}

window.game = game;
game.init();
