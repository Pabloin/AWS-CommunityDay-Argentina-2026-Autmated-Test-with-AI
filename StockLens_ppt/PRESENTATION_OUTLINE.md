# Presentation Outline

## Titulo

StockLens: del prototipo con IA a inventario visual serverless en AWS

## Propuesta

Mostrar como una idea simple, "stock con QR", se convierte en una solucion mas
valiosa cuando se agregan fotos, identidad visual, auditoria y una arquitectura
AWS preparada para operar.

## Acto 1: La idea

- Problema: objetos fisicos, etiquetas, ubicaciones y movimientos dispersos.
- Dolor: no alcanza con saber cantidad; hay que verificar identidad y estado.
- Concepto: cada activo tiene una ficha visual consultable por QR.

## Acto 2: La magia del prototipo

- Mostrar la evolucion inicial en `StockLens_v04`.
- Crear un activo.
- Agregar fotos y texto de etiqueta.
- Generar QR.
- Registrar movimientos.

## Acto 3: La experiencia real

- Mostrar `StockLens_v05`.
- Explicar mobile-first.
- Alta desde celular.
- Acciones rapidas en campo.

## Acto 4: Despues de la magia

- Explicar por que localStorage no alcanza.
- Proponer arquitectura serverless AWS.
- S3 para fotos, DynamoDB para datos, Lambda para logica.
- Textract y Bedrock para extraer y sugerir informacion.
- GitHub Actions con OIDC para desplegar sin credenciales largas.

## Cierre

La IA acelera el primer producto, pero la experiencia, seguridad, datos,
observabilidad y despliegue siguen requiriendo criterio de arquitectura.
