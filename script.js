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

    // ---------- Рваные края: статичный clip-path (вместо тяжёлого SVG-фильтра) ----------
    // [селектор, глубина рваности px, шаг px]
    const ROUGH = [
        ['.feature-banner', 9, 10],
        ['.stats-panel', 9, 10],
        ['.modal-content', 9, 10],
        ['.btn-bonus-img', 7, 9],
        ['.btn-play', 5, 8],
        ['.btn-bonus-text', 4.5, 8],
        ['.modal-card', 5, 8],
        ['.promo-code-box', 4.5, 8],
        ['.zone-bar', 1.9, 3.5]
    ];

    const mulberry32 = (a) => () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // многоугольник: края рваные только внутрь (контент не обрезается снаружи)
    const roughPolygon = (w, h, amp, step, seed) => {
        const rnd = mulberry32(seed);
        const per = 2 * (w + h);
        const N = Math.max(8, Math.ceil(per / step));
        const coarse = [];
        for (let i = 0; i <= Math.ceil(N / 3) + 2; i++) coarse.push(rnd());
        const arr = [];
        for (let i = 0; i < N; i++) {                     // крупные «волны» + мелкая рваность
            const t = i / 3, i0 = Math.floor(t), f = t - i0, s = f * f * (3 - 2 * f);
            const c = coarse[i0] * (1 - s) + coarse[i0 + 1] * s;
            arr.push(amp * (0.05 + 0.95 * (0.5 * c + 0.5 * rnd())));
        }
        const offAt = (d) => {
            const k = d / step, i0 = Math.floor(k), f = k - i0;
            return arr[i0 % N] * (1 - f) + arr[(i0 + 1) % N] * f;
        };
        const pts = [];
        const o0 = offAt(0);
        pts.push([o0, o0]);
        for (let d = step; d < w - step * 0.5; d += step) pts.push([d, offAt(d)]);
        const o1 = offAt(w);
        pts.push([w - o1, o1]);
        for (let d = step; d < h - step * 0.5; d += step) pts.push([w - offAt(w + d), d]);
        const o2 = offAt(w + h);
        pts.push([w - o2, h - o2]);
        for (let d = step; d < w - step * 0.5; d += step) pts.push([w - d, h - offAt(w + h + d)]);
        const o3 = offAt(2 * w + h);
        pts.push([o3, h - o3]);
        for (let d = step; d < h - step * 0.5; d += step) pts.push([offAt(2 * w + h + d), h - d]);
        return 'polygon(' + pts.map((p) => p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px').join(',') + ')';
    };

    const applyRough = (el) => {
        const w = el.offsetWidth, h = el.offsetHeight;
        if (!w || !h) return;
        const key = w + 'x' + h;
        if (el._roughSize === key) return;
        el._roughSize = key;
        el.style.clipPath = roughPolygon(w, h, el._roughAmp, el._roughStep, el._roughSeed);
    };

    const roughEls = [];
    ROUGH.forEach(([sel, amp, step], si) => {
        document.querySelectorAll(sel).forEach((el, i) => {
            el._roughAmp = amp; el._roughStep = step; el._roughSeed = 4 + si * 101 + i * 17;
            roughEls.push(el);
        });
    });
    if ('ResizeObserver' in window) {
        const ro = new ResizeObserver((entries) => entries.forEach((e) => applyRough(e.target)));
        roughEls.forEach((el) => { applyRough(el); ro.observe(el); });
    } else {
        roughEls.forEach(applyRough);
        window.addEventListener('resize', () => roughEls.forEach(applyRough));
    }
});
