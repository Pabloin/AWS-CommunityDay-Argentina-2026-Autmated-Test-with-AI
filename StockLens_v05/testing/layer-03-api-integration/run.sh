#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
LAYER_DIR="$ROOT_DIR/StockLens_v05/testing/layer-03-api-integration"
REPORT_DIR="${REPORT_DIR:-/tmp/stocklens-v05-layer-03}"

if [[ -z "${API_BASE_URL:-}" ]]; then
  echo "API_BASE_URL es obligatorio. Ejemplo: API_BASE_URL=https://api.example ./run.sh" >&2
  exit 1
fi

mkdir -p "$REPORT_DIR"
API_BASE_URL="${API_BASE_URL%/}"

echo "== Layer 03: API integration =="
API_BASE_URL="$API_BASE_URL" \
RUN_BEDROCK_TEST="${RUN_BEDROCK_TEST:-false}" \
JUNIT_REPORT_FILE="$REPORT_DIR/core.xml" \
  node "$LAYER_DIR/run-api-integration.mjs"

echo "Layer 03 passed. Reports: $REPORT_DIR"
