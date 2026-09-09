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
https://admin-v5.lens.glaciar.org
```

La infraestructura vive en:

```text
StockLens_v05/terraform
```

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

La vista mobile consume esa API para crear objetos desde el celular. La vista
mobile tambien puede leer un QR existente para traer la ficha completa desde la
nube. La vista admin muestra desde una notebook el catalogo compartido,
incluyendo fotos, QR, tags, checklist y estado de organizacion.

Recursos principales:

- S3 + CloudFront para `mobile-v5`.
- S3 + CloudFront para `admin-v5`.
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

Secrets:

```text
STOCKLENS_V05_INFRA_ROLE_ARN
STOCKLENS_V05_APP_ROLE_ARN
```

Para el primer apply de infraestructura, el workflow puede reutilizar el secret
`STOCKLENS_V04_INFRA_ROLE_ARN` como bootstrap si `STOCKLENS_V05_INFRA_ROLE_ARN`
todavia no existe. Despues del primer apply, Terraform imprime:

```text
github_actions_infra_role_arn
github_actions_app_role_arn
```

Esos valores deben cargarse como secrets v5 para que la operacion quede separada
de v4.

El workflow de infraestructura corre plan/apply desde GitHub Actions. El workflow
de aplicacion corre por cambios de frontend/backend y tambien despues de un
apply exitoso de infraestructura. Resuelve el HTTP API creado por Terraform,
inyecta `VITE_API_BASE_URL` en el build mobile, genera `front_admin/config.js`,
sube ambos frontends a S3, actualiza la Lambda backend e invalida CloudFront.

## CloudFront

v5 usa una distribucion CloudFront propia. Para la demo conviene mas que
reutilizar una distribucion existente:

- DNS, certificado, cache e invalidaciones quedan aislados.
- Los tags y el tenant son propios de v5.
- El rollback o borrado de v5 no toca v4.
- El costo de demo depende principalmente de trafico y requests, no de tener
  una distribucion adicional.
