import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);
const frontendPort = process.env.PLAYWRIGHT_FRONTEND_PORT ?? "3000";
const backendPort = process.env.PLAYWRIGHT_BACKEND_PORT ?? "3001";
const baseURL = `http://127.0.0.1:${frontendPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: 1,
  reporter: isCi ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL,
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user-a.json",
      },
      dependencies: ["setup"],
      testIgnore: [/.*\.mobile\.spec\.ts/, /.*\.user-b\.spec\.ts/],
    },
    {
      name: "chromium-desktop-user-b",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user-b.json",
      },
      dependencies: ["setup"],
      testMatch: /.*\.user-b\.spec\.ts/,
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["Pixel 7"],
        storageState: "playwright/.auth/user-a.json",
      },
      dependencies: ["setup"],
      testMatch: /.*\.mobile\.spec\.ts/,
    },
  ],
  webServer: [
    {
      command: "node dist/src/main.js",
      cwd: "../backend",
      url: `http://127.0.0.1:${backendPort}`,
      timeout: 120_000,
      reuseExistingServer: !isCi,
      env: {
        ...process.env,
        PORT: backendPort,
      },
    },
    {
      command: `npm run start -- --hostname 127.0.0.1 --port ${frontendPort}`,
      cwd: ".",
      url: `${baseURL}/login`,
      timeout: 120_000,
      reuseExistingServer: !isCi,
      env: {
        ...process.env,
        NEXT_PUBLIC_BACKEND_URL: `http://127.0.0.1:${backendPort}`,
      },
    },
  ],
});
