document.addEventListener('DOMContentLoaded', () => {
    const playBtn = document.getElementById('playBtn');
    const playModal = document.getElementById('playModal');
    const closeBtn = document.querySelector('.modal-close');

    const openModal = () => {
        playModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        playModal.classList.remove('active');
        document.body.style.overflow = '';
    };

    playBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);

    playModal.addEventListener('click', (e) => {
        if (e.target === playModal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && playModal.classList.contains('active')) {
            closeModal();
        }
    });

    // Плавное появление
    const reveals = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    reveals.forEach(block => revealObserver.observe(block));

    // Видео
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