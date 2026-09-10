# Layer 03 - API Integration

Tercera capa de testing para StockLens v05. Ejecuta contratos HTTP contra la API
desplegada y atraviesa servicios reales. El gate automatico usa `fetch` de
Node.js 24 y no agrega dependencias al proyecto:

```text
runner HTTP -> API Gateway -> Lambda -> DynamoDB
                              -> S3
                              -> generador QR
                              -> Bedrock (opcional)
```

## Suite core

Es deterministica y se ejecuta en cada pipeline:

- comprueba `GET /health` y CORS;
- comprueba el contrato de error `404`;
- crea un item temporal `TEST-L3-*` con una imagen PNG;
- vuelve a leerlo para confirmar persistencia en DynamoDB;
- descarga la URL firmada para confirmar persistencia en S3;
- genera y valida el QR SVG;
- elimina la foto y el registro al finalizar.

La limpieza usa `DELETE /test-support/items/{id}`. El backend rechaza cualquier
ID que no comience con `TEST-L3-`, por lo que esta ruta no puede borrar objetos
normales del catalogo.

## Suite Bedrock

Es opcional porque usa un modelo real, cuesta dinero y su contenido no es
deterministico. Valida solamente el contrato estructural: status, nombre,
categoria, tags y checklist. No exige una descripcion textual exacta.

Las colecciones `*.postman_collection.json` documentan el mismo contrato y se
pueden importar en Postman para una demo interactiva. No se instala Newman en
CI: la version disponible arrastra dependencias vulnerables, algo que seria
contradictorio con el objetivo de esta capa de calidad.

## Ejecutar

```bash
API_BASE_URL=https://sioq8my77h.execute-api.us-east-1.amazonaws.com \
  ./StockLens_v05/testing/layer-03-api-integration/run.sh
```

Para incluir Bedrock:

```bash
API_BASE_URL=https://sioq8my77h.execute-api.us-east-1.amazonaws.com \
RUN_BEDROCK_TEST=true \
  ./StockLens_v05/testing/layer-03-api-integration/run.sh
```

Los reportes JUnit se escriben por defecto en
`/tmp/stocklens-v05-layer-03` y GitHub Actions los publica como artefacto.
