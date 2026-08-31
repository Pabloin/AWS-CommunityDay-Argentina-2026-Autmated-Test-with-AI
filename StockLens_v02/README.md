# StockLens v02

Version integrada serverless de StockLens.

Ver contrato de arquitectura en `ARQUITECTURA_REQ_v02.md`.

## Objetivo

Encapsular las dos experiencias de usuario y preparar la base cloud:

- `front_web/`: administracion desktop/web.
- `front_mobile/`: experiencia mobile-first de campo.
- `backend/`: API serverless para activos, movimientos y evidencia.
- `terraform/`: infraestructura AWS.
- `terraform-bootstrap/`: bucket S3 para estado remoto de Terraform.
- `scripts/`: automatizacion local.
- `.github/workflows/stocklens-v02.yml`: CI/CD con GitHub Actions y OIDC.

## Arquitectura propuesta

- Frontends estaticos en S3 + CloudFront.
- API con API Gateway HTTP API.
- Logica con AWS Lambda.
- Stock, activos y movimientos en DynamoDB.
- Fotos/evidencia en S3.
- Usuarios con Cognito User Pool.
- Multi-tenant inicial con `default_tenant_id`.
- Dominios publicos con Route53 + ACM:
  - `stock.lens.glaciar.org`
  - `mobile.lens.glaciar.org`
- GitHub Actions autentica contra AWS con OIDC, sin access keys largas.

Nota DNS: Terraform crea la hosted zone publica `lens.glaciar.org`. Sus NS deben
estar delegados desde la zona padre. Con esa delegacion, Terraform puede crear
`stock.lens.glaciar.org` y `mobile.lens.glaciar.org`.

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
terraform apply -var="state_bucket_name=stocklens-terraform-state-ACCOUNT_ID"
```

Luego crear `terraform/backend.hcl` a partir de `backend.hcl.example`.

```bash
cd terraform
terraform init -backend-config=backend.hcl
terraform plan \
  -var="aws_region=us-east-1" \
  -var="project_name=stocklens-v02" \
  -var="github_owner=OWNER" \
  -var="github_repo=REPO" \
  -var="public_hosted_zone_name=lens.glaciar.org" \
  -var="public_hosted_zone_id=Z05243802169NOT55L8H8" \
  -var="web_domain_name=stock.lens.glaciar.org" \
  -var="mobile_domain_name=mobile.lens.glaciar.org" \
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

## CI/CD

El workflow espera estos secrets/variables en GitHub:

Secrets:

- `AWS_REGION`
- `AWS_ROLE_TO_ASSUME`

Variables:

- `STOCKLENS_FRONT_WEB_BUCKET`
- `STOCKLENS_FRONT_MOBILE_BUCKET`
- `STOCKLENS_API_FUNCTION`
- `STOCKLENS_FRONT_WEB_DISTRIBUTION_ID`
- `STOCKLENS_FRONT_MOBILE_DISTRIBUTION_ID`

Frontend runtime values:

- `VITE_STOCKLENS_API_BASE_URL`
- `VITE_STOCKLENS_COGNITO_USER_POOL_ID`
- `VITE_STOCKLENS_COGNITO_CLIENT_ID`
- `VITE_STOCKLENS_DEFAULT_TENANT_ID`

El rol se puede crear con Terraform usando `github_owner` y `github_repo`.
