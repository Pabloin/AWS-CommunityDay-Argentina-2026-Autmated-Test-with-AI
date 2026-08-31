# WalletOne

Consolidador personal de bancos, tarjetas y movimientos.

## Por que tiene sentido

La integracion directa con bancos reales puede ser compleja por seguridad,
permisos, APIs disponibles y regulaciones. Como MVP, WalletOne usa carga manual
e importacion CSV para demostrar el valor: una vista unica de gastos, ingresos,
deuda de tarjetas, categorias y alertas.

## Ejecutar

Abrir `personal-wallet/index.html` en el navegador.

## CSV soportado

```csv
fecha,cuenta,tipo,categoria,descripcion,monto
2026-08-20,Visa Santander,expense,Comida,Supermercado,53000
2026-08-21,Banco Galicia,income,Ingreso,Honorarios,350000
```
