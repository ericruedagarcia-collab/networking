(() => {
    const config = window.COLLUP_LEGAL || {};
    document.querySelectorAll('[data-legal-field]').forEach(element => {
        element.textContent = config[element.dataset.legalField] || 'Pendiente de confirmar por el titular';
    });
    document.querySelectorAll('form[id^="vip-"]').forEach(form => {
        const status = form.querySelector('.privacy-status');
        if (!config.ready) status.textContent = 'El registro no está disponible temporalmente. Vuelve a consultar esta página más adelante.';
    });
})();
