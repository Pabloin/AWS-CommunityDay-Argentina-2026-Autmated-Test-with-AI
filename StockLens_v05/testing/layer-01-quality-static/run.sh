#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

echo "== Layer 01: static quality checks =="

echo "-- repo structure"
node StockLens_v05/testing/layer-01-quality-static/check-repo-structure.mjs

echo "-- frontend mobile build"
npm --prefix StockLens_v05/front_mobile run build

echo "-- backend syntax"
node --check StockLens_v05/backend/functions/api.mjs

echo "-- terraform fmt"
terraform -chdir=StockLens_v05/terraform fmt -check -recursive

echo "-- terraform validate"
terraform -chdir=StockLens_v05/terraform init -backend=false
terraform -chdir=StockLens_v05/terraform validate
terraform -chdir=StockLens_v05/terraform/environments/staging init -backend=false
terraform -chdir=StockLens_v05/terraform/environments/staging validate

echo "Layer 01 passed."
