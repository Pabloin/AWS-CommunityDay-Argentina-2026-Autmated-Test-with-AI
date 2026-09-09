# Demo Script

## Demo base

1. Abrir `StockLens_v04`.
2. Mostrar inventario inicial.
3. Crear un activo nuevo.
4. Adjuntar fotos del producto y etiqueta.
5. Escribir texto visible de etiqueta.
6. Descargar o mostrar el QR.
7. Registrar una salida y un ajuste.
8. Mostrar historial.

## Demo mobile

1. Abrir `StockLens_v05` en vista mobile.
2. Cargar un activo rapido.
3. Adjuntar una foto.
4. Marcar estado `Revisar`.
5. Hacer entrada/salida.
6. Mostrar QR del activo.

## Transicion a AWS

Explicar que el prototipo usa almacenamiento local. En produccion, cada parte
se reemplaza por servicios administrados: S3, DynamoDB, Lambda, API Gateway,
Cognito, Textract y Bedrock.
