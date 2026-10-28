(function () {
    'use strict';
    const U = AffUI, { $, $$, esc, eur, int, pct, date, sum, icons, toast, badge, btnBusy } = U;
    let st, D = {}, shell, adminUser;
    const aff = (id) => D.affs.find(a => a.id === id) || { display_name: '—', code: '—' };
    const ref = (id) => D.refs.find(r => r.id === id) || { name: '—' };
    const live = (c) => c.status !== 'cancelled';
    const payableOf = (id) => sum(D.collabs.filter(c => c.affiliate_id === id && c.status === 'collected' && !c.payout_id), 'commission_amount');
    const earnedOf = (id) => sum(D.collabs.filter(c => c.affiliate_id === id && live(c)), 'commission_amount');
    const refsOf = (id) => D.refs.filter(r => r.affiliate_id === id);
    const rateOf = (a) => a.commission_rate != null ? a.commission_rate : st.commission_rate;

    async function load() {
        const [affs, refs, collabs, payouts, settings] = await Promise.all([AffAPI.adminAffiliates(), AffAPI.adminReferrals(), AffAPI.adminCollabs(), AffAPI.adminPayouts(), AffAPI.adminSettings()]);
        D = { affs, refs, collabs, payouts }; st = settings;
        if (shell) { shell.setCount('afiliados', affs.length); shell.setCount('pagos', D.payouts.filter(p => p.status === 'pending').length); }
    }
    const reload = () => shell.reload();
    async function act(btn, fn, msg) { try { if (btn) btnBusy(btn, true); await fn(); toast(msg); return true; } catch (e) { toast(e.message, 'err'); if (btn) btnBusy(btn, false); return false; } }

    // ------------------------------------------------------------- Resumen ----
    async function resumen(v) {
        await load();
        const { affs, refs, collabs, payouts } = D;
        const total = sum(collabs.filter(live), 'commission_amount'), por = sum(collabs.filter(c => c.status === 'collected' && !c.payout_id), 'commission_amount');
        const pag = sum(collabs.filter(c => c.status === 'paid'), 'commission_amount'), med = sum(collabs.filter(c => c.status === 'pending'), 'commission_amount');
        const ingr = sum(collabs.filter(live), 'collup_income');
        const months = U.lastMonths(6);
        const series = [['paid', 'Pagado', '#50EAD1'], ['collected', 'Por pagar', '#6EA8FF'], ['pending', 'En medición', '#F5B84B']].map(([k, l, color]) => ({ label: l, color, values: months.map(m => sum(collabs.filter(c => c.status === k && U.monthKey(c.collected_at || c.created_at) === m), 'commission_amount')) }));
        const rank = affs.map(a => ({ a, n: refsOf(a.id).length, e: earnedOf(a.id) })).sort((x, y) => y.n - x.n || y.e - x.e).slice(0, 6);
        const ready = affs.filter(a => payableOf(a.id) >= st.min_payout && !D.payouts.some(p => p.affiliate_id === a.id && p.status === 'pending'));
        const pendPay = payouts.filter(p => p.status === 'pending');
        const alerts = [];
        if (!st.portal_open) alerts.push(['lock', 'amber', 'El portal está <b>cerrado</b> al público: nadie nuevo puede registrarse como afiliado.', 'config']);
        if (ready.length) alerts.push(['wallet', 'teal', `<b>${ready.length}</b> afiliado${ready.length > 1 ? 's' : ''} con comisión por encima del mínimo, listo${ready.length > 1 ? 's' : ''} para pagar.`, 'pagos']);
        if (pendPay.length) alerts.push(['clock', 'amber', `<b>${pendPay.length}</b> pago${pendPay.length > 1 ? 's' : ''} preparado${pendPay.length > 1 ? 's' : ''} pendiente${pendPay.length > 1 ? 's' : ''} de marcar como pagado${pendPay.length > 1 ? 's' : ''}.`, 'pagos']);
        const pendCol = collabs.filter(c => c.status === 'pending').length;
        if (pendCol) alerts.push(['hourglass', 'blue', `<b>${pendCol}</b> colaboraci${pendCol > 1 ? 'ones' : 'ón'} en medición pendiente${pendCol > 1 ? 's' : ''} de confirmar el cobro.`, 'colaboraciones']);
        v.innerHTML = window.AffHead('Administración', 'Vista global del programa de afiliados.', `<button class="btn" id="e1"><i data-lucide="download"></i> Exportar afiliados</button><a class="btn primary" href="#config"><i data-lucide="sliders-horizontal"></i> Configuración</a>`) +
            `<div class="grid g4">
              ${window.AffKpi('Comisiones totales', 'coins', eur(total), `${int(collabs.filter(live).length)} colaboraciones`, 'accent')}
              ${window.AffKpi('Pendiente de pago', 'wallet', eur(por), `${eur(med)} aún en medición`)}
              ${window.AffKpi('Pagado', 'badge-check', eur(pag), `${payouts.filter(p => p.status === 'paid').length} pagos realizados`)}
              ${window.AffKpi('Ingresos CollUp', 'trending-up', eur(ingr), 'Base de comisiones')}
            </div><div class="grid g4" style="margin-top:16px">
              ${window.AffKpi('Afiliados', 'users', int(affs.length), `${affs.filter(a => a.status === 'active').length} activos · ${affs.filter(a => a.status === 'suspended').length} suspendidos`)}
              ${window.AffKpi('Cartera total', 'briefcase', int(refs.length), `${int(refs.filter(r => r.kind === 'business').length)} negocios · ${int(refs.filter(r => r.kind === 'creator').length)} creadores`)}
              ${window.AffKpi('En espera de lanzamiento', 'rocket', int(refs.filter(r => r.status === 'waiting').length), 'Registrados antes de salir la app')}
              ${window.AffKpi('Activos', 'zap', int(refs.filter(r => r.status === 'active').length), refs.length ? `${pct(refs.filter(r => r.status === 'active').length / refs.length)} de la cartera` : '')}
            </div>
            ${alerts.length ? `<div class="card" style="margin-top:16px"><h3>Requiere atención</h3><div class="list">${alerts.map(a => `<div class="li"><div style="display:flex;gap:12px;align-items:center"><i data-lucide="${a[0]}" style="color:var(--${a[1] === 'teal' ? 'teal' : a[1]})"></i><span>${a[2]}</span></div><a class="btn sm" href="#${a[3]}">Ver</a></div>`).join('')}</div></div>` : ''}
            <div class="grid g2" style="margin-top:16px"><div class="card"><div class="card-h"><h3>Comisiones por mes</h3><span class="muted small">Últimos 6 meses</span></div>${U.stackedBars(months.map(U.monthLabel), series, { money: true, label: 'Comisiones por mes' })}</div>
              <div class="card"><h3>Embudo global</h3><p class="sub">Estado de todos los referidos</p>${U.funnel([
                  { label: 'Prospectos', value: refs.filter(r => r.status === 'prospect').length, color: 'var(--violet)' }, { label: 'En espera', value: refs.filter(r => r.status === 'waiting').length, color: 'var(--amber)' },
                  { label: 'Registrados', value: refs.filter(r => r.status === 'registered').length, color: 'var(--blue)' }, { label: 'Activos', value: refs.filter(r => r.status === 'active').length, color: 'var(--teal)' },
                  { label: 'Descartados', value: refs.filter(r => r.status === 'lost').length, color: 'var(--red)' }])}</div></div>
            <div class="card" style="margin-top:16px"><div class="card-h"><h3>Ranking de afiliados</h3><a class="small" href="#afiliados">Ver todos</a></div>${rank.length ? `<div class="list">${rank.map((r, i) => `<div class="li"><div class="cell-name"><b style="width:18px;color:var(--muted2)">${i + 1}</b>${U.avatar(r.a.display_name)}<div><b>${esc(r.a.display_name)}</b><span class="s">${esc(r.a.code)}</span></div></div><div class="right"><b>${int(r.n)}</b> <span class="muted small">en cartera</span><br><span class="small" style="color:var(--teal)">${eur(r.e)}</span></div></div>`).join('')}</div>` : '<p class="muted">Aún no hay afiliados.</p>'}</div>`;
        $('#e1').addEventListener('click', exportAffs);
    }
    function exportAffs() {
        U.csv('afiliados.csv', ['Código', 'Nombre', 'Email', 'Estado', 'Comisión %', 'Cartera', 'Activos', 'Comisión total €', 'Por pagar €', 'Alta'],
            D.affs.map(a => [a.code, a.display_name, a.email, U.LABELS.affiliate[a.status], (rateOf(a) * 100).toFixed(1), refsOf(a.id).length, refsOf(a.id).filter(r => r.status === 'active').length, earnedOf(a.id).toFixed(2), payableOf(a.id).toFixed(2), a.created_at.slice(0, 10)]));
    }

    // ------------------------------------------------------------ Afiliados ----
    async function afiliados(v) {
        await load();
        let q = '', s = 'all';
        v.innerHTML = window.AffHead('Afiliados', `${int(D.affs.length)} registrados. Pulsa uno para ver su cartera y gestionarlo.`, `<button class="btn" id="ex"><i data-lucide="download"></i> CSV</button>`) +
            `<div class="toolbar"><div class="search"><i data-lucide="search"></i><input class="in" id="q" placeholder="Buscar por nombre, email o código…" aria-label="Buscar"></div><select class="in" id="s"><option value="all">Todos</option><option value="active">Activos</option><option value="suspended">Suspendidos</option></select></div><div id="tb"></div>`;
        const cols = [
            { key: 'n', label: 'Afiliado', sort: a => a.display_name.toLowerCase(), html: a => `<div class="cell-name">${U.avatar(a.display_name)}<div><b>${esc(a.display_name)}</b><span class="s">${esc(a.email)}</span></div></div>` },
            { key: 'c', label: 'Código', sort: a => a.code, html: a => `<code style="color:var(--teal)">${esc(a.code)}</code>` },
            { key: 'st', label: 'Estado', sort: a => a.status, html: a => badge('affiliate', a.status) },
            { key: 'p', label: 'Tarifa', cls: 'num', sort: a => rateOf(a), html: a => pct(rateOf(a)) + (a.commission_rate != null ? ' ★' : '') },
            { key: 'r', label: 'Cartera', cls: 'num', sort: a => refsOf(a.id).length, html: a => int(refsOf(a.id).length) },
            { key: 'e', label: 'Comisión total', cls: 'num', sort: a => earnedOf(a.id), html: a => eur(earnedOf(a.id)) },
            { key: 'pp', label: 'Por pagar', cls: 'num', sort: a => payableOf(a.id), html: a => `<b style="color:var(--teal)">${eur(payableOf(a.id))}</b>` },
            { key: 'd', label: 'Alta', sort: a => a.created_at, html: a => date(a.created_at) }
        ];
        const rows = () => D.affs.filter(a => (s === 'all' || a.status === s) && (!q || [a.display_name, a.email, a.code].some(x => String(x).toLowerCase().includes(q))));
        const draw = () => U.table($('#tb'), cols, rows(), { sortKey: 'e', onRow: affDrawer, foot: (r) => `<tr><td colspan="4">Total (${r.length})</td><td class="num">${int(sum(r, a => refsOf(a.id).length))}</td><td class="num">${eur(sum(r, a => earnedOf(a.id)))}</td><td class="num">${eur(sum(r, a => payableOf(a.id)))}</td><td></td></tr>`, empty: '<div class="empty"><i data-lucide="users"></i><h3>Sin afiliados</h3><p>Cuando abras el portal aparecerán aquí.</p></div>' });
        draw();
        $('#q').addEventListener('input', U.debounce(e => { q = e.target.value.trim().toLowerCase(); $('#tb')._st = null; draw(); }));
        $('#s').addEventListener('change', e => { s = e.target.value; draw(); });
        $('#ex').addEventListener('click', exportAffs);
    }
    function affDrawer(a) {
        const rs = refsOf(a.id), cs = D.collabs.filter(c => c.affiliate_id === a.id), pay = payableOf(a.id), pend = D.payouts.find(p => p.affiliate_id === a.id && p.status === 'pending');
        const d = U.drawer(`<div class="sheet-h"><div class="cell-name">${U.avatar(a.display_name)}<div><h3>${esc(a.display_name)}</h3><span class="muted small">${esc(a.email)} · <code>${esc(a.code)}</code></span></div></div><button class="icon-btn" data-close aria-label="Cerrar"><i data-lucide="x"></i></button></div>
        <div class="sheet-b">
          <div class="grid g3" style="grid-template-columns:repeat(3,1fr);margin-top:6px"><div class="card kpi"><div class="l">Cartera</div><div class="v" style="font-size:22px">${rs.length}</div></div><div class="card kpi"><div class="l">Comisión total</div><div class="v" style="font-size:22px">${eur(earnedOf(a.id))}</div></div><div class="card kpi accent"><div class="l">Por pagar</div><div class="v" style="font-size:22px">${eur(pay)}</div></div></div>
          <div class="sec"><h4>Gestión</h4><dl class="kv"><dt>Estado</dt><dd>${badge('affiliate', a.status)}</dd><dt>Tarifa</dt><dd>${pct(rateOf(a))} ${a.commission_rate != null ? '(personalizada)' : '(general)'}</dd><dt>Cobro</dt><dd>${esc(U.LABELS.method[a.payout_method] || 'Sin definir')}${a.payout_details ? ' · ' + esc(a.payout_details) : ''}</dd><dt>Alta</dt><dd>${date(a.created_at)}</dd></dl>
            <div class="row2 stack" style="margin-top:14px;align-items:end"><div><label class="f" for="rt">Tarifa personalizada (%)</label><input class="in" id="rt" type="number" min="0" max="100" step="0.5" value="${a.commission_rate != null ? +(a.commission_rate * 100).toFixed(2) : ''}" placeholder="General: ${(st.commission_rate * 100).toFixed(0)}"></div><div style="display:flex;gap:8px"><button class="btn" id="rs">Aplicar</button><button class="btn ghost" id="rc">Quitar</button></div></div>
            <p class="hint">Solo afecta a colaboraciones futuras; las ya registradas conservan su tarifa.</p></div>
          <div class="sec"><h4>Cartera (${rs.length})</h4>${rs.length ? `<div class="list">${rs.slice(0, 40).map(r => `<div class="li"><div class="cell-name">${U.avatar(r.name)}<div><b>${esc(r.name)}</b><span class="s">${esc(U.LABELS.kind[r.kind])} · ${date(r.created_at)}</span></div></div>${badge('referral', r.status)}</div>`).join('')}</div>${rs.length > 40 ? `<p class="hint">Mostrando 40 de ${rs.length}. Verás todos en Cartera.</p>` : ''}` : '<p class="muted small">Sin referidos todavía.</p>'}</div>
          <div class="sec"><h4>Comisiones recientes</h4>${cs.length ? `<div class="list">${cs.slice(0, 8).map(c => `<div class="li"><div><b>${eur(c.commission_amount)}</b> <span class="muted small">· ${esc(ref(c.referral_id).name)}</span></div>${badge('collab', c.status)}</div>`).join('')}</div>` : '<p class="muted small">Sin comisiones.</p>'}</div>
        </div>
        <div class="sheet-f"><button class="btn ${a.status === 'active' ? 'danger' : 'ghost'}" id="tg">${a.status === 'active' ? 'Suspender' : 'Reactivar'}</button><span class="spacer"></span>${pend ? '<span class="muted small" style="align-self:center">Hay un pago pendiente</span>' : `<button class="btn primary" id="po" ${pay > 0 ? '' : 'disabled'}><i data-lucide="wallet"></i> Preparar pago (${eur(pay)})</button>`}</div>`);
        d.$('#rs').addEventListener('click', async () => { const val = d.$('#rt').value; if (val === '') return toast('Escribe un porcentaje o pulsa Quitar.', 'err'); const n = +val; if (!(n >= 0 && n <= 100)) return toast('Porcentaje no válido.', 'err'); if (await act(null, () => AffAPI.setAffiliate(a.id, null, n / 100, false), 'Tarifa actualizada')) { d.close(); reload(); } });
        d.$('#rc').addEventListener('click', async () => { if (await act(null, () => AffAPI.setAffiliate(a.id, null, null, true), 'Tarifa general restaurada')) { d.close(); reload(); } });
        d.$('#tg').addEventListener('click', async () => { const sus = a.status === 'active'; if (sus && !(await U.confirmBox({ title: `¿Suspender a ${a.display_name}?`, text: 'No podrá registrar nuevos contactos. Conserva su cartera y comisiones.', ok: 'Suspender', danger: true }))) return; if (await act(null, () => AffAPI.setAffiliate(a.id, sus ? 'suspended' : 'active'), sus ? 'Afiliado suspendido' : 'Afiliado reactivado')) { d.close(); reload(); } });
        const po = d.$('#po'); if (po) po.addEventListener('click', () => makePayout(a, d));
    }
    async function makePayout(a, d) {
        const pay = payableOf(a.id), below = pay < st.min_payout;
        if (!(await U.confirmBox({ title: `Preparar pago de ${eur(pay)}`, text: below ? `Está por debajo del mínimo (${eur(st.min_payout)}). Se creará igualmente porque lo has forzado.` : `Se agruparán todas las comisiones por cobrar de ${a.display_name}.`, ok: 'Preparar pago' }))) return;
        if (await act(null, () => AffAPI.createPayout(a.id, a.payout_method || null, below), 'Pago preparado')) { if (d) d.close(); location.hash = '#pagos'; reload(); }
    }

    // --------------------------------------------------------------- Cartera ----
    function addCollabForm(r) {
        const m = U.modal(`<div class="sheet-h"><div><h3>Registrar colaboración</h3><p class="muted small">${r ? esc(r.name) : 'Elige el referido'} · se calcula la comisión automáticamente.</p></div><button class="icon-btn" data-close aria-label="Cerrar"><i data-lucide="x"></i></button></div>
        <form id="cf"><div class="sheet-b">
          ${r ? '' : `<div class="field"><label class="f" for="cr">Referido</label><select class="in" id="cr">${D.refs.filter(x => x.status !== 'lost').sort((a, b) => a.name.localeCompare(b.name)).map(x => `<option value="${x.id}">${esc(x.name)} — ${esc(aff(x.affiliate_id).code)}</option>`).join('')}</select></div>`}
          <div class="row2"><div class="field"><label class="f" for="cg">Importe bruto (€)</label><input class="in" id="cg" type="number" min="0" step="0.01" required></div><div class="field"><label class="f" for="ci">Ingreso de CollUp (€)</label><input class="in" id="ci" type="number" min="0" step="0.01" required></div></div>
          <div class="row2"><div class="field"><label class="f" for="cx">Referencia</label><input class="in" id="cx" maxlength="60" placeholder="ID de la colaboración"></div><div class="field"><label class="f" for="cs">Estado</label><select class="in" id="cs"><option value="pending">En medición</option><option value="collected">Por cobrar (ya cobrada)</option></select></div></div>
          <div class="field"><label class="f" for="cd">Descripción</label><input class="in" id="cd" maxlength="160"></div>
          <div class="banner" style="margin:0"><i data-lucide="calculator"></i><div class="small" id="pv">Comisión estimada: —</div></div>
        </div><div class="sheet-f"><button type="button" class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="csv">Registrar</button></div></form>`);
        const rid = () => r ? r.id : m.$('#cr').value;
        const prev = () => { const x = r || ref(rid()); const a = aff(x.affiliate_id); m.$('#pv').innerHTML = `Comisión estimada: <b>${eur((+m.$('#ci').value || 0) * rateOf(a))}</b> (${pct(rateOf(a))} de ${eur(+m.$('#ci').value || 0)})`; };
        ['#ci', '#cr'].forEach(s => { const el = m.$(s); if (el) el.addEventListener('input', prev)}); prev();
        m.$('#cf').addEventListener('submit', async (e) => { e.preventDefault(); const g = +m.$('#cg').value, i = +m.$('#ci').value; if (!(g >= 0) || !(i >= 0) || m.$('#ci').value === '') return toast('Revisa los importes.', 'err');
            if (await act(m.$('#csv'), () => AffAPI.addCollab({ referral_id: rid(), ref: m.$('#cx').value.trim(), description: m.$('#cd').value.trim(), gross: g, income: i, status: m.$('#cs').value }), 'Colaboración registrada')) { m.close(); reload(); } });
    }
    async function cartera(v) {
        await load();
        const f = { s: 'all', k: 'all', a: 'all', q: '' };
        v.innerHTML = window.AffHead('Cartera global', 'Todos los negocios y creadores registrados por afiliados.', `<button class="btn" id="ex"><i data-lucide="download"></i> CSV</button>`) +
            `<div class="toolbar"><div class="search"><i data-lucide="search"></i><input class="in" id="q" placeholder="Buscar negocio, email, ciudad…" aria-label="Buscar"></div>
              <select class="in" id="fk"><option value="all">Todos los tipos</option><option value="business">Negocios</option><option value="creator">Creadores</option></select>
              <select class="in" id="fa"><option value="all">Todos los afiliados</option>${D.affs.map(a => `<option value="${a.id}">${esc(a.display_name)} (${esc(a.code)})</option>`).join('')}</select></div>
             <div class="chips" id="chips" style="margin-bottom:14px">${['all', 'prospect', 'waiting', 'registered', 'active', 'lost'].map(s => `<button class="chip ${s === 'all' ? 'on' : ''}" data-s="${s}">${s === 'all' ? 'Todos' : U.LABELS.referral[s]}<span class="n">${s === 'all' ? D.refs.length : D.refs.filter(r => r.status === s).length}</span></button>`).join('')}</div><div id="tb"></div>`;
        const cols = [
            { key: 'n', label: 'Nombre', sort: r => r.name.toLowerCase(), html: r => `<div class="cell-name">${U.avatar(r.name)}<div><b>${esc(r.name)}</b><span class="s">${esc(r.email || r.phone || '—')}</span></div></div>` },
            { key: 'k', label: 'Tipo', sort: r => r.kind, html: r => esc(U.LABELS.kind[r.kind]) + (r.business_type ? `<span class="muted"> · ${esc(r.business_type)}</span>` : '') },
            { key: 'a', label: 'Afiliado', sort: r => aff(r.affiliate_id).display_name.toLowerCase(), html: r => `${esc(aff(r.affiliate_id).display_name)} <code class="muted">${esc(aff(r.affiliate_id).code)}</code>` },
            { key: 'o', label: 'Origen', html: r => esc(U.LABELS.source[r.source] || r.source) },
            { key: 's', label: 'Estado', sort: r => r.status, html: r => badge('referral', r.status) },
            { key: 'c', label: 'Ingreso CollUp', cls: 'num', sort: r => inc(r.id), html: r => eur(inc(r.id)) },
            { key: 'd', label: 'Alta', sort: r => r.created_at, html: r => date(r.created_at) }
        ];
        const inc = (id) => sum(D.collabs.filter(c => c.referral_id === id && live(c)), 'collup_income');
        const rows = () => D.refs.filter(r => (f.s === 'all' || r.status === f.s) && (f.k === 'all' || r.kind === f.k) && (f.a === 'all' || r.affiliate_id === f.a) && (!f.q || [r.name, r.email, r.city, r.phone].some(x => String(x || '').toLowerCase().includes(f.q))));
        const draw = () => U.table($('#tb'), cols, rows(), { sortKey: 'd', onRow: refDrawer });
        draw();
        $('#q').addEventListener('input', U.debounce(e => { f.q = e.target.value.trim().toLowerCase(); $('#tb')._st = null; draw(); }));
        $('#fk').addEventListener('change', e => { f.k = e.target.value; $('#tb')._st = null; draw(); }); $('#fa').addEventListener('change', e => { f.a = e.target.value; $('#tb')._st = null; draw(); });
        $$('#chips .chip').forEach(c => c.addEventListener('click', () => { f.s = c.dataset.s; $$('#chips .chip').forEach(x => x.classList.toggle('on', x === c)); $('#tb')._st = null; draw(); }));
        $('#ex').addEventListener('click', () => U.csv('cartera-global.csv', ['Nombre', 'Tipo', 'Email', 'Teléfono', 'Negocio', 'Ciudad', 'Afiliado', 'Código', 'Origen', 'Estado', 'Ingreso CollUp €', 'Alta'],
            rows().map(r => [r.name, U.LABELS.kind[r.kind], r.email, r.phone, r.business_type, r.city, aff(r.affiliate_id).display_name, aff(r.affiliate_id).code, U.LABELS.source[r.source], U.LABELS.referral[r.status], inc(r.id).toFixed(2), r.created_at.slice(0, 10)])));
    }
    function refDrawer(r) {
        const cs = D.collabs.filter(c => c.referral_id === r.id);
        const d = U.drawer(`<div class="sheet-h"><div class="cell-name">${U.avatar(r.name)}<div><h3>${esc(r.name)}</h3><span class="muted small">${esc(U.LABELS.kind[r.kind])} · ${badge('referral', r.status)}</span></div></div><button class="icon-btn" data-close aria-label="Cerrar"><i data-lucide="x"></i></button></div>
        <div class="sheet-b"><div class="sec"><h4>Datos</h4><dl class="kv"><dt>Email</dt><dd>${esc(r.email || '—')}</dd><dt>Teléfono</dt><dd>${esc(r.phone || '—')}</dd><dt>Negocio</dt><dd>${esc(r.business_type || '—')}</dd><dt>Ciudad</dt><dd>${esc(r.city || '—')}</dd><dt>Origen</dt><dd>${esc(U.LABELS.source[r.source] || r.source)}</dd><dt>Alta</dt><dd>${date(r.created_at)}</dd>${r.first_collab_at ? `<dt>1ª colaboración</dt><dd>${date(r.first_collab_at)}</dd><dt>Comisión hasta</dt><dd>${date(r.commission_ends_at)}</dd>` : ''}<dt>Notas</dt><dd>${esc(r.notes || '—')}</dd></dl></div>
          <div class="sec"><h4>Gestión</h4><div class="row2 stack"><div><label class="f" for="rs">Estado</label><select class="in" id="rs">${Object.entries(U.LABELS.referral).map(([k, l]) => `<option value="${k}" ${r.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
            <div><label class="f" for="ra">Afiliado</label><select class="in" id="ra">${D.affs.map(a => `<option value="${a.id}" ${a.id === r.affiliate_id ? 'selected' : ''}>${esc(a.display_name)} (${esc(a.code)})</option>`).join('')}</select></div></div><p class="hint">Reasignar mueve también las comisiones aún no pagadas.</p></div>
          <div class="sec"><h4>Colaboraciones (${cs.length})</h4>${cs.length ? `<div class="list">${cs.map(c => `<div class="li"><div><b>${eur(c.collup_income)}</b> <span class="muted small">→ comisión ${eur(c.commission_amount)} · ${date(c.created_at)}</span></div>${badge('collab', c.status)}</div>`).join('')}</div>` : '<p class="muted small">Sin colaboraciones.</p>'}</div></div>
        <div class="sheet-f"><button class="btn" id="ac"><i data-lucide="plus"></i> Colaboración</button><span class="spacer"></span><button class="btn primary" id="sv">Guardar</button></div>`);
        d.$('#ac').addEventListener('click', () => { d.close(); addCollabForm(r); });
        d.$('#sv').addEventListener('click', async () => { const s = d.$('#rs').value, a = d.$('#ra').value;
            if (await act(d.$('#sv'), async () => { if (s !== r.status) await AffAPI.setReferral(r.id, s, null); if (a !== r.affiliate_id) await AffAPI.setReferral(r.id, null, a); }, 'Cambios guardados')) { d.close(); reload(); } });
    }

    // ------------------------------------------------------- Colaboraciones ----
    async function colaboraciones(v) {
        await load();
        const f = { s: 'all', q: '', from: '', to: '' };
        v.innerHTML = window.AffHead('Colaboraciones', 'Cada colaboración genera la comisión del afiliado. Confirma el cobro para que pase a pagable.', `<button class="btn" id="ex"><i data-lucide="download"></i> CSV</button><button class="btn primary" id="add"><i data-lucide="plus"></i> Registrar</button>`) +
            `<div class="toolbar"><div class="search"><i data-lucide="search"></i><input class="in" id="q" placeholder="Buscar negocio, afiliado o referencia…" aria-label="Buscar"></div><label class="small muted">Desde <input class="in" type="date" id="d1" style="width:auto;display:inline-block"></label><label class="small muted">Hasta <input class="in" type="date" id="d2" style="width:auto;display:inline-block"></label></div>
             <div class="chips" id="chips" style="margin-bottom:14px">${['all', 'pending', 'collected', 'paid', 'cancelled'].map(s => `<button class="chip ${s === 'all' ? 'on' : ''}" data-s="${s}">${s === 'all' ? 'Todas' : U.LABELS.collab[s]}<span class="n">${s === 'all' ? D.collabs.length : D.collabs.filter(c => c.status === s).length}</span></button>`).join('')}</div><div id="tb"></div>`;
        const cols = [
            { key: 'd', label: 'Fecha', sort: c => c.created_at, html: c => date(c.created_at) },
            { key: 'r', label: 'Referido', sort: c => ref(c.referral_id).name.toLowerCase(), html: c => `<b>${esc(ref(c.referral_id).name)}</b><span class="s muted" style="display:block;font-size:12px">${esc(c.collab_ref || c.description || '')}</span>` },
            { key: 'a', label: 'Afiliado', sort: c => aff(c.affiliate_id).display_name.toLowerCase(), html: c => esc(aff(c.affiliate_id).display_name) },
            { key: 'i', label: 'Ingreso CollUp', cls: 'num', sort: c => c.collup_income, html: c => eur(c.collup_income) },
            { key: 'p', label: '%', cls: 'num', html: c => pct(c.commission_rate) },
            { key: 'm', label: 'Comisión', cls: 'num', sort: c => c.commission_amount, html: c => `<b>${eur(c.commission_amount)}</b>` },
            { key: 's', label: 'Estado', sort: c => c.status, html: c => badge('collab', c.status) },
            { key: 'x', label: '', cls: 'right', html: c => c.status === 'pending' ? `<button class="btn sm" data-a="collected" data-id="${c.id}">Confirmar cobro</button> <button class="btn sm ghost" data-a="cancelled" data-id="${c.id}">Cancelar</button>` : c.status === 'collected' && !c.payout_id ? `<button class="btn sm ghost" data-a="cancelled" data-id="${c.id}">Cancelar</button>` : '' }
        ];
        const rows = () => D.collabs.filter(c => (f.s === 'all' || c.status === f.s) && (!f.from || c.created_at.slice(0, 10) >= f.from) && (!f.to || c.created_at.slice(0, 10) <= f.to) && (!f.q || (ref(c.referral_id).name + ' ' + aff(c.affiliate_id).display_name + ' ' + (c.collab_ref || '')).toLowerCase().includes(f.q)));
        const draw = () => { U.table($('#tb'), cols, rows(), { sortKey: 'd', empty: '<div class="empty"><i data-lucide="handshake"></i><h3>Sin colaboraciones</h3><p>Se registrarán aquí cuando la app esté en marcha.</p></div>', foot: (r) => `<tr><td colspan="3">Total (${r.length})</td><td class="num">${eur(sum(r.filter(live), 'collup_income'))}</td><td></td><td class="num">${eur(sum(r.filter(live), 'commission_amount'))}</td><td colspan="2"></td></tr>` });
            $$('#tb [data-a]').forEach(b => b.addEventListener('click', async (e) => { e.stopPropagation(); const cancel = b.dataset.a === 'cancelled'; if (cancel && !(await U.confirmBox({ title: '¿Cancelar la colaboración?', text: 'Se anulará su comisión.', ok: 'Cancelar colaboración', danger: true }))) return; if (await act(b, () => AffAPI.setCollab(b.dataset.id, b.dataset.a), cancel ? 'Colaboración cancelada' : 'Cobro confirmado')) reload(); })); };
        draw();
        $('#q').addEventListener('input', U.debounce(e => { f.q = e.target.value.trim().toLowerCase(); $('#tb')._st = null; draw(); }));
        $('#d1').addEventListener('change', e => { f.from = e.target.value; draw(); }); $('#d2').addEventListener('change', e => { f.to = e.target.value; draw(); });
        $$('#chips .chip').forEach(c => c.addEventListener('click', () => { f.s = c.dataset.s; $$('#chips .chip').forEach(x => x.classList.toggle('on', x === c)); draw(); }));
        $('#add').addEventListener('click', () => addCollabForm(null));
        $('#ex').addEventListener('click', () => U.csv('colaboraciones.csv', ['Fecha', 'Referido', 'Afiliado', 'Código', 'Referencia', 'Bruto €', 'Ingreso CollUp €', '%', 'Comisión €', 'Estado'],
            rows().map(c => [c.created_at.slice(0, 10), ref(c.referral_id).name, aff(c.affiliate_id).display_name, aff(c.affiliate_id).code, c.collab_ref, c.gross_amount.toFixed(2), c.collup_income.toFixed(2), (c.commission_rate * 100).toFixed(1), c.commission_amount.toFixed(2), U.LABELS.collab[c.status]])));
    }

    // ----------------------------------------------------------------- Pagos ----
    async function pagos(v) {
        await load();
        const withPay = D.affs.map(a => ({ a, amt: payableOf(a.id), pend: D.payouts.some(p => p.affiliate_id === a.id && p.status === 'pending') })).filter(x => x.amt > 0 && !x.pend).sort((x, y) => y.amt - x.amt);
        v.innerHTML = window.AffHead('Pagos', `Mínimo de pago: <b>${eur(st.min_payout)}</b>. Prepara el pago, transfiere y márcalo como pagado con su referencia.`, `<button class="btn" id="ex"><i data-lucide="download"></i> CSV</button>`) +
            `<div class="card"><div class="card-h"><h3>Pendiente de preparar</h3><span class="muted small">${eur(sum(withPay, 'amt'))} en total</span></div>${withPay.length ? `<div class="list">${withPay.map(x => `<div class="li"><div class="cell-name">${U.avatar(x.a.display_name)}<div><b>${esc(x.a.display_name)}</b><span class="s">${esc(U.LABELS.method[x.a.payout_method] || 'Sin método de cobro')}${x.a.payout_details ? ' · ' + esc(x.a.payout_details) : ''}</span></div></div><div style="display:flex;gap:12px;align-items:center"><b style="color:var(--teal)">${eur(x.amt)}</b>${x.amt >= st.min_payout ? '<span class="badge b-active">Listo</span>' : `<span class="badge b-waiting">Bajo mínimo</span>`}<button class="btn sm ${x.amt >= st.min_payout ? 'primary' : ''}" data-p="${x.a.id}">Preparar</button></div></div>`).join('')}</div>` : '<p class="muted">No hay comisiones por pagar ahora mismo.</p>'}</div>
             <h3 style="margin:24px 0 12px">Historial de pagos</h3><div id="tb"></div>`;
        $$('[data-p]').forEach(b => b.addEventListener('click', () => makePayout(aff(b.dataset.p), null)));
        U.table($('#tb'), [
            { key: 'd', label: 'Fecha', sort: p => p.created_at, html: p => date(p.created_at) },
            { key: 'a', label: 'Afiliado', sort: p => aff(p.affiliate_id).display_name.toLowerCase(), html: p => `<b>${esc(aff(p.affiliate_id).display_name)}</b>` },
            { key: 'm', label: 'Importe', cls: 'num', sort: p => p.amount, html: p => `<b>${eur(p.amount)}</b>` },
            { key: 'me', label: 'Método', html: p => esc(U.LABELS.method[p.method] || p.method || '—') },
            { key: 'r', label: 'Referencia', html: p => esc(p.reference || '—') },
            { key: 's', label: 'Estado', sort: p => p.status, html: p => badge('payout', p.status) },
            { key: 'x', label: '', cls: 'right', html: p => p.status === 'pending' ? `<button class="btn sm primary" data-mp="${p.id}">Marcar pagado</button>` : date(p.paid_at) }
        ], D.payouts, { sortKey: 'd', empty: '<div class="empty"><i data-lucide="landmark"></i><h3>Sin pagos</h3></div>', foot: r => `<tr><td colspan="2">Total</td><td class="num">${eur(sum(r, 'amount'))}</td><td colspan="4"></td></tr>` });
        $$('[data-mp]').forEach(b => b.addEventListener('click', () => {
            const p = D.payouts.find(x => x.id === b.dataset.mp);
            const m = U.modal(`<div class="sheet-h"><h3>Marcar como pagado</h3></div><div class="sheet-b"><p class="muted" style="margin-bottom:14px">${eur(p.amount)} a ${esc(aff(p.affiliate_id).display_name)}. Las comisiones asociadas pasarán a <b>Pagada</b>.</p><div class="field"><label class="f" for="rf">Referencia de la transferencia</label><input class="in" id="rf" maxlength="80" placeholder="Opcional"></div></div><div class="sheet-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="ok">Confirmar pago</button></div>`);
            m.$('#ok').addEventListener('click', async () => { if (await act(m.$('#ok'), () => AffAPI.markPaid(p.id, m.$('#rf').value.trim()), 'Pago marcado como pagado')) { m.close(); reload(); } });
        }));
        $('#ex').addEventListener('click', () => U.csv('pagos.csv', ['Fecha', 'Afiliado', 'Importe €', 'Método', 'Referencia', 'Estado', 'Pagado el'], D.payouts.map(p => [p.created_at.slice(0, 10), aff(p.affiliate_id).display_name, p.amount.toFixed(2), U.LABELS.method[p.method], p.reference, U.LABELS.payout[p.status], (p.paid_at || '').slice(0, 10)])));
    }

    // ---------------------------------------------------------- Configuración ----
    async function config(v) {
        await load();
        v.innerHTML = window.AffHead('Configuración', 'Reglas del programa y visibilidad del portal.') +
            `<div class="grid g2e"><form class="card" id="cf"><h3>Reglas</h3><p class="sub">Se aplican a colaboraciones nuevas.</p>
              <div class="row2"><div class="field"><label class="f" for="r1">Comisión (%)</label><input class="in" id="r1" type="number" min="0" max="100" step="0.5" value="${+(st.commission_rate * 100).toFixed(2)}"></div><div class="field"><label class="f" for="r2">Duración (meses)</label><input class="in" id="r2" type="number" min="1" max="120" value="${st.commission_months}"></div></div>
              <div class="row2"><div class="field"><label class="f" for="r3">Pago mínimo (€)</label><input class="in" id="r3" type="number" min="0" step="1" value="${st.min_payout}"></div><div class="field"><label class="f" for="r4">Lanzamiento (texto público)</label><input class="in" id="r4" maxlength="60" value="${esc(st.launch_label || '')}"></div></div>
              <button class="btn primary" id="rsv">Guardar reglas</button></form>
             <div class="card"><h3>Visibilidad del portal</h3><p class="sub">Con el portal cerrado, nadie nuevo puede registrarse como afiliado. Los administradores y afiliados existentes siguen entrando.</p>
              <div class="code-box" style="padding:16px 18px"><div><b id="po-t">${st.portal_open ? 'Portal abierto' : 'Portal cerrado'}</b><div class="muted small">${st.portal_open ? 'Se aceptan nuevos afiliados.' : 'Registros de nuevos afiliados desactivados.'}</div></div><button class="btn ${st.portal_open ? 'danger' : 'primary'}" id="tp">${st.portal_open ? 'Cerrar portal' : 'Abrir portal'}</button></div>
              <div class="banner warn" style="margin-top:14px"><i data-lucide="info"></i><div class="small">Esta página no está enlazada ni indexada (<code>noindex</code>). Abrir el portal permite el registro, pero no la publica en buscadores.</div></div></div></div>
             <div class="card" style="margin-top:16px"><h3>Exportaciones</h3><p class="sub">Copias de seguridad en CSV (compatibles con Excel).</p><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="x1"><i data-lucide="download"></i> Afiliados</button><button class="btn" id="x2"><i data-lucide="download"></i> Cartera</button><button class="btn" id="x3"><i data-lucide="download"></i> Colaboraciones</button><button class="btn" id="x4"><i data-lucide="download"></i> Pagos</button></div></div>`;
        $('#cf').addEventListener('submit', async (e) => { e.preventDefault(); const r = +$('#r1').value, mo = +$('#r2').value, mi = +$('#r3').value;
            if (!(r >= 0 && r <= 100) || !(mo >= 1) || !(mi >= 0)) return toast('Revisa los valores.', 'err');
            if (await act($('#rsv'), () => AffAPI.setSettings({ rate: r / 100, months: Math.round(mo), min: mi, launch: $('#r4').value.trim() || null }), 'Reglas guardadas')) reload(); });
        $('#tp').addEventListener('click', async () => { const open = !st.portal_open; if (!(await U.confirmBox({ title: open ? '¿Abrir el portal?' : '¿Cerrar el portal?', text: open ? 'Cualquiera con el enlace podrá crear una cuenta de afiliado.' : 'Se bloquean los registros nuevos.', ok: open ? 'Abrir portal' : 'Cerrar portal', danger: !open }))) return; if (await act(null, () => AffAPI.setSettings({ open }), open ? 'Portal abierto' : 'Portal cerrado')) reload(); });
        $('#x1').addEventListener('click', exportAffs);
        $('#x2').addEventListener('click', () => U.csv('cartera.csv', ['Nombre', 'Tipo', 'Email', 'Afiliado', 'Estado', 'Alta'], D.refs.map(r => [r.name, U.LABELS.kind[r.kind], r.email, aff(r.affiliate_id).code, U.LABELS.referral[r.status], r.created_at.slice(0, 10)])));
        $('#x3').addEventListener('click', () => U.csv('colaboraciones.csv', ['Fecha', 'Referido', 'Afiliado', 'Ingreso €', 'Comisión €', 'Estado'], D.collabs.map(c => [c.created_at.slice(0, 10), ref(c.referral_id).name, aff(c.affiliate_id).code, c.collup_income.toFixed(2), c.commission_amount.toFixed(2), U.LABELS.collab[c.status]])));
        $('#x4').addEventListener('click', () => U.csv('pagos.csv', ['Fecha', 'Afiliado', 'Importe €', 'Estado'], D.payouts.map(p => [p.created_at.slice(0, 10), aff(p.affiliate_id).code, p.amount.toFixed(2), U.LABELS.payout[p.status]])));
    }

    (async function init() {
        await AffAPI.ready; const app = $('#app');
        try { const s = await AffAPI.session(); if (!s || !s.isAdmin) return void (location.href = 'index.html'); adminUser = s.user; }
        catch (e) { return void (location.href = 'index.html'); }
        shell = await AffShell.mount({ app, badge: 'Administración', user: { name: 'Administrador', email: adminUser.email },
            items: [
                { id: 'resumen', label: 'Resumen', short: 'Inicio', icon: 'layout-dashboard', render: resumen },
                { id: 'afiliados', label: 'Afiliados', icon: 'users', count: true, render: afiliados },
                { id: 'cartera', label: 'Cartera global', short: 'Cartera', icon: 'briefcase', render: cartera },
                { id: 'colaboraciones', label: 'Colaboraciones', short: 'Collabs', icon: 'handshake', render: colaboraciones },
                { id: 'pagos', label: 'Pagos', icon: 'landmark', count: true, render: pagos },
                { id: 'config', label: 'Configuración', short: 'Ajustes', icon: 'settings', render: config }
            ], onSignOut: async () => { await AffAPI.signOut(); location.href = 'index.html'; } });
    })();
})();
