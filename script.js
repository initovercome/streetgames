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
        // Фокус не уходит за пределы модалки
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

    // Копирование промокода
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

    // Видео стартуют сами (autoplay), а вне экрана ставятся на паузу
    const videos = document.querySelectorAll('video');
    videos.forEach((v) => {
        v.muted = true;
        v.disablePictureInPicture = true;
        v.disableRemotePlayback = true;
        v.play().catch(() => {});
    });

    // Вкладка в фоне: все ролики на паузу
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

    // Рваные края: фильтр считается один раз в маску-картинку, а не на каждом кадре
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
        if (!w || !h) return; // скрытая модалка: посчитаем, когда появится
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
});
