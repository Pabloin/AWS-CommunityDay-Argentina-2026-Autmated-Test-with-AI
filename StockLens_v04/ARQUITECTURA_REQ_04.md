# StockLens v04 - Architecture Requirements

## Proposito

Este documento es el contrato de arquitectura de StockLens v04 para el workshop
"Dale confianza a tu codigo: crea un pipeline en AWS que genera tests con IA".

v04 reemplaza la complejidad de CodePipeline/CodeBuild/CodeStar por dos
pipelines de GitHub Actions con OIDC hacia AWS:

- Pipeline de infraestructura: Terraform plan/apply.
- Pipeline de aplicacion: AI test generation, Playwright y deploy.

## Principios

- Terraform no se ejecuta desde la notebook de la demo.
- La notebook puede editar codigo, commitear y pushear, pero no aplicar infra.
- GitHub Actions es el plano de ejecucion de CI/CD.
- AWS no guarda access keys largas; GitHub asume roles por OIDC.
- Infraestructura y aplicacion tienen pipelines separados.
- La IA no decide despliegues: propone tests.
- Playwright y el pipeline deciden si se despliega.
- El fallback de tests esta apagado por defecto.
- Los recursos v04 tienen nombres, dominios, tags y tenant propios.

## Versiones

| Version | Scope | Mensaje |
| --- | --- | --- |
| v01 | Prototipo local | IA acelera prototipado. |
| v02 | App serverless + GitHub Actions simple | El prototipo llega a AWS. |
| v03 | CodePipeline/CodeBuild | Variante AWS-native, mas compleja para la demo. |
| v04 | GitHub Actions + OIDC + AI quality gate | Demo clara, auditable y ejecutable. |

## Recursos AWS

| Servicio | Uso v04 |
| --- | --- |
| S3 | Buckets privados para front web/mobile y evidencia. |
| CloudFront | HTTPS publico para frontends. |
| ACM | Certificado separado para dominios v04. |
| Route53 | Validacion DNS y alias records. |
| API Gateway HTTP API | Entrada publica del backend. |
| Lambda | API StockLens y generador de tests con IA. |
| Amazon Bedrock | Modelo que propone tests Playwright. |
| DynamoDB | Persistencia serverless. |
| Cognito | Base de autenticacion/claims. |
| IAM | Roles OIDC separados para infra y app. |
| Resource Groups | Navegacion por tags en consola. |

Servicios excluidos de v04:

- CodePipeline.
- CodeBuild.
- CodeStar Connections.

## Tags

Todos los recursos Terraform deben tener tags comunes:

```text
Event        = aws-cday-argentina-2026
Project      = stocklens-v04
Owner        = pablo-inchausti
Environment  = demo
ManagedBy    = terraform
Repository   = repository URL
Release      = stocklens-v04
Tenant       = aws-cday-argentina-2026-v4
DeploymentId = v4
CostCenter   = community-day-demo
```

Tags de componente:

```text
App       = StockLens
Version   = v04
Component = frontend | backend | database | pipeline | resource-management
Purpose   = segun el recurso
```

## Dominios

- Web/admin: `stock-v4.lens.glaciar.org`
- Mobile: `mobile-v4.lens.glaciar.org`

Terraform debe crear un certificado ACM en `us-east-1` para ambos nombres y
validarlo con Route53 en la hosted zone existente `Z05243802169NOT55L8H8`.

## Estado Terraform

Backend remoto:

```hcl
bucket       = "stocklens-terraform-state-442809140287"
key          = "stocklens/v04/terraform.tfstate"
region       = "us-east-1"
use_lockfile = true
encrypt      = true
```

No usar `profile` en el backend del pipeline. Las credenciales vienen de OIDC.
No commitear `backend.hcl`, `terraform.tfstate`, `.terraform/` ni `tfplan`.

## Pipeline De Infraestructura

Archivo:

```text
.github/workflows/stocklens-v04-infra.yml
```

Disparadores:

- `pull_request` para validar.
- `workflow_dispatch` para plan/apply manual.

Pasos:

```text
checkout
setup-terraform
configure-aws-credentials con STOCKLENS_V04_INFRA_ROLE_ARN
./scripts/build-all.sh
terraform fmt -check -recursive
terraform init -backend-config=backend.hcl.example
terraform validate
terraform plan -out=tfplan
terraform apply -auto-approve tfplan, solo si apply=true
terraform output
```

Regla: ningun `terraform apply` desde la notebook. Todo apply entra por este
workflow.

Bootstrap: el primer `STOCKLENS_V04_INFRA_ROLE_ARN` debe apuntar a un rol OIDC
ya existente con permisos suficientes. Una vez aplicada la v04, puede cambiarse
al output `github_actions_infra_role_arn`.

## Pipeline De Aplicacion

Archivo:

```text
.github/workflows/stocklens-v04-app.yml
```

Disparadores:

- `push` a `master` con cambios en `StockLens_v04/**`.
- `workflow_dispatch`.

Pasos:

```text
checkout
setup-node
configure-aws-credentials con STOCKLENS_V04_APP_ROLE_ARN
AI_TEST_GENERATOR_FUNCTION=stocklens-v04-ai-test-generator node scripts/generate-ai-tests.mjs
./scripts/build-all.sh
npm install --prefix front_web --no-save @playwright/test
npx --prefix front_web playwright install --with-deps chromium
npm --prefix front_web exec playwright test -- --config=front_web/playwright.config.ts
aws s3 sync front_web/dist s3://stocklens-v04-front-web-ACCOUNT
aws s3 sync front_mobile/dist s3://stocklens-v04-front-mobile-ACCOUNT
aws lambda update-function-code --function-name stocklens-v04-api
aws cloudfront create-invalidation
```

Regla: si falla Bedrock, validacion del test o Playwright, no hay deploy.

## AI Test Generator

Codigo:

```text
StockLens_v04/ai_test_generator/index.mjs
StockLens_v04/scripts/generate-ai-tests.mjs
```

Entradas de contexto:

```text
front_web/src/main.tsx
front_web/src/styles.css
front_mobile/src/main.tsx
backend/functions/api.mjs
```

Validaciones obligatorias:

- Debe importar `@playwright/test`.
- Debe definir `test(...)`.
- No puede hardcodear `localhost` ni `127.0.0.1`.
- Debe usar `page.goto("/")` para respetar `baseURL`.
- Debe mantenerse debajo del limite de tamanio definido en la Lambda.

## Demo

Narrativa:

```text
Cambio de codigo
  -> GitHub Actions Application
  -> Lambda ai-test-generator
  -> Amazon Bedrock
  -> test Playwright generado
  -> Playwright ejecuta
  -> deploy por OIDC si pasa
```

Demo negativa:

- Romper un selector o texto que el test espera.
- Mostrar que Playwright falla.
- Mostrar que no se ejecuta deploy.

Demo positiva:

- Corregir el cambio.
- Push a `master`.
- Mostrar el workflow verde.
- Abrir `https://stock-v4.lens.glaciar.org`.

## Excluido De v04

- Terraform apply desde PC.
- Access keys largas.
- CodePipeline/CodeBuild/CodeStar.
- Fallback automatico de tests.
- Deploy si la IA no genero un test valido.
- WAF, alarmas avanzadas y observabilidad completa.
