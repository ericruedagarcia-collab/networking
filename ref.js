/* CollUp · captura del código de afiliado (?ref=CODIGO).
 * Guarda el código en el navegador 30 días para atribuir el registro en la lista de espera.
 * Solo se guarda si el enlace trae ?ref=; no hay seguimiento de ningún otro tipo. */
(function () {
    'use strict';
    var KEY = 'collup_ref', DAYS = 30;
    function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
    try {
        var m = new URLSearchParams(location.search).get('ref');
        if (m) {
            var code = String(m).toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
            if (/^[A-Z0-9][A-Z0-9-]{2,19}$/.test(code)) localStorage.setItem(KEY, JSON.stringify({ code: code, exp: Date.now() + DAYS * 864e5 }));
        }
    } catch (e) {}
    window.COLLUP_REF = {
        get: function () { var r = read(); if (!r || !r.code || r.exp < Date.now()) { try { localStorage.removeItem(KEY); } catch (e) {} return null; } return r.code; }
    };
})();
