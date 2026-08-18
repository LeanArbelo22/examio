import { defineConfig, devices } from "@playwright/test";

const frontendPort = 3100;
const apiPort = 55813;

process.env.NEXTAUTH_URL = `http://127.0.0.1:${frontendPort}`;
process.env.NEXTAUTH_SECRET = "examio-e2e-secret-only-for-local-tests";
process.env.EXAMIO_API_URL = `http://127.0.0.1:${apiPort}/api`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: `node e2e/support/mock-api.mjs ${apiPort}`,
      port: apiPort,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: `pnpm dev --hostname 127.0.0.1 --port ${frontendPort}`,
      port: frontendPort,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
