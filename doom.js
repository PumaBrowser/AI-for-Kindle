// ==========================================================================
// KINDLE DOOM — A Raycasting FPS Engine
// Optimized for e-ink displays and touch-only input
// ==========================================================================

(function () {
    'use strict';

    // ── Constants ──────────────────────────────────────────────────────
    const TILE = 64;
    const FOV = Math.PI / 3;          // 60° field of view
    const HALF_FOV = FOV / 2;
    const MAX_DEPTH = 16;
    const ENEMY_SPEED = 0.008;
    const BULLET_COOLDOWN = 300;      // ms between shots
    const ENEMY_DAMAGE = 8;
    const PLAYER_DAMAGE = 25;

    // ── Map Definition ────────────────────────────────────────────────
    // 1 = stone wall, 2 = brick wall, 3 = metal wall, 0 = open space
    const MAP = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 2, 2, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 1],
        [1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 2, 0, 2, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 1],
        [1, 0, 0, 3, 3, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];
    const MAP_W = MAP[0].length;
    const MAP_H = MAP.length;

    // ── Game State ────────────────────────────────────────────────────
    let canvas, ctx, width, height, numRays;
    let isKindleMode = false;
    let gameRunning = false;
    let gameOver = false;
    let gameWon = false;
    let lastTime = 0;
    let lastShot = 0;
    let shotFlash = 0;
    let damageFlash = 0;
    let kills = 0;

    const player = {
        x: 1.5,
        y: 1.5,
        angle: 0,
        health: 100,
        speed: 0.04,
        rotSpeed: 0.04,
    };

    // Input state
    const keys = {};

    // ── Enemies ───────────────────────────────────────────────────────
    let enemies = [];

    function spawnEnemies() {
        enemies = [
            { x: 5.5, y: 3.5, health: 50, alive: true, lastAttack: 0, type: 'imp' },
            { x: 10.5, y: 5.5, health: 50, alive: true, lastAttack: 0, type: 'imp' },
            { x: 7.5, y: 10.5, health: 75, alive: true, lastAttack: 0, type: 'demon' },
            { x: 13.5, y: 13.5, health: 50, alive: true, lastAttack: 0, type: 'imp' },
            { x: 3.5, y: 12.5, health: 75, alive: true, lastAttack: 0, type: 'demon' },
            { x: 10.5, y: 10.5, health: 100, alive: true, lastAttack: 0, type: 'baron' },
            { x: 14.5, y: 1.5, health: 50, alive: true, lastAttack: 0, type: 'imp' },
            { x: 1.5, y: 14.5, health: 75, alive: true, lastAttack: 0, type: 'demon' },
        ];
        kills = 0;
    }

    // ── Wall Colors ───────────────────────────────────────────────────
    function getWallColor(type, side, dist) {
        const shade = Math.max(0.25, 1 - dist / MAX_DEPTH);
        if (isKindleMode) {
            // High-contrast grayscale for e-ink
            const base = side ? 180 : 220;
            const v = Math.floor(base * shade);
            return `rgb(${v},${v},${v})`;
        }
        let r, g, b;
        if (type === 1) {          // stone: blue-gray
            r = side ? 90 : 110; g = side ? 90 : 105; b = side ? 120 : 140;
        } else if (type === 2) {   // brick: warm red
            r = side ? 140 : 170; g = side ? 60 : 70; b = side ? 50 : 55;
        } else {                   // metal: teal
            r = side ? 60 : 70; g = side ? 120 : 145; b = side ? 130 : 155;
        }
        r = Math.floor(r * shade); g = Math.floor(g * shade); b = Math.floor(b * shade);
        return `rgb(${r},${g},${b})`;
    }

    // ── Raycasting Engine (DDA) ───────────────────────────────────────
    function castRays() {
        const rays = [];
        for (let i = 0; i < numRays; i++) {
            const rayAngle = player.angle - HALF_FOV + (i / numRays) * FOV;
            const sin = Math.sin(rayAngle);
            const cos = Math.cos(rayAngle);

            // DDA algorithm
            let mapX = Math.floor(player.x);
            let mapY = Math.floor(player.y);

            const deltaDistX = Math.abs(1 / (cos || 1e-10));
            const deltaDistY = Math.abs(1 / (sin || 1e-10));

            let stepX, stepY, sideDistX, sideDistY;

            if (cos < 0) {
                stepX = -1;
                sideDistX = (player.x - mapX) * deltaDistX;
            } else {
                stepX = 1;
                sideDistX = (mapX + 1 - player.x) * deltaDistX;
            }
            if (sin < 0) {
                stepY = -1;
                sideDistY = (player.y - mapY) * deltaDistY;
            } else {
                stepY = 1;
                sideDistY = (mapY + 1 - player.y) * deltaDistY;
            }

            let hit = false;
            let side = 0;
            let depth = 0;
            let wallType = 1;

            while (!hit && depth < MAX_DEPTH) {
                if (sideDistX < sideDistY) {
                    sideDistX += deltaDistX;
                    mapX += stepX;
                    side = 0;
                } else {
                    sideDistY += deltaDistY;
                    mapY += stepY;
                    side = 1;
                }
                depth++;
                if (mapX >= 0 && mapX < MAP_W && mapY >= 0 && mapY < MAP_H && MAP[mapY][mapX] > 0) {
                    hit = true;
                    wallType = MAP[mapY][mapX];
                }
            }

            let perpDist;
            if (side === 0) {
                perpDist = (mapX - player.x + (1 - stepX) / 2) / (cos || 1e-10);
            } else {
                perpDist = (mapY - player.y + (1 - stepY) / 2) / (sin || 1e-10);
            }

            // Fix fish-eye distortion
            perpDist *= Math.cos(rayAngle - player.angle);
            perpDist = Math.max(perpDist, 0.1);

            // Texture coordinate
            let wallX;
            if (side === 0) {
                wallX = player.y + perpDist * sin;
            } else {
                wallX = player.x + perpDist * cos;
            }
            wallX -= Math.floor(wallX);

            rays.push({ dist: perpDist, side, wallType, wallX, angle: rayAngle });
        }
        return rays;
    }

    // ── Rendering ─────────────────────────────────────────────────────
    function render(rays) {
        const halfH = height / 2;
        const stripW = Math.ceil(width / numRays);

        // Sky & floor
        if (isKindleMode) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, halfH);
            ctx.fillStyle = '#cccccc';
            ctx.fillRect(0, halfH, width, halfH);
        } else {
            // Sky gradient
            const skyGrad = ctx.createLinearGradient(0, 0, 0, halfH);
            skyGrad.addColorStop(0, '#1a1a2e');
            skyGrad.addColorStop(1, '#16213e');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, width, halfH);

            // Floor gradient
            const floorGrad = ctx.createLinearGradient(0, halfH, 0, height);
            floorGrad.addColorStop(0, '#2d2d2d');
            floorGrad.addColorStop(1, '#1a1a1a');
            ctx.fillStyle = floorGrad;
            ctx.fillRect(0, halfH, width, halfH);
        }

        // Walls
        for (let i = 0; i < rays.length; i++) {
            const ray = rays[i];
            const lineH = Math.min(height * 2, height / ray.dist);
            const drawStart = halfH - lineH / 2;

            ctx.fillStyle = getWallColor(ray.wallType, ray.side, ray.dist);
            ctx.fillRect(i * stripW, drawStart, stripW + 1, lineH);

            // Simple vertical line texture pattern
            if (lineH > 30) {
                const texX = ray.wallX;
                if (Math.floor(texX * 8) % 2 === 0) {
                    ctx.fillStyle = isKindleMode
                        ? 'rgba(0,0,0,0.06)'
                        : 'rgba(0,0,0,0.08)';
                    ctx.fillRect(i * stripW, drawStart, stripW + 1, lineH);
                }
                // Horizontal mortar lines
                if (ray.wallType === 2 && lineH > 60) {
                    ctx.strokeStyle = isKindleMode ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.12)';
                    ctx.lineWidth = 1;
                    const brickH = lineH / 8;
                    for (let b = 0; b < 8; b++) {
                        const by = drawStart + b * brickH;
                        ctx.beginPath();
                        ctx.moveTo(i * stripW, by);
                        ctx.lineTo(i * stripW + stripW, by);
                        ctx.stroke();
                    }
                }
            }
        }

        // Render enemies (sprites)
        renderEnemies(rays);

        // Shot flash
        if (shotFlash > 0) {
            ctx.fillStyle = isKindleMode
                ? `rgba(0,0,0,${shotFlash * 0.3})`
                : `rgba(255,200,50,${shotFlash * 0.15})`;
            ctx.fillRect(0, 0, width, height);
            shotFlash = Math.max(0, shotFlash - 0.08);
        }

        // Damage flash
        if (damageFlash > 0) {
            ctx.fillStyle = isKindleMode
                ? `rgba(0,0,0,${damageFlash * 0.4})`
                : `rgba(200,0,0,${damageFlash * 0.25})`;
            ctx.fillRect(0, 0, width, height);
            damageFlash = Math.max(0, damageFlash - 0.04);
        }

        // Crosshair
        const cx = width / 2;
        const cy = height / 2;
        ctx.strokeStyle = isKindleMode ? '#000000' : '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy); ctx.lineTo(cx - 4, cy);
        ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 12, cy);
        ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy - 4);
        ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 12);
        ctx.stroke();

        // Weapon (simple shotgun shape)
        drawWeapon();

        // HUD
        drawHUD();

        // Minimap
        drawMinimap();
    }

    // ── Enemy Rendering ───────────────────────────────────────────────
    function renderEnemies(rays) {
        // Sort enemies by distance (far first so close ones draw on top)
        const visible = enemies.filter(e => e.alive).map(e => {
            const dx = e.x - player.x;
            const dy = e.y - player.y;
            return { ...e, dist: Math.sqrt(dx * dx + dy * dy), dx, dy };
        }).sort((a, b) => b.dist - a.dist);

        for (const e of visible) {
            // Angle to enemy
            let angle = Math.atan2(e.dy, e.dx) - player.angle;
            // Normalize angle
            while (angle > Math.PI) angle -= 2 * Math.PI;
            while (angle < -Math.PI) angle += 2 * Math.PI;

            // Check if in FOV
            if (Math.abs(angle) > HALF_FOV + 0.2) continue;

            // Screen position
            const screenX = (0.5 + angle / FOV) * width;
            const spriteH = Math.min(height * 1.5, height / e.dist);
            const spriteW = spriteH * 0.6;
            const drawY = height / 2 - spriteH / 2;

            // Depth check — is the enemy behind a wall?
            const rayIdx = Math.floor(screenX / (width / numRays));
            if (rayIdx >= 0 && rayIdx < rays.length && rays[rayIdx].dist < e.dist) continue;

            // Draw enemy sprite
            drawEnemySprite(screenX, drawY, spriteW, spriteH, e);
        }
    }

    function drawEnemySprite(sx, sy, sw, sh, enemy) {
        const cx = sx;
        const bodyTop = sy + sh * 0.2;
        const bodyBot = sy + sh;
        const headR = sw * 0.25;

        if (isKindleMode) {
            // High-contrast black silhouette
            ctx.fillStyle = '#000000';
            // Head
            ctx.beginPath();
            ctx.arc(cx, bodyTop, headR, 0, Math.PI * 2);
            ctx.fill();
            // Body
            ctx.fillRect(cx - sw * 0.3, bodyTop + headR * 0.5, sw * 0.6, sh * 0.45);
            // Arms
            ctx.fillRect(cx - sw * 0.45, bodyTop + headR, sw * 0.15, sh * 0.3);
            ctx.fillRect(cx + sw * 0.3, bodyTop + headR, sw * 0.15, sh * 0.3);
            // Legs
            ctx.fillRect(cx - sw * 0.25, bodyBot - sh * 0.3, sw * 0.18, sh * 0.3);
            ctx.fillRect(cx + sw * 0.07, bodyBot - sh * 0.3, sw * 0.18, sh * 0.3);
            // Eyes
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - headR * 0.5, bodyTop - headR * 0.3, headR * 0.35, headR * 0.3);
            ctx.fillRect(cx + headR * 0.15, bodyTop - headR * 0.3, headR * 0.35, headR * 0.3);
        } else {
            // Colored enemies
            let bodyColor, headColor;
            if (enemy.type === 'imp') {
                bodyColor = '#8B4513'; headColor = '#A0522D';
            } else if (enemy.type === 'demon') {
                bodyColor = '#800020'; headColor = '#A0002A';
            } else {
                bodyColor = '#4A0080'; headColor = '#6A00B0';
            }
            // Shadow/glow
            ctx.shadowColor = enemy.type === 'baron' ? '#8800ff' : '#ff4400';
            ctx.shadowBlur = 8;

            // Head
            ctx.fillStyle = headColor;
            ctx.beginPath();
            ctx.arc(cx, bodyTop, headR, 0, Math.PI * 2);
            ctx.fill();

            // Body
            ctx.fillStyle = bodyColor;
            ctx.fillRect(cx - sw * 0.3, bodyTop + headR * 0.5, sw * 0.6, sh * 0.45);

            // Arms
            ctx.fillRect(cx - sw * 0.45, bodyTop + headR, sw * 0.15, sh * 0.3);
            ctx.fillRect(cx + sw * 0.3, bodyTop + headR, sw * 0.15, sh * 0.3);

            // Legs
            ctx.fillRect(cx - sw * 0.25, bodyBot - sh * 0.3, sw * 0.18, sh * 0.3);
            ctx.fillRect(cx + sw * 0.07, bodyBot - sh * 0.3, sw * 0.18, sh * 0.3);

            // Eyes (glowing)
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 6;
            ctx.fillStyle = '#ff3333';
            ctx.fillRect(cx - headR * 0.5, bodyTop - headR * 0.3, headR * 0.35, headR * 0.3);
            ctx.fillRect(cx + headR * 0.15, bodyTop - headR * 0.3, headR * 0.35, headR * 0.3);

            ctx.shadowBlur = 0;
        }

        // Health bar for damaged enemies
        if (enemy.health < getMaxHealth(enemy.type)) {
            const barW = sw * 0.7;
            const barH = 4;
            const barX = cx - barW / 2;
            const barY = sy + sh * 0.1;
            const ratio = enemy.health / getMaxHealth(enemy.type);

            ctx.fillStyle = isKindleMode ? '#ffffff' : '#333333';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = isKindleMode ? '#000000' : (ratio > 0.5 ? '#00cc44' : '#ff3333');
            ctx.fillRect(barX, barY, barW * ratio, barH);
        }
    }

    function getMaxHealth(type) {
        if (type === 'imp') return 50;
        if (type === 'demon') return 75;
        return 100;
    }

    // ── Weapon ────────────────────────────────────────────────────────
    function drawWeapon() {
        const ww = width * 0.18;
        const wh = height * 0.35;
        const wx = width / 2 - ww / 2;
        const wy = height - wh + (shotFlash > 0 ? -8 : 0);

        if (isKindleMode) {
            // Simple black weapon outline
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.fillStyle = '#ffffff';

            // Barrel
            ctx.fillRect(wx + ww * 0.4, wy, ww * 0.2, wh * 0.6);
            ctx.strokeRect(wx + ww * 0.4, wy, ww * 0.2, wh * 0.6);

            // Handle
            ctx.fillRect(wx + ww * 0.25, wy + wh * 0.5, ww * 0.5, wh * 0.5);
            ctx.strokeRect(wx + ww * 0.25, wy + wh * 0.5, ww * 0.5, wh * 0.5);

            // Muzzle flash
            if (shotFlash > 0.3) {
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(wx + ww * 0.5, wy - 5, 12, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Metallic weapon
            const gunGrad = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
            gunGrad.addColorStop(0, '#555555');
            gunGrad.addColorStop(0.5, '#888888');
            gunGrad.addColorStop(1, '#444444');

            // Barrel
            ctx.fillStyle = gunGrad;
            ctx.fillRect(wx + ww * 0.38, wy, ww * 0.24, wh * 0.65);
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1;
            ctx.strokeRect(wx + ww * 0.38, wy, ww * 0.24, wh * 0.65);

            // Handle
            const handleGrad = ctx.createLinearGradient(wx, wy + wh * 0.5, wx + ww, wy + wh);
            handleGrad.addColorStop(0, '#6b4c2a');
            handleGrad.addColorStop(1, '#4a3520');
            ctx.fillStyle = handleGrad;
            ctx.fillRect(wx + ww * 0.22, wy + wh * 0.55, ww * 0.56, wh * 0.45);
            ctx.strokeRect(wx + ww * 0.22, wy + wh * 0.55, ww * 0.56, wh * 0.45);

            // Muzzle flash
            if (shotFlash > 0.3) {
                ctx.shadowColor = '#ffaa00';
                ctx.shadowBlur = 20;
                ctx.fillStyle = '#ffdd44';
                ctx.beginPath();
                ctx.arc(wx + ww * 0.5, wy - 5, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    }

    // ── HUD ───────────────────────────────────────────────────────────
    function drawHUD() {
        const pad = 12;
        const barW = 160;
        const barH = 18;

        // Health bar background
        ctx.fillStyle = isKindleMode ? '#cccccc' : 'rgba(0,0,0,0.6)';
        ctx.fillRect(pad, height - pad - barH, barW, barH);

        // Health bar fill
        const hpRatio = player.health / 100;
        if (isKindleMode) {
            ctx.fillStyle = '#000000';
        } else {
            ctx.fillStyle = hpRatio > 0.5 ? '#00cc44' : hpRatio > 0.25 ? '#ffaa00' : '#ff3333';
        }
        ctx.fillRect(pad, height - pad - barH, barW * hpRatio, barH);

        // Border
        ctx.strokeStyle = isKindleMode ? '#000000' : '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(pad, height - pad - barH, barW, barH);

        // Health text
        ctx.fillStyle = isKindleMode ? '#000000' : '#ffffff';
        ctx.font = 'bold 14px Outfit, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`HP: ${player.health}`, pad + 4, height - pad - 3);

        // Kill counter
        const totalEnemies = enemies.length;
        ctx.textAlign = 'right';
        ctx.fillText(`KILLS: ${kills} / ${totalEnemies}`, width - pad, height - pad - 3);
    }

    // ── Minimap ───────────────────────────────────────────────────────
    function drawMinimap() {
        const size = 4;
        const mapPx = MAP_W * size;
        const ox = width - mapPx - 10;
        const oy = 10;

        // Background
        ctx.fillStyle = isKindleMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.5)';
        ctx.fillRect(ox - 2, oy - 2, mapPx + 4, MAP_H * size + 4);

        for (let y = 0; y < MAP_H; y++) {
            for (let x = 0; x < MAP_W; x++) {
                if (MAP[y][x] > 0) {
                    ctx.fillStyle = isKindleMode ? '#000000' : '#666666';
                    ctx.fillRect(ox + x * size, oy + y * size, size, size);
                }
            }
        }

        // Enemies on minimap
        for (const e of enemies) {
            if (!e.alive) continue;
            ctx.fillStyle = isKindleMode ? '#666666' : '#ff3333';
            ctx.fillRect(ox + e.x * size - 1, oy + e.y * size - 1, 3, 3);
        }

        // Player
        ctx.fillStyle = isKindleMode ? '#000000' : '#00ff88';
        ctx.fillRect(ox + player.x * size - 2, oy + player.y * size - 2, 4, 4);

        // Player direction
        const dirLen = 6;
        ctx.strokeStyle = isKindleMode ? '#000000' : '#00ff88';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ox + player.x * size, oy + player.y * size);
        ctx.lineTo(
            ox + player.x * size + Math.cos(player.angle) * dirLen,
            oy + player.y * size + Math.sin(player.angle) * dirLen
        );
        ctx.stroke();
    }

    // ── Game Logic ────────────────────────────────────────────────────
    function update(dt) {
        if (gameOver || gameWon) return;

        const moveSpeed = player.speed * dt;
        const rotSpeed = player.rotSpeed * dt;

        // Rotation
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            player.angle -= rotSpeed;
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            player.angle += rotSpeed;
        }

        // Movement with collision
        let dx = 0, dy = 0;
        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
            dx += Math.cos(player.angle) * moveSpeed;
            dy += Math.sin(player.angle) * moveSpeed;
        }
        if (keys['ArrowDown'] || keys['s'] || keys['S']) {
            dx -= Math.cos(player.angle) * moveSpeed;
            dy -= Math.sin(player.angle) * moveSpeed;
        }
        // Strafe
        if (keys['q'] || keys['Q']) {
            dx += Math.cos(player.angle - Math.PI / 2) * moveSpeed;
            dy += Math.sin(player.angle - Math.PI / 2) * moveSpeed;
        }
        if (keys['e'] || keys['E']) {
            dx += Math.cos(player.angle + Math.PI / 2) * moveSpeed;
            dy += Math.sin(player.angle + Math.PI / 2) * moveSpeed;
        }

        // Collision detection with sliding
        const margin = 0.2;
        const newX = player.x + dx;
        const newY = player.y + dy;

        if (MAP[Math.floor(player.y)][Math.floor(newX + margin * Math.sign(dx))] === 0) {
            player.x = newX;
        }
        if (MAP[Math.floor(newY + margin * Math.sign(dy))][Math.floor(player.x)] === 0) {
            player.y = newY;
        }

        // Enemy AI
        const now = performance.now();
        for (const e of enemies) {
            if (!e.alive) continue;
            const edx = player.x - e.x;
            const edy = player.y - e.y;
            const dist = Math.sqrt(edx * edx + edy * edy);

            // Move toward player if distance > 1.2
            if (dist > 1.2 && dist < 10) {
                const speed = (e.type === 'demon' ? ENEMY_SPEED * 1.3 : ENEMY_SPEED) * dt;
                const nx = e.x + (edx / dist) * speed;
                const ny = e.y + (edy / dist) * speed;
                if (MAP[Math.floor(ny)][Math.floor(nx)] === 0) {
                    e.x = nx;
                    e.y = ny;
                }
            }

            // Attack player if close
            if (dist < 1.5 && now - e.lastAttack > 1200) {
                e.lastAttack = now;
                const dmg = e.type === 'baron' ? ENEMY_DAMAGE * 2 : ENEMY_DAMAGE;
                player.health = Math.max(0, player.health - dmg);
                damageFlash = 1;
                if (player.health <= 0) {
                    gameOver = true;
                }
            }
        }

        // Check win condition
        if (enemies.every(e => !e.alive)) {
            gameWon = true;
        }
    }

    function shoot() {
        const now = performance.now();
        if (now - lastShot < BULLET_COOLDOWN) return;
        if (gameOver || gameWon) return;

        lastShot = now;
        shotFlash = 1;

        // Hitscan — check for enemy in crosshair
        const aimAngle = player.angle;
        let closestEnemy = null;
        let closestDist = Infinity;

        for (const e of enemies) {
            if (!e.alive) continue;
            const dx = e.x - player.x;
            const dy = e.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let angle = Math.atan2(dy, dx) - aimAngle;
            while (angle > Math.PI) angle -= 2 * Math.PI;
            while (angle < -Math.PI) angle += 2 * Math.PI;

            // Generous hit detection (wider at distance)
            const hitWidth = 0.15 + 0.03 * dist;
            if (Math.abs(angle) < hitWidth && dist < closestDist) {
                // Check line-of-sight (simple wall check)
                if (hasLineOfSight(player.x, player.y, e.x, e.y)) {
                    closestEnemy = e;
                    closestDist = dist;
                }
            }
        }

        if (closestEnemy) {
            const dmg = Math.max(5, PLAYER_DAMAGE - closestDist * 2);
            closestEnemy.health -= dmg;
            if (closestEnemy.health <= 0) {
                closestEnemy.alive = false;
                kills++;
            }
        }
    }

    function hasLineOfSight(x1, y1, x2, y2) {
        const steps = 30;
        const dx = (x2 - x1) / steps;
        const dy = (y2 - y1) / steps;
        for (let i = 1; i < steps; i++) {
            const mx = Math.floor(x1 + dx * i);
            const my = Math.floor(y1 + dy * i);
            if (mx >= 0 && mx < MAP_W && my >= 0 && my < MAP_H && MAP[my][mx] > 0) {
                return false;
            }
        }
        return true;
    }

    // ── Game Over / Win Screens ───────────────────────────────────────
    function drawOverlay() {
        ctx.fillStyle = isKindleMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, width, height);

        ctx.textAlign = 'center';
        if (gameOver) {
            ctx.fillStyle = isKindleMode ? '#000000' : '#ff3333';
            ctx.font = `bold ${Math.floor(width * 0.08)}px Outfit, system-ui, sans-serif`;
            ctx.fillText('YOU DIED', width / 2, height / 2 - 30);

            ctx.fillStyle = isKindleMode ? '#000000' : '#cccccc';
            ctx.font = `${Math.floor(width * 0.035)}px Outfit, system-ui, sans-serif`;
            ctx.fillText(`Kills: ${kills} / ${enemies.length}`, width / 2, height / 2 + 20);
            ctx.fillText('Tap or press ENTER to restart', width / 2, height / 2 + 55);
        } else if (gameWon) {
            ctx.fillStyle = isKindleMode ? '#000000' : '#00ff88';
            ctx.font = `bold ${Math.floor(width * 0.07)}px Outfit, system-ui, sans-serif`;
            ctx.fillText('LEVEL CLEAR!', width / 2, height / 2 - 30);

            ctx.fillStyle = isKindleMode ? '#000000' : '#cccccc';
            ctx.font = `${Math.floor(width * 0.035)}px Outfit, system-ui, sans-serif`;
            ctx.fillText(`All ${enemies.length} enemies eliminated`, width / 2, height / 2 + 20);
            ctx.fillText(`Health remaining: ${player.health}%`, width / 2, height / 2 + 50);
            ctx.fillText('Tap or press ENTER to play again', width / 2, height / 2 + 85);
        }
    }

    function resetGame() {
        player.x = 1.5;
        player.y = 1.5;
        player.angle = 0;
        player.health = 100;
        gameOver = false;
        gameWon = false;
        shotFlash = 0;
        damageFlash = 0;
        spawnEnemies();
    }

    // ── Game Loop ─────────────────────────────────────────────────────
    function gameLoop(time) {
        if (!gameRunning) return;

        const dt = Math.min(time - lastTime, 50); // cap dt to prevent spiral
        lastTime = time;

        update(dt);

        const rays = castRays();
        render(rays);

        if (gameOver || gameWon) {
            drawOverlay();
        }

        requestAnimationFrame(gameLoop);
    }

    // ── Touch Controls ────────────────────────────────────────────────
    function setupTouchControls() {
        const btnFwd = document.getElementById('btn-forward');
        const btnBack = document.getElementById('btn-backward');
        const btnLeft = document.getElementById('btn-left');
        const btnRight = document.getElementById('btn-right');
        const btnShoot = document.getElementById('btn-shoot');
        const btnStrafeL = document.getElementById('btn-strafe-left');
        const btnStrafeR = document.getElementById('btn-strafe-right');

        function bind(el, key) {
            if (!el) return;
            const start = (ev) => { ev.preventDefault(); keys[key] = true; };
            const end = (ev) => { ev.preventDefault(); keys[key] = false; };
            el.addEventListener('touchstart', start, { passive: false });
            el.addEventListener('touchend', end, { passive: false });
            el.addEventListener('touchcancel', end, { passive: false });
            el.addEventListener('mousedown', start);
            el.addEventListener('mouseup', end);
            el.addEventListener('mouseleave', end);
        }

        bind(btnFwd, 'w');
        bind(btnBack, 's');
        bind(btnLeft, 'a');
        bind(btnRight, 'd');
        bind(btnStrafeL, 'q');
        bind(btnStrafeR, 'e');

        if (btnShoot) {
            const shootHandler = (ev) => { ev.preventDefault(); shoot(); };
            btnShoot.addEventListener('touchstart', shootHandler, { passive: false });
            btnShoot.addEventListener('mousedown', shootHandler);
        }

        // Tap on canvas to shoot (or restart)
        canvas.addEventListener('click', () => {
            if (gameOver || gameWon) {
                resetGame();
            } else {
                shoot();
            }
        });
    }

    // ── Keyboard Controls ─────────────────────────────────────────────
    function setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            keys[e.key] = true;
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                if (gameOver || gameWon) {
                    resetGame();
                } else {
                    shoot();
                }
            }
        });
        document.addEventListener('keyup', (e) => {
            keys[e.key] = false;
        });
    }

    // ── Initialization ────────────────────────────────────────────────
    function init() {
        canvas = document.getElementById('doom-canvas');
        if (!canvas) return;

        ctx = canvas.getContext('2d');

        // Detect kindle mode
        isKindleMode = document.body.classList.contains('kindle-mode');

        // Observe kindle mode changes
        const observer = new MutationObserver(() => {
            isKindleMode = document.body.classList.contains('kindle-mode');
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        // Size canvas
        function resize() {
            const container = canvas.parentElement;
            const maxW = container.clientWidth;
            // Kindle browsers may be slow, use lower resolution
            const scale = isKindleMode ? 0.5 : 1;
            width = Math.floor(Math.min(maxW, 700) * scale);
            height = Math.floor(width * 0.6);
            numRays = Math.floor(width / 2); // 1 ray per 2 pixels
            canvas.width = width;
            canvas.height = height;
            canvas.style.width = Math.min(maxW, 700) + 'px';
            canvas.style.height = Math.floor(Math.min(maxW, 700) * 0.6) + 'px';
        }
        resize();
        window.addEventListener('resize', resize);

        spawnEnemies();
        setupKeyboardControls();
        setupTouchControls();

        // Start button
        const startBtn = document.getElementById('doom-start');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (!gameRunning) {
                    gameRunning = true;
                    lastTime = performance.now();
                    startBtn.textContent = 'RESTART';
                    requestAnimationFrame(gameLoop);
                } else {
                    resetGame();
                }
            });
        }
    }

    // Boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
