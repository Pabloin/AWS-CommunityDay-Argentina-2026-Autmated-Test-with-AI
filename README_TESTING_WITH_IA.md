# Testing con IA en StockLens

## Charla

**Dale confianza a tu codigo: crea un pipeline en AWS que genera tests con IA**

La idea central no es confiar ciegamente en tests generados por IA. La IA ayuda a
proponer casos de prueba, pero el control tecnico queda en el pipeline:

- valida que el test generado sea codigo ejecutable;
- ejecuta quality gates estaticos y dinamicos;
- guarda evidencia;
- despliega solo si las validaciones pasan.

## Capas de testing

Para ordenar la charla, conviene separar los tests en dos grandes bloques:

1. **Tests estaticos**: revisan codigo, dependencias, infraestructura y contratos
   sin ejecutar la aplicacion completa.
2. **Tests dinamicos**: ejecutan funciones, APIs, browser, base de datos o flujos
   reales de usuario.

## Tests estaticos

Los tests estaticos son baratos, rapidos y muy buenos para fallar temprano.

| Capa | Herramientas posibles | Que valida |
| --- | --- | --- |
| TypeScript / build | `tsc`, `vite build` | Tipos, imports, bundle frontend. |
| Backend build | Node.js, empaquetado Lambda | Imports, sintaxis, artefacto deployable. |
| Lint / formato | ESLint, Prettier | Consistencia y errores simples. |
| Dependencias | `npm audit`, Dependabot, Snyk, Trivy | Riesgos de supply chain. |
| Terraform | `terraform fmt`, `terraform validate`, TFLint, Checkov, tfsec | Sintaxis, convenciones y riesgos IaC. |
| Test generado por IA | validacion custom | Que importe `@playwright/test`, defina `test(...)` y no sea un fallback silencioso. |

En StockLens v04 ya existe una validacion importante: si la IA no genera un test
real y valido, el pipeline falla. El fallback local esta deshabilitado por
defecto para no simular confianza.

## Tests dinamicos

Los tests dinamicos ejecutan comportamiento real. Son mas caros que los
estaticos, pero dan mas confianza porque prueban la aplicacion viva.

| Capa | Herramientas posibles | Que valida |
| --- | --- | --- |
| Unit front | Vitest + Testing Library | Componentes, funciones puras y estados aislados. |
| Unit backend | Vitest o Jest | Handlers Lambda con eventos mock y AWS SDK mockeado. |
| API / contrato HTTP | Postman + Newman | Endpoints, status codes, payloads y errores. |
| Base de datos | DynamoDB Local, mocks o tabla real de demo | Persistencia, claves, queries y patrones de acceso. |
| End-to-end | Playwright | Browser real, UI, llamadas API, persistencia y evidencia visual. |

## Donde entra Playwright

Playwright se ejecuta desde el frontend, pero no es solamente un test de front.
Cuando apunta a una aplicacion desplegada o a un entorno integrado, es un test
**end-to-end**.

Puede validar un flujo completo:

1. abrir la app en un browser real;
2. interactuar con la UI;
3. disparar llamadas a la API;
4. persistir datos en backend;
5. volver a leerlos;
6. guardar video, trace y reporte HTML.

En StockLens v04, Playwright es el quality gate dinamico principal. La IA genera
un test Playwright, el pipeline lo valida y luego lo ejecuta. Si falla, no hay
deploy.

## Donde entra Postman

Postman no se superpone del todo con Playwright ni con unit tests.

Postman prueba la API desde afuera:

- `GET /health`
- `POST /analyze`
- `POST /items`
- `GET /items`
- `GET /items/{id}`
- `GET /items/{id}/qr`

Usado con Newman en CI, Postman funciona como test de contrato HTTP. Es una capa
intermedia: mas real que un unit test, pero mas acotada que un E2E de browser.

## Tests de base de datos

En StockLens v05 usamos DynamoDB, no una base relacional. Por eso no hablaria de
"views" como concepto central, salvo que se compare con SQL.

Para DynamoDB, lo importante es probar patrones de acceso:

- crear un item y verificar que se pueda leer por ID;
- listar items del tenant correcto;
- validar claves, atributos obligatorios y fechas;
- confirmar que las fotos guardadas en S3 quedan referenciadas desde DynamoDB;
- evitar que un tenant lea datos de otro tenant si se agrega aislamiento real.

Opciones:

- **Unit test con mocks**: rapido, sin AWS.
- **DynamoDB Local**: mas real, sigue siendo local.
- **Tabla real de demo/ephemeral**: maxima confianza, mas costo y limpieza
  obligatoria.

## Rol de la IA

La IA puede ayudar en varias capas, pero no deberia decidir sola.

Puede:

- sugerir tests Playwright a partir del codigo;
- proponer casos borde;
- explicar por que un test fallo;
- generar datos de prueba;
- sugerir assertions para API o base de datos.

No deberia:

- aprobar despliegues;
- inventar un test fallback sin avisar;
- saltarse validaciones;
- reemplazar revision humana en cambios criticos;
- escribir tests fragiles sin evidencia.

## Pipeline recomendado

Una version ordenada del pipeline seria:

```text
Push / Pull Request
  -> tests estaticos
     -> TypeScript / build
     -> lint
     -> npm audit
     -> terraform fmt / validate
  -> generacion IA
     -> Bedrock propone test Playwright
     -> validacion sintactica y estructural del test
  -> tests dinamicos
     -> unit front
     -> unit backend
     -> API tests con Newman
     -> integration tests DynamoDB/S3
     -> Playwright E2E con video/trace
  -> publicar evidencia
  -> deploy solo si todo pasa
```

## Estado actual del proyecto

### StockLens v04

Demo tecnica del pipeline:

- GitHub Actions con OIDC hacia AWS.
- Lambda generadora de tests con Amazon Bedrock.
- Test Playwright generado y validado.
- Ejecucion de Playwright.
- Evidencia en S3: videos, traces y reporte HTML.
- Admin de evidencia.
- Deploy condicionado al quality gate.

### StockLens v05

Demo de producto:

- app mobile-first;
- captura de fotos;
- analisis con Bedrock Vision;
- API Gateway + Lambda;
- DynamoDB para catalogo;
- S3 para fotos;
- admin web;
- QR por item y lectura desde mobile.

## Brecha actual

Hoy la demo ya muestra bien el concepto IA + Playwright + evidencia. Para
completar la historia de calidad por capas, conviene agregar:

- Vitest para frontend;
- Vitest o Jest para backend;
- Postman/Newman para API;
- tests de persistencia DynamoDB/S3;
- un reporte consolidado que muestre que cada capa paso o fallo.

## Mensaje para la charla

La confianza no viene de que la IA escriba tests. La confianza viene de tener un
pipeline que combina capas:

- estatico para fallar temprano;
- unitario para comportamiento aislado;
- API para contratos;
- datos para persistencia;
- E2E para flujos reales;
- evidencia para auditar.

La IA acelera la creacion de tests. El pipeline decide si el cambio merece pasar.
