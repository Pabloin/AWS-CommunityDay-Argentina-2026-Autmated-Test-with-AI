# QA Preparation

## Preguntas probables

### Por que no guardar todo en el QR?

Porque el QR deberia ser estable y liviano. Lo ideal es guardar un ID y consultar
la ficha actualizada desde la API.

### Que pasa si no hay internet?

La PWA puede capturar datos offline y sincronizar despues. Eso requiere una cola
local y reglas de resolucion de conflictos.

### Donde se guardan las fotos?

En produccion, en Amazon S3. DynamoDB guarda metadata y referencias a las fotos.

### Como se lee una etiqueta?

Amazon Textract puede extraer texto. Luego Bedrock puede ayudar a interpretarlo,
pero un usuario deberia confirmar los datos antes de guardar.

### Es seguro para datos sensibles?

Si se usa Cognito, IAM minimo privilegio, URLs firmadas, cifrado en S3 y reglas
de retencion/auditoria.
