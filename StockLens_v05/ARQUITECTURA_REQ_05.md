# StockLens v05 - Requisitos de arquitectura

## Objetivo

StockLens v05 separa infraestructura, validacion y promocion para que un cambio
pueda probarse con servicios AWS reales sin afectar produccion.

## Principios

- Terraform se ejecuta exclusivamente en GitHub Actions mediante OIDC.
- Produccion y staging usan states, nombres, datos y dominios separados.
- Ambos ambientes consumen el mismo modulo Terraform.
- Un plan destructivo queda bloqueado de forma predeterminada.
- Produccion Terraform requiere `workflow_dispatch` con `apply=true`.
- Staging recibe primero la aplicacion candidata.
- Layer 3 debe pasar en staging antes de disparar produccion.
- Bedrock real es una prueba opcional porque tiene costo y salida variable.
- Ningun pipeline utiliza access keys AWS de larga duracion.
- El bootstrap de una cuenta nueva crea solamente la confianza inicial; nunca
  ejecuta Terraform y su rol temporal se elimina despues del primer apply.

## Estructura Terraform

```text
StockLens_v05/terraform/
  modules/
    apps/                         frontends, DNS y CDN
    storage/                      DynamoDB y almacenamiento de fotos
    api/                          Lambda y contrato HTTP
    cicd/                         OIDC y roles de despliegue
    stocklens/                    composicion reutilizable
  environments/
    production/                   root, moved blocks y backend de produccion
    staging/                      root y backend de staging
```

Produccion conserva el state existente:

```text
s3://stocklens-terraform-state-442809140287/stocklens/v05/terraform.tfstate
```

Staging utiliza:

```text
s3://stocklens-terraform-state-442809140287/stocklens/v05/staging/terraform.tfstate
```

Los bloques `moved` encadenan las direcciones historicas de produccion con los
modulos arquitectonicos y migran staging desde `module.stocklens.aws_*` hacia
`module.stocklens.module.<componente>.aws_*`. El plan debe mostrar cero
destrucciones. Si propone reemplazar CloudFront, DynamoDB, S3, ACM o Route53,
no debe aplicarse.

## Ambientes

| Propiedad | Staging | Produccion |
| --- | --- | --- |
| Project | `stocklens-v05-staging` | `stocklens-v05` |
| Environment | `staging` | `demo` |
| Mobile | `mobile-staging-v5.lens.glaciar.org` | `mobile-v5.lens.glaciar.org` |
| Web | `web-staging-v5.lens.glaciar.org` | `web-v5.lens.glaciar.org` |
| Alias estable Mobile | No aplica | `mobile.lens.glaciar.org` |
| Alias estable Web | No aplica | `web.lens.glaciar.org` |
| Tenant | `aws-cday-argentina-2026-v5-staging` | `aws-cday-argentina-2026-v5` |
| State key | `stocklens/v05/staging/terraform.tfstate` | `stocklens/v05/terraform.tfstate` |

Staging reutiliza los tres buckets S3 de produccion con aislamiento por prefijo:

```text
front-mobile/staging/mobile/
front-admin/staging/web/
photos/tenants/aws-cday-argentina-2026-v5-staging/
```

Los comandos `s3 sync --delete` de produccion excluyen siempre `staging/*`.
Esta regla evita que una promocion de la aplicacion elimine los objetos del
ambiente de pruebas almacenados en los mismos buckets.

Cada ambiente mantiene distribuciones CloudFront, certificado, API Gateway,
Lambda, tabla DynamoDB, roles IAM y Resource Group propios. Tambien se comparten
la hosted zone de Route53 y el proveedor OIDC de GitHub ya existente.

Los aliases sin version son el canal estable del producto. Permanecen junto a
los nombres versionados y se mueven solamente mediante el pipeline de
infraestructura. El certificado, CloudFront, Route53 y CORS deben declarar
siempre el mismo conjunto de nombres.

## Pipelines

```text
push
  -> StockLens v05 Staging Infrastructure
  -> StockLens v05 Staging Application
     -> Layer 02
     -> deploy staging
     -> Layer 03
     -> invalidar y esperar CloudFront
     -> Layer 04 Playwright E2E + evidencia
  -> StockLens v05 Application
     -> promocion a produccion
```

La Layer 04 publica siempre, incluso ante fallas, un sitio de evidencia en
`web-staging-v5.lens.glaciar.org/evidence/`. S3 conserva `index.json`, videos,
capturas, traces y el reporte HTML bajo el prefijo aislado
`staging/web/evidence/`; CloudFront permite revisarlos sin descargar artifacts
desde GitHub. El resultado de Playwright se aplica como quality gate despues de
publicar la evidencia.

Workflows:

- `.github/workflows/stocklens-v05-staging-infra.yml`
- `.github/workflows/stocklens-v05-staging-app.yml`
- `.github/workflows/stocklens-v05-infra.yml`
- `.github/workflows/stocklens-v05-app.yml`

## Bootstrap OIDC

Existe una dependencia inevitable en una cuenta vacia: GitHub Actions necesita
un rol AWS para ejecutar Terraform, pero ese rol todavia no puede ser creado por
Terraform. `StockLens_v05/terraform-bootstrap/bootstrap-github-oidc-role.sh create` resuelve
una sola vez esa confianza inicial creando el provider OIDC si falta y el rol
temporal `stocklens-v05-github-infra-bootstrap-role`.

El rol temporal usa `AdministratorAccess`: no es minimo privilegio y su alcance
se acepta solamente para resolver el momento cero. No debe quedar como rol
operativo.

El ARN temporal se carga en `STOCKLENS_V05_INFRA_ROLE_ARN`. Luego del primer
apply desde GitHub, el secret se reemplaza por el output
`github_actions_infra_role_arn` y se ejecuta el script con `destroy`. El provider
OIDC permanece porque es un recurso compartido por repositorios y versiones.
El workflow v5 no acepta roles v4 como fallback operativo.

El rol de infraestructura de produccion crea inicialmente staging. El rol de
aplicacion staging tiene un ARN deterministico y permisos limitados a sus
recursos:

```text
arn:aws:iam::442809140287:role/stocklens-v05-staging-github-actions-app-role
```

## Gate de integracion

Layer 3 crea un objeto temporal, persiste metadata y foto, vuelve a leerlos,
genera el QR y elimina ambos recursos. Si alguna assertion falla, el workflow
de staging falla y no dispara la aplicacion de produccion.

Layer 4 crea objetos temporales mediante la API y verifica recorridos reales en
Mobile y Web con Chromium. El workflow conserva video, trace, screenshots,
reporte HTML y JUnit como artifact durante 14 dias. La camara fisica queda fuera
de CI y requiere una prueba de dispositivo real.

## Regla de migracion

La primera adopcion del modulo se realiza en dos pasos:

1. Ejecutar el workflow de produccion sin apply y revisar que no haya deletes.
2. Ejecutarlo manualmente con `apply=true` y `allow_destroy=false`.

Nunca usar `terraform state mv` ni `terraform apply` desde la notebook para esta
migracion.
