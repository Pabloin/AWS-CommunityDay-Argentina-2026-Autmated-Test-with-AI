#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$repo_root/scripts/build-all.sh"

cd "$repo_root/terraform"
terraform init -backend-config=backend.hcl
terraform apply
