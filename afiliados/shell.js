// Esqueleto común del panel de afiliado y del panel admin: barra lateral, navegación móvil, rutas por hash.
(function () {
    'use strict';
    const { $, $$, esc, icons, toast } = AffUI;
    window.AffShell = {
        async mount({ app, items, user, sub, badge, onSignOut, extraTop }) {
            const nav = items.map(i => `<a href="#${i.id}" data-id="${i.id}"><i data-lucide="${i.icon}"></i><span>${esc(i.label)}</span>${i.count ? `<span class="count" data-count="${i.id}"></span>` : ''}</a>`).join('');
            const mnav = items.slice(0, 5).map(i => `<a href="#${i.id}" data-id="${i.id}"><i data-lucide="${i.icon}"></i>${esc(i.short || i.label)}</a>`).join('');
            app.innerHTML = `<div class="shell"><aside class="side"><div class="brand"><img src="../assets/logo.webp" width="40" height="40" alt="CollUp"><div><b>CollUp</b><small>${esc(badge)}</small></div></div>
              <nav class="nav">${nav}</nav>
              <div class="foot">${AffUI.avatar(user.name)}<div style="min-width:0"><b>${esc(user.name)}</b><span class="muted">${esc(user.email)}</span></div><button class="icon-btn" id="so" title="Cerrar sesión" aria-label="Cerrar sesión" style="margin-left:auto"><i data-lucide="log-out"></i></button></div></aside>
              <main class="main" id="view" tabindex="-1"></main></div><nav class="mnav">${mnav}</nav>`;
            icons();
            $('#so').addEventListener('click', onSignOut);
            const view = $('#view');
            let token = 0;
            const go = async () => {
                const id = (location.hash || '').slice(1).split('?')[0] || items[0].id;
                const item = items.find(i => i.id === id) || items[0];
                $$('[data-id]', app).forEach(a => a.classList.toggle('on', a.dataset.id === item.id));
                AffUI.setTitle(item.label);
                const t = ++token;
                view.innerHTML = '<div class="grid g4"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>';
                try { await item.render(view); view.insertAdjacentHTML('beforeend', '<footer class="page-foot"><img src="../assets/logo.webp" alt=""><span>CollUp · Programa de afiliados</span><span>·</span><a href="mailto:collupworld@gmail.com">Soporte</a><span>·</span><a href="../privacidad.html">Privacidad</a></footer>'); icons(); } catch (e) { if (t === token) view.innerHTML = `<div class="empty"><i data-lucide="alert-triangle"></i><h3>No se ha podido cargar</h3><p>${esc(e.message)}</p><button class="btn" onclick="location.reload()">Reintentar</button></div>`; icons(); }
                window.scrollTo(0, 0);
            };
            window.addEventListener('hashchange', go);
            await go();
            return { reload: go, setCount(id, n) { const el = $(`[data-count="${id}"]`); if (el) el.textContent = n || ''; } };
        }
    };
    window.AffHead = (title, p, actions) => `<div class="top"><div><h1>${esc(title)}</h1>${p ? `<p>${p}</p>` : ''}</div>${actions ? `<div class="actions">${actions}</div>` : ''}</div>`;
    window.AffKpi = (label, icon, value, detail, cls) => `<div class="card kpi ${cls || ''}"><div class="l"><i data-lucide="${icon}"></i>${esc(label)}</div><div class="v">${value}</div><div class="d">${detail || '&nbsp;'}</div></div>`;
})();
