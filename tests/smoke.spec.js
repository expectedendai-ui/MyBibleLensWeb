// @ts-check
const { test, expect } = require("@playwright/test");
const { waitForPageReady, attachConsoleErrorWatch } = require("./utils");

test.describe("MyBibleLens marketing site — smoke", () => {
  test("loads with no console errors", async ({ page }) => {
    const getErrors = attachConsoleErrorWatch(page);
    await page.goto("/");
    await waitForPageReady(page);
    const errors = getErrors();
    expect(errors, `Console errors detected:\n${errors.join("\n")}`).toHaveLength(0);
  });

  test("hero renders the brand title + slogan + simplified shimmer line", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    await expect(page.locator(".hero-title")).toHaveText(/MyBibleLens/);
    await expect(page.locator(".hero-tagline")).toContainText("Bringing people closer to God");
    // The long Verse-to-Art / Sermon-Deck / Lens-Powered marketing paragraph
    // should be GONE — replaced with the single positioning line.
    const shimmer = page.locator(".hero-shimmer-tagline");
    await expect(shimmer).toContainText("The world's first");
    await expect(shimmer).toContainText("Bible Productivity App");
    await expect(shimmer).not.toContainText("Lens-Powered");
    await expect(shimmer).not.toContainText("Sermon Deck");
    await expect(shimmer).not.toContainText("Verse-to-Art");
  });

  test("hero order: shimmer line sits above the scroll cue", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    const shimmerTop = await page
      .locator(".hero-shimmer-tagline")
      .evaluate((el) => el.getBoundingClientRect().top);
    const cueTop = await page
      .locator(".hero-scroll-cue")
      .evaluate((el) => el.getBoundingClientRect().top);
    expect(shimmerTop).toBeLessThan(cueTop);
  });

  test("study repository renders all feature cards", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    // 8 feature cards + "Much More" + "Start Your Journey" = 10
    const cards = page.locator(".repo-card");
    await expect(cards).toHaveCount(10);
    await expect(page.locator(".repo-card", { hasText: "Mosaic" })).toBeVisible();
    await expect(page.locator(".repo-card", { hasText: "Start Your Journey" })).toBeVisible();
  });

  test("pricing section shows all 5 tiers with correct prices", async ({ page }) => {
    await page.goto("/#pricing");
    await waitForPageReady(page);
    // Filter by .pricing-tier-name (one per card) to avoid cards matching
    // each other's feature-list references ("Everything in Apostle", etc.).
    const cardFor = (tier) =>
      page.locator(".pricing-card-wrapper").filter({
        has: page.locator(".pricing-tier-name", { hasText: new RegExp(`^${tier}`) }),
      });
    await expect(cardFor("Seeker")).toContainText("Free");
    await expect(cardFor("Apostle")).toContainText("$14.99");
    await expect(cardFor("Sanctuary")).toContainText("$29.99");
    await expect(cardFor("Kingdom")).toContainText("$59.99");
    await expect(cardFor("Founding")).toContainText("$99.99");
  });

  test("no subscription / Stripe artifacts remain on the page", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    const body = (await page.locator("body").textContent()) ?? "";
    // Old pricing model leftovers — guard against accidental rollback.
    // Match price-slash patterns ($X / month) NOT feature-rate copy
    // ("1 Scripture Glow per month" is legitimate).
    expect(body, "old $7.77 monthly Apostle price should be gone").not.toMatch(/\$7\.77/);
    expect(body, "no slash-month price tags").not.toMatch(/\$\d+(\.\d+)?\s*\/\s*month/i);
    expect(body, "no slash-year price tags").not.toMatch(/\$\d+(\.\d+)?\s*\/\s*year/i);
    expect(body, "70,000-seat narrative is retired").not.toMatch(/70,000\s+seats/i);
    expect(body, "Founding $144 price is retired").not.toMatch(/founding\s+member.*\$144/i);
    expect(body, "monthly billing toggle is gone").not.toMatch(
      /monthly\s+billing|yearly\s+billing/i
    );
  });

  test("footer legal links are readable (contrast guard)", async ({ page }) => {
    await page.goto("/#download");
    await waitForPageReady(page);
    const link = page.locator(".footer-links a").first();
    await expect(link).toBeVisible();
    // Ensure the resolved text color isn't transparent or matching the bg
    const { color, bg } = await link.evaluate((el) => {
      const cs = getComputedStyle(el);
      const bgEl = el.closest("footer") || document.body;
      const bgCs = getComputedStyle(bgEl);
      return { color: cs.color, bg: bgCs.backgroundColor };
    });
    expect(color, "footer link color must be a defined value").not.toBe("rgba(0, 0, 0, 0)");
    expect(color, "footer link color must not equal footer background").not.toBe(bg);
  });

  test("about link points to the legal#about page", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    const aboutLink = page.locator(".about-link-section a");
    await expect(aboutLink).toHaveAttribute("href", "legal.html#about");
  });

  test("App Store + Google Play badges are present", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    await expect(page.getByRole("link", { name: /App Store/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Google Play/i })).toBeVisible();
  });

  test("Mosaic showcase section renders with all expected content", async ({ page }) => {
    await page.goto("/#mosaic-showcase");
    await waitForPageReady(page);
    const section = page.locator("#mosaic-showcase");
    await expect(section).toBeVisible();
    await expect(section.locator(".mosaic-showcase__title")).toContainText("Cut out images");
    await expect(section.locator(".mosaic-board")).toBeVisible();
    // Mockup tiles should all render
    const tiles = section.locator(".mosaic-tile");
    await expect(tiles).toHaveCount(6);
  });

  test("FAQ section renders all questions and each item expands", async ({ page }) => {
    await page.goto("/#faq");
    await waitForPageReady(page);
    const items = page.locator(".faq-item");
    await expect(items).toHaveCount(7);
    // Click the first one open and confirm the answer becomes visible
    const first = items.first();
    await first.locator("summary").click();
    await expect(first).toHaveAttribute("open", "");
    await expect(first.locator(".faq-item__a")).toBeVisible();
  });

  test("Floating nav exists in DOM and reveals after scrolling past hero", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    const nav = page.locator("#floating-nav");
    await expect(nav).toHaveAttribute("data-hidden", "true");
    // Scroll past the hero
    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await page.waitForTimeout(200);
    await expect(nav).toHaveAttribute("data-hidden", "false");
  });

  test("Floating nav close button dismisses for the session", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    // Scroll past hero so the nav is showing
    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await page.waitForTimeout(200);
    const nav = page.locator("#floating-nav");
    await expect(nav).toHaveAttribute("data-hidden", "false");
    // Click the × close button (need to click the button under our nav-hide CSS;
    // visibility:hidden from waitForPageReady would block click, so reset that).
    await page.addStyleTag({
      content: ".floating-nav { visibility: visible !important; opacity: 1 !important; }",
    });
    await page.locator("#floating-nav-close").click();
    await expect(nav).toHaveAttribute("data-dismissed", "true");
    // After dismissal, further scrolling should not bring it back
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
    await page.waitForTimeout(200);
    await expect(nav).toHaveAttribute("data-dismissed", "true");
    // sessionStorage flag is set
    const stored = await page.evaluate(() =>
      sessionStorage.getItem("mbl_floating_nav_dismissed_v1")
    );
    expect(stored).toBe("1");
  });

  test("Scroll halo grows as the page is scrolled", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    const fill = page.locator("#scroll-halo-fill");
    await page.evaluate(() => window.scrollTo(0, 0));
    // Trigger a synchronous dispatch so the handler runs immediately —
    // rAF-gated scroll handlers are otherwise flaky to assert on.
    await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
    await expect
      .poll(async () =>
        parseFloat((await fill.getAttribute("style"))?.match(/width:\s*([\d.]+)/)?.[1] ?? "0")
      )
      .toBeLessThan(5);
    // Scroll halfway down the page and dispatch
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight / 2);
      window.dispatchEvent(new Event("scroll"));
    });
    await expect
      .poll(async () =>
        parseFloat((await fill.getAttribute("style"))?.match(/width:\s*([\d.]+)/)?.[1] ?? "0")
      )
      .toBeGreaterThan(25);
  });
});
