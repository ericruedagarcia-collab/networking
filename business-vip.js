const SUPABASE_URL = 'https://wiezfulptazkbuneqwxk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9oZzyX5cqtxDu0XvKNY2Qg_CeGfziAZ';

let supabaseClient = null;
function getSupabase() {
    if (supabaseClient) return supabaseClient;
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return supabaseClient;
    }
    return null;
}

document.addEventListener('DOMContentLoaded', () => {

    try {
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
        console.warn('Lucide Icons no cargó a tiempo');
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Intro: animación de logo ----
    const introScreen = document.getElementById('introScreen');
    const hideIntro = () => {
        document.body.classList.remove('no-scroll');
        if (!introScreen) return;
        introScreen.classList.add('intro-hide');
        setTimeout(() => introScreen.remove(), 900);
    };
    if (introScreen) {
        if (reduceMotion) {
            hideIntro();
        } else {
            introScreen.addEventListener('click', hideIntro, { once: true });
            setTimeout(hideIntro, 2100);
        }
    }

    // ---- Cursor glow ambiental (solo dispositivos con puntero fino) ----
    const glow = document.getElementById('cursorGlow');
    if (glow && window.matchMedia('(hover: hover)').matches && !reduceMotion) {
        let raf = null;
        window.addEventListener('mousemove', (e) => {
            glow.classList.add('active');
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
            });
        }, { passive: true });
        document.addEventListener('mouseleave', () => glow.classList.remove('active'));
    }

    // ---- Botones magnéticos ----
    if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
        document.querySelectorAll('[data-magnetic]').forEach((btn) => {
            btn.addEventListener('mousemove', (e) => {
                const r = btn.getBoundingClientRect();
                const x = e.clientX - r.left - r.width / 2;
                const y = e.clientY - r.top - r.height / 2;
                btn.style.transform = `translate(${x * 0.18}px, ${y * 0.35}px)`;
            });
            btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
        });
    }

    // ---- Reveal on scroll ----
    const revealEls = document.querySelectorAll('.fade-up');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
    revealEls.forEach(el => revealObserver.observe(el));

    // ---- Formulario VIP negocios ----
    const form = document.getElementById('vip-business-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = form.querySelector('button');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Enviando...';
            if (typeof lucide !== 'undefined') lucide.createIcons();
            btn.disabled = true;

            const resetBtn = (label) => {
                btn.innerHTML = label;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                btn.disabled = false;
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }, 3000);
            };

            const payload = {
                role: 'business',
                name: document.getElementById('vip-biz-name').value,
                email: document.getElementById('vip-biz-email').value,
                business_type: document.getElementById('vip-biz-type').value
            };

            try {
                const supabase = getSupabase();
                if (!supabase) throw new Error('Supabase no inicializado');

                const { error } = await supabase.from('waitlist').insert([payload]);

                if (error) {
                    console.error('Error saving:', error);
                    resetBtn('Error de conexión, inténtalo de nuevo');
                    return;
                }

                // Aviso por email a collupworld@gmail.com (no bloqueante:
                // si falla, el lead ya está guardado en Supabase igualmente).
                fetch('/api/notify-signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).catch((notifyErr) => console.warn('No se pudo enviar el aviso por email:', notifyErr));

                btn.innerHTML = originalHTML;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                btn.disabled = false;
                form.reset();

                const successMsg = document.getElementById('vip-success');
                successMsg.style.display = 'flex';
                setTimeout(() => { successMsg.style.display = 'none'; }, 6000);
            } catch (err) {
                console.error('Exception:', err);
                resetBtn('Error en el sistema');
            }
        });
    }
});
