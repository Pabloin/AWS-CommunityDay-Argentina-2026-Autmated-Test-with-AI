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
├── StockLens_v01/
│   ├── README.md
│   ├── package.json
│   ├── src/
│   └── ...
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
|
└── personal-wallet/
    ├── README.md
    ├── index.html
    ├── styles.css
    └── script.js
```

## Versiones StockLens

| Version | Objetivo | Estado |
| --- | --- | --- |
| `StockLens_v01` | Prototipo admin/local con QR, stock y fotos | Creada |
| `StockLens_v02` | Web + mobile + backend serverless + DynamoDB + CI/CD OIDC | En progreso |
| `StockLens_v03` | Produccion hardening, observabilidad y dominio | Pendiente |

## Flujo de charla

1. Mostrar el problema: inventario fisico sin trazabilidad visual.
2. Demo v01: prototipo creado rapido con IA.
3. Demo v02: experiencia mobile en campo.
4. Explicar v03: arquitectura AWS productiva.
5. Cierre: IA acelera, pero cloud engineering lo vuelve operable.
