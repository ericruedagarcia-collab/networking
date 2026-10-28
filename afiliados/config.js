// CollUp · Portal de afiliados (oculto). Configuración pública.
// La clave "publishable" es pública por diseño: la seguridad real está en las políticas RLS
// y en las funciones de la migración 20261027_affiliates.sql.
window.COLLUP_AFF = Object.freeze({
    SUPABASE_URL: 'https://xikyjwxvcmiohxztglgs.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_loxgiljlYepy5uyKrxIU3w_4eqExVRM',
    SITE_URL: 'https://collup.info',
    // Modo demostración con datos ficticios en memoria. Solo funciona en localhost o archivo local
    // (?demo=1), salvo que se ponga true aquí. Déjalo en false en producción.
    ALLOW_DEMO_ON_SITE: false,
    // Estas reglas se muestran en la interfaz; los valores reales vienen de la base de datos.
    DEFAULT_RATE: 0.2,
    DEFAULT_MONTHS: 12
});
