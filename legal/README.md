# Estado de la preparación legal (7 de octubre de 2026)

No publicado. Marco de trabajo propuesto: España/UE, pendiente de confirmar.
Los textos son borradores y el registro queda cerrado en esta versión local hasta completar los hechos y verificar la base de datos. No prueban conformidad integral.

## Hechos auditados

- Producción: GitHub Pages, collup.info. Una ruta `/api` no ejecuta funciones allí.
- Formularios: `landing_waitlist` en Supabase; nombre/usuario, email, rol, nicho/sector. Rangos de seguidores, colaboraciones y presupuesto ahora opcionales.
- Páginas antiguas: AdSense se cargaba sin consentimiento. Sustituidas por entradas a las páginas actuales; no basta con `noindex` para proteger la privacidad.
- Retiradas las fotos de Unsplash y las cargas de SDK desde CDNs. Lucide y Supabase servidos localmente.
- La sesión Supabase ya no persiste en almacenamiento del navegador.
- Eliminado el envío desde el navegador a `/api/notify-signup`. La función opcional ahora requiere un secreto exclusivamente de servidor; no puede reactivarse desde un frontend estático. No hemos configurado ningún webhook.
- No se detectó analítica ni píxeles en las páginas actuales. Verificar siempre en producción después del despliegue.

## Datos necesarios para cerrar los textos

Titular, NIF/CIF, domicilio, país, datos registrales cuando procedan, email de privacidad, política de menores, plazo/criterio real de conservación, proveedores contratados, regiones y garantías de transferencias internacionales. Confirmar si hay planes publicitarios y bases concretas de la oferta de un mes gratuito. No inventar estos datos.

## Activación: tareas en orden

1. Completar los hechos en `legal-config.js` y los textos HTML; retirar sus avisos de borrador solo después de revisarlos. Ajustar el marco territorial si no es España.
2. Revisar el contrato/DPA de Supabase y las condiciones del alojamiento, proveedores/subencargados y accesos internacionales. No basta con elegir una región europea.
3. Auditar permisos/RLS, grants de columnas, vistas y tablas públicas relacionadas. No leer datos de terceros para probar seguridad.
4. Revisar y aplicar la migración SQL a `landing_waitlist`; no se ha ejecutado. Confirmar id/secuencia y políticas existentes. La migración no fabrica el consentimiento de registros antiguos.
5. Pruebas con registros de prueba controlados: nuevo consentimiento obligatorio y fecha del servidor; negar lectura, modificación y borrado anónimos; revisar cualquier policy alternativa. No activar sin pruebas satisfactorias.
6. Aprobar una versión definitiva del aviso y guardarla con las solicitudes. Definir quién gestiona derechos, retirada y supresión, acceso del equipo, backups y registros de incidencias. Implantar realmente el plazo de conservación, no solo declararlo.
7. Confirmar que la recogida incluye solo mayores de la edad aprobada, o implementar el procedimiento que corresponda.
8. Ajustar todas las ofertas comerciales a bases claras: duración, elegibilidad, alcance y ausencia de cobros por la lista. Si no se puede concretar, retirar la oferta antes de publicar.
9. Cambiar `ready` a `true` solo al terminar y probar el flujo; establecer `noticeVersion` definitivo. Publicar los archivos, no los borradores actuales.
10. Auditar cookies/red en producción antes y después del envío. No se necesita banner si no hay tecnologías opcionales; si se añade publicidad/analítica, implementar bloqueo previo y consentimiento por categorías con rechazo igual de visible y retirada permanente.

## Operación posterior

Mantener un registro de actividades, control de acceso de mínimo privilegio, cuentas con MFA, contratos de encargados, un procedimiento de derechos y otro de brechas. Evaluar la notificación a la autoridad en los plazos del RGPD cuando corresponda. Definir restauración, retención de copias y borrado también en los proveedores.

Esta landing no sustituye condiciones de uso de la futura app. Pagos/escrow, verificación de seguidores, contratos digitales y posibles suscripciones necesitan revisión propia antes de activar esas funciones; no prometer cobros o rentabilidad garantizados sin soporte contractual y operativo.

## Fuentes consultadas

- LSSI: https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758
- RGPD: https://eur-lex.europa.eu/eli/reg/2016/679/oj/spa
- AEPD, consentimiento: https://www.aepd.es/preguntas-frecuentes/2-tus-obligaciones-como-responsable-del-tratamiento/5-bases-legitimadoras-del-tratamiento/FAQ-0211-segun-el-rgpd-como-debe-solicitarse-el-consentimiento-de-los-interesados-para-tratar-sus-datos-personales
- AEPD, cookies: https://www.aepd.es/guias/guia-cookies.pdf
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase DPA: https://supabase.com/legal/customer-resources/data-processing-addendum
- GitHub privacidad: https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement
