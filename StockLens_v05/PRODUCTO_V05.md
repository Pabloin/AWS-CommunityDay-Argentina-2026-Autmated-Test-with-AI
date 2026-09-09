# StockLens v05 - Concepto De Producto

## Frase Guia

```text
Convertir una caja olvidada en un inventario visual con QR.
```

La app esta pensada para una persona que abre el galpon, encuentra libros,
juegos, juguetes o herramientas, y quiere identificar que es cada cosa, donde
quedo y como volver a encontrarla con un QR.

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

### Clasificar

Alta rapida de un objeto:

- Foto.
- Nombre sugerido por IA.
- Categoria sugerida por IA.
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

### Etiquetas

Vista de identificacion:

- Objetos identificados.
- Codigo QR.
- Ubicacion.
- Ficha asociada.
- Accion para marcar que ya tiene QR fisico.

## Estados

```text
Para revisar
Identificado
Con QR
Guardado
No ubicado
```

Son estados de decision humana, no estados tecnicos.

## Demo Sugerida

```text
1. Abrir StockLens v05.
2. Clasificar "Monopoly edicion vieja".
3. Marcar estado "Para revisar".
4. Guardar ubicacion "Galpon / caja azul".
5. Completar parte del checklist.
6. Generar o descargar QR.
7. Cambiar a "Con QR".
8. Abrir la vista Etiquetas.
9. Escanear el QR desde el celular para recuperar la ficha.
```

Mensaje de cierre:

```text
En pocos minutos, una cosa perdida en el galpon se vuelve una ficha visible,
revisable y facil de encontrar.
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
- texto corto para imprimir junto al QR.

La persona siempre revisa antes de guardar. La IA acelera la carga, no decide
por el usuario.
