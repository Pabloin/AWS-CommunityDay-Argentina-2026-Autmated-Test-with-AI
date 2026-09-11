# Layer 04 - Playwright E2E

Valida recorridos de usuario completos sobre el ambiente desplegado. El browser
interactua con Mobile y Web mientras la preparacion y limpieza usan la API real.

## Cobertura

- Mobile abre una ficha mediante el mismo `?item=` incluido en el QR.
- Mobile muestra datos persistidos y genera una etiqueta QR descargable.
- Mobile busca el objeto desde el inventario.
- Web carga el catalogo, busca el objeto y abre su detalle.
- Web obtiene el QR desde API Gateway y enlaza la ficha Mobile.
- La API atraviesa Lambda, DynamoDB y S3 en staging.

La camara fisica no se prueba en CI porque el runner no dispone de una. Esa
capacidad requiere una prueba de dispositivo real separada.

## Evidencia

Playwright produce para cada recorrido:

- video WebM;
- trace ZIP;
- screenshot si falla;
- reporte HTML;
- resultado JUnit.

El pipeline conserva el artifact descargable de GitHub y tambien publica una
vista navegable en:

```text
https://web-staging-v5.lens.glaciar.org/evidence/
```

El visor muestra primero el resumen estructurado y los videos embebidos. Las
capturas, el reporte HTML completo y los traces quedan disponibles como
diagnostico secundario. Los archivos viven en el bucket web existente bajo
`staging/web/evidence/runs/<run-id>/<attempt>/`; no se crea otro bucket.

Los items usan el prefijo temporal `TEST-L3-E2E-` para que el endpoint de soporte
permita eliminarlos en un bloque `finally`, incluso cuando falle una assertion.

## Ejecucion

```bash
cd StockLens_v05/testing/layer-04-e2e-playwright
npm ci
npx playwright install chromium
MOBILE_BASE_URL=https://mobile-staging-v5.lens.glaciar.org \
WEB_BASE_URL=https://web-staging-v5.lens.glaciar.org \
API_BASE_URL=https://API_ID.execute-api.us-east-1.amazonaws.com \
./run.sh
```
