#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$repo_root/front_web"
npm install
npm run build

cd "$repo_root/front_mobile"
npm install
npm run build

cd "$repo_root/backend"
npm run check
mkdir -p dist
npm run package
