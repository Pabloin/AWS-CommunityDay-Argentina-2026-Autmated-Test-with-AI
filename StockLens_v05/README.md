# StockLens v05

Version de producto mobile-first para la historia:

```text
Convertir una caja olvidada en un inventario visual con QR.
```

v04 queda como demo tecnica de pipeline, OIDC, Bedrock, Playwright y evidencia.
v05 explora como se sentiria la aplicacion si una persona del publico se la
llevara a su casa para identificar libros, juegos, juguetes, herramientas u
objetos guardados con IA y QR.

## Concepto

La app no empieza como inventario tecnico. Empieza como captura:

```text
Sacar foto
  -> Bedrock sugiere que objeto es
  -> nombrar objeto
  -> marcar estado
  -> ubicarlo
  -> generar QR para encontrarlo despues
```

## Experiencia

Tres modos:

- `Clasificar`: alta rapida desde foto con sugerencias de IA.
- `Organizar`: lista de objetos, pendientes y detalle.
- `Etiquetas`: objetos identificados con ficha QR.

Estados humanos:

- `Para revisar`
- `Identificado`
- `Con QR`
- `Guardado`
- `No ubicado`

## Probar local

```bash
npm install --prefix StockLens_v05/front_mobile
npm --prefix StockLens_v05/front_mobile run dev
```

Abrir:

```text
http://127.0.0.1:5190
```

Los QR generados localmente apuntan a la app publica en
`https://mobile-v5.lens.glaciar.org`, para que puedan abrirse desde cualquier
telefono. El pipeline define esa direccion mediante `VITE_PUBLIC_APP_URL`.

## Despliegue En AWS

Dominio propuesto:

```text
https://mobile-v5.lens.glaciar.org
https://web-v5.lens.glaciar.org
```

La infraestructura vive en:

```text
StockLens_v05/terraform
```

La implementacion AWS esta separada por componentes de arquitectura:

```text
StockLens_v05/terraform/modules/
  apps/       S3 de frontends, CloudFront, ACM y Route53
  storage/    DynamoDB y S3 de fotos
  api/        Lambda, IAM de ejecucion y API Gateway
  cicd/       GitHub OIDC y roles de los pipelines
  stocklens/  composicion de los cuatro modulos
```

Produccion y staging tienen roots simetricos en
`StockLens_v05/terraform/environments/production` y
`StockLens_v05/terraform/environments/staging`. Ambos conservan states remotos
independientes. El contrato completo esta en
[`ARQUITECTURA_REQ_05.md`](ARQUITECTURA_REQ_05.md).

Staging reutiliza los buckets S3 v05 mediante prefijos propios; no crea buckets
adicionales. Lambda, API Gateway y DynamoDB si son independientes para evitar
que una prueba modifique el catalogo de produccion.

Backend:

```text
StockLens_v05/backend
```

El backend expone una API serverless:

- `GET /health`: estado de API y storage.
- `POST /analyze`: recibe una imagen como data URL, llama a Amazon Bedrock con
  un modelo multimodal y devuelve sugerencias estructuradas.
- `GET /items`: lista el catalogo compartido.
- `POST /items`: guarda metadata en DynamoDB y fotos en S3.
- `GET /items/{id}`: devuelve un objeto con URLs firmadas de sus fotos.
- `GET /items/{id}/qr`: genera el QR SVG de una ficha.
- `DELETE /test-support/items/{id}`: limpia exclusivamente items temporales con
  prefijo `TEST-L3-` creados por las pruebas de integracion.

La vista mobile consume esa API para crear objetos desde el celular. La vista
mobile tambien puede leer un QR existente para traer la ficha completa desde la
nube. La vista admin muestra desde una notebook el catalogo compartido,
incluyendo fotos, QR, tags, checklist y estado de organizacion.

Recursos principales:

- S3 + CloudFront para `mobile-v5`.
- S3 + CloudFront para `web-v5`.
- API Gateway HTTP API.
- Lambda Node.js.
- DynamoDB `stocklens-v05-items`.
- S3 privado `stocklens-v05-photos-*` para fotos, con lifecycle de demo.
- Amazon Bedrock para sugerencias desde imagen.
- Resource Group por tags para ver el stack del tenant v5 consolidado.

El state remoto usa el mismo bucket de Terraform del workshop, con key separada:

```text
s3://stocklens-terraform-state-442809140287/stocklens/v05/terraform.tfstate
```

## Pipelines

Infraestructura:

```text
.github/workflows/stocklens-v05-infra.yml
```

Aplicacion:

```text
.github/workflows/stocklens-v05-app.yml
```

Staging:

```text
.github/workflows/stocklens-v05-staging-infra.yml
.github/workflows/stocklens-v05-staging-app.yml
```

Antes de construir o desplegar, el pipeline ejecuta la capa unitaria sin
credenciales AWS:

```text
StockLens_v05/testing/layer-02-unit
```

Despues del deploy de la API se ejecuta la integracion real y se publica un
reporte JUnit:

```text
StockLens_v05/testing/layer-03-api-integration
```

Luego del deploy de staging y de esperar las invalidaciones CloudFront, Layer 4
ejecuta los recorridos completos Mobile y Web. La promocion se bloquea si falla:

```text
StockLens_v05/testing/layer-04-e2e-playwright
```

El artifact del workflow incluye videos WebM, traces, screenshots, reporte HTML
y JUnit durante 14 dias.

Secrets:

```text
STOCKLENS_V05_INFRA_ROLE_ARN
STOCKLENS_V05_APP_ROLE_ARN
```

En una cuenta nueva existe un unico paso administrativo de bootstrap:

```bash
AWS_PROFILE=sebas StockLens_v05/terraform-bootstrap/bootstrap-github-oidc-role.sh create
```

El script no ejecuta Terraform. Crea el provider OIDC si falta y un rol temporal,
le adjunta `AdministratorAccess` e imprime el ARN para
`STOCKLENS_V05_INFRA_ROLE_ARN`. Ese permiso amplio existe solamente durante el
bootstrap. El primer apply se ejecuta desde GitHub Actions. Despues, Terraform
imprime los roles definitivos:

```text
github_actions_infra_role_arn
github_actions_app_role_arn
```

Esos valores deben cargarse como secrets v5 para que la operacion quede separada
de otras versiones. Finalmente se elimina el rol temporal:

```bash
AWS_PROFILE=sebas StockLens_v05/terraform-bootstrap/bootstrap-github-oidc-role.sh destroy
```

El provider OIDC no se elimina porque es compartido por los pipelines de la
cuenta. En esta cuenta el provider se habia creado para v4; actualmente el
workflow v5 exige exclusivamente su rol oficial y ya no tiene fallback a v4.

El workflow de infraestructura corre plan/apply desde GitHub Actions. El workflow
de aplicacion corre por cambios de frontend/backend y tambien despues de un
apply exitoso de infraestructura. Resuelve el HTTP API creado por Terraform,
inyecta `VITE_API_BASE_URL` en el build mobile, genera `front_web/config.js`,
sube ambos frontends a S3, actualiza la Lambda backend e invalida CloudFront.

## CloudFront

v5 usa una distribucion CloudFront propia. Para la demo conviene mas que
reutilizar una distribucion existente:

- DNS, certificado, cache e invalidaciones quedan aislados.
- Los tags y el tenant son propios de v5.
- El rollback o borrado de v5 no toca v4.
- El costo de demo depende principalmente de trafico y requests, no de tener
  una distribucion adicional.
