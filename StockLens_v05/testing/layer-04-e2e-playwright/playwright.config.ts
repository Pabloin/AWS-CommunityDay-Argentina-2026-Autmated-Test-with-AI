import { defineConfig, devices } from "@playwright/test";

const mobileUrl = process.env.MOBILE_BASE_URL;
const webUrl = process.env.WEB_BASE_URL;

if (!mobileUrl || !webUrl || !process.env.API_BASE_URL) {
  throw new Error("MOBILE_BASE_URL, WEB_BASE_URL y API_BASE_URL son obligatorios.");
}

export default defineConfig({
  testDir: "./tests",
  globalTeardown: "./global-teardown.ts",
  outputDir: "./test-results",
  timeout: 45_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
    ["json", { outputFile: "test-results/results.json" }]
  ],
  use: {
    screenshot: "only-on-failure",
    trace: "on",
    video: "on"
  },
  projects: [
    {
      name: "mobile-chromium",
      testMatch: "mobile.spec.ts",
      use: {
        ...devices["Pixel 7"],
        baseURL: mobileUrl
      }
    },
    {
      name: "web-chromium",
      testMatch: "web.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: webUrl
      }
    }
  ]
});
