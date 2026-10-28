// CollUp · Portal de afiliados · utilidades de interfaz compartidas.
(function () {
    'use strict';
    const $ = (s, r) => (r || document).querySelector(s);
    const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const eur = (n, d) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: d == null ? (Math.abs(n) % 1 ? 2 : 0) : d, maximumFractionDigits: d == null ? 2 : d }).format(n || 0);
    const int = (n) => new Intl.NumberFormat('es-ES').format(n || 0);
    const pct = (n) => new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1 }).format(n || 0);
    const date = (d) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '') : '—';
    const dateShort = (d) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : '—';
    const monthKey = (d) => { const t = new Date(d); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0'); };
    const monthLabel = (k) => { const [y, m] = k.split('-'); return new Date(+y, +m - 1, 1).toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''); };
    const sum = (arr, f) => arr.reduce((s, x) => s + (typeof f === 'function' ? f(x) : +x[f] || 0), 0);
    const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms || 180); }; };
    const initials = (n) => String(n || '?').replace(/^@/, '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const hue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
    const avatar = (name) => `<span class="avatar" style="--h:${hue(name)}">${esc(initials(name))}</span>`;

    const LABELS = {
        referral: { prospect: 'Prospecto', waiting: 'En espera', registered: 'Registrado', active: 'Activo', lost: 'Descartado' },
        collab: { pending: 'En medición', collected: 'Por cobrar', paid: 'Pagada', cancelled: 'Cancelada' },
        payout: { pending: 'Pendiente', paid: 'Pagado' },
        affiliate: { active: 'Activo', suspended: 'Suspendido' },
        kind: { business: 'Negocio', creator: 'Creador' },
        source: { link: 'Enlace', manual: 'Manual' },
        method: { transfer: 'Transferencia', stripe: 'Stripe', bizum: 'Bizum' }
    };
    const badge = (type, key) => `<span class="badge b-${esc(key)}">${esc(LABELS[type][key] || key)}</span>`;

    // ------------------------------------------------------------ toasts ----
    function toast(msg, kind) {
        let box = $('#toasts');
        if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.append(box); }
        const t = document.createElement('div');
        t.className = 'toast ' + (kind || 'ok');
        t.innerHTML = `<i data-lucide="${kind === 'err' ? 'alert-circle' : 'check-circle-2'}"></i><span>${esc(msg)}</span>`;
        box.append(t); icons();
        setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, kind === 'err' ? 5200 : 3200);
    }
    function icons() { try { if (window.lucide) window.lucide.createIcons(); } catch (e) {} }

    // ------------------------------------------------------ modal / drawer ----
    function overlay(html, cls) {
        const el = document.createElement('div');
        el.className = 'overlay ' + (cls || '');
        el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
        document.body.append(el);
        document.body.classList.add('noscroll');
        const close = () => { el.classList.add('out'); setTimeout(() => { el.remove(); if (!$('.overlay')) document.body.classList.remove('noscroll'); }, 200); };
        el.addEventListener('mousedown', (e) => { if (e.target === el) close(); });
        const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
        document.addEventListener('keydown', onKey);
        el.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
        requestAnimationFrame(() => el.classList.add('in'));
        icons();
        const first = el.querySelector('input,select,textarea,button:not([data-close])'); if (first && cls !== 'drawer') first.focus();
        return { el, close, $: (s) => el.querySelector(s), $$: (s) => Array.from(el.querySelectorAll(s)) };
    }
    const modal = (html) => overlay(html, 'modal');
    const drawer = (html) => overlay(html, 'drawer');
    function confirmBox({ title, text, ok, danger }) {
        return new Promise(res => {
            const m = modal(`<div class="sheet-h"><h3>${esc(title)}</h3></div><div class="sheet-b"><p class="muted">${esc(text)}</p></div>
              <div class="sheet-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn ${danger ? 'danger' : 'primary'}" id="cf-ok">${esc(ok || 'Confirmar')}</button></div>`);
            let done = false;
            m.$('#cf-ok').addEventListener('click', () => { done = true; m.close(); res(true); });
            m.el.addEventListener('transitionend', () => {}, { once: true });
            const obs = new MutationObserver(() => { if (!document.body.contains(m.el) && !done) { res(false); obs.disconnect(); } });
            obs.observe(document.body, { childList: true });
        });
    }

    // ------------------------------------------------------------ helpers ----
    async function copy(text, label) {
        try { await navigator.clipboard.writeText(text); }
        catch (e) { const t = document.createElement('textarea'); t.value = text; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch (x) {} t.remove(); }
        toast(label || 'Copiado al portapapeles');
    }
    function csv(filename, headers, rows) {
        const q = (v) => { v = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
        const body = [headers, ...rows].map(r => r.map(q).join(';')).join('\r\n');
        const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.append(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    function btnBusy(btn, busy, label) {
        if (busy) { btn.dataset.html = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> ${esc(label || 'Un momento…')}`; icons(); }
        else { btn.disabled = false; btn.innerHTML = btn.dataset.html || btn.innerHTML; icons(); }
    }

    // -------------------------------------------------------------- charts ----
    // series: [{label, color, values: []}] stacked bars over labels
    function stackedBars(labels, series, opts) {
        opts = opts || {};
        const W = 640, H = opts.height || 220, pl = 44, pr = 8, pt = 12, pb = 26;
        const totals = labels.map((_, i) => series.reduce((s, x) => s + (x.values[i] || 0), 0));
        const max = Math.max(1, ...totals);
        const step = niceStep(max / 4);
        const top = Math.ceil(max / step) * step || 1;
        const bw = (W - pl - pr) / labels.length;
        const y = (v) => pt + (H - pt - pb) * (1 - v / top);
        let g = '';
        for (let v = 0; v <= top + 1e-9; v += step) g += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${pl - 8}" y="${y(v) + 4}" class="ax" text-anchor="end">${opts.money ? shortEur(v) : int(v)}</text>`;
        let bars = '';
        labels.forEach((l, i) => {
            let acc = 0; const x = pl + i * bw + bw * 0.18, w = bw * 0.64;
            series.forEach(s => {
                const v = s.values[i] || 0; if (!v) return;
                const y1 = y(acc + v), y0 = y(acc); acc += v;
                bars += `<rect x="${x}" y="${y1}" width="${w}" height="${Math.max(0, y0 - y1)}" rx="3" fill="${s.color}"><title>${esc(l)} · ${esc(s.label)}: ${opts.money ? eur(v) : int(v)}</title></rect>`;
            });
            bars += `<text x="${x + w / 2}" y="${H - 8}" class="ax" text-anchor="middle">${esc(l)}</text>`;
        });
        const legend = series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join('');
        return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Gráfico')}" preserveAspectRatio="xMidYMid meet">${g}${bars}</svg><div class="legend">${legend}</div></div>`;
    }
    function niceStep(v) { const p = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1)))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
    function shortEur(v) { return v >= 1000 ? (v / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + 'k€' : v + '€'; }
    function funnel(items) {
        const max = Math.max(1, ...items.map(i => i.value));
        return `<div class="funnel">${items.map(i => `<div class="f-row"><span class="f-l">${esc(i.label)}</span><div class="f-bar"><i style="width:${Math.max(2, i.value / max * 100)}%;background:${i.color || 'var(--teal)'}"></i></div><b>${int(i.value)}</b></div>`).join('')}</div>`;
    }
    function lastMonths(n) {
        const out = []; const d = new Date(); d.setDate(1);
        for (let i = n - 1; i >= 0; i--) { const t = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0')); }
        return out;
    }

    // ----------------------------------------------------- generic table ----
    // cols: [{key,label,html:(row)=>string, sort:(row)=>value, cls}]
    function table(el, cols, rows, opts) {
        opts = opts || {};
        const st = el._st || (el._st = { key: opts.sortKey || null, dir: opts.sortDir || -1, page: 0 });
        const per = opts.perPage || 25;
        let data = rows.slice();
        const col = cols.find(c => c.key === st.key);
        if (col && col.sort) data.sort((a, b) => { const x = col.sort(a), y = col.sort(b); return (x > y ? 1 : x < y ? -1 : 0) * st.dir; });
        const pages = Math.max(1, Math.ceil(data.length / per));
        if (st.page >= pages) st.page = pages - 1;
        const slice = data.slice(st.page * per, st.page * per + per);
        if (!data.length) { el.innerHTML = opts.empty || '<div class="empty"><i data-lucide="inbox"></i><p>No hay resultados.</p></div>'; icons(); return; }
        el.innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map(c => `<th class="${c.cls || ''} ${c.sort ? 'sortable' : ''} ${st.key === c.key ? 'sorted' : ''}" data-k="${c.key}">${esc(c.label)}${st.key === c.key ? (st.dir > 0 ? ' ↑' : ' ↓') : ''}</th>`).join('')}</tr></thead>
          <tbody>${slice.map((r, i) => `<tr data-i="${st.page * per + i}" class="${opts.onRow ? 'click' : ''}">${cols.map(c => `<td class="${c.cls || ''}" data-label="${esc(c.label)}">${c.html(r)}</td>`).join('')}</tr>`).join('')}</tbody>
          ${opts.foot ? `<tfoot>${opts.foot(data)}</tfoot>` : ''}</table></div>
          ${pages > 1 ? `<div class="pager"><button class="btn ghost sm" data-p="-1" ${st.page === 0 ? 'disabled' : ''}>Anterior</button><span>Página ${st.page + 1} de ${pages} · ${int(data.length)} filas</span><button class="btn ghost sm" data-p="1" ${st.page >= pages - 1 ? 'disabled' : ''}>Siguiente</button></div>` : ''}`;
        el.querySelectorAll('th.sortable').forEach(th => th.addEventListener('click', () => { const k = th.dataset.k; if (st.key === k) st.dir *= -1; else { st.key = k; st.dir = -1; } table(el, cols, rows, opts); }));
        el.querySelectorAll('.pager button').forEach(b => b.addEventListener('click', () => { st.page += +b.dataset.p; table(el, cols, rows, opts); }));
        if (opts.onRow) el.querySelectorAll('tbody tr').forEach(tr => tr.addEventListener('click', (e) => { if (e.target.closest('button,a,input,select')) return; opts.onRow(data[+tr.dataset.i]); }));
        icons();
    }

    function fmtCode(c) { return String(c || '').toUpperCase(); }
    function refLink(code, path) { return `${window.COLLUP_AFF.SITE_URL}${path || '/'}?ref=${encodeURIComponent(fmtCode(code))}`; }
    function qrSvg(text, size) {
        try { const qr = window.qrcode(0, 'M'); qr.addData(text); qr.make(); return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (e) { return ''; }
    }
    function setTitle(t) { document.title = t + ' · CollUp Afiliados'; }

    window.AffUI = { $, $$, esc, eur, int, pct, date, dateShort, monthKey, monthLabel, sum, debounce, initials, avatar, hue, LABELS, badge, toast, icons, modal, drawer, confirmBox, copy, csv, btnBusy, stackedBars, funnel, lastMonths, table, fmtCode, refLink, qrSvg, setTitle };
})();
