#!/usr/bin/env bash
set -euo pipefail

LAYER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for variable in MOBILE_BASE_URL WEB_BASE_URL API_BASE_URL; do
  if [[ -z "${!variable:-}" ]]; then
    echo "${variable} es obligatorio." >&2
    exit 1
  fi
done

echo "== Layer 04: Playwright E2E =="
cd "$LAYER_DIR"
npx playwright test
