#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <user-pool-id> <email> <temporary-password> [tenant-id] [role]" >&2
  exit 2
fi

user_pool_id="$1"
email="$2"
temporary_password="$3"
tenant_id="${4:-aws-cday-argentina-2026-v4}"
role="${5:-admin}"

aws cognito-idp admin-create-user \
  --user-pool-id "$user_pool_id" \
  --username "$email" \
  --temporary-password "$temporary_password" \
  --user-attributes \
    Name=email,Value="$email" \
    Name=email_verified,Value=true \
    Name=custom:tenantId,Value="$tenant_id" \
    Name=custom:role,Value="$role"

echo "Created Cognito user $email with tenant=$tenant_id role=$role"
