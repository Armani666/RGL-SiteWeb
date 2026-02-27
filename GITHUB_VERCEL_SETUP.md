# GitHub -> Vercel Setup

## 1) Secrets en GitHub
En tu repo: Settings -> Secrets and variables -> Actions -> New repository secret

Crea estos 3 secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## 2) Obtener IDs desde Vercel CLI
En tu maquina local:
```powershell
npx vercel login
npx vercel link
```
Despues abre `.vercel/project.json` y copia:
- `orgId` -> `VERCEL_ORG_ID`
- `projectId` -> `VERCEL_PROJECT_ID`

## 3) Workflow
Archivo creado:
- `.github/workflows/vercel-deploy.yml`

Comportamiento:
- Pull Request a `main`: deploy Preview
- Push a `main`: deploy Production

## 4) Recomendado en Vercel
En Project Settings -> Git, desactiva Auto Deploy si quieres que solo mande GitHub Actions.
