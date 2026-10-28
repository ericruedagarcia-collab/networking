// CollUp · Portal de afiliados · MODO DEMO (datos ficticios en memoria, nada se guarda).
// Se activa con ?demo=1 solo en localhost. Entra con cualquier email; si empieza por "admin" entras como administrador.
(function () {
    'use strict';
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pick = a => a[Math.floor(rnd() * a.length)];
    const uid = (p) => p + '-' + Math.floor(rnd() * 1e9).toString(36);
    const now = Date.now(), DAY = 864e5;
    const iso = t => new Date(t).toISOString();

    const settings = { portal_open: false, commission_rate: 0.2, commission_months: 12, min_payout: 25, launch_label: 'Enero–febrero 2027' };
    const names = ['Marta Soler', 'Carlos Vidal', 'Lucía Ferrer', 'Pau Costa', 'Nerea Gil', 'Andrés Mora', 'Julia Ros', 'Hugo Beltrán', 'Irene Sales', 'Marc Peris'];
    const codes = ['MARTA', 'CARLOS20', 'LUCIA-VLC', 'PAUCOSTA', 'NEREA', 'ANDRES', 'JULIAROS', 'HUGO-B', 'IRENE', 'MARCPERIS'];
    const affiliates = names.map((n, i) => ({
        id: 'aff-' + i, code: codes[i], display_name: n, email: n.toLowerCase().replace(/[^a-z]+/g, '.') + '@correo.com',
        status: i === 8 ? 'suspended' : 'active', commission_rate: i === 1 ? 0.25 : null,
        payout_method: i % 3 === 0 ? 'transfer' : i % 3 === 1 ? 'bizum' : null, payout_details: i % 3 === 0 ? 'ES•• •••• •••• 4821' : null,
        accepted_terms_at: iso(now - (60 - i * 4) * DAY), created_at: iso(now - (60 - i * 4) * DAY)
    }));
    const biz = ['Restaurante Casa Pepe', 'Hotel Mar Blava', 'Bar El Racó', 'Pizzería La Vall', 'Gimnasio FitCastelló', 'Boutique Luna', 'Agencia Viajes Sol', 'Clínica Dental Sonrisa', 'Heladería Dolce', 'Peluquería Estilo', 'Camping Els Pins', 'Cafetería Aroma', 'Tienda Naturaleza', 'Hotel Rural La Plana', 'Cervecería Nord', 'Floristería Petalo', 'Escuela de Surf Playa', 'Librería Món', 'Taller Moto Vidal', 'Spa Zen Costa', 'Marisquería La Gamba', 'Zapatería Paso', 'Estudio Pilates Core', 'Bodega Vinos del Sur', 'Cocina Fusión Wok'];
    const creators = ['@martaviaja', '@pau.gastro', '@lucia.fit', '@nerea.style', '@andresfoto', '@julia.tiktok', '@hugo.trip', '@irenebeauty'];
    const types = ['Restaurante', 'Hotel', 'Bar', 'Tienda', 'Gimnasio', 'Agencia de viajes', 'Salud y belleza', 'Otro'];
    const cities = ['Castellón', 'Valencia', 'La Vall d\'Uixó', 'Benicàssim', 'Alicante', 'Peñíscola', 'Vila-real'];
    const referrals = [], collabs = [], payouts = [];
    let bi = 0;
    affiliates.forEach((a, ai) => {
        const n = ai === 0 ? 14 : ai === 1 ? 11 : ai === 8 ? 2 : 2 + Math.floor(rnd() * 6);
        for (let k = 0; k < n; k++) {
            const isCreator = rnd() < 0.25;
            const name = isCreator ? pick(creators) + k : biz[bi++ % biz.length] + (bi > biz.length ? ' ' + Math.floor(bi / biz.length) : '');
            const r = rnd();
            const status = r < 0.18 ? 'prospect' : r < 0.78 ? 'waiting' : r < 0.9 ? 'lost' : 'waiting';
            referrals.push({
                id: uid('ref'), affiliate_id: a.id, kind: isCreator ? 'creator' : 'business', name,
                email: name.toLowerCase().replace(/[^a-z0-9]+/g, '') + '@mail.com', phone: null,
                business_type: isCreator ? null : pick(types), city: pick(cities), notes: rnd() < 0.3 ? 'Muy interesado, quiere probar en cuanto salga.' : null,
                source: status === 'prospect' || rnd() < 0.3 ? 'manual' : 'link', status, waitlist_id: null,
                first_collab_at: null, commission_ends_at: null,
                created_at: iso(now - Math.floor(rnd() * (50 - ai * 3 + 5)) * DAY), updated_at: iso(now)
            });
        }
    });
    // Simulate post-launch data for a few referrals so the dashboards show commissions.
    referrals.filter(r => r.kind === 'business' && r.status === 'waiting').forEach((r, i) => {
        if (i % 3 !== 0) return;
        const start = now - Math.floor(10 + rnd() * 100) * DAY;
        r.status = 'active'; r.first_collab_at = iso(start); r.commission_ends_at = iso(start + 365 * DAY);
        const nc = 1 + Math.floor(rnd() * 4);
        for (let c = 0; c < nc; c++) {
            const gross = pick([150, 250, 400, 600, 800, 1200]);
            const income = Math.round(gross * 0.162 * 100) / 100;
            const when = start + c * 11 * DAY;
            const status = when < now - 45 * DAY ? 'paid' : when < now - 8 * DAY ? 'collected' : 'pending';
            const aff = affiliates.find(a => a.id === r.affiliate_id);
            const rate = aff.commission_rate ?? 0.2;
            collabs.push({
                id: uid('col'), referral_id: r.id, affiliate_id: r.affiliate_id, collab_ref: 'COL-' + (1000 + collabs.length),
                description: pick(['Reel + 3 stories', 'Visita y reseña', 'Pack TikTok', 'Campaña verano', 'Menú degustación']),
                gross_amount: gross, collup_income: income, commission_rate: rate, commission_amount: Math.round(income * rate * 100) / 100,
                status, collected_at: status === 'pending' ? null : iso(when), paid_at: status === 'paid' ? iso(when + 20 * DAY) : null,
                payout_id: null, created_at: iso(when - 3 * DAY)
            });
        }
    });
    // payouts for paid collabs
    affiliates.forEach(a => {
        const paid = collabs.filter(c => c.affiliate_id === a.id && c.status === 'paid');
        if (!paid.length) return;
        const p = { id: uid('pay'), affiliate_id: a.id, amount: Math.round(paid.reduce((s, c) => s + c.commission_amount, 0) * 100) / 100, status: 'paid', method: a.payout_method || 'transfer', reference: 'TRF-' + Math.floor(rnd() * 9000 + 1000), created_at: iso(now - 25 * DAY), paid_at: iso(now - 24 * DAY), created_by: 'admin' };
        payouts.push(p); paid.forEach(c => c.payout_id = p.id);
    });

    // ---- session ----
    let current = null;
    try { current = JSON.parse(sessionStorage.getItem('collup_demo_session') || 'null'); } catch (e) {}
    const save = () => { try { sessionStorage.setItem('collup_demo_session', JSON.stringify(current)); } catch (e) {} };
    const wait = (v) => new Promise(r => setTimeout(() => r(v), 90));
    const clone = o => JSON.parse(JSON.stringify(o));
    const err = m => { throw new Error(window.AffAPI.friendly({ message: m })); };
    const needAdmin = () => { if (!current || !current.isAdmin) err('forbidden'); };
    const normalize = c => String(c || '').trim().toUpperCase();
    const problem = c => {
        c = normalize(c);
        if (!/^[A-Z0-9][A-Z0-9-]{2,19}$/.test(c)) return 'format';
        if (['COLLUP', 'ADMIN', 'AFILIADOS', 'SOPORTE', 'TEST', 'PRUEBA', 'HOLA'].includes(c)) return 'reserved';
        if (affiliates.some(a => a.code === c)) return 'taken';
        return null;
    };
    const myAff = () => affiliates.find(a => a.id === (current && current.affiliateId));
    const recalc = (c) => {
        const r = referrals.find(x => x.id === c.referral_id);
        const rate = c.commission_rate;
        if (c.status === 'cancelled') { c.commission_amount = 0; return; }
        if (c.status === 'pending') { c.commission_amount = Math.round(c.collup_income * rate * 100) / 100; return; }
        if (!c.collected_at) c.collected_at = iso(Date.now());
        if (!r.first_collab_at) { r.first_collab_at = c.collected_at; r.commission_ends_at = iso(new Date(c.collected_at).getTime() + settings.commission_months * 30.4 * DAY); }
        r.status = 'active';
        c.commission_amount = Math.round(c.collup_income * rate * 100) / 100;
    };

    window.AffDemo = {
        mode: 'demo',
        status: () => wait({ open: settings.portal_open, commission_rate: settings.commission_rate, commission_months: settings.commission_months, min_payout: settings.min_payout, launch_label: settings.launch_label }),
        codeAvailable: (code) => { const p = problem(code); return wait({ available: !p, reason: p, code: normalize(code) }); },
        session: () => wait(current ? { user: { id: current.id, email: current.email }, isAdmin: current.isAdmin } : null),
        async signIn(email) {
            const admin = /^admin/i.test(email);
            current = { id: admin ? 'adm-1' : 'aff-0', email, isAdmin: admin, affiliateId: admin ? null : 'aff-0' };
            if (admin) current.affiliateId = null;
            save(); return wait();
        },
        async signUp(email) { current = { id: 'new-' + uid('u'), email, isAdmin: false, affiliateId: null }; save(); return wait({ needsConfirmation: false }); },
        async signOut() { current = null; save(); return wait(); },
        resetPassword: () => wait(),
        changePassword: () => wait(),
        me: () => wait(myAff() ? clone(myAff()) : null),
        async claim({ code, name }) {
            const p = problem(code); if (p) err('code_' + p);
            const a = { id: current.id, code: normalize(code), display_name: name, email: current.email, status: 'active', commission_rate: null, payout_method: null, payout_details: null, accepted_terms_at: iso(Date.now()), created_at: iso(Date.now()) };
            affiliates.push(a); current.affiliateId = a.id; save(); return wait({ code: a.code });
        },
        async changeCode(code) {
            if (referrals.some(r => r.affiliate_id === current.affiliateId)) err('code_locked');
            const p = problem(code); if (p) err('code_' + p);
            myAff().code = normalize(code); return wait({ code: myAff().code });
        },
        async updateProfile({ name, method, details }) { Object.assign(myAff(), { display_name: name, payout_method: method || null, payout_details: details || null }); return wait(); },
        myReferrals: () => wait(clone(referrals.filter(r => r.affiliate_id === (current && current.affiliateId)))),
        myCollabs: () => wait(clone(collabs.filter(c => c.affiliate_id === (current && current.affiliateId)))),
        myPayouts: () => wait(clone(payouts.filter(p => p.affiliate_id === (current && current.affiliateId)))),
        async addLead(l) {
            if (!l.consent) err('consent_required');
            if (l.email && referrals.some(r => (r.email || '').toLowerCase() === l.email.toLowerCase())) err('already_registered');
            const r = { id: uid('ref'), affiliate_id: current.affiliateId, kind: l.kind, name: l.name, email: l.email || null, phone: l.phone || null, business_type: l.business_type || null, city: l.city || null, notes: l.notes || null, source: 'manual', status: 'prospect', waitlist_id: null, first_collab_at: null, commission_ends_at: null, created_at: iso(Date.now()), updated_at: iso(Date.now()) };
            referrals.unshift(r); return wait(r.id);
        },
        async updateLead(id, notes, lost) {
            const r = referrals.find(x => x.id === id && x.affiliate_id === current.affiliateId); if (!r) err('not_found');
            r.notes = notes || null;
            if (['prospect', 'waiting', 'lost'].includes(r.status)) r.status = lost ? 'lost' : (r.source === 'manual' ? 'prospect' : 'waiting');
            return wait();
        },
        adminAffiliates: () => { needAdmin(); return wait(clone(affiliates)); },
        adminReferrals: () => { needAdmin(); return wait(clone(referrals)); },
        adminCollabs: () => { needAdmin(); return wait(clone(collabs)); },
        adminPayouts: () => { needAdmin(); return wait(clone(payouts)); },
        adminSettings: () => { needAdmin(); return wait(clone(settings)); },
        async setSettings(s) {
            needAdmin();
            if (s.open != null) settings.portal_open = s.open; if (s.rate != null) settings.commission_rate = s.rate;
            if (s.months != null) settings.commission_months = s.months; if (s.min != null) settings.min_payout = s.min;
            if (s.launch) settings.launch_label = s.launch; return wait(clone(settings));
        },
        async setAffiliate(id, status, rate, clearRate) {
            needAdmin(); const a = affiliates.find(x => x.id === id); if (!a) err('not_found');
            if (status) a.status = status; if (clearRate) a.commission_rate = null; else if (rate != null) a.commission_rate = rate; return wait();
        },
        async setReferral(id, status, affiliateId) {
            needAdmin(); const r = referrals.find(x => x.id === id); if (!r) err('not_found');
            if (status) r.status = status; if (affiliateId) { r.affiliate_id = affiliateId; collabs.filter(c => c.referral_id === id && c.status !== 'paid').forEach(c => c.affiliate_id = affiliateId); }
            return wait();
        },
        async addCollab(c) {
            needAdmin(); const r = referrals.find(x => x.id === c.referral_id); if (!r) err('not_found');
            if (c.ref && collabs.some(x => x.collab_ref === c.ref)) err('duplicate_collab_ref');
            const a = affiliates.find(x => x.id === r.affiliate_id);
            const n = { id: uid('col'), referral_id: r.id, affiliate_id: r.affiliate_id, collab_ref: c.ref || null, description: c.description || null, gross_amount: c.gross, collup_income: c.income, commission_rate: a.commission_rate ?? settings.commission_rate, commission_amount: 0, status: c.status || 'pending', collected_at: null, paid_at: null, payout_id: null, created_at: iso(Date.now()) };
            recalc(n); collabs.unshift(n); return wait(n.id);
        },
        async setCollab(id, status) {
            needAdmin(); const c = collabs.find(x => x.id === id); if (!c || c.status === 'paid') err('not_editable');
            c.status = status; recalc(c); return wait();
        },
        async createPayout(affiliateId, method, force) {
            needAdmin();
            const rows = collabs.filter(c => c.affiliate_id === affiliateId && c.status === 'collected' && !c.payout_id && c.commission_amount > 0);
            const total = Math.round(rows.reduce((s, c) => s + c.commission_amount, 0) * 100) / 100;
            if (total <= 0) err('nothing_to_pay'); if (total < settings.min_payout && !force) err('below_minimum');
            const a = affiliates.find(x => x.id === affiliateId);
            const p = { id: uid('pay'), affiliate_id: affiliateId, amount: total, status: 'pending', method: method || a.payout_method, reference: null, created_at: iso(Date.now()), paid_at: null, created_by: 'adm-1' };
            payouts.unshift(p); rows.forEach(c => c.payout_id = p.id); return wait(p.id);
        },
        async markPaid(id, reference) {
            needAdmin(); const p = payouts.find(x => x.id === id); if (!p || p.status !== 'pending') err('not_editable');
            p.status = 'paid'; p.paid_at = iso(Date.now()); p.reference = reference || null;
            collabs.filter(c => c.payout_id === id).forEach(c => { c.status = 'paid'; c.paid_at = p.paid_at; }); return wait();
        }
    };
})();
