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
    videos.forEach((v) => { v.muted = true; v.play().catch(() => {}); });

    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(({ target, isIntersecting }) => {
                if (isIntersecting) target.play().catch(() => {});
                else target.pause();
            });
        }, { threshold: 0.1 });
        videos.forEach((v) => io.observe(v));
    }
});
