#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const runId = process.env.GITHUB_RUN_ID;
const attempt = process.env.GITHUB_RUN_ATTEMPT ?? "1";
const repository = process.env.GITHUB_REPOSITORY ?? "Pabloin/AWS-CommunityDay-Argentina-2026-Autmated-Test-with-AI";
const commitSha = process.env.GITHUB_SHA ?? "";
const workflowName = process.env.GITHUB_WORKFLOW ?? "StockLens v04 Application";
const status = process.env.PLAYWRIGHT_EVIDENCE_STATUS ?? "success";
const bucket = process.env.PLAYWRIGHT_EVIDENCE_BUCKET;
const prefix = process.env.PLAYWRIGHT_EVIDENCE_PREFIX;
const previousIndexPath = process.env.PLAYWRIGHT_EVIDENCE_PREVIOUS_INDEX ?? "front_admin/dist/evidence/index.previous.json";

if (!runId || !bucket || !prefix) {
  throw new Error("GITHUB_RUN_ID, PLAYWRIGHT_EVIDENCE_BUCKET and PLAYWRIGHT_EVIDENCE_PREFIX are required");
}

function walkFiles(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    return fullPath;
  });
}

function readPreviousRuns() {
  if (!existsSync(previousIndexPath)) return [];

  try {
    const parsed = JSON.parse(readFileSync(previousIndexPath, "utf8"));
    return Array.isArray(parsed.runs) ? parsed.runs : [];
  } catch {
    return [];
  }
}

function presign(key) {
  return execFileSync("aws", ["s3", "presign", `s3://${bucket}/${key}`, "--expires-in", "604800"], {
    encoding: "utf8"
  }).trim();
}

const testResultsDir = "front_web/test-results";
const videos = walkFiles(testResultsDir)
  .filter((file) => file.endsWith(".webm"))
  .map((file) => {
    const relativePath = path.relative(testResultsDir, file);
    const key = `${prefix}/test-results/${relativePath}`;
    return {
      name: path.basename(file),
      s3Key: key,
      url: presign(key)
    };
  });

const run = {
  runId,
  attempt,
  status,
  workflowName,
  commitSha,
  createdAt: new Date().toISOString(),
  githubRunUrl: `https://github.com/${repository}/actions/runs/${runId}`,
  artifactUrl: `https://github.com/${repository}/actions/runs/${runId}`,
  s3Prefix: `s3://${bucket}/${prefix}/`,
  s3ConsoleUrl: `https://s3.console.aws.amazon.com/s3/buckets/${bucket}?prefix=${encodeURIComponent(`${prefix}/`)}`,
  videos
};

const previousRuns = readPreviousRuns().filter((item) => item.runId !== run.runId);
const index = {
  generatedAt: new Date().toISOString(),
  runs: [run, ...previousRuns].slice(0, 25)
};

const evidenceDir = "front_admin/dist/evidence";
const runDir = path.join(evidenceDir, "runs", runId, attempt);
mkdirSync(runDir, { recursive: true });
writeFileSync(path.join(evidenceDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
writeFileSync(path.join(runDir, "manifest.json"), `${JSON.stringify(run, null, 2)}\n`);

console.log(`Wrote ${path.join(evidenceDir, "index.json")}`);
console.log(`Recorded ${videos.length} Playwright video(s)`);
