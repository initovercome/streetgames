document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);
    const playBtn = $('playBtn'), playModal = $('playModal');
    const bonusBtn = $('bonusBtn'), bonusModal = $('bonusModal');
    const copyBtn = $('copyBtn'), promoCode = $('promoCode');
    const page = document.querySelector('.container');

    let lastFocus = null;

    const openModal = (modal) => {
        lastFocus = document.activeElement;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        page.inert = true;
        const first = modal.querySelector('a, button');
        if (first) first.focus();
    };

    const closeModal = (modal) => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        page.inert = false;
        if (lastFocus) lastFocus.focus();
    };

    playBtn.addEventListener('click', () => openModal(playModal));
    bonusBtn.addEventListener('click', () => openModal(bonusModal));

    document.querySelectorAll('.modal').forEach((modal) => {
        modal.querySelector('.modal-close')?.addEventListener('click', () => closeModal(modal));
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });
        modal.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            const items = modal.querySelectorAll('a[href], button');
            const first = items[0], last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(closeModal);
        }
    });

    if (copyBtn && promoCode) {
        copyBtn.addEventListener('click', async () => {
            const code = promoCode.textContent.trim();
            const showSuccess = () => {
                copyBtn.textContent = 'Скопировано';
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.textContent = 'Копировать';
                    copyBtn.classList.remove('copied');
                }, 2000);
            };
            try {
                await navigator.clipboard.writeText(code);
                showSuccess();
            } catch {
                const range = document.createRange();
                range.selectNode(promoCode);
                const sel = getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                try { document.execCommand('copy'); showSuccess(); } catch {}
                sel.removeAllRanges();
            }
        });
    }

    const videos = document.querySelectorAll('video');
    videos.forEach((v) => {
        v.muted = true;
        v.disablePictureInPicture = true;
        v.disableRemotePlayback = true;
        v.play().catch(() => {});
    });

    document.addEventListener('visibilitychange', () => {
        videos.forEach((v) => { if (document.hidden) v.pause(); else if (v._visible !== false) v.play().catch(() => {}); });
    });

    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(({ target, isIntersecting }) => {
                target._visible = isIntersecting;
                if (isIntersecting) target.play().catch(() => {});
                else target.pause();
            });
        }, { threshold: 0.35 });
        videos.forEach((v) => io.observe(v));
    }

    const ROUGH_SELECTOR = '.btn-play, .feature-banner, .btn-bonus-img, .stats-panel, .modal-content';

    const buildMask = (w, h) => {
        const svg =
            `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
            `<defs><filter id="f" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">` +
            `<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="4" seed="4" result="noise"/>` +
            `<feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur"/>` +
            `<feDisplacementMap in="blur" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" result="disp"/>` +
            `<feComponentTransfer in="disp" result="hard"><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer>` +
            `<feComposite in="SourceGraphic" in2="hard" operator="in"/></filter></defs>` +
            `<rect width="${w}" height="${h}" fill="#000" filter="url(#f)"/></svg>`;
        return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    };

    const applyMask = (el) => {
        const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
        if (!w || !h) return;
        if (el._maskSize === w + 'x' + h) return;
        el._maskSize = w + 'x' + h;
        const mask = buildMask(w, h);
        el.style.webkitMaskImage = mask;
        el.style.maskImage = mask;
        el.style.webkitMaskSize = el.style.maskSize = '100% 100%';
        el.style.webkitMaskRepeat = el.style.maskRepeat = 'no-repeat';
        el.classList.add('rough-masked');
    };

    const roughEls = document.querySelectorAll(ROUGH_SELECTOR);
    if ('ResizeObserver' in window) {
        let timer;
        const ro = new ResizeObserver((entries) => {
            clearTimeout(timer);
            timer = setTimeout(() => entries.forEach((e) => applyMask(e.target)), 120);
        });
        roughEls.forEach((el) => { applyMask(el); ro.observe(el); });
    }

    // ========== МИНИ-ИГРА: МАШИНКА СВЕРХУ ==========
    (function initCarGame() {
        const canvas = document.createElement('canvas');
        canvas.id = 'carCanvas';
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        const hint = document.createElement('div');
        hint.className = 'car-hint';
        hint.textContent = 'WASD / ←↑↓→ — езда · ПРОБЕЛ — дрифт · Esc — спрятать подсказку';
        document.body.appendChild(hint);
        setTimeout(() => hint.classList.add('hide'), 8000);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') hint.classList.add('hide');
        }, { once: true });

        let W = 0, H = 0;
        const resize = () => {
            W = canvas.width = window.innerWidth;
            H = canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const keys = {};
        window.addEventListener('keydown', (e) => {
            keys[e.code] = true;
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', (e) => { keys[e.code] = false; });

        const car = {
            x: W * 0.5,
            y: H * 0.35,
            angle: -Math.PI / 2,
            vx: 0,
            vy: 0,
            len: 38,
            wid: 20
        };

        const trails = [];
        const MAX_TRAILS = 180;
        const smoke = [];

        const ACCEL = 0.22;
        const BRAKE = 0.28;
        const FRICTION = 0.985;
        const TURN_RATE = 0.055;
        const MAX_SPEED = 11;
        const DRIFT_LATERAL = 0.92;
        const GRIP_LATERAL = 0.78;

        function update() {
            const up    = keys['KeyW'] || keys['ArrowUp'];
            const down  = keys['KeyS'] || keys['ArrowDown'];
            const left  = keys['KeyA'] || keys['ArrowLeft'];
            const right = keys['KeyD'] || keys['ArrowRight'];
            const drift = keys['Space'];

            if (up) {
                car.vx += Math.cos(car.angle) * ACCEL;
                car.vy += Math.sin(car.angle) * ACCEL;
            }
            if (down) {
                car.vx -= Math.cos(car.angle) * BRAKE * 0.6;
                car.vy -= Math.sin(car.angle) * BRAKE * 0.6;
            }

            const spd = Math.hypot(car.vx, car.vy);
            if (spd > 0.4) {
                const turnMul = Math.min(1, spd / 4);
                if (left)  car.angle -= TURN_RATE * turnMul * (drift ? 1.35 : 1);
                if (right) car.angle += TURN_RATE * turnMul * (drift ? 1.35 : 1);
            } else {
                if (left)  car.angle -= TURN_RATE * 0.4;
                if (right) car.angle += TURN_RATE * 0.4;
            }

            const forwardX = Math.cos(car.angle);
            const forwardY = Math.sin(car.angle);
            const rightX = Math.cos(car.angle + Math.PI / 2);
            const rightY = Math.sin(car.angle + Math.PI / 2);

            let long = car.vx * forwardX + car.vy * forwardY;
            let lat  = car.vx * rightX  + car.vy * rightY;

            const latGrip = drift ? DRIFT_LATERAL : GRIP_LATERAL;
            lat *= latGrip;

            long *= FRICTION;
            if (!up && !down) long *= 0.992;

            const total = Math.hypot(long, lat);
            if (total > MAX_SPEED) {
                const k = MAX_SPEED / total;
                long *= k;
                lat  *= k;
            }

            car.vx = long * forwardX + lat * rightX;
            car.vy = long * forwardY + lat * rightY;

            car.x += car.vx;
            car.y += car.vy;

            const margin = 24;
            if (car.x < margin)          { car.x = margin;          car.vx *= -0.55; }
            if (car.x > W - margin)      { car.x = W - margin;      car.vx *= -0.55; }
            if (car.y < margin)          { car.y = margin;          car.vy *= -0.55; }
            if (car.y > H - margin)      { car.y = H - margin;      car.vy *= -0.55; }

            if (spd > 1.2) {
                const rearOffset = car.len * 0.35;
                const rx = car.x - Math.cos(car.angle) * rearOffset;
                const ry = car.y - Math.sin(car.angle) * rearOffset;
                const side = car.wid * 0.38;
                trails.push({
                    x1: rx + Math.cos(car.angle + Math.PI/2) * side,
                    y1: ry + Math.sin(car.angle + Math.PI/2) * side,
                    x2: rx + Math.cos(car.angle - Math.PI/2) * side,
                    y2: ry + Math.sin(car.angle - Math.PI/2) * side,
                    life: 1,
                    drift: drift || Math.abs(lat) > 1.8
                });
                if (trails.length > MAX_TRAILS) trails.shift();
            }

            if ((drift || Math.abs(lat) > 2.2) && spd > 3 && Math.random() < 0.55) {
                const rear = car.len * 0.4;
                smoke.push({
                    x: car.x - Math.cos(car.angle) * rear + (Math.random() - 0.5) * 10,
                    y: car.y - Math.sin(car.angle) * rear + (Math.random() - 0.5) * 10,
                    vx: (Math.random() - 0.5) * 1.2,
                    vy: (Math.random() - 0.5) * 1.2,
                    life: 1,
                    size: 4 + Math.random() * 8
                });
            }

            for (let i = trails.length - 1; i >= 0; i--) {
                trails[i].life -= 0.012;
                if (trails[i].life <= 0) trails.splice(i, 1);
            }
            for (let i = smoke.length - 1; i >= 0; i--) {
                const s = smoke[i];
                s.x += s.vx;
                s.y += s.vy;
                s.life -= 0.025;
                s.size *= 1.02;
                if (s.life <= 0) smoke.splice(i, 1);
            }
        }

        function drawCar() {
            ctx.save();
            ctx.translate(car.x, car.y);
            ctx.rotate(car.angle);

            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(-car.len/2 + 3, -car.wid/2 + 3, car.len, car.wid, 4);
            } else {
                ctx.rect(-car.len/2 + 3, -car.wid/2 + 3, car.len, car.wid);
            }
            ctx.fill();

            const grad = ctx.createLinearGradient(-car.len/2, 0, car.len/2, 0);
            grad.addColorStop(0, '#6b21a8');
            grad.addColorStop(0.5, '#821be3');
            grad.addColorStop(1, '#a855f7');
            ctx.fillStyle = grad;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(-car.len/2, -car.wid/2, car.len, car.wid, 5);
            } else {
                ctx.rect(-car.len/2, -car.wid/2, car.len, car.wid);
            }
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(-car.len/2 + 6, -car.wid/2 + 3, car.len * 0.45, car.wid - 6, 3);
            } else {
                ctx.rect(-car.len/2 + 6, -car.wid/2 + 3, car.len * 0.45, car.wid - 6);
            }
            ctx.fill();

            ctx.fillStyle = 'rgba(30, 30, 50, 0.7)';
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(2, -car.wid/2 + 4, 11, car.wid - 8, 2);
            } else {
                ctx.rect(2, -car.wid/2 + 4, 11, car.wid - 8);
            }
            ctx.fill();

            ctx.fillStyle = '#f5c518';
            ctx.fillRect(car.len/2 - 5, -car.wid/2 + 2, 4, 5);
            ctx.fillRect(car.len/2 - 5, car.wid/2 - 7, 4, 5);

            ctx.fillStyle = '#ef4444';
            ctx.fillRect(-car.len/2 + 1, -car.wid/2 + 3, 3, 4);
            ctx.fillRect(-car.len/2 + 1, car.wid/2 - 7, 3, 4);

            ctx.fillStyle = '#111';
            const wheelW = 5, wheelH = 9;
            ctx.fillRect(car.len/2 - 12, -car.wid/2 - 3, wheelH, wheelW);
            ctx.fillRect(car.len/2 - 12, car.wid/2 - 2, wheelH, wheelW);
            ctx.fillRect(-car.len/2 + 4, -car.wid/2 - 3, wheelH, wheelW);
            ctx.fillRect(-car.len/2 + 4, car.wid/2 - 2, wheelH, wheelW);

            ctx.restore();
        }

        function draw() {
            ctx.clearRect(0, 0, W, H);

            for (const t of trails) {
                ctx.beginPath();
                ctx.strokeStyle = t.drift
                    ? `rgba(130, 27, 227, ${t.life * 0.55})`
                    : `rgba(255,255,255, ${t.life * 0.18})`;
                ctx.lineWidth = t.drift ? 3.5 : 2.2;
                ctx.lineCap = 'round';
                ctx.moveTo(t.x1, t.y1);
                ctx.lineTo(t.x2, t.y2);
                ctx.stroke();
            }

            for (const s of smoke) {
                ctx.beginPath();
                ctx.fillStyle = `rgba(180, 180, 190, ${s.life * 0.35})`;
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
            }

            drawCar();
        }

        function loop() {
            update();
            draw();
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    })();
});
