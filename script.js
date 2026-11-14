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

// ---------- Живая статистика с игрового сервера (/api/stats, Worker) ----------
// Сервер сам присылает данные раз в ~10 минут.
document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);
    const CLASSES = ['E', 'D', 'C', 'B', 'A', 'S1', 'S2'];

    const el = (tag, cls, text) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    };
    const arr = (x) => (Array.isArray(x) ? x : []);
    const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
    const digits = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const money = (n) => (n >= 1e9 ? '$' + (n / 1e9).toFixed(1) + 'B'
        : n >= 1e6 ? '$' + (n / 1e6).toFixed(1) + 'M' : '$' + digits(n));
    const lapTime = (ms) => {
        const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, x = Math.floor(ms % 1000);
        return m + ':' + String(s).padStart(2, '0') + '.' + String(x).padStart(3, '0');
    };
    const ago = (unix) => {
        const d = Math.max(0, Date.now() / 1000 - unix);
        if (d < 90) return 'обновлено только что';
        if (d < 3600) return 'обновлено ' + Math.round(d / 60) + ' мин назад';
        if (d < 86400) return 'обновлено ' + Math.round(d / 3600) + ' ч назад';
        return 'обновлено ' + new Date(unix * 1000).toLocaleDateString('ru-RU');
    };

    const fameList = $('fameList'), richList = $('richList'), zonesList = $('zonesList');
    const records = $('records'), classTabs = $('classTabs'), periodTabs = $('periodTabs');
    if (!fameList || !richList || !zonesList || !records) return;

    const emptyRow = (ul, text) => { ul.textContent = ''; ul.append(el('li', 'stats-empty', text)); };

    const renderTop = (ul, list, fmt) => {
        const items = arr(list).slice(0, +ul.dataset.limit || 5);
        if (!items.length) return emptyRow(ul, 'Пока пусто');
        ul.textContent = '';
        items.forEach((p, i) => {
            const li = el('li');
            li.append(el('span', 'rank', i + 1), el('span', 'name', p.name), el('span', 'value', fmt(+p.value || 0)));
            ul.append(li);
        });
    };

    const renderZones = (zones) => {
        const z = obj(zones), list = arr(z.list), total = +z.total || 0;
        if (!list.length) return emptyRow(zonesList, 'Все районы пока ничьи');
        zonesList.textContent = '';
        list.slice(0, 3).forEach((c) => {
            const li = el('li'), bar = el('span', 'zone-bar'), fill = el('i');
            fill.style.width = (total ? Math.min(100, (c.value / total) * 100) : 0) + '%';
            bar.append(fill);
            li.append(el('span', 'zone-name', c.name), bar, el('span', 'zone-val', c.value));
            zonesList.append(li);
        });
    };

    // --- рекорды ---
    let data = null;
    const state = { period: 'best', cls: null };

    const recRow = (place, sub, rec, scoreText) => {
        const li = el('li');
        const p = el('span', 'rec-place', place);
        if (sub) p.append(el('small', null, sub));
        if (rec) {
            const who = el('span', 'rec-who');
            who.append(el('b', null, rec.name));
            const car = el('span', 'rec-car', rec.car || '');
            if (rec.car) car.title = rec.car;
            li.append(p, el('span', 'rec-score', scoreText), who, car);
        } else {
            li.classList.add('rec-free');
            li.append(p, el('span', 'rec-score', '—'), el('span', 'rec-who', 'рекорд свободен'), el('span', 'rec-car', ''));
        }
        return li;
    };

    const renderRecords = () => {
        const tracks = arr(data.tracks), drift = arr(data.drift);
        classTabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cls === state.cls)));
        periodTabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.period === state.period)));

        $('tracksTitle').textContent = 'ТРАССЫ НА ВРЕМЯ · КЛАСС ' + state.cls;
        const trackList = $('trackList');
        trackList.textContent = '';
        tracks.forEach((t) => {
            const rec = obj(obj(t[state.period])[state.cls]);
            trackList.append(recRow(t.name || t.id, null, rec.name ? rec : null, rec.score ? lapTime(rec.score) : ''));
        });
        if (!tracks.length) emptyRow(trackList, 'Пока пусто');

        const driftList = $('driftList');
        driftList.textContent = '';
        drift.forEach((z) => {
            const rec = obj(z[state.period]);
            driftList.append(recRow(z.name || 'Зона ' + z.id, z.name ? 'зона ' + z.id : null,
                rec.name ? rec : null, rec.score ? digits(rec.score) : ''));
        });
        if (!drift.length) emptyRow(driftList, 'Пока пусто');
    };

    const setupRecords = () => {
        const tracks = arr(data.tracks);
        if (!tracks.length && !arr(data.drift).length) { records.hidden = true; return; }
        if (!state.cls) {   // по умолчанию — класс, где больше всего рекордов
            let best = 'S2', bestN = -1;
            CLASSES.forEach((c) => {
                const n = tracks.filter((t) => obj(obj(t.best)[c]).name).length;
                if (n >= bestN) { best = c; bestN = n; }
            });
            state.cls = best;
        }
        if (!classTabs.children.length) {
            CLASSES.forEach((c) => {
                const b = el('button', null, c);
                b.type = 'button';
                b.dataset.cls = c;
                classTabs.append(b);
            });
        }
        records.hidden = false;
        renderRecords();
    };

    classTabs.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-cls]');
        if (b && data) { state.cls = b.dataset.cls; renderRecords(); }
    });
    periodTabs.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-period]');
        if (b && data) { state.period = b.dataset.period; renderRecords(); }
    });

    const render = (d) => {
        data = d;
        if (d.empty) {
            [fameList, richList, zonesList].forEach((ul) => emptyRow(ul, 'Данные скоро появятся'));
            return;
        }
        $('statsUpdated').textContent = d.updated ? ago(d.updated) : '';
        renderTop(fameList, d.fame, digits);
        renderTop(richList, d.rich, money);
        renderZones(d.zones);
        setupRecords();
    };

    const load = () => fetch('/api/stats')
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then(render)
        .catch(() => {
            if (!data) [fameList, richList, zonesList].forEach((ul) => emptyRow(ul, 'Нет связи с сервером'));
        });

    load();
    setInterval(() => { if (!document.hidden) load(); }, 120000);
});
