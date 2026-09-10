# Terraform bootstrap

Esta carpeta resuelve exclusivamente el momento cero de una cuenta AWS nueva:
GitHub Actions necesita asumir un rol OIDC antes de que Terraform pueda crear
los roles definitivos.

Crear la confianza inicial:

```bash
AWS_PROFILE=sebas ./StockLens_v05/terraform-bootstrap/bootstrap-github-oidc-role.sh create
```

El comando crea el provider OIDC si no existe y un rol temporal con
`AdministratorAccess`. No ejecuta `terraform init`, `plan` ni `apply`.

Despues del primer apply desde GitHub Actions:

1. Reemplazar `STOCKLENS_V05_INFRA_ROLE_ARN` por el output
   `github_actions_infra_role_arn`.
2. Eliminar el rol temporal:

```bash
AWS_PROFILE=sebas ./StockLens_v05/terraform-bootstrap/bootstrap-github-oidc-role.sh destroy
```

El provider OIDC no se elimina porque puede ser compartido por otros pipelines.
