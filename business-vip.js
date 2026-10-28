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
            script.src = 'assets/vendor/supabase.min.js';
            const timeout = setTimeout(() => { script.remove(); reject(new Error('Tiempo de conexión agotado')); }, 12000);
            script.onload = () => { clearTimeout(timeout); resolve(); };
            script.onerror = () => { clearTimeout(timeout); reject(new Error('No se pudo conectar')); };
            document.head.append(script);
        }).catch(error => { supabaseLoading = null; throw error; });
        await supabaseLoading;
    }
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    return supabaseClient;
}

document.addEventListener('DOMContentLoaded', () => {

    try {
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
        console.warn('Lucide Icons no cargó a tiempo');
    }

    // ---- Formulario VIP negocios ----
    const form = document.getElementById('vip-business-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const legal = window.COLLUP_LEGAL;
            if (!legal?.ready || !form.reportValidity()) {
                form.querySelector('.privacy-status').textContent = 'El registro no está disponible temporalmente.';
                return;
            }
            if (!form.querySelector('[name="privacy-consent"]').checked) return;

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
                privacy_consent: true,
                privacy_notice_version: legal.noticeVersion,
                name: document.getElementById('vip-biz-name').value,
                email: document.getElementById('vip-biz-email').value,
                phone: (document.getElementById('vip-biz-phone')?.value || '').trim(),
                business_type: document.getElementById('vip-biz-type').value,
                monthly_collabs: document.getElementById('vip-biz-collabs').value,
                monthly_budget: document.getElementById('vip-biz-budget').value
            };

            const aff = window.COLLUP_REF && window.COLLUP_REF.get();
            if (aff) payload.referral_code = aff;

            try {
                const supabase = await getSupabase();
                if (!supabase) throw new Error('Supabase no inicializado');

                const { error } = await supabase.from('landing_waitlist').insert([payload]);

                if (error) {
                    console.error('Error saving:', error);
                    // The server says what to fix ("Revisa el teléfono", "Revisa el email"…).
                    resetBtn(error.hint || 'Error de conexión, inténtalo de nuevo');
                    return;
                }

                // The saved registration queues its personalized welcome server-side.

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
