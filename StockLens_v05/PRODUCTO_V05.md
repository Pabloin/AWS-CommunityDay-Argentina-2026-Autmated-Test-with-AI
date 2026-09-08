# StockLens v05 - Concepto De Producto

## Frase Guia

```text
Convertir una caja olvidada en un catalogo vendible.
```

La app esta pensada para una persona que abre el galpon, encuentra libros,
juegos, juguetes o herramientas, y quiere decidir que vender, que revisar y
donde quedo cada cosa.

## Principio De Usabilidad

No empieza con administracion. Empieza con captura.

```text
Foto primero.
IA sugiere datos despues.
Decision al final.
```

La persona no deberia sentir que esta cargando un ERP en miniatura. Deberia
sentir que esta ordenando objetos reales con el celular.

## Modos

### Capturar

Alta rapida de un objeto:

- Foto.
- Nombre sugerido por IA.
- Categoria sugerida por IA.
- Precio sugerido.
- Ubicacion.
- Estado.
- Nota.
- Etiquetas significativas.
- Checklist sugerido por categoria/imagen.

### Organizar

Vista para revisar lo que ya existe:

- Busqueda.
- Lista de objetos.
- Ficha simple.
- Estado humano.
- Checklist por categoria.
- QR descargable.

### Vender

Vista de salida:

- Objetos listos o publicados.
- Precio.
- Ubicacion.
- Texto base para publicar.
- Accion para marcar publicado.

## Estados

```text
Para revisar
Listo para vender
Publicado
Vendido
No vender
```

Son estados de decision humana, no estados tecnicos.

## Demo Sugerida

```text
1. Abrir StockLens v05.
2. Capturar "Monopoly edicion vieja".
3. Marcar estado "Para revisar".
4. Guardar ubicacion "Galpon / caja azul".
5. Completar parte del checklist.
6. Generar o descargar QR.
7. Cambiar a "Listo para vender".
8. Abrir la vista Vender.
9. Copiar texto para publicar.
```

Mensaje de cierre:

```text
En pocos minutos, una cosa perdida en el galpon se vuelve una ficha visible,
revisable y lista para decidir.
```

## URL Cloud

Cuando el pipeline de infraestructura y aplicacion hayan corrido:

```text
https://mobile-v5.lens.glaciar.org
```

## IA En Producto

La accion clave es `Analizar con IA` despues de subir una foto. La app envia la
imagen a `POST /analyze`; una Lambda llama a Amazon Bedrock y devuelve:

- nombre corto del objeto;
- categoria;
- descripcion;
- estado visible o recomendacion de revision;
- etiquetas;
- checklist;
- texto base para publicacion online.

La persona siempre revisa antes de guardar. La IA acelera la carga, no decide
por el usuario.
