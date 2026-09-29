/* Pantalla de Campañas interactiva: sustituye la captura estática dentro del móvil.
   Buscador, pestañas, filtros, slides de fotos por campaña y botón "Unirme". */
(function () {
    'use strict';

    var ICON = {
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
        check: '<svg class="cd-check" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.8l2.5 1.7 3-.1 1.2 2.7 2.6 1.6-.6 3 1.2 2.7-2.2 2.1-.5 3-3 .6-2.2 2.1L12 21l-2.7 1.6-2.2-2.1-3-.6-.5-3L1.4 14.7l1.2-2.7-.6-3 2.6-1.6 1.2-2.7 3 .1z"/><path d="m8.5 12 2.4 2.4 4.6-4.8" fill="none" stroke="#0B1018" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        l: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
        r: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
        ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
        clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
        spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>'
    };

    /* Escenas ilustradas para las slides (no dependen de fotos externas) */
    function scene(kind, c1, c2, c3) {
        var g = '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs><rect width="390" height="168" fill="url(#g)"/>';
        var s = {
            sun: '<circle cx="290" cy="58" r="30" fill="' + c3 + '" opacity=".9"/><path d="M0 168V120l70-34 60 38 80-52 90 60 90-30v66z" fill="#000" opacity=".28"/><path d="M0 168v-30l90-24 80 26 110-38 110 34v32z" fill="#000" opacity=".22"/>',
            waves: '<path d="M0 100q50-30 100 0t100 0 100 0 100 0v68H0z" fill="' + c3 + '" opacity=".55"/><path d="M0 128q50-26 100 0t100 0 100 0 100 0v40H0z" fill="#000" opacity=".25"/><circle cx="90" cy="52" r="20" fill="#fff" opacity=".35"/>',
            blocks: '<rect x="40" y="46" width="88" height="112" rx="14" fill="' + c3 + '" opacity=".75"/><rect x="146" y="26" width="88" height="132" rx="14" fill="#fff" opacity=".22"/><rect x="252" y="62" width="88" height="96" rx="14" fill="#000" opacity=".28"/>',
            ring: '<circle cx="195" cy="84" r="52" fill="none" stroke="' + c3 + '" stroke-width="14" opacity=".8"/><circle cx="195" cy="84" r="22" fill="#fff" opacity=".3"/><circle cx="62" cy="130" r="26" fill="#000" opacity=".22"/><circle cx="332" cy="40" r="16" fill="#fff" opacity=".3"/>'
        }[kind];
        return '<svg viewBox="0 0 390 168" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + g + s + '</svg>';
    }

    var CAMPAIGNS = [
        { id: 1, biz: 'Nómada Studio', title: 'Lanzamiento colección otoño', deliv: '1 Reel · 2 Stories', niche: 'Moda', pay: 569.9, taken: 2, max: 5, deadline: '18 oct',
          slides: [['sun', '#B45309', '#7C2D12', '#FCD34D'], ['blocks', '#9A3412', '#431407', '#FDBA74'], ['ring', '#78350F', '#1C0A00', '#FBBF24']] },
        { id: 2, biz: 'Cocina+', title: 'Reseña app de recetas', deliv: '1 TikTok', niche: 'Gastronomía', pay: 335.24, taken: 0, max: 3, deadline: '30 oct',
          slides: [['ring', '#BE123C', '#4C0519', '#FDA4AF'], ['blocks', '#9F1239', '#2A0A12', '#FECDD3']] },
        { id: 3, biz: 'Costa Azul Hotels', title: 'Fin de semana en la costa', deliv: '2 Reels · 3 Stories', niche: 'Viajes', pay: 820, taken: 1, max: 4, deadline: '5 nov',
          slides: [['waves', '#0E7490', '#082F49', '#67E8F9'], ['sun', '#0369A1', '#082F49', '#FDE68A'], ['waves', '#155E75', '#0B1220', '#A5F3FC'], ['blocks', '#0C4A6E', '#020617', '#7DD3FC']] },
        { id: 4, biz: 'Pulse Gym', title: 'Reto 30 días de fuerza', deliv: '1 Video · 4 Stories', niche: 'Fitness', pay: 410, taken: 3, max: 6, deadline: '12 nov',
          slides: [['blocks', '#4338CA', '#1E1B4B', '#A5B4FC'], ['ring', '#5B21B6', '#1E1B4B', '#C4B5FD'], ['sun', '#3730A3', '#0F172A', '#E0E7FF']] }
    ];
    var NICHES = ['Todas', 'Moda', 'Viajes', 'Lifestyle', 'Fitness', 'Gastronomía'];

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function eur(n) { return n.toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €'; }

    function build(screen) {
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var state = { tab: 'explore', niche: 'Todas', q: '', requested: {} };
        var timers = [];

        screen.classList.add('cd-screen');
        screen.innerHTML = '<div class="cd-canvas"><div class="cd-top">' +
            '<h3 class="cd-title">Campañas</h3><div class="cd-sub"></div>' +
            '<label class="cd-search">' + ICON.search + '<input type="search" placeholder="Buscar campaña, nicho, marca..." aria-label="Buscar campañas"></label>' +
            '<div class="cd-seg" role="tablist"><button class="on" data-tab="explore" role="tab">Explorar</button><button data-tab="mine" role="tab">Mis solicitudes <span class="cd-badge" hidden>0</span></button></div>' +
            '<div class="cd-chips">' + NICHES.map(function (n, i) { return '<button class="cd-chip' + (i ? '' : ' on') + '" data-niche="' + n + '">' + n + '</button>'; }).join('') + '</div>' +
            '</div><div class="cd-list"></div></div>';

        var canvas = screen.querySelector('.cd-canvas');
        var list = screen.querySelector('.cd-list');
        var sub = screen.querySelector('.cd-sub');
        var badge = screen.querySelector('.cd-badge');

        /* Escala el lienzo de 390px al ancho real de la pantalla del móvil */
        function fit() { canvas.style.transform = 'scale(' + (screen.clientWidth / 390) + ')'; canvas.style.height = (screen.clientHeight / (screen.clientWidth / 390)) + 'px'; }
        fit();
        if (window.ResizeObserver) new ResizeObserver(fit).observe(screen); else window.addEventListener('resize', fit);

        function visible() {
            return CAMPAIGNS.filter(function (c) {
                if (state.tab === 'mine' && !state.requested[c.id]) return false;
                if (state.niche !== 'Todas' && c.niche !== state.niche) return false;
                var q = state.q.trim().toLowerCase();
                return !q || (c.title + ' ' + c.biz + ' ' + c.niche).toLowerCase().indexOf(q) > -1;
            });
        }

        function cardHTML(c) {
            var req = !!state.requested[c.id];
            var taken = c.taken + (req ? 1 : 0);
            var left = c.max - taken;
            var initials = c.biz.split(' ').slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
            return '<article class="cd-card" data-id="' + c.id + '"><div class="cd-slider">' +
                '<div class="cd-track">' + c.slides.map(function (s) { return '<div class="cd-slide">' + scene(s[0], s[1], s[2], s[3]) + '</div>'; }).join('') + '</div>' +
                '<div class="cd-shade"></div><span class="cd-status">ABIERTA</span>' +
                '<button class="cd-arrow l" aria-label="Foto anterior">' + ICON.l + '</button><button class="cd-arrow r" aria-label="Foto siguiente">' + ICON.r + '</button>' +
                '<div class="cd-dots">' + c.slides.map(function (_, i) { return '<i' + (i ? '' : ' class="on"') + '></i>'; }).join('') + '</div>' +
                '<span class="cd-count">1/' + c.slides.length + '</span></div>' +
                '<div class="cd-body"><div class="cd-biz"><span class="cd-av">' + esc(initials) + '</span><b>' + esc(c.biz) + '</b>' + ICON.check + '<span class="cd-niche">' + esc(c.niche) + '</span></div>' +
                '<h4 class="cd-ctitle">' + esc(c.title) + '</h4><div class="cd-deliv">' + esc(c.deliv) + '</div>' +
                '<div class="cd-earn"><div><small>Puedes ganar hasta</small><strong>' + eur(c.pay) + '</strong></div><em>' + esc(c.deadline) + '</em></div>' +
                '<div class="cd-foot"><div class="cd-slots"><span>' + left + ' de ' + c.max + ' plazas libres</span><div class="cd-bar"><i style="width:' + Math.max(6, taken / c.max * 100) + '%"></i></div></div>' +
                '<button class="cd-btn' + (req ? ' req' : '') + '">' + (req ? ICON.clock + 'Solicitado' : ICON.ok + 'Unirme') + '</button></div></div></article>';
        }

        function slider(card) {
            var track = card.querySelector('.cd-track');
            var dots = card.querySelectorAll('.cd-dots i');
            var count = card.querySelector('.cd-count');
            var n = dots.length, idx = 0, auto = null, stopped = reduce;
            function go(i, smooth) { idx = (i + n) % n; track.scrollTo({ left: idx * track.clientWidth, behavior: smooth === false ? 'auto' : 'smooth' }); }
            function stop() { stopped = true; clearInterval(auto); }
            track.addEventListener('scroll', function () {
                var i = Math.round(track.scrollLeft / track.clientWidth);
                if (i === idx && dots[i].classList.contains('on')) return;
                idx = i;
                dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
                count.textContent = (i + 1) + '/' + n;
            }, { passive: true });
            card.querySelector('.cd-arrow.l').addEventListener('click', function () { stop(); go(idx - 1); });
            card.querySelector('.cd-arrow.r').addEventListener('click', function () { stop(); go(idx + 1); });
            track.addEventListener('pointerdown', stop);
            track.addEventListener('touchstart', stop, { passive: true });
            if (!stopped && window.IntersectionObserver) {
                var io = new IntersectionObserver(function (es) {
                    clearInterval(auto);
                    if (es[0].isIntersecting && !stopped) auto = setInterval(function () { go(idx + 1); }, 3200);
                }, { threshold: 0.6 });
                io.observe(card);
                timers.push(function () { io.disconnect(); clearInterval(auto); });
            }
        }

        function render() {
            timers.forEach(function (f) { f(); }); timers = [];
            var items = visible();
            var nReq = Object.keys(state.requested).length;
            badge.hidden = !nReq; badge.textContent = nReq;
            sub.textContent = state.tab === 'mine' ? nReq + ' solicitudes enviadas' : items.length + ' campañas disponibles';
            if (!items.length) {
                list.innerHTML = '<div class="cd-empty"><div>' + ICON.spark + '</div><h4>' + (state.tab === 'mine' ? 'Aún no has solicitado ninguna campaña' : 'Sin resultados') +
                    '</h4><p>' + (state.tab === 'mine' ? 'Explora las campañas abiertas y únete a las que encajen contigo.' : 'Prueba con otro filtro o búsqueda.') + '</p></div>';
                return;
            }
            list.innerHTML = items.map(cardHTML).join('');
            list.querySelectorAll('.cd-card').forEach(slider);
        }

        screen.addEventListener('click', function (e) {
            var t = e.target.closest('[data-tab],[data-niche],.cd-btn');
            if (!t) return;
            if (t.dataset.tab) {
                state.tab = t.dataset.tab;
                screen.querySelectorAll('.cd-seg button').forEach(function (b) { b.classList.toggle('on', b === t); });
                list.scrollTop = 0; render();
            } else if (t.dataset.niche) {
                state.niche = t.dataset.niche;
                screen.querySelectorAll('.cd-chip').forEach(function (b) { b.classList.toggle('on', b === t); });
                list.scrollTop = 0; render();
            } else {
                var id = +t.closest('.cd-card').dataset.id;
                if (state.requested[id]) delete state.requested[id]; else state.requested[id] = true;
                var top = list.scrollTop; render(); list.scrollTop = top;
            }
        });
        screen.querySelector('input').addEventListener('input', function (e) { state.q = e.target.value; render(); });
        render();
    }

    function init() {
        document.querySelectorAll('.phone-mini-screen').forEach(function (screen) {
            if (screen.querySelector('img[src$="campaigns.png"]')) {
                var shine = screen.querySelector('.phone-mini-shine');
                build(screen);
                if (shine) screen.appendChild(shine);
            }
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
