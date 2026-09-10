import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = new URL("..", import.meta.url).pathname;

const requiredPaths = [
  "StockLens_v05/front_mobile/package.json",
  "StockLens_v05/front_mobile/tsconfig.json",
  "StockLens_v05/front_web/index.html",
  "StockLens_v05/front_web/config.js",
  "StockLens_v05/backend/functions/api.mjs",
  "StockLens_v05/terraform/main.tf",
  ".github/workflows/stocklens-v05-app.yml"
];

const missing = requiredPaths.filter((relativePath) => !existsSync(join(repoRoot, relativePath)));

if (missing.length) {
  console.error("Missing required project paths:");
  for (const relativePath of missing) {
    console.error(`- ${relativePath}`);
  }
  process.exit(1);
}

const workflowPath = join(repoRoot, ".github/workflows/stocklens-v05-app.yml");
const workflow = readFileSync(workflowPath, "utf8");

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

