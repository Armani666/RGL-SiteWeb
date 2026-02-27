# DAST Quickstart (OWASP ZAP Baseline)

## Requisitos
- Docker instalado y corriendo.
- URL objetivo accesible (staging o produccion).

## Ejecucion
```powershell
powershell -ExecutionPolicy Bypass -File .\zap_baseline.ps1 -TargetUrl "https://tu-dominio.com"
```

## Salida
- `zap-report.html`
- `zap-report.md`

## Configuracion de reglas
Edita `zap-rules.conf` para ajustar severidad por regla (`FAIL`, `WARN`, `IGNORE`).

## Notas
- `zap-baseline` es no intrusivo (crawl + passive scan).
- Para pruebas mas profundas (active scan), usar ZAP Full Scan en entorno de pruebas.
