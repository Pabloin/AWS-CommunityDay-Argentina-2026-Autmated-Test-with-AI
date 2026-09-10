# Layer 02 - Unit Tests

Segunda capa de testing para StockLens v05. Comprueba decisiones de negocio en
memoria, sin navegador, red, credenciales ni recursos AWS.

## Que protege

### Frontend mobile

- Estados actuales y compatibilidad con estados historicos.
- Transformacion de items recibidos desde la API.
- Lectura segura del catalogo local, sin datos de demostracion inventados.
- Generacion del identificador de un objeto.
- Extraccion del ID desde QR de StockLens, URLs y JSON de etiquetas externas.
- Aplicacion de sugerencias de IA sin pisar campos revisados por la persona.

### Backend Lambda

- Cuerpos normales y base64 enviados por API Gateway.
- Formatos y tamanos aceptados para imagenes.
- Extraccion del JSON devuelto por Bedrock.
- Limites, defaults y tipos aplicados a una sugerencia de IA.
- Normalizacion de un objeto antes de guardarlo en DynamoDB.
- Rutas de API y URL publica incluida en el QR.

## Limite de esta capa

Estos tests no afirman que Bedrock reconozca correctamente una manguera ni que
la camara pueda decodificar la etiqueta fotografiada. Prueban el comportamiento
deterministico alrededor de esas dependencias:

```text
imagen -> [Bedrock fuera de Layer 02] -> JSON -> normalizacion testeada
pixeles QR -> [jsQR fuera de Layer 02] -> payload -> ID testeado
```

La foto real de una etiqueta AGC sirve luego como fixture de integracion o E2E.
En esta capa se puede probar un payload como `{"assetId":"AGC-27824-1"}`, pero
no se debe afirmar que se leyeron los pixeles si el decoder no fue ejecutado.

## Relacion con IA generativa

La IA puede proponer nuevos casos y archivos de test. Esos candidatos deben
pasar revision y luego ejecutarse con el mismo runner deterministico. Bedrock no
decide si el pipeline queda verde: lo decide Node comparando entradas y salidas.

## Ejecutar

Requiere Node.js 24, la misma version configurada en GitHub Actions:

```bash
./StockLens_v05/testing/layer-02-unit/run.sh
```

El runner exige al menos 90% de cobertura de lineas en los dos modulos de
dominio. Si baja de ese umbral, la capa falla aunque todos los casos ejecutados
hayan quedado verdes.
