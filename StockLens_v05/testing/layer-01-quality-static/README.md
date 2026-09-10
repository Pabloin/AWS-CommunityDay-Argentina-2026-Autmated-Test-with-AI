# Layer 01 - Quality Static Tests

Primera capa de testing para StockLens v05.

Esta capa no prueba comportamiento de usuario. Prueba que el cambio sea
construible, consistente y desplegable antes de gastar tiempo en IA, browser,
AWS o deploy.

## Objetivo

Fallar temprano cuando hay errores basicos:

- TypeScript roto en el frontend mobile.
- Imports o sintaxis invalida en la Lambda backend.
- Terraform mal formateado o invalido.
- Workflow apuntando a carpetas que no existen.
- Renames incompletos entre codigo, infraestructura y pipelines.

## Por que es la primera capa

Es la capa mas barata y deterministica:

```text
codigo
  -> build estatico
  -> sintaxis backend
  -> terraform fmt / validate
  -> estructura esperada
  -> recien despues tests dinamicos
```

Si falla aca, no tiene sentido correr Playwright, Postman, Bedrock ni deploy.

## Checks incluidos

### 1. Frontend mobile

```bash
npm --prefix StockLens_v05/front_mobile run build
```

Valida:

- TypeScript.
- Imports.
- Configuracion Vite.
- Bundle de produccion.

### 2. Backend Lambda

```bash
node --check StockLens_v05/backend/functions/api.mjs
```

Valida:

- Sintaxis JavaScript.
- Que el handler al menos sea parseable por Node.

No llama AWS. No llama Bedrock. No crea recursos.

### 3. Terraform

```bash
terraform -chdir=StockLens_v05/terraform fmt -check
terraform -chdir=StockLens_v05/terraform init -backend=false
terraform -chdir=StockLens_v05/terraform validate
```

Valida:

- Formato IaC.
- Sintaxis Terraform.
- Referencias internas.

`init -backend=false` evita usar el state remoto. No aplica infraestructura.

### 4. Estructura de repo

```bash
node StockLens_v05/testing/layer-01-quality-static/check-repo-structure.mjs
```

Valida rutas esperadas por el pipeline, por ejemplo:

- `StockLens_v05/front_mobile`
- `StockLens_v05/front_web`
- `StockLens_v05/backend/functions/api.mjs`
- `.github/workflows/stocklens-v05-app.yml`

Tambien detecta referencias viejas a `front_admin` en el workflow v05.

## Ejecutar todo

```bash
./StockLens_v05/testing/layer-01-quality-static/run.sh
```

## Mensaje para la charla

La IA puede ayudar a generar tests, pero la confianza empieza antes:

```text
Primero verifico que el sistema se pueda construir.
Despues verifico comportamiento.
Despues despliego.
```

Esta capa no reemplaza Playwright ni Postman. Les prepara el terreno.
