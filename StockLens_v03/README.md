# StockLens v03

Version workshop de StockLens con pipeline AWS que genera y ejecuta tests con IA.

Ver contrato de arquitectura en `ARQUITECTURA_REQ_v03.md`.

## Objetivo

Mostrar como una app de ecommerce/inventario puede ganar confianza antes del
despliegue con un pipeline que crea tests Playwright asistidos por IA.

- `front_web/`: administracion desktop/web.
- `front_mobile/`: experiencia mobile-first de campo.
- `backend/`: API serverless para activos, movimientos y evidencia.
- `ai_test_generator/`: Lambda que usa Amazon Bedrock para proponer tests.
- `terraform/`: infraestructura AWS.
- `terraform-bootstrap/`: bucket S3 para estado remoto de Terraform.
- `scripts/`: automatizacion local.
- `buildspec-quality.yml`: build, generacion de tests IA y quality gate.
- `buildspec-deploy.yml`: despliegue si el quality gate pasa.

## Arquitectura propuesta

- Frontends estaticos en S3 + CloudFront.
- API con API Gateway HTTP API.
- Logica con AWS Lambda.
- Stock, activos y movimientos en DynamoDB.
- Fotos/evidencia en S3.
- Usuarios con Cognito User Pool.
- AWS CodePipeline como orquestador.
- AWS CodeBuild para build, test Playwright y deploy.
- Lambda + Amazon Bedrock para generar tests a partir del codigo.
- Multi-tenant inicial con `default_tenant_id`.
- Dominios publicos con Route53 + ACM:
  - `stock-v3.lens.glaciar.org`
  - `mobile-v3.lens.glaciar.org`
- CodeStar Connections conecta el repo GitHub con CodePipeline.

Nota DNS: Terraform crea la hosted zone publica `lens.glaciar.org`. Sus NS deben
estar delegados desde la zona padre. Con esa delegacion, Terraform puede crear
`stock-v3.lens.glaciar.org` y `mobile-v3.lens.glaciar.org`.

## Ejecutar front web

```bash
cd front_web
npm install
npm run dev
```

## Ejecutar front mobile

```bash
cd front_mobile
npm install
npm run dev
```

## Backend local

La Lambda esta escrita como modulo simple en `backend/functions/api.mjs`.
Por ahora sirve como contrato inicial para la infraestructura y la demo.

## Infraestructura

Bootstrap del bucket de estado:

```bash
cd terraform-bootstrap
terraform init
terraform apply -var="state_bucket_name=stocklens-terraform-state-442809140287"
```

Luego crear `terraform/backend.hcl` a partir de `backend.hcl.example`.

```bash
cd terraform
terraform init -backend-config=backend.hcl
terraform plan \
  -var="aws_region=us-east-1" \
  -var="project_name=stocklens-v03" \
  -var="github_owner=OWNER" \
  -var="github_repo=REPO" \
  -var="public_hosted_zone_name=lens.glaciar.org" \
  -var="public_hosted_zone_id=Z05243802169NOT55L8H8" \
  -var="web_domain_name=stock-v3.lens.glaciar.org" \
  -var="mobile_domain_name=mobile-v3.lens.glaciar.org" \
  -var="codestar_connection_arn=arn:aws:codestar-connections:REGION:ACCOUNT:connection/ID" \
  -var="github_oidc_provider_arn=arn:aws:iam::442809140287:oidc-provider/token.actions.githubusercontent.com"
```

Ese archivo queda ignorado por git porque puede contener profile o datos locales.
La zona publica `lens.glaciar.org` ya existe en la cuenta `sebas`; Terraform la
consume por ID y no crea una hosted zone nueva.

El lock del estado usa `use_lockfile = true` del backend S3. No se usa tabla
DynamoDB para lock de Terraform; DynamoDB queda reservado para datos de la app.

## Crear usuario demo

Despues de aplicar Terraform, usar el output `cognito_user_pool_id`:

```bash
./scripts/create-demo-user.sh USER_POOL_ID admin@example.com 'TemporalPass123' aws-cday-argentina-2026 admin
```

## Pipeline v3

Flujo principal:

```text
GitHub push a master
  -> CodePipeline Source
  -> CodeBuild AIQualityGate
       -> Lambda ai-test-generator
       -> Amazon Bedrock
       -> front_web/tests/ai/ai.generated.spec.ts
       -> npm build + Playwright
  -> CodeBuild Deploy
       -> S3 frontends
       -> Lambda API update
       -> CloudFront invalidations
```

Antes de aplicar Terraform, crear o reutilizar una conexion GitHub en
Developer Tools > Connections y pasar su ARN con `codestar_connection_arn`.
Si esa variable queda vacia, Terraform crea los recursos de soporte pero no
crea el `aws_codepipeline`; esto permite probar la infraestructura base sin
tener todavia la conexion aprobada.

La Lambda usa por defecto `us.anthropic.claude-haiku-4-5-20251001-v1:0`. Se puede
cambiar con `bedrock_model_id`.

El modo por defecto es estricto: si Bedrock falla, si la Lambda no devuelve un
test real o si el test no pasa, el quality gate falla y no hay deploy. Existe un
fallback local solo para ensayos controlados, pero hay que habilitarlo
deliberadamente con `ALLOW_AI_TEST_FALLBACK=true`; el `buildspec-quality.yml`
lo deja en `false`.
