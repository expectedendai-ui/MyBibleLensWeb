// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/**
 * Playwright config for the MyBibleLens marketing site.
 *
 * Local dev: `npm run dev` first (port 8765), then `npm run test`.
 * CI: webServer block boots http-server automatically.
 *
 * Visual regression baselines live in `tests/__screenshots__/`.
 * Update intentionally with `npm run test:update` and commit the new PNGs.
 */
module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["html"], ["github"]] : [["html"], ["list"]],
  snapshotDir: "./tests/__screenshots__",
  snapshotPathTemplate: "{snapshotDir}/{testFilePath}/{arg}{-projectName}{ext}",

  expect: {
    // Allow tiny color/anti-alias variance — keeps tests stable across machines
    // without masking real visual regressions. 2% diff = around a 1px text
    // reflow on a single section, which is well below "human can notice."
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, threshold: 0.25, animations: "disabled" },
  },

  use: {
    baseURL: "http://localhost:8765",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      // Chromium with an iPhone viewport — gives us mobile-layout coverage
      // without dragging WebKit into the install footprint. Real-device parity
      // is a separate concern (BrowserStack / TestFlight covers that).
      name: "mobile-iphone",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:8765",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
