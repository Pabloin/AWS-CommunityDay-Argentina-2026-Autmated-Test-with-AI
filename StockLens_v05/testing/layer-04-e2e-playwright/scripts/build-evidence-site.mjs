#!/usr/bin/env node
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const layerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resultsDir = path.join(layerDir, "test-results");
const reportDir = path.join(layerDir, "playwright-report");
const outputDir = path.join(layerDir, "evidence-publish");
const viewerDir = path.join(layerDir, "viewer");
const previousIndexPath = path.join(outputDir, "index.previous.json");

const runId = required("GITHUB_RUN_ID");
const attempt = process.env.GITHUB_RUN_ATTEMPT ?? "1";
const repository = process.env.GITHUB_REPOSITORY ?? "Pabloin/AWS-CommunityDay-Argentina-2026-Autmated-Test-with-AI";
const baseUrl = required("EVIDENCE_BASE_URL").replace(/\/$/, "");
const runPath = `runs/${runId}/${attempt}`;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function walkFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

function publicFile(file, root, publicFolder) {
  const relativePath = path.relative(root, file).split(path.sep).map(encodeURIComponent).join("/");
  return {
    name: path.basename(path.dirname(file)).replaceAll("-", " "),
    url: `${baseUrl}/${runPath}/${publicFolder}/${relativePath}`
  };
}

function readTests() {
  const jsonPath = path.join(resultsDir, "results.json");
  if (!existsSync(jsonPath)) return [];

  const payload = JSON.parse(readFileSync(jsonPath, "utf8"));
  const tests = [];

  function visitSuite(suite, parents = []) {
    const titles = suite.title ? [...parents, suite.title] : parents;
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const result = test.results?.at(-1);
        tests.push({
          title: [...titles, spec.title].filter(Boolean).join(" / "),
          project: test.projectName ?? test.projectId ?? "browser",
          status: result?.status ?? "skipped",
          durationMs: result?.duration ?? 0,
          error: (result?.error?.message ?? result?.errors?.[0]?.message)?.split("\n")[0] ?? null
        });
      }
    }
    for (const child of suite.suites ?? []) visitSuite(child, titles);
  }

  for (const suite of payload.suites ?? []) visitSuite(suite);
  return tests;
}

function readPreviousRuns() {
  if (!existsSync(previousIndexPath)) return [];
  try {
    const payload = JSON.parse(readFileSync(previousIndexPath, "utf8"));
    return Array.isArray(payload.runs) ? payload.runs : [];
  } catch {
    return [];
  }
}

mkdirSync(outputDir, { recursive: true });
const previousRuns = readPreviousRuns();
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
cpSync(viewerDir, outputDir, { recursive: true });

const runOutputDir = path.join(outputDir, runPath);
if (existsSync(reportDir)) cpSync(reportDir, path.join(runOutputDir, "report"), { recursive: true });
if (existsSync(resultsDir)) cpSync(resultsDir, path.join(runOutputDir, "results"), { recursive: true });

const resultFiles = walkFiles(resultsDir);
const run = {
  runId,
  attempt,
  status: process.env.LAYER_04_STATUS ?? "unknown",
  workflow: process.env.GITHUB_WORKFLOW ?? "StockLens v05 Staging Application",
  commitSha: process.env.GITHUB_SHA ?? "",
  createdAt: new Date().toISOString(),
  githubUrl: `https://github.com/${repository}/actions/runs/${runId}`,
  reportUrl: `${baseUrl}/${runPath}/report/index.html`,
  tests: readTests(),
  videos: resultFiles.filter((file) => file.endsWith(".webm")).map((file) => publicFile(file, resultsDir, "results")),
  screenshots: resultFiles.filter((file) => file.endsWith(".png")).map((file) => publicFile(file, resultsDir, "results")),
  traces: resultFiles.filter((file) => file.endsWith("trace.zip")).map((file) => publicFile(file, resultsDir, "results"))
};

const runs = [run, ...previousRuns.filter((previous) => previous.runId !== runId)].slice(0, 20);
writeFileSync(
  path.join(outputDir, "index.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), runs }, null, 2)}\n`
);
writeFileSync(path.join(runOutputDir, "manifest.json"), `${JSON.stringify(run, null, 2)}\n`);

console.log(`Prepared evidence for run ${runId}: ${run.tests.length} tests, ${run.videos.length} videos.`);
