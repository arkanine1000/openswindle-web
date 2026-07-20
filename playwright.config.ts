import { defineConfig, devices } from '@playwright/test';

/**
 * Runs against the real engine in mock-LLM mode (deterministic scripted NPC,
 * fully offline) — the engine repo is expected as a sibling directory.
 *
 * The suite runs on its own ports (engine 8001, client 5175) so it can never
 * reuse a dev server pair — in particular a real-LLM engine on :8000, which
 * would burn tokens and make matches non-deterministic. Keep the client port
 * off the dev server's 5174: reuseExistingServer would otherwise adopt a
 * running dev server that talks to the wrong engine.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5175',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      // iPhone-class emulation in Chromium (the device descriptor's default
      // WebKit is not installed; Chromium covers the layout contract).
      name: 'mobile',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'uv --directory ../openswindle run uvicorn openswindle.api:app --port 8001',
      url: 'http://localhost:8001/healthz',
      env: {
        OPENSWINDLE_MOCK_LLM: 'true',
        // The test client is served from 5175, not the dev server's 5174.
        OPENSWINDLE_CORS_ORIGINS: 'http://localhost:5175',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'pnpm dev --port 5175',
      url: 'http://localhost:5175',
      env: { VITE_API_BASE: 'http://localhost:8001' },
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
