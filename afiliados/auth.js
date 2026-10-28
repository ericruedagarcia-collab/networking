(function () {
    'use strict';
    const { $, esc, icons, toast, btnBusy, debounce, pct } = AffUI;
    const card = $('#card');
    const PEND = 'collup_aff_pending';
    let status = { open: false, commission_rate: 0.2, commission_months: 12, min_payout: 25, launch_label: '' };

    const getPending = () => { try { return JSON.parse(localStorage.getItem(PEND) || 'null'); } catch (e) { return null; } };
    const setPending = (v) => { try { v ? localStorage.setItem(PEND, JSON.stringify(v)) : localStorage.removeItem(PEND); } catch (e) {} };

    function conditions() {
        return `<details class="small muted" style="margin:2px 0 14px"><summary style="cursor:pointer;color:var(--teal)">Ver condiciones del programa</summary>
        <ul style="margin:8px 0 0;padding-left:18px;display:grid;gap:5px">
          <li>Comisión del <b>${pct(status.commission_rate)}</b> sobre los ingresos de CollUp de cada colaboración del negocio o creador que registres.</li>
          <li>Se aplica durante <b>${status.commission_months} meses</b> desde la primera colaboración del referido.</li>
          <li>Solo se paga lo que CollUp ha cobrado. Pago mínimo de <b>${AffUI.eur(status.min_payout)}</b>.</li>
          <li>Si dos afiliados registran el mismo negocio, se queda con el primero que lo registró.</li>
          <li>Antes del lanzamiento los negocios quedan en tu cartera pero no pueden colaborar todavía.</li>
          <li>Solo puedes registrar contactos que sepan que los registras y no hagas spam.</li>
        </ul></details>`;
    }

    function closedNote() {
        return `<div class="banner warn"><i data-lucide="lock"></i><div><b>Programa aún no abierto</b><br><span class="small">Estamos preparando el lanzamiento. Si ya tienes cuenta puedes entrar; los registros nuevos se abrirán pronto.</span></div></div>`;
    }

    function authView(tab) {
        tab = tab || 'in';
        card.innerHTML = `
        <h2>${tab === 'in' ? 'Bienvenido de nuevo' : 'Crea tu cuenta de afiliado'}</h2>
        <p class="sub">${tab === 'in' ? 'Entra para ver tu cartera y tus comisiones.' : 'Elige tu código y empieza a registrar negocios.'}</p>
        <div class="seg auth-tabs"><button data-t="in" class="${tab === 'in' ? 'on' : ''}">Entrar</button><button data-t="up" class="${tab === 'up' ? 'on' : ''}">Crear cuenta</button></div>
        ${!status.open && tab === 'up' ? closedNote() : ''}
        <form id="f" novalidate>
          ${tab === 'up' ? `<div class="field"><label class="f" for="name">Nombre o marca</label><input class="in" id="name" autocomplete="name" maxlength="60" required placeholder="Ej. Marta Soler"></div>` : ''}
          <div class="field"><label class="f" for="email">Email</label><input class="in" id="email" type="email" autocomplete="email" required placeholder="tu@email.com"></div>
          <div class="field"><label class="f" for="pw">Contraseña</label><input class="in" id="pw" type="password" autocomplete="${tab === 'in' ? 'current-password' : 'new-password'}" minlength="8" required placeholder="${tab === 'up' ? 'Mínimo 8 caracteres' : '••••••••'}">
            ${tab === 'up' ? '<div class="strength"><i id="str"></i></div>' : ''}</div>
          ${tab === 'up' ? `<div class="field"><label class="f" for="code">Tu código de afiliado</label><input class="in" id="code" maxlength="20" autocomplete="off" spellcheck="false" placeholder="Ej. MARTA" style="text-transform:uppercase;letter-spacing:.08em;font-weight:700"><div class="hint" id="code-h">3–20 caracteres: letras, números y guiones. Será único.</div><div class="sugg" id="sugg"></div></div>
          ${conditions()}
          <label class="check" style="margin-bottom:16px"><input type="checkbox" id="terms"><span>Acepto las condiciones del programa de afiliados.</span></label>` : ''}
          <div class="hint err" id="err" role="alert" style="margin:0 0 12px" hidden></div>
          <button class="btn primary block" id="go" type="submit">${tab === 'in' ? 'Entrar' : 'Crear cuenta'}</button>
          ${tab === 'in' ? '<p class="or"><button type="button" class="link-btn" id="forgot">He olvidado mi contraseña</button></p>' : ''}
        </form>`;
        icons();
        card.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => authView(b.dataset.t)));
        const f = $('#f'), err = $('#err');
        const showErr = (m) => { err.textContent = m; err.hidden = !m; };
        if (tab === 'up') wireCode($('#code'), $('#code-h'), $('#sugg'), $('#name'));
        if (tab === 'up') $('#pw').addEventListener('input', (e) => { const v = e.target.value; let s = 0; if (v.length >= 8) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) s++; const el = $('#str'); el.style.width = s * 25 + '%'; el.style.background = ['var(--red)', 'var(--red)', 'var(--amber)', 'var(--teal-d)', 'var(--teal)'][s]; });
        const fg = $('#forgot');
        if (fg) fg.addEventListener('click', async () => {
            const email = $('#email').value.trim(); if (!email) return showErr('Escribe tu email y vuelve a pulsar.');
            try { await AffAPI.resetPassword(email); toast('Te hemos enviado un enlace para restablecer la contraseña.'); showErr(''); } catch (e) { showErr(e.message); }
        });
        f.addEventListener('submit', async (ev) => {
            ev.preventDefault(); showErr('');
            const email = $('#email').value.trim(), pw = $('#pw').value, btn = $('#go');
            if (!/^\S+@\S+\.\S+$/.test(email)) return showErr('Escribe un email válido.');
            if (pw.length < 8) return showErr('La contraseña debe tener al menos 8 caracteres.');
            try {
                if (tab === 'in') {
                    btnBusy(btn, true, 'Entrando…'); await AffAPI.signIn(email, pw); await route();
                } else {
                    const name = $('#name').value.trim(), code = $('#code').value.trim();
                    if (!status.open) return showErr('El registro de nuevos afiliados todavía no está abierto.');
                    if (name.length < 2) return showErr('Escribe tu nombre o marca.');
                    if (!$('#terms').checked) return showErr('Debes aceptar las condiciones.');
                    btnBusy(btn, true, 'Creando cuenta…');
                    const chk = await AffAPI.codeAvailable(code); if (!chk.available) throw new Error(codeMsg(chk.reason));
                    setPending({ code: chk.code, name });
                    const r = await AffAPI.signUp(email, pw);
                    if (r.needsConfirmation) return confirmView(email);
                    await route();
                }
            } catch (e) { showErr(e.message); btnBusy(btn, false); }
        });
    }

    function codeMsg(reason) {
        return ({ format: 'El código debe tener de 3 a 20 caracteres: letras, números y guiones.', reserved: 'Ese código está reservado. Elige otro.', taken: 'Ese código ya está en uso. Prueba con otro.' })[reason] || 'Código no válido.';
    }
    function suggestions(name) {
        const base = String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().split(/\s+/).filter(Boolean);
        if (!base.length) return [];
        const a = base[0], b = base[1] || '';
        return [...new Set([a, a + (b ? b[0] : ''), a + '10', a + '2027', (a + b).slice(0, 12), 'COLLUP' + a].filter(x => x.length >= 3 && x.length <= 20))].slice(0, 5);
    }
    function wireCode(input, hint, sug, nameInput) {
        const run = debounce(async () => {
            const v = input.value.trim(); if (!v) { hint.className = 'hint'; hint.textContent = '3–20 caracteres: letras, números y guiones. Será único.'; return; }
            hint.className = 'hint'; hint.textContent = 'Comprobando…';
            try { const r = await AffAPI.codeAvailable(v); if (input.value.trim() !== v) return;
                hint.className = 'hint ' + (r.available ? 'ok' : 'err'); hint.textContent = r.available ? `✓ ${r.code} está disponible` : codeMsg(r.reason); }
            catch (e) { hint.className = 'hint err'; hint.textContent = e.message; }
        }, 350);
        input.addEventListener('input', () => { input.value = input.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''); run(); });
        const renderS = () => { const s = suggestions(nameInput && nameInput.value); sug.innerHTML = s.length ? '<span class="tiny muted" style="align-self:center">Ideas:</span>' + s.map(x => `<button type="button" class="chip" data-c="${esc(x)}">${esc(x)}</button>`).join('') : ''; sug.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { input.value = c.dataset.c; run(); })); };
        if (nameInput) nameInput.addEventListener('input', debounce(renderS, 300));
    }

    function confirmView(email) {
        card.innerHTML = `<div style="text-align:center"><img src="../assets/logo.webp" width="72" height="72" alt="CollUp" style="margin-bottom:14px;border-radius:16px">
        <h2>Confirma tu email</h2><p class="sub">Te hemos enviado un enlace a <b>${esc(email)}</b>. Ábrelo y volverás aquí con tu código reservado: lo activaremos automáticamente.</p>
        <button class="btn ghost block" id="back">Volver a entrar</button></div>`;
        icons(); $('#back').addEventListener('click', () => authView('in'));
    }

    function claimView(session) {
        const p = getPending();
        card.innerHTML = `<h2>Elige tu código de afiliado</h2><p class="sub">Es lo que identificará a todos los negocios que registres. Después de registrar tu primer negocio no se podrá cambiar.</p>
        ${!status.open ? closedNote() : ''}
        <form id="f" novalidate>
          <div class="field"><label class="f" for="name">Nombre o marca</label><input class="in" id="name" maxlength="60" value="${esc(p ? p.name : '')}"></div>
          <div class="field"><label class="f" for="code">Código</label><input class="in" id="code" maxlength="20" value="${esc(p ? p.code : '')}" autocomplete="off" style="text-transform:uppercase;letter-spacing:.08em;font-weight:700"><div class="hint" id="code-h"></div><div class="sugg" id="sugg"></div></div>
          ${conditions()}
          <label class="check" style="margin-bottom:16px"><input type="checkbox" id="terms"><span>Acepto las condiciones del programa de afiliados.</span></label>
          <div class="hint err" id="err" hidden style="margin:0 0 12px"></div>
          <button class="btn primary block" id="go" ${status.open ? '' : 'disabled'}>Activar mi cuenta</button>
          <p class="or"><button type="button" class="link-btn" id="out">Cerrar sesión (${esc(session.user.email)})</button></p>
        </form>`;
        icons();
        wireCode($('#code'), $('#code-h'), $('#sugg'), $('#name'));
        $('#out').addEventListener('click', async () => { await AffAPI.signOut(); setPending(null); authView('in'); });
        const err = $('#err');
        $('#f').addEventListener('submit', async (ev) => {
            ev.preventDefault(); err.hidden = true; const btn = $('#go');
            if (!$('#terms').checked) { err.textContent = 'Debes aceptar las condiciones.'; err.hidden = false; return; }
            try { btnBusy(btn, true, 'Activando…'); await AffAPI.claim({ code: $('#code').value, name: $('#name').value.trim(), accept: true }); setPending(null); location.href = 'panel.html'; }
            catch (e) { err.textContent = e.message; err.hidden = false; btnBusy(btn, false); }
        });
        if (p && p.code) $('#code').dispatchEvent(new Event('input'));
    }

    async function route() {
        const s = await AffAPI.session();
        if (!s) return authView('in');
        if (s.isAdmin) { location.href = 'admin.html'; return; }
        let me = null; try { me = await AffAPI.me(); } catch (e) {}
        if (me) { location.href = 'panel.html'; return; }
        const p = getPending();
        if (p && status.open) {
            try { await AffAPI.claim({ code: p.code, name: p.name, accept: true }); setPending(null); location.href = 'panel.html'; return; }
            catch (e) { toast(e.message, 'err'); }
        }
        claimView(s);
    }

    (async function init() {
        await AffAPI.ready;
        try { status = await AffAPI.status() || status; } catch (e) {}
        $('#rate-txt').textContent = pct(status.commission_rate);
        $('#months-txt').textContent = status.commission_months + ' meses';
        if (status.launch_label) $('#launch-txt').textContent = `Lanzamiento previsto: ${status.launch_label}. Los negocios que registres ahora quedan en tu cartera y, cuando la app salga, tendrás ventaja sobre los demás afiliados.`;
        if (AffAPI.demo) { const d = document.createElement('div'); d.className = 'banner warn'; d.style.cssText = 'position:fixed;right:12px;top:12px;max-width:320px;z-index:60;margin:0'; d.innerHTML = '<i data-lucide="flask-conical"></i><div class="small"><b>Modo demo</b> · datos ficticios. Entra con cualquier email; si empieza por <code>admin</code> verás el panel de administración.</div>'; document.body.append(d); }
        try { await route(); } catch (e) { authView('in'); toast(e.message, 'err'); }
        icons();
    })();
})();
