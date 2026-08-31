# AWS Community Day Argentina 2026 - StockLens

Repositorio de demo para la charla: crear una aplicacion con IA y evolucionarla
hacia una arquitectura AWS.

## Apps

- `StockLens_v01/`: app admin/local con inventario, QR, fotos y movimientos.
- `StockLens_v02/`: version serverless con `front_web`, `front_mobile`, `backend`, `terraform` y CI/CD OIDC.
- `StockLens_ppt/`: material de presentacion.
- `personal-wallet/`: idea separada de wallet personal consolidada.

## Documentacion

- `README_MAIN.md`: guia principal de la charla.
- `STRUCTURE_OVERVIEW.md`: mapa de carpetas y versiones.

## Ejecutar StockLens v01

```bash
cd StockLens_v01
npm install
npm run dev
```

## Ejecutar StockLens v02

```bash
cd StockLens_v02/front_mobile
npm install
npm run dev
```
