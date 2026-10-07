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
    if (window.lucide) window.lucide.createIcons();
})();
