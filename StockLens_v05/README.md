# StockLens v05

Version de producto mobile-first para la historia:

```text
Convertir una caja olvidada en un catalogo vendible.
```

v04 queda como demo tecnica de pipeline, OIDC, Bedrock, Playwright y evidencia.
v05 explora como se sentiria la aplicacion si una persona del publico se la
llevara a su casa para catalogar libros, juegos, juguetes, herramientas u
objetos guardados.

## Concepto

La app no empieza como inventario tecnico. Empieza como captura:

```text
Sacar foto
  -> nombrar objeto
  -> marcar estado
  -> ubicarlo
  -> decidir si esta listo para vender
```

## Experiencia

Tres modos:

- `Capturar`: alta rapida desde foto.
- `Organizar`: lista de objetos, pendientes y detalle.
- `Vender`: objetos listos para publicar.

Estados humanos:

- `Para revisar`
- `Listo para vender`
- `Publicado`
- `Vendido`
- `No vender`

## Probar local

```bash
npm install --prefix StockLens_v05/front_mobile
npm --prefix StockLens_v05/front_mobile run dev
```

Abrir:

```text
http://127.0.0.1:5190
```

