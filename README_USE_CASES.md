# StockLens - Casos De Uso Y Motivacion

## Idea Central

StockLens nace de una pregunta simple:

```text
Que tengo, donde esta, en que estado esta y que puedo hacer ahora?
```

La aplicacion usa inventario visual, QR, fotos y evidencia para conectar objetos
fisicos con una ficha digital. Eso puede servir para un edificio, una empresa,
un evento o una casa.

La tecnologia de la demo cambia segun la version, pero el problema humano es el
mismo: hay cosas fisicas que se pierden, se olvidan, se duplican o llegan a
produccion sin suficiente confianza.

---

## Historia 1: El Edificio Y Los Espacios Comunes

Esta es la motivacion empatica original.

En un edificio hay objetos que no pertenecen a una sola persona, pero que todos
dependen de alguna manera de que esten disponibles:

- Matafuegos.
- Herramientas de mantenimiento.
- Carteles.
- Llaves.
- Elementos de seguridad.
- Insumos de uso comun.

El problema no siempre es tecnico. Muchas veces es operativo:

```text
Alguien lo movio.
Alguien lo uso.
Alguien no aviso.
Alguien cree que esta, pero no esta.
```

Entonces aparece una necesidad concreta:

- Identificar cada objeto.
- Saber donde deberia estar.
- Registrar evidencia visual.
- Controlar estado y cantidad.
- Detectar faltantes antes de que sean un problema.

En esta historia, StockLens funciona como una herramienta de control de activos
para espacios comunes.

Flujo esperado:

```text
Escanear QR del objeto
  -> ver ficha del activo
  -> confirmar ubicacion
  -> ajustar stock o estado
  -> agregar foto como evidencia
  -> dejar trazabilidad
```

Ejemplo:

```text
Matafuego CO2 5 kg
Ubicacion: Auditorio / Hall central
Estado: OK
Stock: 8
Minimo: 6
Evidencia: foto de etiqueta y ubicacion
```

Valor:

```text
Menos incertidumbre sobre objetos compartidos.
Mas evidencia antes de que algo falte.
Mas confianza para operar espacios comunes.
```

---

## Historia 2: La Casa, El Galpon Y Las Cosas Guardadas

Esta historia hace que el caso sea mas universal.

No todo el publico vive el problema de un edificio, pero casi todos tienen
inventario invisible en algun lugar:

- Libros guardados.
- Juegos de mesa.
- Rompecabezas.
- Juguetes de la infancia.
- Una patineta.
- Herramientas.
- Objetos de coleccion.
- Cosas que algun dia se podrian mover, prestar, reparar o publicar en otra app.

Antes de cualquier decision, hay una tarea previa:

```text
Ordenar lo que tengo.
Saber en que estado esta.
Sacar fotos.
Poder encontrarlo despues.
```

En esta historia, StockLens no es solamente una app de stock. Es una herramienta
para transformar cosas guardadas en un catalogo confiable.

Flujo esperado:

```text
Sacar foto del objeto
  -> cargar nombre y estado
  -> registrar ubicacion
  -> agregar observaciones
  -> generar QR
  -> escanear el QR para recuperar la ficha
```

Ejemplo:

```text
Monopoly edicion vieja
Ubicacion: Galpon
Estado: Revisar piezas
Cantidad: 1
Evidencia: foto de caja, tablero y componentes
```

Otro ejemplo:

```text
Libro: Rayuela
Ubicacion: Biblioteca
Estado: Bueno
Cantidad: 1
Evidencia: foto de tapa y lomo
```

Valor:

```text
Antes de mover algo, se gana confianza sobre el inventario.
Antes de prestar, reparar o publicar en otra app, se sabe que falta revisar.
Antes de mover objetos, se sabe donde estan.
```

---

## Puente Entre Ambas Historias

Las dos historias parecen distintas, pero comparten el mismo patron:

```text
Objetos fisicos
  -> identificacion
  -> ubicacion
  -> estado
  -> evidencia
  -> decision
```

En un edificio, la decision puede ser:

```text
Esta en condiciones?
Falta algo?
Hay que reponer?
Alguien lo movio?
```

En una casa, la decision puede ser:

```text
Esta completo?
Necesita fotos?
Donde lo guarde?
Ya tiene QR?
```

StockLens sirve porque reduce incertidumbre sobre cosas fisicas.

---

## Relacion Con Ecommerce

El ecommerce no empieza en el checkout.

Antes de publicar algo en cualquier canal externo hay que tener:

- Catalogo.
- Fotos.
- Stock.
- Estado.
- Evidencia.
- Confianza en los datos.

StockLens permite contar esa etapa previa:

```text
Primero ordeno mi inventario.
Despues genero confianza sobre los datos.
Despues, si corresponde, otra app resuelve la venta.
```

Por eso la aplicacion encaja con una charla sobre pipelines, tests e IA:

```text
Si el inventario no es confiable, el ecommerce tampoco lo es.
Si el codigo no esta validado, el deploy tampoco da confianza.
```

La demo une esos dos mundos:

- Confianza sobre objetos fisicos mediante fotos, QR y stock.
- Confianza sobre software mediante IA, Playwright y CI/CD.

---

## Mensaje Para La Charla

Una forma simple de contarlo:

```text
Todos tenemos inventario invisible.
En una empresa se llama stock.
En un edificio se llama cosas comunes.
En una casa se llama baulera.
```

StockLens convierte ese inventario invisible en algo visible, auditable y
operable.

Y el pipeline de la demo muestra como podemos desplegar esa aplicacion con mas
confianza, usando IA para proponer tests y automatizacion para validar antes de
llegar a produccion.
