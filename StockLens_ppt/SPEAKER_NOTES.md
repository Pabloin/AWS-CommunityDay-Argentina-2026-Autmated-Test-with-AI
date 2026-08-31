# Speaker Notes

## Mensaje principal

StockLens no es solo una app de stock. Es una identidad digital para activos
fisicos: fotos, etiquetas, estado, ubicacion, movimientos y QR.

## Frase corta

Inventario visual con QR: identifica activos, valida etiquetas y controla
movimientos desde una ficha unica con fotos asociadas.

## Puntos para remarcar

- El QR no guarda toda la informacion; guarda el ID del activo.
- La ficha vive en la aplicacion y luego en AWS.
- Las fotos son evidencia, no decoracion.
- Mobile es clave porque el operador esta frente al activo.
- La version productiva necesita seguridad, permisos, almacenamiento y auditoria.

## Riesgos para explicar

- Integraciones reales requieren autenticacion y permisos.
- Fotos pueden contener datos sensibles.
- OCR puede equivocarse; siempre debe haber confirmacion humana.
- Offline/sync requiere resolver conflictos.
