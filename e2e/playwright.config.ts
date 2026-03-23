import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 60000,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'pnpm --filter @refract/server dev',
      port: 4000,
      reuseExistingServer: !process.env.CI,
      cwd: '..',
    },
    {
      command: 'pnpm --filter @refract/app dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      cwd: '..',
    },
  ],
});
