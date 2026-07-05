// @ts-check
const { test, expect } = require("@playwright/test");
const { waitForPageReady, settleLazyFlows, waitForStableBox } = require("./utils");

/**
 * Visual regression baselines for the marketing site. Every change that
 * intentionally moves pixels needs `npm run test:update` and a commit of the
 * updated PNG baselines under `tests/__screenshots__/`.
 *
 * IMPORTANT — local-only suite:
 * Pixel snapshots here are captured on the developer's machine (macOS). Linux
 * Chromium in CI renders text at different sub-pixel heights, which not only
 * shifts pixels but changes the section's *measured height* — so the diff
 * machinery fails before it even runs ("Expected 1440×948, received 1440×979").
 *
 * Until we have Linux-rendered baselines (captured via Docker + Playwright's
 * official `mcr.microsoft.com/playwright` image, then committed alongside the
 * macOS PNGs in platform-specific subfolders), CI runs only the behavior /
 * smoke suite. Run this suite locally with `npm run test:visual` before any
 * intentional UI change to confirm what moved.
 */
test.describe("Visual regression — index.html", () => {
  // Note: a single full-page screenshot is too volatile to be useful
  // (scroll-trigger timing varies during capture). Per-section snapshots are
  // both more stable and more diagnostic — if pricing breaks, only the
  // pricing snapshot turns red.

  test("hero", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    await expect(page.locator(".hero")).toHaveScreenshot("hero.png");
  });

  test("repository", async ({ page }) => {
    await page.goto("/#repository");
    await waitForPageReady(page);
    await page.waitForTimeout(100);
    await expect(page.locator(".repo-section")).toHaveScreenshot("repository.png");
  });

  test("mosaic showcase", async ({ page }) => {
    await page.goto("/#mosaic-showcase");
    await waitForPageReady(page);
    await settleLazyFlows(page);
    const section = page.locator(".mosaic-showcase");
    await section.scrollIntoViewIfNeeded();
    await waitForStableBox(page, section);
    await expect(section).toHaveScreenshot("mosaic-showcase.png", { timeout: 15000 });
  });

  test("pricing", async ({ page }) => {
    await page.goto("/#pricing");
    await waitForPageReady(page);
    await settleLazyFlows(page);
    const section = page.locator(".pricing-section");
    await waitForStableBox(page, section);
    await expect(section).toHaveScreenshot("pricing.png", { timeout: 15000 });
  });

  test("faq", async ({ page }) => {
    await page.goto("/#faq");
    await waitForPageReady(page);
    await settleLazyFlows(page);
    const section = page.locator(".faq-section");
    await waitForStableBox(page, section);
    await expect(section).toHaveScreenshot("faq.png", { timeout: 15000 });
  });

  test("about + footer", async ({ page }, testInfo) => {
    // The mobile footer screenshot is genuinely flaky due to font subpixel
    // rendering on a small text-heavy section. The contrast smoke test
    // ("footer legal links are readable") covers the actual regression risk
    // (invisible text) without the pixel-precision cost.
    test.skip(
      testInfo.project.name === "mobile-iphone",
      "footer is text-heavy + small — contrast smoke test covers mobile risk"
    );
    await page.goto("/#download");
    await waitForPageReady(page);
    await expect(page.locator(".footer-section")).toHaveScreenshot("footer.png");
  });
});
