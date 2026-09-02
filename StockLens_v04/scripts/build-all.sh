#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$repo_root/front_web"
npm ci --include=optional
npm rebuild esbuild
npm run build

cd "$repo_root/front_mobile"
npm ci --include=optional
npm rebuild esbuild
npm run build

cd "$repo_root/backend"
npm run check
mkdir -p dist
npm run package
