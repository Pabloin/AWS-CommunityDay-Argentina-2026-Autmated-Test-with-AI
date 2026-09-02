import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const modelId = process.env.BEDROCK_MODEL_ID ?? "us.anthropic.claude-haiku-4-5-20251001-v1:0";
const bedrock = new BedrockRuntimeClient({});

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  };
}

function stripCodeFence(text) {
  return text
    .replace(/^```(?:ts|typescript|js|javascript)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractTextFromAnthropic(body) {
  const parsed = JSON.parse(Buffer.from(body).toString("utf8"));
  return (parsed.content ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function validatePlaywrightTest(source) {
  const trimmed = stripCodeFence(source);
  if (!trimmed.includes("@playwright/test")) {
    throw new Error("Generated source does not import @playwright/test");
  }
  if (!trimmed.includes("test(")) {
    throw new Error("Generated source does not define a Playwright test");
  }
  if (/localhost|127\.0\.0\.1/.test(trimmed)) {
    throw new Error("Generated source hardcodes a local host instead of using page.goto('/')");
  }
  if (trimmed.length > 12000) {
    throw new Error("Generated source is longer than the allowed safety limit");
  }
  return trimmed.endsWith("\n") ? trimmed : `${trimmed}\n`;
}

export async function handler(event) {
  const files = Array.isArray(event.files) ? event.files.slice(0, 12) : [];
  const context = files
    .map((file) => `FILE: ${file.path}\n${String(file.content ?? "").slice(0, 6000)}`)
    .join("\n\n---\n\n");

  if (!context) {
    return response(400, {
      generated: false,
      testPath: "front_web/tests/ai/ai.generated.spec.ts",
      error: "No source files were provided."
    });
  }

  const prompt = [
    "You are generating one concise Playwright end-to-end test for a React ecommerce/inventory app called StockLens.",
    "Return only valid TypeScript test code. Do not use markdown.",
    "Focus on realistic user-visible behavior from the provided files.",
    "Use robust locators and avoid brittle implementation details.",
    "The test must import { test, expect } from '@playwright/test'.",
    "Use page.goto('/') so Playwright uses the configured baseURL. Do not hardcode localhost, ports or deployed URLs.",
    "If authentication blocks deep flows, create a smoke/regression test that still validates the app shell.",
    "",
    context
  ].join("\n");

  try {
    const command = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1800,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }]
          }
        ]
      })
    });

    const result = await bedrock.send(command);
    const generated = validatePlaywrightTest(extractTextFromAnthropic(result.body));

    return response(200, {
      generated: true,
      modelId,
      testPath: "front_web/tests/ai/ai.generated.spec.ts",
      testSource: generated
    });
  } catch (error) {
    return response(502, {
      generated: false,
      testPath: "front_web/tests/ai/ai.generated.spec.ts",
      modelId,
      error: error.message
    });
  }
}
