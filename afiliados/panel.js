(function () {
    'use strict';
    const U = AffUI, { $, $$, esc, eur, int, pct, date, sum, icons, toast, badge, btnBusy } = U;
    let me, st, data = {};
    const rateOf = () => me.commission_rate != null ? me.commission_rate : st.commission_rate;
    const payable = () => data.collabs.filter(c => c.status === 'collected' && !c.payout_id);
    const refName = (id) => (data.refs.find(r => r.id === id) || {}).name || '—';

    async function load() {
        const [refs, collabs, payouts] = await Promise.all([AffAPI.myReferrals(), AffAPI.myCollabs(), AffAPI.myPayouts()]);
        data = { refs, collabs, payouts };
        shell && shell.setCount('cartera', refs.length);
    }
    let shell;

    // ------------------------------------------------------------- Resumen ----
    async function resumen(v) {
        await load();
        const { refs, collabs, payouts } = data;
        const por = sum(payable(), 'commission_amount'), med = sum(collabs.filter(c => c.status === 'pending'), 'commission_amount');
        const pag = sum(collabs.filter(c => c.status === 'paid'), 'commission_amount');
        const activos = refs.filter(r => r.status === 'active').length, espera = refs.filter(r => r.status === 'waiting').length;
        const months = U.lastMonths(6);
        const series = [['paid', 'Pagado', '#50EAD1'], ['collected', 'Por cobrar', '#6EA8FF'], ['pending', 'En medición', '#F5B84B']].map(([k, l, color]) => ({
            label: l, color, values: months.map(m => sum(collabs.filter(c => c.status === k && U.monthKey(c.collected_at || c.created_at) === m), 'commission_amount'))
        }));
        const steps = [
            ['Crear tu código de afiliado', true],
            ['Registrar tu primer negocio', refs.length > 0],
            ['Compartir tu enlace con alguien', refs.some(r => r.source === 'link')],
            ['Añadir tu método de cobro', !!me.payout_method],
            ['Conseguir tu primera comisión', collabs.length > 0]
        ];
        const pre = st.launch_label && activos === 0;
        v.innerHTML = window.AffHead(`Hola, ${esc(me.display_name.split(' ')[0])} 👋`, 'Este es el estado de tu cartera y tus comisiones.',
            `<button class="btn" id="cp"><i data-lucide="link"></i> Copiar mi enlace</button><a class="btn primary" href="#cartera" id="addl"><i data-lucide="plus"></i> Añadir negocio</a>`) +
            (pre ? `<div class="banner"><i data-lucide="rocket"></i><div><b>Fase de prelanzamiento.</b> La app se lanzará previsiblemente en <b>${esc(st.launch_label)}</b>. Los negocios que registres ahora quedan en tu cartera (${int(espera)} en espera) y podrán colaborar cuando salga. Quien más acumule antes del lanzamiento empieza con ventaja.</div></div>` : '') +
            (me.status === 'suspended' ? `<div class="banner warn"><i data-lucide="alert-triangle"></i><div><b>Cuenta suspendida.</b> Contacta con CollUp para reactivarla.</div></div>` : '') +
            `<div class="grid g4">
              ${window.AffKpi('Por cobrar', 'wallet', eur(por), `Mínimo de pago ${eur(st.min_payout)}`, 'accent')}
              ${window.AffKpi('En medición', 'hourglass', eur(med), 'Hasta que CollUp cobre')}
              ${window.AffKpi('Pagado', 'badge-check', eur(pag), `${payouts.filter(p => p.status === 'paid').length} pagos`)}
              ${window.AffKpi('Cartera', 'briefcase', int(refs.length), `${int(activos)} activos · ${int(espera)} en espera`)}
            </div>
            <div class="grid g2" style="margin-top:16px">
              <div class="card"><div class="card-h"><h3>Comisiones por mes</h3><span class="muted small">Últimos 6 meses</span></div>${U.stackedBars(months.map(U.monthLabel), series, { money: true, label: 'Comisiones por mes' })}</div>
              <div class="card"><h3>Embudo de tu cartera</h3><p class="sub">De prospecto a negocio activo</p>${U.funnel([
                  { label: 'Prospectos', value: refs.filter(r => r.status === 'prospect').length, color: 'var(--violet)' },
                  { label: 'En espera', value: refs.filter(r => r.status === 'waiting').length, color: 'var(--amber)' },
                  { label: 'Registrados', value: refs.filter(r => r.status === 'registered').length, color: 'var(--blue)' },
                  { label: 'Activos', value: activos, color: 'var(--teal)' },
                  { label: 'Descartados', value: refs.filter(r => r.status === 'lost').length, color: 'var(--red)' }])}</div>
            </div>
            <div class="grid g2e" style="margin-top:16px">
              <div class="card"><h3>Primeros pasos</h3><p class="sub">${steps.filter(s => s[1]).length} de ${steps.length} completados</p><ul class="steps">${steps.map(s => `<li class="${s[1] ? 'done' : ''}"><span class="dot">${s[1] ? '<i data-lucide="check"></i>' : ''}</span><span>${esc(s[0])}</span></li>`).join('')}</ul></div>
              <div class="card"><div class="card-h"><h3>Últimos en tu cartera</h3><a href="#cartera" class="small">Ver todo</a></div>
                ${refs.length ? `<div class="list">${refs.slice(0, 5).map(r => `<div class="li"><div class="cell-name">${U.avatar(r.name)}<div><b>${esc(r.name)}</b><span class="s">${esc(U.LABELS.kind[r.kind])} · ${date(r.created_at)}</span></div></div>${badge('referral', r.status)}</div>`).join('')}</div>`
                : `<div class="empty" style="padding:26px"><i data-lucide="users"></i><p>Aún no has registrado a nadie.</p></div>`}</div>
            </div>`;
        icons();
        $('#cp').addEventListener('click', () => U.copy(U.refLink(me.code, '/'), 'Enlace copiado'));
    }

    // ------------------------------------------------------------- Cartera ----
    function leadForm(onDone) {
        const m = U.modal(`<div class="sheet-h"><div><h3>Añadir a tu cartera</h3><p class="muted small">Si el contacto ya está registrado por otro afiliado, se queda con el primero.</p></div><button class="icon-btn" data-close aria-label="Cerrar"><i data-lucide="x"></i></button></div>
        <form id="lf" novalidate><div class="sheet-b">
          <div class="field"><div class="seg" id="kind"><button type="button" data-k="business" class="on">Negocio</button><button type="button" data-k="creator">Creador</button></div></div>
          <div class="field"><label class="f" for="ln">Nombre del negocio o creador</label><input class="in" id="ln" maxlength="120" required></div>
          <div class="row2"><div class="field"><label class="f" for="le">Email</label><input class="in" id="le" type="email"></div><div class="field"><label class="f" for="lp">Teléfono</label><input class="in" id="lp" type="tel" maxlength="30"></div></div>
          <div class="row2" id="bz"><div class="field"><label class="f" for="lt">Tipo de negocio</label><input class="in" id="lt" maxlength="60" placeholder="Restaurante, tienda…"></div><div class="field"><label class="f" for="lc">Ciudad</label><input class="in" id="lc" maxlength="60"></div></div>
          <div class="field"><label class="f" for="lo">Notas privadas</label><textarea class="in" id="lo" maxlength="600" placeholder="Contexto, siguiente paso…"></textarea></div>
          <label class="check"><input type="checkbox" id="lcons"><span>Confirmo que esta persona sabe que la registro y ha aceptado que CollUp la contacte.</span></label>
          <div class="hint err" id="le2" hidden style="margin-top:12px"></div>
        </div><div class="sheet-f"><button type="button" class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="lsave">Añadir</button></div></form>`);
        let kind = 'business';
        m.$$('#kind button').forEach(b => b.addEventListener('click', () => { kind = b.dataset.k; m.$$('#kind button').forEach(x => x.classList.toggle('on', x === b)); m.$('#bz').style.display = kind === 'business' ? '' : 'none'; }));
        m.$('#lf').addEventListener('submit', async (e) => {
            e.preventDefault(); const err = m.$('#le2'); err.hidden = true;
            const l = { kind, name: m.$('#ln').value.trim(), email: m.$('#le').value.trim(), phone: m.$('#lp').value.trim(), business_type: kind === 'business' ? m.$('#lt').value.trim() : '', city: m.$('#lc').value.trim(), notes: m.$('#lo').value.trim(), consent: m.$('#lcons').checked };
            const bad = !l.name ? 'Escribe un nombre.' : (!l.email && !l.phone) ? 'Añade un email o un teléfono para identificar al contacto.' : (l.email && !/^\S+@\S+\.\S+$/.test(l.email)) ? 'El email no es válido.' : !l.consent ? 'Confirma que la persona sabe que la registras.' : '';
            if (bad) { err.textContent = bad; err.hidden = false; return; }
            const b = m.$('#lsave');
            try { btnBusy(b, true, 'Guardando…'); await AffAPI.addLead(l); toast('Añadido a tu cartera'); m.close(); onDone && onDone(); }
            catch (x) { err.textContent = x.message; err.hidden = false; btnBusy(b, false); }
        });
    }
    async function cartera(v) {
        await load();
        let f = { s: 'all', k: 'all', q: '' };
        const refs = data.refs;
        const cnt = (s) => s === 'all' ? refs.length : refs.filter(r => r.status === s).length;
        v.innerHTML = window.AffHead('Mi cartera', 'Negocios y creadores que has registrado con tu código.', `<button class="btn" id="exp"><i data-lucide="download"></i> CSV</button><button class="btn primary" id="add"><i data-lucide="plus"></i> Añadir</button>`) +
            (st.launch_label ? `<div class="banner"><i data-lucide="info"></i><div>Antes del lanzamiento los negocios <b>quedan en tu cartera</b> en estado <b>En espera</b>, pero aún no pueden colaborar. Al salir la app (${esc(st.launch_label)}) pasan a activos.</div></div>` : '') +
            `<div class="toolbar"><div class="search"><i data-lucide="search"></i><input class="in" id="q" placeholder="Buscar por nombre, email o ciudad…" aria-label="Buscar"></div>
              <select class="in" id="kf" aria-label="Tipo"><option value="all">Todos los tipos</option><option value="business">Negocios</option><option value="creator">Creadores</option></select></div>
             <div class="chips" id="chips" style="margin-bottom:14px">${['all', 'prospect', 'waiting', 'registered', 'active', 'lost'].map(s => `<button class="chip ${s === 'all' ? 'on' : ''}" data-s="${s}">${s === 'all' ? 'Todos' : U.LABELS.referral[s]}<span class="n">${cnt(s)}</span></button>`).join('')}</div>
             <div id="tb"></div>`;
        const cols = [
            { key: 'name', label: 'Nombre', sort: r => r.name.toLowerCase(), html: r => `<div class="cell-name">${U.avatar(r.name)}<div><b>${esc(r.name)}</b><span class="s">${esc(r.email || r.phone || '—')}</span></div></div>` },
            { key: 'kind', label: 'Tipo', sort: r => r.kind, html: r => `${esc(U.LABELS.kind[r.kind])}${r.business_type ? `<span class="muted"> · ${esc(r.business_type)}</span>` : ''}` },
            { key: 'city', label: 'Ciudad', sort: r => r.city || '', html: r => esc(r.city || '—') },
            { key: 'source', label: 'Origen', html: r => esc(U.LABELS.source[r.source] || r.source) },
            { key: 'status', label: 'Estado', sort: r => r.status, html: r => badge('referral', r.status) },
            { key: 'earn', label: 'Comisión', cls: 'num', sort: r => comOf(r.id), html: r => eur(comOf(r.id)) },
            { key: 'created_at', label: 'Alta', sort: r => r.created_at, html: r => date(r.created_at) }
        ];
        const comOf = (id) => sum(data.collabs.filter(c => c.referral_id === id && c.status !== 'cancelled'), 'commission_amount');
        const filtered = () => refs.filter(r => (f.s === 'all' || r.status === f.s) && (f.k === 'all' || r.kind === f.k) &&
            (!f.q || [r.name, r.email, r.city, r.business_type].some(x => String(x || '').toLowerCase().includes(f.q))));
        const draw = () => U.table($('#tb'), cols, filtered(), { sortKey: 'created_at', onRow: detail, empty: refs.length ? undefined : `<div class="empty"><i data-lucide="briefcase"></i><h3>Tu cartera está vacía</h3><p>Añade tu primer negocio o comparte tu enlace para que se registren solos.</p><button class="btn primary" id="e-add">Añadir negocio</button></div>` });
        draw(); const ea = $('#e-add'); if (ea) ea.addEventListener('click', () => leadForm(() => shell.reload()));
        $('#q').addEventListener('input', U.debounce(e => { f.q = e.target.value.trim().toLowerCase(); $('#tb')._st = null; draw(); }));
        $('#kf').addEventListener('change', e => { f.k = e.target.value; $('#tb')._st = null; draw(); });
        $$('#chips .chip').forEach(c => c.addEventListener('click', () => { f.s = c.dataset.s; $$('#chips .chip').forEach(x => x.classList.toggle('on', x === c)); $('#tb')._st = null; draw(); }));
        $('#add').addEventListener('click', () => leadForm(() => shell.reload()));
        $('#exp').addEventListener('click', () => U.csv('mi-cartera.csv', ['Nombre', 'Tipo', 'Email', 'Teléfono', 'Negocio', 'Ciudad', 'Origen', 'Estado', 'Comisión €', 'Alta'],
            filtered().map(r => [r.name, U.LABELS.kind[r.kind], r.email, r.phone, r.business_type, r.city, U.LABELS.source[r.source], U.LABELS.referral[r.status], comOf(r.id).toFixed(2), r.created_at.slice(0, 10)])));
    }
    function detail(r) {
        const cs = data.collabs.filter(c => c.referral_id === r.id);
        const d = U.drawer(`<div class="sheet-h"><div class="cell-name">${U.avatar(r.name)}<div><h3>${esc(r.name)}</h3><span class="muted small">${esc(U.LABELS.kind[r.kind])} · ${badge('referral', r.status)}</span></div></div><button class="icon-btn" data-close aria-label="Cerrar"><i data-lucide="x"></i></button></div>
        <div class="sheet-b">
          ${r.status === 'waiting' ? `<div class="banner" style="margin-top:8px"><i data-lucide="clock"></i><div class="small">Está en tu cartera. Podrá colaborar cuando CollUp se lance${st.launch_label ? ` (${esc(st.launch_label)})` : ''}.</div></div>` : ''}
          <div class="sec"><h4>Datos</h4><dl class="kv"><dt>Email</dt><dd>${esc(r.email || '—')}</dd><dt>Teléfono</dt><dd>${esc(r.phone || '—')}</dd><dt>Negocio</dt><dd>${esc(r.business_type || '—')}</dd><dt>Ciudad</dt><dd>${esc(r.city || '—')}</dd><dt>Origen</dt><dd>${esc(U.LABELS.source[r.source] || r.source)}</dd><dt>Alta</dt><dd>${date(r.created_at)}</dd>
            ${r.first_collab_at ? `<dt>1ª colaboración</dt><dd>${date(r.first_collab_at)}</dd><dt>Comisión hasta</dt><dd>${date(r.commission_ends_at)}</dd>` : ''}</dl></div>
          <div class="sec"><h4>Comisiones (${cs.length})</h4>${cs.length ? `<div class="list">${cs.map(c => `<div class="li"><div><b>${eur(c.commission_amount)}</b><span class="muted small"> · ${esc(c.collab_ref || c.description || 'Colaboración')} · ${date(c.created_at)}</span></div>${badge('collab', c.status)}</div>`).join('')}</div>` : '<p class="muted small">Todavía no hay colaboraciones.</p>'}</div>
          <div class="sec"><h4>Notas privadas</h4><textarea class="in" id="dn" maxlength="600">${esc(r.notes || '')}</textarea></div>
        </div>
        <div class="sheet-f">${r.status !== 'lost' && r.status !== 'active' ? '<button class="btn danger" id="dl">Descartar</button>' : r.status === 'lost' ? '<button class="btn ghost" id="dr">Reabrir</button>' : ''}<span class="spacer"></span><button class="btn primary" id="ds">Guardar notas</button></div>`);
        const run = async (lost, msg) => { try { await AffAPI.updateLead(r.id, d.$('#dn').value, lost); toast(msg); d.close(); shell.reload(); } catch (e) { toast(e.message, 'err'); } };
        d.$('#ds').addEventListener('click', () => run(r.status === 'lost', 'Notas guardadas'));
        const dl = d.$('#dl'); if (dl) dl.addEventListener('click', async () => { if (await U.confirmBox({ title: '¿Descartar este contacto?', text: 'Seguirá en tu histórico pero dejará de contar como prospecto.', ok: 'Descartar', danger: true })) run(true, 'Descartado'); });
        const dr = d.$('#dr'); if (dr) dr.addEventListener('click', () => run(false, 'Reabierto'));
    }

    // ----------------------------------------------------------- Comisiones ----
    async function comisiones(v) {
        await load();
        const f = { s: 'all', from: '', to: '', q: '' };
        v.innerHTML = window.AffHead('Comisiones', `Ganas el <b>${pct(rateOf())}</b> de los ingresos de CollUp en cada colaboración, durante ${st.commission_months} meses desde la primera.`, `<button class="btn" id="exp"><i data-lucide="download"></i> CSV</button>`) +
            `<div class="toolbar"><div class="search"><i data-lucide="search"></i><input class="in" id="q" placeholder="Buscar por negocio o referencia…" aria-label="Buscar"></div>
              <label class="small muted">Desde <input class="in" type="date" id="d1" style="width:auto;display:inline-block"></label><label class="small muted">Hasta <input class="in" type="date" id="d2" style="width:auto;display:inline-block"></label></div>
             <div class="chips" id="chips" style="margin-bottom:14px">${['all', 'pending', 'collected', 'paid', 'cancelled'].map(s => `<button class="chip ${s === 'all' ? 'on' : ''}" data-s="${s}">${s === 'all' ? 'Todas' : U.LABELS.collab[s]}</button>`).join('')}</div><div id="tb"></div>`;
        const cols = [
            { key: 'created_at', label: 'Fecha', sort: c => c.created_at, html: c => date(c.created_at) },
            { key: 'ref', label: 'Negocio', sort: c => refName(c.referral_id).toLowerCase(), html: c => `<b>${esc(refName(c.referral_id))}</b><span class="s muted" style="display:block;font-size:12px">${esc(c.collab_ref || c.description || '')}</span>` },
            { key: 'income', label: 'Ingreso CollUp', cls: 'num', sort: c => c.collup_income, html: c => eur(c.collup_income) },
            { key: 'rate', label: '%', cls: 'num', sort: c => c.commission_rate, html: c => pct(c.commission_rate) },
            { key: 'amt', label: 'Comisión', cls: 'num', sort: c => c.commission_amount, html: c => `<b>${eur(c.commission_amount)}</b>` },
            { key: 'status', label: 'Estado', sort: c => c.status, html: c => badge('collab', c.status) }
        ];
        const filtered = () => data.collabs.filter(c => (f.s === 'all' || c.status === f.s) && (!f.from || c.created_at.slice(0, 10) >= f.from) && (!f.to || c.created_at.slice(0, 10) <= f.to) &&
            (!f.q || (refName(c.referral_id) + ' ' + (c.collab_ref || '')).toLowerCase().includes(f.q)));
        const draw = () => U.table($('#tb'), cols, filtered(), {
            sortKey: 'created_at', empty: '<div class="empty"><i data-lucide="coins"></i><h3>Aún no hay comisiones</h3><p>Aparecerán aquí cuando tus referidos empiecen a colaborar.</p></div>',
            foot: (rows) => `<tr><td colspan="2">Total (${rows.length})</td><td class="num">${eur(sum(rows, 'collup_income'))}</td><td></td><td class="num">${eur(sum(rows.filter(c => c.status !== 'cancelled'), 'commission_amount'))}</td><td></td></tr>`
        });
        draw();
        $('#q').addEventListener('input', U.debounce(e => { f.q = e.target.value.trim().toLowerCase(); $('#tb')._st = null; draw(); }));
        $('#d1').addEventListener('change', e => { f.from = e.target.value; draw(); }); $('#d2').addEventListener('change', e => { f.to = e.target.value; draw(); });
        $$('#chips .chip').forEach(c => c.addEventListener('click', () => { f.s = c.dataset.s; $$('#chips .chip').forEach(x => x.classList.toggle('on', x === c)); draw(); }));
        $('#exp').addEventListener('click', () => U.csv('mis-comisiones.csv', ['Fecha', 'Negocio', 'Referencia', 'Ingreso CollUp €', '%', 'Comisión €', 'Estado'],
            filtered().map(c => [c.created_at.slice(0, 10), refName(c.referral_id), c.collab_ref, c.collup_income.toFixed(2), (c.commission_rate * 100).toFixed(1), c.commission_amount.toFixed(2), U.LABELS.collab[c.status]])));
    }

    // ---------------------------------------------------------------- Pagos ----
    async function pagos(v) {
        await load();
        const por = sum(payable(), 'commission_amount'), min = st.min_payout, p = Math.min(1, por / min);
        v.innerHTML = window.AffHead('Pagos', 'CollUp paga las comisiones ya cobradas cuando alcanzas el mínimo.') +
            `<div class="grid g2e"><div class="card"><h3>Disponible para cobrar</h3><div class="kpi"><div class="v" style="color:var(--teal)">${eur(por)}</div></div>
              <div class="progress"><i style="width:${p * 100}%"></i></div><p class="small muted">${por >= min ? '✓ Has alcanzado el mínimo. CollUp preparará tu pago.' : `Te faltan <b>${eur(min - por)}</b> para el mínimo de ${eur(min)}.`}</p>
              ${me.payout_method ? '' : '<div class="banner warn" style="margin-top:14px"><i data-lucide="alert-triangle"></i><div class="small">Aún no has indicado cómo quieres cobrar. <a href="#ajustes">Añadir método de cobro</a></div></div>'}</div>
              <div class="card"><h3>Cómo se calcula</h3><ul class="steps" style="margin-top:10px">
                <li><span class="dot"><i data-lucide="check" style="width:13px"></i></span><span style="text-decoration:none;color:var(--ink)">Tu referido colabora y CollUp ingresa su comisión.</span></li>
                <li><span class="dot"><i data-lucide="check" style="width:13px"></i></span><span style="text-decoration:none;color:var(--ink)">Cuando CollUp cobra, tu comisión pasa a <b>Por cobrar</b>.</span></li>
                <li><span class="dot"><i data-lucide="check" style="width:13px"></i></span><span style="text-decoration:none;color:var(--ink)">Al superar ${eur(min)}, se prepara y se marca como <b>Pagada</b>.</span></li></ul></div></div>
             <h3 style="margin:24px 0 12px">Historial</h3><div id="tb"></div>`;
        U.table($('#tb'), [
            { key: 'created_at', label: 'Fecha', sort: x => x.created_at, html: x => date(x.created_at) },
            { key: 'amount', label: 'Importe', cls: 'num', sort: x => x.amount, html: x => `<b>${eur(x.amount)}</b>` },
            { key: 'method', label: 'Método', html: x => esc(U.LABELS.method[x.method] || x.method || '—') },
            { key: 'ref', label: 'Referencia', html: x => esc(x.reference || '—') },
            { key: 'status', label: 'Estado', sort: x => x.status, html: x => badge('payout', x.status) },
            { key: 'paid_at', label: 'Pagado el', sort: x => x.paid_at || '', html: x => date(x.paid_at) }
        ], data.payouts, { sortKey: 'created_at', empty: '<div class="empty"><i data-lucide="landmark"></i><h3>Sin pagos todavía</h3><p>Tus pagos aparecerán aquí.</p></div>' });
    }

    // -------------------------------------------------------------- Mi código ----
    async function codigo(v) {
        await load();
        const locked = data.refs.length > 0;
        const pages = [['/', 'Página principal', 'house'], ['/negocios.html', 'Página para negocios', 'store'], ['/influencer-vip.html', 'Página para creadores', 'sparkles']];
        const tpl = [
            ['Para un negocio', `Hola 👋 Soy ${me.display_name}. Estoy colaborando con CollUp, una plataforma que conecta negocios con creadores para campañas reales. Se lanza pronto y ahora puedes apuntarte con ventaja: ${U.refLink(me.code, '/negocios.html')}`],
            ['Para un creador', `¡Hola! Te hablo de CollUp: negocios que buscan creadores para colaborar y pagar por ello. Puedes entrar antes del lanzamiento aquí: ${U.refLink(me.code, '/influencer-vip.html')}`],
            ['Mensaje corto', `Mira CollUp, lo vas a querer probar: ${U.refLink(me.code, '/')}`]];
        v.innerHTML = window.AffHead('Mi código y enlaces', 'Comparte tu enlace: todo el que se registre desde él queda en tu cartera automáticamente.') +
            `<div class="code-box"><div><div class="muted small">Tu código</div><div class="code" id="cd">${esc(me.code)}</div></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="cc"><i data-lucide="copy"></i> Copiar código</button><button class="btn" id="chg" ${locked ? 'title="Bloqueado: ya tienes negocios en tu cartera"' : ''}><i data-lucide="pencil"></i> Cambiar</button></div></div>
             ${locked ? '<p class="hint" style="margin:8px 4px">El código se bloquea al registrar tu primer negocio para que los enlaces ya compartidos sigan funcionando.</p>' : ''}
             <div class="grid g2" style="margin-top:16px"><div class="card"><h3>Enlaces con tu código</h3><p class="sub">Elige la página que mejor encaje con quien lo recibe.</p>
               <div style="display:grid;gap:14px">${pages.map(([p, l, ic]) => `<div><div class="small muted" style="margin-bottom:5px;display:flex;gap:6px;align-items:center"><i data-lucide="${ic}" style="width:14px;height:14px"></i>${l}</div><div class="link-row"><code>${esc(U.refLink(me.code, p))}</code><button class="btn sm" data-copy="${esc(U.refLink(me.code, p))}">Copiar</button></div></div>`).join('')}</div></div>
               <div class="card" style="text-align:center"><h3>Código QR</h3><p class="sub">Ideal para tarjetas, escaparates y eventos.</p><div class="qr" style="margin:0 auto 14px">${U.qrSvg(U.refLink(me.code, '/'))}</div><button class="btn sm" id="dq"><i data-lucide="download"></i> Descargar SVG</button></div></div>
             <div class="card" style="margin-top:16px"><h3>Mensajes listos para enviar</h3><p class="sub">Cópialos o compártelos directamente.</p>${tpl.map((t, i) => `<div class="small muted" style="margin-top:12px"><b>${t[0]}</b></div><div class="tpl">${esc(t[1])}</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-copy="${esc(t[1])}"><i data-lucide="copy"></i> Copiar</button><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(t[1])}"><i data-lucide="message-circle"></i> WhatsApp</a><a class="btn sm" href="mailto:?subject=${encodeURIComponent('Te presento CollUp')}&body=${encodeURIComponent(t[1])}"><i data-lucide="mail"></i> Email</a></div>`).join('')}</div>`;
        icons();
        $$('[data-copy]', v).forEach(b => b.addEventListener('click', () => U.copy(b.dataset.copy)));
        $('#cc').addEventListener('click', () => U.copy(me.code, 'Código copiado'));
        $('#dq').addEventListener('click', () => { const b = new Blob([U.qrSvg(U.refLink(me.code, '/'))], { type: 'image/svg+xml' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `collup-${me.code}.svg`; a.click(); });
        $('#chg').addEventListener('click', () => {
            if (locked) return toast('Ya no puedes cambiar el código: tienes negocios en tu cartera.', 'err');
            const m = U.modal(`<div class="sheet-h"><h3>Cambiar código</h3></div><div class="sheet-b"><div class="field"><label class="f" for="nc">Nuevo código</label><input class="in" id="nc" maxlength="20" value="${esc(me.code)}" style="text-transform:uppercase;font-weight:700;letter-spacing:.08em"><div class="hint" id="nh"></div></div></div><div class="sheet-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="ns">Guardar</button></div>`);
            const inp = m.$('#nc'), h = m.$('#nh');
            const chk = U.debounce(async () => { try { const r = await AffAPI.codeAvailable(inp.value); h.className = 'hint ' + (r.available || r.code === me.code ? 'ok' : 'err'); h.textContent = r.available ? `✓ ${r.code} disponible` : r.code === me.code ? 'Es tu código actual' : ({ format: 'De 3 a 20 caracteres: letras, números y guiones.', reserved: 'Código reservado.', taken: 'Ya está en uso.' })[r.reason]; } catch (e) { h.textContent = e.message; } }, 300);
            inp.addEventListener('input', () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''); chk(); });
            m.$('#ns').addEventListener('click', async () => { try { btnBusy(m.$('#ns'), true); await AffAPI.changeCode(inp.value); me = await AffAPI.me(); toast('Código actualizado'); m.close(); shell.reload(); } catch (e) { toast(e.message, 'err'); btnBusy(m.$('#ns'), false); } });
        });
    }

    // -------------------------------------------------------------- Ajustes ----
    async function ajustes(v) {
        v.innerHTML = window.AffHead('Ajustes', 'Tu perfil, cómo quieres cobrar y tu contraseña.') +
            `<div class="grid g2e"><form class="card" id="pf"><h3>Perfil y cobro</h3><p class="sub">Solo CollUp puede ver tus datos de cobro.</p>
              <div class="field"><label class="f" for="pn">Nombre o marca</label><input class="in" id="pn" maxlength="60" value="${esc(me.display_name)}"></div>
              <div class="field"><label class="f">Email</label><input class="in" value="${esc(me.email)}" disabled></div>
              <div class="field"><label class="f" for="pm">Método de cobro</label><select class="in" id="pm"><option value="">Sin definir</option>${Object.entries(U.LABELS.method).map(([k, l]) => `<option value="${k}" ${me.payout_method === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
              <div class="field"><label class="f" for="pd">Datos de cobro</label><input class="in" id="pd" maxlength="120" value="${esc(me.payout_details || '')}" placeholder="IBAN, email de Stripe o teléfono de Bizum" autocomplete="off"><div class="hint">Se guardan solo para poder pagarte.</div></div>
              <button class="btn primary" id="ps">Guardar cambios</button></form>
             <form class="card" id="pw"><h3>Contraseña</h3><p class="sub">Mínimo 8 caracteres.</p><div class="field"><label class="f" for="p1">Nueva contraseña</label><input class="in" id="p1" type="password" autocomplete="new-password" minlength="8"></div>
              <button class="btn" id="pwb">Cambiar contraseña</button>
              <hr style="border:0;border-top:1px solid var(--line);margin:22px 0"><dl class="kv"><dt>Código</dt><dd><b>${esc(me.code)}</b></dd><dt>Comisión</dt><dd>${pct(rateOf())} ${me.commission_rate != null ? '<span class="muted">(tarifa personalizada)</span>' : ''}</dd><dt>Alta</dt><dd>${date(me.created_at)}</dd></dl></form></div>`;
        $('#pf').addEventListener('submit', async (e) => { e.preventDefault(); const b = $('#ps'); try { btnBusy(b, true); await AffAPI.updateProfile({ name: $('#pn').value.trim(), method: $('#pm').value, details: $('#pd').value.trim() }); me = await AffAPI.me(); toast('Cambios guardados'); } catch (x) { toast(x.message, 'err'); } btnBusy(b, false); });
        $('#pw').addEventListener('submit', async (e) => { e.preventDefault(); const b = $('#pwb'); if ($('#p1').value.length < 8) return toast('Mínimo 8 caracteres.', 'err'); try { btnBusy(b, true); await AffAPI.changePassword($('#p1').value); $('#p1').value = ''; toast('Contraseña actualizada'); } catch (x) { toast(x.message, 'err'); } btnBusy(b, false); });
    }

    (async function init() {
        await AffAPI.ready;
        const app = $('#app');
        try {
            const s = await AffAPI.session();
            if (!s) return void (location.href = 'index.html');
            if (s.isAdmin) return void (location.href = 'admin.html');
            me = await AffAPI.me();
            if (!me) return void (location.href = 'index.html');
            st = await AffAPI.status();
        } catch (e) { app.innerHTML = `<div class="empty" style="margin:20vh auto;max-width:420px"><h3>No se ha podido cargar</h3><p>${esc(e.message)}</p><a class="btn" href="index.html">Volver</a></div>`; return; }
        shell = await AffShell.mount({
            app, badge: 'Afiliados', user: { name: me.display_name, email: me.email },
            items: [
                { id: 'resumen', label: 'Resumen', short: 'Inicio', icon: 'layout-dashboard', render: resumen },
                { id: 'cartera', label: 'Mi cartera', short: 'Cartera', icon: 'briefcase', count: true, render: cartera },
                { id: 'comisiones', label: 'Comisiones', short: 'Comisiones', icon: 'coins', render: comisiones },
                { id: 'pagos', label: 'Pagos', icon: 'landmark', render: pagos },
                { id: 'codigo', label: 'Mi código', short: 'Código', icon: 'qr-code', render: codigo },
                { id: 'ajustes', label: 'Ajustes', icon: 'settings', render: ajustes }
            ],
            onSignOut: async () => { await AffAPI.signOut(); location.href = 'index.html'; }
        });
        shell.setCount('cartera', (data.refs || []).length);
    })();
})();
