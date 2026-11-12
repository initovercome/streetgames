document.addEventListener('DOMContentLoaded', () => {
    const playBtn = document.getElementById('playBtn');
    const playModal = document.getElementById('playModal');
    const bonusBtn = document.getElementById('bonusBtn');
    const bonusModal = document.getElementById('bonusModal');
    const copyBtn = document.getElementById('copyBtn');
    const promoCode = document.getElementById('promoCode');

    const openModal = (modal) => {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeModal = (modal) => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    playBtn.addEventListener('click', () => openModal(playModal));

    bonusBtn.addEventListener('click', () => openModal(bonusModal));
    bonusBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal(bonusModal);
        }
    });

    document.querySelectorAll('.modal').forEach(modal => {
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeModal(modal));
        }
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => closeModal(modal));
        }
    });

    if (copyBtn && promoCode) {
        copyBtn.addEventListener('click', async () => {
            const code = promoCode.textContent.trim();
            try {
                await navigator.clipboard.writeText(code);
                copyBtn.textContent = 'Скопировано';
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.textContent = 'Копировать';
                    copyBtn.classList.remove('copied');
                }, 2000);
            } catch (err) {
                const range = document.createRange();
                range.selectNode(promoCode);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);
                try {
                    document.execCommand('copy');
                    copyBtn.textContent = 'Скопировано';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.textContent = 'Копировать';
                        copyBtn.classList.remove('copied');
                    }, 2000);
                } catch (e) {}
                window.getSelection().removeAllRanges();
            }
        });
    }

    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
        video.removeAttribute('loop');

        video.addEventListener('timeupdate', () => {
            if (video.duration && video.currentTime >= video.duration - 0.25) {
                video.currentTime = 0;
                video.play().catch(() => {});
            }
        });

        video.addEventListener('loadeddata', () => {
            if (video.paused) video.play().catch(() => {});
        });
    });
});
