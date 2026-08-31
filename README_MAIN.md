# AWS Community Day Argentina 2026 - StockLens

## Presentacion: Del prototipo con IA a una app serverless en AWS

StockLens es una aplicacion demo para mostrar como una idea creada rapido con IA
puede evolucionar hacia una solucion cloud real: inventario visual, codigos QR,
fotos de activos, auditoria de campo y trazabilidad.

## Etapas

### v01: StockLens Admin - Prototipo local

Ubicacion: `StockLens_v01/`

Primera version funcional en navegador:

- Inventario de activos y lotes.
- Generacion de codigos QR.
- Fotos asociadas al activo.
- Texto visible de etiquetas.
- Movimientos de entrada, salida y ajuste.
- Persistencia local en el navegador.

Mensaje: la IA ayuda a convertir una idea en una app usable muy rapido.

### v02: StockLens Serverless - Web, mobile y backend AWS

Ubicacion: `StockLens_v02/`

Version integrada para evolucionar el prototipo a AWS:

- `front_web/`: administracion desktop/web.
- `front_mobile/`: experiencia mobile-first para operadores.
- `backend/`: API serverless con Lambda.
- `terraform/`: DynamoDB, S3, CloudFront, ACM, Route53, API Gateway, Lambda y rol OIDC.
- `.github/workflows/`: CI/CD con GitHub Actions.

Mensaje: el valor real aparece cuando el prototipo gana backend, persistencia,
seguridad y despliegue reproducible.

### v03: StockLens Cloud - Arquitectura AWS propuesta

Ubicacion futura: `StockLens_v03/`

Proxima version sugerida:

- Frontend en S3 + CloudFront.
- API con API Gateway + Lambda.
- Datos en DynamoDB.
- Fotos en S3.
- OCR con Amazon Textract.
- Sugerencias inteligentes con Amazon Bedrock.
- Alertas con EventBridge + SNS/SES.

Mensaje: despues de la magia del prototipo, hace falta arquitectura, seguridad,
operacion, costos y automatizacion.

## Como navegar

- `StockLens_ppt/`: material de presentacion.
- `StockLens_v01/`: app web admin/local.
- `StockLens_v02/`: version serverless integrada con `front_web`, `front_mobile`, `backend` y `terraform`.
- `personal-wallet/`: idea separada, no relacionada con StockLens.

## Comandos

```bash
cd StockLens_v01
npm install
npm run dev
```

```bash
cd StockLens_v02/front_mobile
npm install
npm run dev
```
