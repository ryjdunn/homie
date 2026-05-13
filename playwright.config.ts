import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile-safari-size",
      use: {
        ...devices["iPhone 14"],
      },
    },
    {
      name: "small-mobile",
      use: {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop-smoke",
      use: {
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
  webServer: {
    command:
      "DATABASE_URL=postgres://localhost:5432/homie_e2e HOMIE_UPLOAD_DIR=.homie/e2e-uploads HOMIE_AGENT_TOKEN=e2e-agent-token npm run dev:test",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
