#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

echo "== Layer 02: unit tests =="
node --test --experimental-test-coverage \
  --test-coverage-include=StockLens_v05/front_mobile/src/catalog-domain.ts \
  --test-coverage-lines=90 \
  StockLens_v05/testing/layer-02-unit/frontend/*.test.ts
node --test --experimental-test-coverage \
  --test-coverage-include=StockLens_v05/backend/functions/domain.mjs \
  --test-coverage-lines=90 \
  StockLens_v05/testing/layer-02-unit/backend/*.test.mjs
echo "Layer 02 passed."
