const SUPABASE_URL = 'https://xikyjwxvcmiohxztglgs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_loxgiljlYepy5uyKrxIU3w_4eqExVRM';

// Load the signup dependency only when a visitor submits the form.
let supabaseClient = null;
let supabaseLoading;
async function getSupabase() {
    if (supabaseClient) return supabaseClient;
    if (!window.supabase) {
        if (!supabaseLoading) supabaseLoading = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.js';
            const timeout = setTimeout(() => { script.remove(); reject(new Error('Tiempo de conexión agotado')); }, 12000);
            script.onload = () => { clearTimeout(timeout); resolve(); };
            script.onerror = () => { clearTimeout(timeout); reject(new Error('No se pudo conectar')); };
            document.head.append(script);
        }).catch(error => { supabaseLoading = null; throw error; });
        await supabaseLoading;
    }
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
}

document.addEventListener('DOMContentLoaded', () => {

    try {
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
        console.warn('Lucide Icons no cargó a tiempo');
    }

    // ---- Formulario VIP creadores ----
    const form = document.getElementById('vip-influencer-form');
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
                role: 'creator',
                name: document.getElementById('vip-inf-name').value,
                email: document.getElementById('vip-inf-email').value,
                niche: document.getElementById('vip-inf-niche').value,
                ig_followers: document.getElementById('vip-inf-followers').value
            };

            try {
                const supabase = await getSupabase();
                if (!supabase) throw new Error('Supabase no inicializado');

                const { error } = await supabase.from('landing_waitlist').insert([payload]);

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
