# StockLens v05

Version de producto mobile-first para la historia:

```text
Convertir una caja olvidada en un catalogo vendible.
```

v04 queda como demo tecnica de pipeline, OIDC, Bedrock, Playwright y evidencia.
v05 explora como se sentiria la aplicacion si una persona del publico se la
llevara a su casa para catalogar libros, juegos, juguetes, herramientas u
objetos guardados.

## Concepto

La app no empieza como inventario tecnico. Empieza como captura:

```text
Sacar foto
  -> nombrar objeto
  -> marcar estado
  -> ubicarlo
  -> decidir si esta listo para vender
```

## Experiencia

Tres modos:

- `Capturar`: alta rapida desde foto.
- `Organizar`: lista de objetos, pendientes y detalle.
- `Vender`: objetos listos para publicar.

Estados humanos:

- `Para revisar`
- `Listo para vender`
- `Publicado`
- `Vendido`
- `No vender`

## Probar local

```bash
npm install --prefix StockLens_v05/front_mobile
npm --prefix StockLens_v05/front_mobile run dev
```

Abrir:

```text
http://127.0.0.1:5190
```

## Despliegue En AWS

Dominio propuesto:

```text
https://mobile-v5.lens.glaciar.org
```

La infraestructura vive en:

```text
StockLens_v05/terraform
```

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

## CloudFront

v5 usa una distribucion CloudFront propia. Para la demo conviene mas que
reutilizar una distribucion existente:

- DNS, certificado, cache e invalidaciones quedan aislados.
- Los tags y el tenant son propios de v5.
- El rollback o borrado de v5 no toca v4.
- El costo de demo depende principalmente de trafico y requests, no de tener
  una distribucion adicional.
