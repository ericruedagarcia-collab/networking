// CollUp · Portal de afiliados · capa de datos.
// Dos backends con la misma interfaz: Supabase (real) y demo (datos ficticios en memoria).
(function () {
    'use strict';
    const CFG = window.COLLUP_AFF;
    const params = new URLSearchParams(location.search);
    const local = ['localhost', '127.0.0.1', ''].includes(location.hostname);
    const demo = params.get('demo') === '1' && (local || CFG.ALLOW_DEMO_ON_SITE);
    if (demo) { try { sessionStorage.setItem('collup_aff_demo', '1'); } catch (e) {} }
    const demoActive = demo || (function () { try { return sessionStorage.getItem('collup_aff_demo') === '1' && (local || CFG.ALLOW_DEMO_ON_SITE); } catch (e) { return false; } })();

    const ERRORS = {
        portal_closed: 'El programa de afiliados todavía no está abierto al público.',
        terms_required: 'Debes aceptar las condiciones del programa.',
        already_affiliate: 'Esta cuenta ya es de afiliado.',
        code_format: 'El código debe tener de 3 a 20 caracteres: letras, números y guiones.',
        code_reserved: 'Ese código está reservado. Elige otro.',
        code_taken: 'Ese código ya está en uso. Prueba con otro.',
        code_locked: 'Ya no puedes cambiar tu código porque tienes negocios en tu cartera.',
        not_authenticated: 'Tu sesión ha caducado. Vuelve a entrar.',
        not_affiliate: 'Tu cuenta de afiliado no está activa.',
        consent_required: 'Confirma que la persona sabe que la registras.',
        invalid_kind: 'Tipo no válido.',
        invalid_email: 'El email no es válido.',
        already_registered: 'Este contacto ya está registrado por otro afiliado (o por ti).',
        not_found: 'No se ha encontrado el elemento.',
        forbidden: 'No tienes permiso para hacer esto.',
        invalid_status: 'Estado no válido.',
        duplicate_collab_ref: 'Ya existe una colaboración con esa referencia.',
        not_editable: 'Este elemento ya no se puede modificar.',
        nothing_to_pay: 'No hay comisiones por cobrar para este afiliado.',
        below_minimum: 'Todavía no alcanza el importe mínimo de pago.',
        'Invalid login credentials': 'Email o contraseña incorrectos.',
        'Email not confirmed': 'Confirma tu email antes de entrar (revisa tu bandeja de entrada).',
        'User already registered': 'Ya existe una cuenta con ese email. Inicia sesión.'
    };
    function friendly(err) {
        const msg = (err && (err.message || err.error_description)) || String(err || '');
        for (const k of Object.keys(ERRORS)) if (msg.includes(k)) return ERRORS[k];
        if (/Password should be/i.test(msg)) return 'La contraseña debe tener al menos 8 caracteres.';
        if (/rate limit|too many/i.test(msg)) return 'Demasiados intentos. Espera unos minutos.';
        if (/fetch|network/i.test(msg)) return 'No hay conexión con el servidor. Inténtalo de nuevo.';
        return 'Algo ha fallado. Inténtalo de nuevo.';
    }
    function fail(err) { const e = new Error(friendly(err)); e.original = err; throw e; }

    // ------------------------------------------------------------ Supabase --
    let client = null;
    async function sb() {
        if (client) return client;
        if (!window.supabase) {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = '../assets/vendor/supabase.min.js';
                const t = setTimeout(() => reject(new Error('fetch')), 12000);
                s.onload = () => { clearTimeout(t); resolve(); };
                s.onerror = () => { clearTimeout(t); reject(new Error('fetch')); };
                document.head.append(s);
            });
        }
        client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY,
            { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'collup-aff-auth' } });
        return client;
    }
    async function rpc(name, args) {
        const c = await sb();
        const { data, error } = await c.rpc(name, args || {});
        if (error) fail(error);
        return data;
    }
    async function all(table, build) {
        const c = await sb();
        const out = [];
        for (let from = 0; ; from += 1000) {
            let q = c.from(table).select('*');
            if (build) q = build(q);
            const { data, error } = await q.range(from, from + 999);
            if (error) fail(error);
            out.push(...data);
            if (data.length < 1000) break;
        }
        return out;
    }
    const num = (rows, keys) => rows.map(r => { keys.forEach(k => { if (r[k] != null) r[k] = Number(r[k]); }); return r; });
    const COLLAB_NUM = ['gross_amount', 'collup_income', 'commission_rate', 'commission_amount'];

    const supa = {
        mode: 'supabase',
        status: () => rpc('affiliate_portal_status'),
        codeAvailable: (code) => rpc('affiliate_code_available', { p_code: code }),
        async session() {
            const c = await sb();
            const { data } = await c.auth.getSession();
            const s = data.session;
            if (!s) return null;
            let isAdmin = false;
            try { const r = await c.rpc('is_affiliate_admin'); isAdmin = r.data === true; } catch (e) {}
            return { user: { id: s.user.id, email: s.user.email }, isAdmin };
        },
        async signIn(email, password) {
            const c = await sb();
            const { error } = await c.auth.signInWithPassword({ email, password });
            if (error) fail(error);
        },
        async signUp(email, password) {
            const c = await sb();
            const { data, error } = await c.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + '/afiliados/' } });
            if (error) fail(error);
            if (data.user && data.user.identities && data.user.identities.length === 0) fail({ message: 'User already registered' });
            return { needsConfirmation: !data.session };
        },
        async signOut() { const c = await sb(); await c.auth.signOut(); },
        async resetPassword(email) {
            const c = await sb();
            const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/afiliados/' });
            if (error) fail(error);
        },
        async changePassword(password) {
            const c = await sb();
            const { error } = await c.auth.updateUser({ password });
            if (error) fail(error);
        },
        async me() {
            const c = await sb();
            const { data: u } = await c.auth.getUser();
            if (!u.user) return null;
            const { data, error } = await c.from('affiliates').select('*').eq('id', u.user.id).maybeSingle();
            if (error) fail(error);
            if (data && data.commission_rate != null) data.commission_rate = Number(data.commission_rate);
            return data;
        },
        claim: ({ code, name, accept }) => rpc('affiliate_signup', { p_code: code, p_name: name, p_accept: accept }),
        changeCode: (code) => rpc('affiliate_change_code', { p_code: code }),
        updateProfile: ({ name, method, details }) => rpc('affiliate_update_profile', { p_name: name, p_method: method || '', p_details: details || '' }),
        async myReferrals() { return all('affiliate_referrals', q => q.order('created_at', { ascending: false })); },
        async myCollabs() { return num(await all('affiliate_collaborations', q => q.order('created_at', { ascending: false })), COLLAB_NUM); },
        async myPayouts() { return num(await all('affiliate_payouts', q => q.order('created_at', { ascending: false })), ['amount']); },
        addLead: (l) => rpc('affiliate_add_lead', { p_kind: l.kind, p_name: l.name, p_email: l.email || null, p_phone: l.phone || null, p_business_type: l.business_type || null, p_city: l.city || null, p_notes: l.notes || null, p_consent: l.consent }),
        updateLead: (id, notes, lost) => rpc('affiliate_update_lead', { p_id: id, p_notes: notes || '', p_lost: !!lost }),
        // admin
        async adminAffiliates() { return all('affiliates', q => q.order('created_at', { ascending: false })).then(r => r.map(a => (a.commission_rate != null && (a.commission_rate = Number(a.commission_rate)), a))); },
        adminReferrals() { return this.myReferrals(); },
        adminCollabs() { return this.myCollabs(); },
        adminPayouts() { return this.myPayouts(); },
        adminSettings: () => rpc('affiliate_admin_get_settings'),
        setSettings: (s) => rpc('affiliate_admin_set_settings', { p_open: s.open ?? null, p_rate: s.rate ?? null, p_months: s.months ?? null, p_min: s.min ?? null, p_launch: s.launch ?? null }),
        setAffiliate: (id, status, rate, clearRate) => rpc('affiliate_admin_set_affiliate', { p_id: id, p_status: status ?? null, p_rate: rate ?? null, p_clear_rate: !!clearRate }),
        setReferral: (id, status, affiliateId) => rpc('affiliate_admin_set_referral', { p_id: id, p_status: status ?? null, p_affiliate_id: affiliateId ?? null }),
        addCollab: (c) => rpc('affiliate_admin_add_collab', { p_referral_id: c.referral_id, p_ref: c.ref || null, p_description: c.description || null, p_gross: c.gross, p_income: c.income, p_status: c.status || 'pending' }),
        setCollab: (id, status) => rpc('affiliate_admin_set_collab', { p_id: id, p_status: status }),
        createPayout: (affiliateId, method, force) => rpc('affiliate_admin_create_payout', { p_affiliate_id: affiliateId, p_method: method || null, p_force: !!force }),
        markPaid: (id, reference) => rpc('affiliate_admin_mark_payout_paid', { p_id: id, p_reference: reference || null })
    };

    window.AffAPI = { friendly, demo: demoActive, ready: null, backend: supa };
    if (demoActive) {
        window.AffAPI.ready = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'demo.js';
            s.onload = () => { window.AffAPI.backend = window.AffDemo; resolve(); };
            s.onerror = reject;
            document.head.append(s);
        });
    } else {
        window.AffAPI.ready = Promise.resolve();
    }
    // Proxy so pages can call AffAPI.x() regardless of the active backend.
    ['mode', 'status', 'codeAvailable', 'session', 'signIn', 'signUp', 'signOut', 'resetPassword', 'changePassword', 'me', 'claim', 'changeCode',
        'updateProfile', 'myReferrals', 'myCollabs', 'myPayouts', 'addLead', 'updateLead', 'adminAffiliates', 'adminReferrals', 'adminCollabs',
        'adminPayouts', 'adminSettings', 'setSettings', 'setAffiliate', 'setReferral', 'addCollab', 'setCollab', 'createPayout', 'markPaid'
    ].forEach(k => {
        Object.defineProperty(window.AffAPI, k, {
            get() { const b = window.AffAPI.backend; const v = b[k]; return typeof v === 'function' ? v.bind(b) : v; }
        });
    });
})();
