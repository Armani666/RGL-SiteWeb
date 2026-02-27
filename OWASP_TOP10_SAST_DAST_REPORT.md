# Security Report (OWASP Top 10) - Rose Gold Luxury

Fecha: 2026-02-27
Alcance: `index.html`, `script.js`, `styles.css` (frontend estatico)
Metodologia: OWASP Top 10 2021 + revisiones SAST (patrones de codigo) + DAST manual basico (flujo UI/API)

## Resumen Ejecutivo

- Riesgo general actual: **Medio**
- Hallazgos criticos: **0**
- Hallazgos altos: **1** (dependiente de configuracion en Supabase/RLS)
- Mitigaciones aplicadas en este cambio:
  - CSP y politicas de navegador en `index.html`
  - Sanitizacion de URLs de imagen provenientes de datos externos en `script.js`

## Hallazgos por OWASP Top 10

### A01:2021 - Broken Access Control

- Riesgo: **Alto** (si RLS en Supabase no esta bien configurado)
- Evidencia:
  - El frontend consulta `catalog_products` con key publicable.
- Impacto:
  - Posible exposicion de datos de catalogo no previstos.
- Mitigacion recomendada:
  - Verificar politicas RLS y permisos de la vista `catalog_products`.
  - Limitar columnas de salida y usar solo datos publicos.

### A03:2021 - Injection

- Riesgo: **Bajo/Controlado**
- Evidencia:
  - Render dinamico usa `escapeHtml(...)` en campos de texto del catalogo.
- Mitigacion aplicada:
  - Sanitizacion de `src` para imagenes (`sanitizeImageUrl`) para aceptar solo `http(s)` o `assets/...`.

### A05:2021 - Security Misconfiguration

- Riesgo previo: **Medio**
- Evidencia:
  - No habia politicas de seguridad de navegador.
- Mitigacion aplicada:
  - `Content-Security-Policy`
  - `Referrer-Policy`
  - `Permissions-Policy`

### A07:2021 - Identification and Authentication Failures

- Aplicabilidad: **No aplica directamente** (sitio sin login).

### A08:2021 - Software and Data Integrity Failures

- Riesgo: **Bajo**
- Observacion:
  - Fuentes externas de Google Fonts (riesgo operativo bajo).

## DAST Manual (Checklist minimo)

1. Ingresar payloads XSS en campos de busqueda y formulario:
   - `<script>alert(1)</script>`
   - `"><img src=x onerror=alert(1)>`
2. Verificar que no se ejecute JS al renderizar productos desde API.
3. Forzar datos de imagen invalidos o esquemas no permitidos:
   - `javascript:alert(1)`
   - `data:text/html;base64,...`
4. Confirmar que solo se carguen imagenes validas o fallback local.
5. Revisar errores HTTP en consola para Supabase (`401/403/400`) y corregir RLS/columnas.

## Siguientes pasos recomendados

1. Configurar y validar politicas RLS en Supabase para `catalog_products`.
2. Implementar pipeline CI con SAST automatizado.
3. Ejecutar un escaneo DAST con OWASP ZAP contra un entorno de staging.

