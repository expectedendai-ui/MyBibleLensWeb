// @ts-check
const { test, expect } = require("@playwright/test");
const { waitForPageReady } = require("./utils");

/**
 * Visual regression baselines for the marketing site. Every change that
 * intentionally moves pixels needs `npm run test:update` and a commit of the
 * updated PNG baselines under `tests/__screenshots__/`.
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
    await page.waitForTimeout(120);
    await expect(page.locator(".mosaic-showcase")).toHaveScreenshot("mosaic-showcase.png");
  });

  test("orb", async ({ page }) => {
    await page.goto("/#the-orb");
    await waitForPageReady(page);
    await expect(page.locator(".orb-section")).toHaveScreenshot("orb.png");
  });

  test("pricing", async ({ page }) => {
    await page.goto("/#pricing");
    await waitForPageReady(page);
    await expect(page.locator(".pricing-section")).toHaveScreenshot("pricing.png");
  });

  test("faq", async ({ page }) => {
    await page.goto("/#faq");
    await waitForPageReady(page);
    await page.waitForTimeout(120);
    await expect(page.locator(".faq-section")).toHaveScreenshot("faq.png");
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
