# Repository Structure Overview

```text
AWS-CommunityDay-Argentina-2026-Autmated-Test-with-AI/
|
├── README.md
├── README_MAIN.md
├── STRUCTURE_OVERVIEW.md
├── .gitignore
|
├── StockLens_ppt/
│   ├── README.md
│   ├── PRESENTATION_OUTLINE.md
│   ├── SPEAKER_NOTES.md
│   ├── slides/
│   │   └── slide-outline.md
│   ├── notes/
│   │   ├── demo-script.md
│   │   └── qa-preparation.md
│   ├── resources/
│   │   └── links.md
│   └── diagrams/
│       └── architecture.md
|
├── StockLens_v02/
│   ├── ARQUITECTURA_REQ_v02.md
│   ├── README.md
│   ├── front_web/
│   │   ├── package.json
│   │   └── src/
│   ├── front_mobile/
│   │   ├── package.json
│   │   └── src/
│   ├── backend/
│   │   └── functions/
│   ├── terraform/
│   └── scripts/
```

## Versiones StockLens

| Version | Objetivo | Estado |
| --- | --- | --- |
| `StockLens_v02` | Web + mobile + backend serverless + DynamoDB + CI/CD OIDC | En progreso |
| `StockLens_v03` | Produccion hardening, observabilidad y dominio | Pendiente |
| `StockLens_v04` | Pipeline con IA, Playwright, evidencia y GitHub Actions OIDC | Desplegada |
| `StockLens_v05` | Producto mobile-first con catalogo cloud y Bedrock Vision | Desplegada |

## Flujo de charla

1. Mostrar el problema: inventario fisico sin trazabilidad visual.
2. Demo v02: experiencia mobile en campo.
3. Demo v04: pipeline con IA, tests Playwright y evidencia.
4. Demo v05: producto mobile-first con catalogo cloud.
5. Cierre: IA acelera, pero cloud engineering lo vuelve operable.
