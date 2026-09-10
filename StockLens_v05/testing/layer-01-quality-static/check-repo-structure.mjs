import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = new URL("../../..", import.meta.url).pathname;

const requiredPaths = [
  "StockLens_v05/front_mobile/package.json",
  "StockLens_v05/front_mobile/tsconfig.json",
  "StockLens_v05/front_web/index.html",
  "StockLens_v05/front_web/config.js",
  "StockLens_v05/backend/functions/api.mjs",
  "StockLens_v05/testing/layer-04-e2e-playwright/playwright.config.ts",
  "StockLens_v05/testing/layer-04-e2e-playwright/global-teardown.ts",
  "StockLens_v05/testing/layer-04-e2e-playwright/tests/mobile.spec.ts",
  "StockLens_v05/testing/layer-04-e2e-playwright/tests/web.spec.ts",
  "StockLens_v05/terraform/modules/stocklens/main.tf",
  "StockLens_v05/terraform/environments/production/main.tf",
  "StockLens_v05/terraform/environments/production/backend.hcl",
  "StockLens_v05/terraform/environments/staging/main.tf",
  "StockLens_v05/terraform/environments/staging/backend.hcl",
  ".github/workflows/stocklens-v05-app.yml",
  ".github/workflows/stocklens-v05-infra.yml",
  ".github/workflows/stocklens-v05-staging-app.yml",
  ".github/workflows/stocklens-v05-staging-infra.yml"
];

const missing = requiredPaths.filter((relativePath) => !existsSync(join(repoRoot, relativePath)));

if (missing.length) {
  console.error("Missing required project paths:");
  for (const relativePath of missing) {
    console.error(`- ${relativePath}`);
  }
  process.exit(1);
}

const workflowPaths = [
  ".github/workflows/stocklens-v05-app.yml",
  ".github/workflows/stocklens-v05-staging-app.yml"
];
const workflows = workflowPaths.map((path) => readFileSync(join(repoRoot, path), "utf8"));
const workflow = workflows.join("\n");

const forbiddenWorkflowReferences = ["front_admin/config.js", "aws s3 sync front_admin", "StockLens_v05/front_admin/**"];
const staleReferences = forbiddenWorkflowReferences.filter((text) => workflow.includes(text));

if (staleReferences.length) {
  console.error("Workflow still points to old v05 admin paths:");
  for (const reference of staleReferences) {
    console.error(`- ${reference}`);
  }
  process.exit(1);
}

const requiredWorkflowReferences = ["StockLens_v05/front_web/**", "> front_web/config.js", "aws s3 sync front_web"];
const missingWorkflowReferences = requiredWorkflowReferences.filter((text) => !workflow.includes(text));

if (missingWorkflowReferences.length) {
  console.error("Workflow is missing expected v05 web references:");
  for (const reference of missingWorkflowReferences) {
    console.error(`- ${reference}`);
  }
  process.exit(1);
}

console.log("Repo structure check passed.");
