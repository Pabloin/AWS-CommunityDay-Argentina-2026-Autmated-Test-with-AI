#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const functionName = process.env.AI_TEST_GENERATOR_FUNCTION;
const allowFallback = process.env.ALLOW_AI_TEST_FALLBACK === "true";
const outputPath = resolve(repoRoot, "front_web/tests/ai/ai.generated.spec.ts");

const candidateFiles = [
  "front_web/src/main.tsx",
  "front_web/src/styles.css",
  "front_mobile/src/main.tsx",
  "backend/functions/api.mjs"
];

const fallbackTest = `import { test, expect } from "@playwright/test";

test("StockLens loads the main dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toContainText(/StockLens|Inventario|Activos/i);
});
`;

function readContextFiles() {
  return candidateFiles.map((path) => ({
    path,
    content: readFileSync(resolve(repoRoot, path), "utf8")
  }));
}

function writeGeneratedTest(source) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, source, "utf8");
  console.log(`Generated Playwright test written to ${outputPath}`);
}

function invokeGenerator() {
  const payload = JSON.stringify({ files: readContextFiles() });
  const responseFile = resolve(repoRoot, "ai-test-generator-response.json");

  execFileSync(
    "aws",
    [
      "lambda",
      "invoke",
      "--function-name",
      functionName,
      "--cli-binary-format",
      "raw-in-base64-out",
      "--payload",
      payload,
      responseFile
    ],
    { cwd: repoRoot, stdio: "inherit" }
  );

  const invokeResponse = JSON.parse(readFileSync(responseFile, "utf8"));
  const body = typeof invokeResponse.body === "string" ? JSON.parse(invokeResponse.body) : invokeResponse;
  if (invokeResponse.functionError) {
    throw new Error(`AI generator Lambda failed: ${invokeResponse.functionError}`);
  }
  if (invokeResponse.statusCode && invokeResponse.statusCode >= 400) {
    throw new Error(`AI generator rejected the request: ${body.error ?? invokeResponse.statusCode}`);
  }
  if (body.generated !== true) {
    throw new Error("AI generator did not produce a real generated test.");
  }
  if (!body.testSource) {
    throw new Error("AI generator response did not include testSource");
  }
  if (body.notes) console.log(body.notes);
  writeGeneratedTest(body.testSource);
}

if (!functionName) {
  if (!allowFallback) {
    throw new Error("AI_TEST_GENERATOR_FUNCTION is not set. Refusing to write fallback test because ALLOW_AI_TEST_FALLBACK is not true.");
  }
  console.log("ALLOW_AI_TEST_FALLBACK=true and AI_TEST_GENERATOR_FUNCTION is not set; writing explicit fallback smoke test.");
  writeGeneratedTest(fallbackTest);
} else {
  try {
    invokeGenerator();
  } catch (error) {
    if (!allowFallback) {
      throw error;
    }
    console.log(`ALLOW_AI_TEST_FALLBACK=true; AI test generation failed and fallback smoke test is being written. ${error.message}`);
    writeGeneratedTest(fallbackTest);
  }
}
