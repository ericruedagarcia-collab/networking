(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const elements = document.querySelectorAll('.fade-up');
    const show = element => element.classList.add('is-visible');
    // The content remains readable without JavaScript or observer support.
    if (!reduced && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    show(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0, rootMargin: '0px 0px 64px 0px' });
        elements.forEach(element => {
            if (element.getBoundingClientRect().top < window.innerHeight) show(element);
            else { element.classList.add('reveal-pending'); observer.observe(element); }
        });
    } else elements.forEach(show);

    document.querySelectorAll('.phone-mini-screen img').forEach(img => {
        if (reduced) return;
        img.classList.add('image-pending');
        const reveal = async () => {
            try { await img.decode(); } catch { /* Keep the alternative text visible on failure. */ }
            requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add('image-ready')));
        };
        if (img.complete) reveal();
        else { img.addEventListener('load', reveal, { once: true }); img.addEventListener('error', reveal, { once: true }); }
    });
    if (!reduced && document.querySelector('.story-row')) {
        const layer = document.createElement('div');
        layer.className = 'scroll-light-layer';
        layer.setAttribute('aria-hidden', 'true');
        const guide = document.createElement('div');
        guide.className = 'scroll-guide';
        const trails = Array.from({ length: 8 }, () => {
            const beam = document.createElement('div');
            beam.className = 'scroll-light-trail';
            layer.append(beam);
            return beam;
        });
        layer.append(guide);
        document.body.prepend(layer);
        let frame = 0;
        let previousTime = 0;
        let target;
        let points;
        const measure = () => {
            const phase = window.scrollY / Math.max(600, window.innerHeight * 1.05);
            target = {
                x: window.innerWidth * (.5 - Math.cos(phase * Math.PI) * .32),
                y: window.innerHeight * (.58 + Math.sin(phase * Math.PI) * .12),
                scale: .95 + Math.sin(phase * Math.PI * .7) * .25
            };
            if (!points) points = Array.from({ length: 9 }, () => ({ ...target }));
        };
        const render = time => {
            frame = 0;
            const dt = Math.min(32, previousTime ? time - previousTime : 16);
            previousTime = time;
            let remaining = 0;
            points.forEach((point, i) => {
                const destination = i === 0 ? target : points[i - 1];
                const blend = 1 - Math.exp(-dt / (i === 0 ? 110 : 85));
                point.x += (destination.x - point.x) * blend;
                point.y += (destination.y - point.y) * blend;
                point.scale += (destination.scale - point.scale) * blend;
                remaining += Math.abs(destination.x - point.x) + Math.abs(destination.y - point.y);
            });
            const size = window.innerWidth < 860 ? 260 : 360;
            const head = points[0];
            guide.style.transform = `translate3d(${head.x - size / 2}px, ${head.y - size / 2}px, 0) scale(${head.scale})`;
            trails.forEach((beam, i) => {
                const a = points[i], b = points[i + 1];
                const dx = a.x - b.x, dy = a.y - b.y;
                const length = Math.hypot(dx, dy);
                const angle = Math.atan2(dy, dx);
                beam.style.width = `${length + 80}px`;
                beam.style.opacity = `${Math.min(1, length / 14) * (1 - i / 10)}`;
                beam.style.transform = `translate3d(${b.x - 40}px, ${b.y - 40}px, 0) rotate(${angle}rad)`;
            });
            // Animate only while the light and its trailing beam are settling.
            if (remaining > .3 && !document.hidden) frame = requestAnimationFrame(render);
            else previousTime = 0;
        };
        const schedule = () => {
            measure();
            if (!frame && !document.hidden) frame = requestAnimationFrame(render);
        };
        schedule();
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule, { passive: true });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
            else schedule();
        });
    }
    if (window.lucide) window.lucide.createIcons();
})();
