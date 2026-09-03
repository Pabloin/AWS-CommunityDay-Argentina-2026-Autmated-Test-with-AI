# StockLens v04

Version simplificada para el workshop: la infraestructura y la aplicacion se
despliegan desde GitHub Actions usando OIDC contra AWS.

Ver contrato de arquitectura en `ARQUITECTURA_REQ_04.md`.

## Objetivo

Demostrar un flujo auditable donde GitHub Actions genera tests Playwright con
IA, los ejecuta y despliega solo si el quality gate pasa. Terraform tambien se
ejecuta desde GitHub Actions; no desde la notebook de la demo.

## Estructura

- `front_web/`: administracion desktop/web.
- `front_mobile/`: experiencia mobile-first de campo.
- `backend/`: API serverless para activos, movimientos y evidencia.
- `ai_test_generator/`: Lambda que usa Amazon Bedrock para proponer tests.
- `terraform/`: infraestructura AWS de la app, roles OIDC y Lambda generadora.
- `.github/workflows/stocklens-v04-infra.yml`: pipeline de infraestructura.
- `.github/workflows/stocklens-v04-app.yml`: pipeline de aplicacion.

## Dominios

- Web/admin: `stock-v4.lens.glaciar.org`
- Mobile: `mobile-v4.lens.glaciar.org`

Terraform crea un certificado ACM separado para esos dominios y registros
Route53 dentro de la hosted zone `lens.glaciar.org`.

## Terraform State

El estado remoto usa:

```text
s3://stocklens-terraform-state-442809140287/stocklens/v04/terraform.tfstate
```

`terraform/backend.hcl.example` esta preparado para GitHub Actions. No incluye
`profile`, porque las credenciales se obtienen por OIDC.

## Pipelines

### Infraestructura

Workflow:

```text
.github/workflows/stocklens-v04-infra.yml
```

Hace:

```text
checkout
configure-aws-credentials con OIDC
build local de artifacts requeridos por Terraform
terraform fmt
terraform init
terraform validate
terraform plan
terraform apply solo si workflow_dispatch apply=true
```

Secret requerido:

```text
STOCKLENS_V04_INFRA_ROLE_ARN
```

Para el primer despliegue hace falta un rol OIDC de bootstrap ya existente con
permisos suficientes para crear la infraestructura. Despues del primer apply,
Terraform expone `github_actions_infra_role_arn` y ese rol puede quedar como
valor definitivo del secret.

El bootstrap administrativo opcional esta en:

```text
scripts/bootstrap-github-oidc-role.sh
```

No corre Terraform. Solo crea el proveedor OIDC si falta, crea/actualiza el rol
bootstrap y muestra el ARN para el secret. Cuando el secret ya apunta al rol
final administrado por Terraform, se puede ejecutar en modo `destroy` para
eliminar el rol bootstrap temporal.

### Aplicacion

Workflow:

```text
.github/workflows/stocklens-v04-app.yml
```

Hace:

```text
checkout
configure-aws-credentials con OIDC
invoca Lambda ai-test-generator
Lambda llama a Amazon Bedrock
escribe front_web/tests/ai/ai.generated.spec.ts
build front_web/front_mobile/backend
instala Playwright
corre Playwright
sube video, trace y reporte HTML como artifact
sube video, trace y reporte HTML a S3
despliega a S3, Lambda y CloudFront solo si pasa
```

Secret requerido:

```text
STOCKLENS_V04_APP_ROLE_ARN
```

Variables opcionales:

```text
STOCKLENS_V04_FRONT_WEB_DISTRIBUTION_ID
STOCKLENS_V04_FRONT_MOBILE_DISTRIBUTION_ID
```

Si esas variables no existen, el workflow intenta resolver las distribuciones
por alias CloudFront.

Evidencia Playwright en S3:

```text
s3://stocklens-v04-playwright-evidence-442809140287/runs/<github_run_id>/<attempt>/
```

El workflow tambien agrega links presignados temporales a los videos `.webm` en
el summary del run.

## AI Quality Gate

La Lambda usa por defecto:

```text
us.anthropic.claude-haiku-4-5-20251001-v1:0
```

El modo por defecto es estricto:

- Si Bedrock falla, falla el workflow.
- Si la respuesta no importa `@playwright/test`, falla.
- Si la respuesta no define `test(...)`, falla.
- Si hardcodea `localhost` o `127.0.0.1`, falla.
- Si Playwright falla, no hay deploy.

Existe fallback solo para ensayo local deliberado:

```bash
ALLOW_AI_TEST_FALLBACK=true node scripts/generate-ai-tests.mjs
```

El workflow de aplicacion lo deja en `false`.

## Demo

1. Mostrar StockLens en `https://stock-v4.lens.glaciar.org`.
2. Hacer un cambio en `StockLens_v04/front_web`.
3. Commit y push a `master`.
4. Abrir GitHub Actions > `StockLens v04 Application`.
5. Mostrar el paso `Generate Playwright test with Bedrock`.
6. Abrir el archivo generado en logs/artifacts o en el commit si se decide
   persistirlo.
7. Mostrar `Run generated Playwright tests`.
8. Descargar el artifact `stocklens-v04-playwright-evidence` o abrir los links
   presignados del summary para mostrar el video de Playwright.
9. Mostrar deploy solo despues de pasar el quality gate.

Mensaje:

```text
La IA propone tests. Playwright verifica. GitHub Actions despliega con OIDC.
Terraform tambien corre en pipeline, no desde la notebook.
```
