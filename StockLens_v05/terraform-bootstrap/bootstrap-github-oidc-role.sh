#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  StockLens_v05/terraform-bootstrap/bootstrap-github-oidc-role.sh create
  StockLens_v05/terraform-bootstrap/bootstrap-github-oidc-role.sh destroy

Environment variables:
  AWS_PROFILE       Optional AWS CLI profile.
  AWS_REGION        Optional AWS region. Defaults to us-east-1.
  AWS_ACCOUNT_ID    Optional AWS account id. Auto-detected if omitted.

This script only bootstraps or removes the temporary GitHub OIDC role.
The temporary role has AdministratorAccess and must be removed after bootstrap.
It does not run Terraform plan/apply.
USAGE
}

command="${1:-}"
if [[ -z "$command" || "$command" == "-h" || "$command" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "$command" != "create" && "$command" != "destroy" ]]; then
  usage >&2
  exit 2
fi

aws_region="${AWS_REGION:-us-east-1}"
role_name="stocklens-v05-github-infra-bootstrap-role"
oidc_host="token.actions.githubusercontent.com"
oidc_url="https://${oidc_host}"
thumbprint="6938fd4d98bab03faadb97b34396831e3780aea1"
policy_arn="arn:aws:iam::aws:policy/AdministratorAccess"

aws_args=(--region "$aws_region")
if [[ -n "${AWS_PROFILE:-}" ]]; then
  aws_args+=(--profile "$AWS_PROFILE")
fi

account_id="${AWS_ACCOUNT_ID:-$(aws "${aws_args[@]}" sts get-caller-identity --query Account --output text)}"
provider_arn="arn:aws:iam::${account_id}:oidc-provider/${oidc_host}"
trust_file="$(mktemp)"
created_trust_file=false

cleanup() {
  if [[ "$created_trust_file" == "true" && -f "$trust_file" ]]; then
    rm -f "$trust_file"
  fi
}
trap cleanup EXIT

write_trust_policy() {
  created_trust_file=true
  cat >"$trust_file" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "${provider_arn}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:Pabloin/AWS-CommunityDay-Argentina-2026-Autmated-Test-with-AI:*",
            "repo:pabloin/AWS-CommunityDay-Argentina-2026-Autmated-Test-with-AI:*",
            "repo:Pabloin@*/AWS-CommunityDay-Argentina-2026-Autmated-Test-with-AI@*:*",
            "repo:pabloin@*/AWS-CommunityDay-Argentina-2026-Autmated-Test-with-AI@*:*"
          ]
        }
      }
    }
  ]
}
EOF
}

ensure_oidc_provider() {
  if aws "${aws_args[@]}" iam get-open-id-connect-provider \
    --open-id-connect-provider-arn "$provider_arn" >/dev/null 2>&1; then
    echo "OIDC provider already exists: ${provider_arn}"
    return
  fi

  aws "${aws_args[@]}" iam create-open-id-connect-provider \
    --url "$oidc_url" \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list "$thumbprint" \
    --tags \
      Key=Project,Value=stocklens-v05 \
      Key=Release,Value=stocklens-v05 \
      Key=Tenant,Value=aws-cday-argentina-2026-v5 \
      Key=ManagedBy,Value=manual-bootstrap \
      Key=Purpose,Value=github-actions-oidc-bootstrap >/dev/null

  echo "Created OIDC provider: ${provider_arn}"
}

create_bootstrap_role() {
  ensure_oidc_provider
  write_trust_policy

  if aws "${aws_args[@]}" iam get-role --role-name "$role_name" >/dev/null 2>&1; then
    aws "${aws_args[@]}" iam update-assume-role-policy \
      --role-name "$role_name" \
      --policy-document "file://${trust_file}"
    echo "Updated bootstrap role trust policy: ${role_name}"
  else
    aws "${aws_args[@]}" iam create-role \
      --role-name "$role_name" \
      --assume-role-policy-document "file://${trust_file}" \
      --description "Bootstrap role for StockLens v05 Terraform GitHub Actions OIDC" \
      --tags \
        Key=Project,Value=stocklens-v05 \
        Key=Release,Value=stocklens-v05 \
        Key=Tenant,Value=aws-cday-argentina-2026-v5 \
        Key=ManagedBy,Value=manual-bootstrap \
        Key=Purpose,Value=github-actions-terraform-bootstrap >/dev/null
    echo "Created bootstrap role: ${role_name}"
  fi

  aws "${aws_args[@]}" iam attach-role-policy \
    --role-name "$role_name" \
    --policy-arn "$policy_arn"

  echo
  echo "Set this GitHub repository secret for the first infra apply:"
  echo
  echo "STOCKLENS_V05_INFRA_ROLE_ARN"
  echo "arn:aws:iam::${account_id}:role/${role_name}"
  echo
  echo "After Terraform creates stocklens-v05-github-infra-role, update the secret to:"
  echo
  echo "arn:aws:iam::${account_id}:role/stocklens-v05-github-infra-role"
}

destroy_bootstrap_role() {
  if ! aws "${aws_args[@]}" iam get-role --role-name "$role_name" >/dev/null 2>&1; then
    echo "Bootstrap role does not exist: ${role_name}"
    return
  fi

  aws "${aws_args[@]}" iam detach-role-policy \
    --role-name "$role_name" \
    --policy-arn "$policy_arn" >/dev/null 2>&1 || true

  aws "${aws_args[@]}" iam delete-role --role-name "$role_name"

  echo "Deleted bootstrap role: arn:aws:iam::${account_id}:role/${role_name}"
  echo "OIDC provider was not deleted because it can be shared by other repos/stacks:"
  echo "${provider_arn}"
}

case "$command" in
  create)
    create_bootstrap_role
    ;;
  destroy)
    destroy_bootstrap_role
    ;;
esac
