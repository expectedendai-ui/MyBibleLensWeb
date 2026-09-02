// @ts-check
const { test, expect } = require("@playwright/test");
const { waitForPageReady, settleLazyFlows, attachConsoleErrorWatch } = require("./utils");

async function prepareAboutCanvas(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto("/legal.html#about");
  await page.addStyleTag({
    content:
      ".hero-photo-card, .hero-cursor { animation: none !important; opacity: 1 !important; }",
  });
}

test.describe("MyBibleLens marketing site — smoke", () => {
  test("loads with no console errors", async ({ page }) => {
    const getErrors = attachConsoleErrorWatch(page);
    await page.goto("/");
    await waitForPageReady(page);
    const errors = getErrors();
    expect(errors, `Console errors detected:\n${errors.join("\n")}`).toHaveLength(0);
  });

  test("publishes one canonical application identity", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://mybiblelens.us/"
    );
    const schema = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .evaluate((element) => JSON.parse(element.textContent || "{}"));

    expect(schema["@id"]).toBe("https://mybiblelens.us/#application");
    expect(schema.sameAs).toEqual(
      expect.arrayContaining([
        "https://www.wikidata.org/wiki/Q141251174",
        "https://apps.apple.com/us/app/mybiblelens/id6764069602",
        "https://www.instagram.com/mybiblelens/",
      ])
    );
    expect(schema.author["@id"]).toBe("https://expectedend.co/denzel-rigaud#person");
    expect(schema.author.url).toBe("https://expectedend.co/denzel-rigaud");
    expect(schema.author.sameAs).toContain("https://www.wikidata.org/wiki/Q140198525");
    expect(schema.author.sameAs).not.toContain("https://www.instagram.com/thewatercheck/");
    expect(schema.author.sameAs).not.toContain("https://www.instagram.com/mybiblelens/");
  });

  test("hero renders the brand title and tagline appears on the page", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    await expect(page.locator(".hero-title")).toHaveText(/MyBibleLens/);
    // Tagline lives above the store CTAs (moved out of hero) — still classed .hero-tagline.
    await expect(page.locator(".hero-tagline")).toContainText(
      "Bringing you closer to God in an exciting and easy way!"
    );
  });

  test("hero eyebrow announces the World's First Sanctuary App for Christianity", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForPageReady(page);
    const eyebrow = page.locator(".hero-eyebrow");
    await expect(eyebrow).toContainText(/world.s first/i);
    await expect(eyebrow).toContainText("Sanctuary App for Christianity");
  });

  test("spotlight flow renders all 13 feature iframes in order without nested scrolling", async ({
    page,
  }) => {
    await page.goto("/");
    // The old iPad carousel was retired on 2026-06-02 in favor of in-context
    // spotlight sections embedded as auto-sized iframes.
    // 2026-06-04: the flow was reordered (Reflections + Games above Themes,
    // Focus Timer to the bottom) and the Orb, Parental Lock, and Deep Study
    // sections were added.
    // 2026-06-21: reordered to lead with the most visual tools — Canvas, Glow,
    // Mosaic up top; Parental Lock moved to the very bottom.
    // 2026-07-09: added the "Before we get started" homepage-customization band
    // (customize-flow) after Canvas, and swapped Mosaic ahead of Scripture Glow.
    const order = [
      "canvas-flow",
      "customize-flow",
      "mosaic-flow",
      "glow-flow",
      "sermon-flow",
      "reflections-flow",
      "milestone-flow",
      "fellowship-flow",
      "games-flow",
      "themes-flow",
      "orb-flow",
      "timer-flow",
      "parental-lock-flow",
    ];
    const wraps = page.locator(".flow-iframe-wrap");
    await expect(wraps).toHaveCount(order.length);
    for (let i = 0; i < order.length; i++) {
      await expect(wraps.nth(i)).toHaveAttribute("id", order[i]);
      const frame = page.locator(`#${order[i]} iframe`);
      await expect(frame).toBeAttached();
      const transition = await frame.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          property: style.transitionProperty,
          duration: style.transitionDuration,
          hasAnimatedHeight: style.transitionProperty
            .split(",")
            .some(
              (property, index) =>
                ["all", "height"].includes(property.trim()) &&
                parseFloat(style.transitionDuration.split(",")[index] ?? style.transitionDuration) >
                  0
            ),
        };
      });
      expect(
        transition,
        `${order[i]} must resize immediately so it never becomes a second scroll surface`
      ).toMatchObject({ hasAnimatedHeight: false });
      await expect(
        frame,
        `${order[i]} is presentation-only and must not expose an iframe scrollbar`
      ).toHaveAttribute("scrolling", "no");
    }
    await waitForPageReady(page);
    await settleLazyFlows(page);
    for (const id of order) {
      const dimensions = await page.locator(`#${id} iframe`).evaluate((element) => ({
        frameHeight: element.getBoundingClientRect().height,
        contentHeight: element.contentDocument?.body.scrollHeight ?? null,
      }));
      expect(dimensions.contentHeight, `${id} content must be measurable`).not.toBeNull();
      expect(
        Math.abs(dimensions.frameHeight - dimensions.contentHeight),
        `${id} frame must fit its content without clipping or nested scrolling`
      ).toBeLessThanOrEqual(2);
    }
  });

  test("Sermon Builder phones stay inside the visible spotlight at desktop widths", async ({
    page,
  }) => {
    await page.goto("/mockups/sermon-spotlight.html");
    await waitForPageReady(page);

    for (const width of [1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });

      for (const selector of [".phone--editor", ".phone--present"]) {
        const bounds = await page.locator(selector).evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            viewportWidth: window.innerWidth,
            documentHeight: document.documentElement.scrollHeight,
          };
        });
        expect(
          bounds.left,
          `${selector} must not be cut off on the left at ${width}px`
        ).toBeGreaterThanOrEqual(0);
        expect(
          bounds.right,
          `${selector} must not be cut off on the right at ${width}px`
        ).toBeLessThanOrEqual(bounds.viewportWidth);
        expect(
          bounds.top,
          `${selector} must not be cut off on the top at ${width}px`
        ).toBeGreaterThanOrEqual(0);
        expect(
          bounds.bottom,
          `${selector} must not be cut off on the bottom at ${width}px`
        ).toBeLessThanOrEqual(bounds.documentHeight);
      }
    }
  });

  test("Supabase security badge appears with the right link", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    const badge = page.locator(".supabase-badge");
    await expect(badge).toBeAttached();
    await expect(badge).toHaveAttribute("href", "https://supabase.com/security");
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

  test("core tiers stay lifetime while cloud storage shows the current subscriptions", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForPageReady(page);
    const body = (await page.locator("body").textContent()) ?? "";

    await expect(page.locator(".pricing-section")).toContainText("Pay Once. Yours Forever.");
    await expect(page.locator(".cloud-storage-section")).toContainText("10 GB included free");
    await expect(page.locator(".cloud-storage-section")).toContainText("20 GB total");
    await expect(page.locator(".cloud-storage-section")).toContainText("$1.99/month");
    await expect(page.locator(".cloud-storage-section")).toContainText("$19.99/year");
    await expect(page.locator(".cloud-storage-section")).toContainText("50 GB total");
    await expect(page.locator(".cloud-storage-section")).toContainText("$3.99/month");
    await expect(page.locator(".cloud-storage-section")).toContainText("$39.99/year");
    await expect(page.locator(".cloud-storage-section")).toContainText(
      "Existing accounts keep their included 20 GB"
    );
    await expect(page.locator(".cloud-storage-section")).toContainText(
      "Your files are never deleted automatically"
    );

    // Old pricing model leftovers — guard against accidental rollback.
    expect(body, "old $7.77 monthly Apostle price should be gone").not.toMatch(/\$7\.77/);
    expect(body, "retired +10 GB storage pack should be gone").not.toMatch(/Storage Pack \+10 GB/i);
    expect(body, "retired +50 GB storage pack should be gone").not.toMatch(/Storage Pack \+50 GB/i);
    expect(body, "retired $12.99 storage price should be gone").not.toMatch(/\$12\.99/);
    expect(body, "retired $49.99 storage price should be gone").not.toMatch(/\$49\.99/);
    expect(body, "70,000-seat narrative is retired").not.toMatch(/70,000\s+seats/i);
    expect(body, "Founding $144 price is retired").not.toMatch(/founding\s+member.*\$144/i);
  });

  test("billing disclosure explains storage renewal, cancellation, and safe over-cap behavior", async ({
    page,
  }) => {
    await page.goto("/legal.html#refund");
    await waitForPageReady(page);
    const body = (await page.locator("body").textContent()) ?? "";

    expect(body).toContain("Cloud 20");
    expect(body).toContain("Cloud 50");
    expect(body).toContain("auto-renewing subscription");
    expect(body).toContain("current paid billing period");
    expect(body).toContain("new uploads are paused");
    expect(body).toContain("never automatically deleted");
    expect(body).not.toMatch(/Storage Pack \+10 GB|Storage Pack \+50 GB|\$12\.99|\$49\.99/i);
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

  test("about canvas frames the behind-the-scenes build video without the horse tile", async ({
    page,
  }) => {
    await prepareAboutCanvas(page, { width: 1280, height: 900 });

    const canvas = page.locator(".hero--canvas");
    const buildVideo = canvas.locator(".hero-photo-card--build");

    await expect(canvas.locator(".hero-photo-card")).toHaveCount(5);
    await expect(canvas.locator(".hero-photo-card--tl")).toHaveCount(0);
    await expect(canvas.getByText("The early days.", { exact: true })).toHaveCount(0);
    await expect(canvas.getByText("Eyes forward.", { exact: true })).toHaveCount(0);
    await expect(buildVideo.locator("video")).toHaveAttribute("src", "assets/about-build-desk.mp4");
    await expect(buildVideo).toHaveAttribute("data-caption", /building/i);
    await expect(canvas.locator(".hero-cursor__label")).toContainText("Denzel Rigaud");
    await expect(canvas.locator(".hero-cursor__role")).toContainText("Founder");

    const videoBox = await buildVideo.boundingBox();
    expect(videoBox).not.toBeNull();
    expect(videoBox.x).toBeGreaterThanOrEqual(0);
    const canvasWidth = await canvas.evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }));
    expect(canvasWidth.scroll).toBeLessThanOrEqual(canvasWidth.client);

    await buildVideo.click();
    const videoOverlay = page.locator("#about-video-overlay");
    await expect(videoOverlay).toHaveClass(/is-open/);
    await expect(videoOverlay.locator(".about-reward-video")).toHaveAttribute(
      "src",
      /about-build-desk\.mp4$/
    );
    await expect(videoOverlay.locator(".about-reward-caption")).toContainText(
      "Building MyBibleLens"
    );
  });

  test("about canvas keeps every memory tile inside a phone viewport", async ({ page }) => {
    await prepareAboutCanvas(page, { width: 390, height: 844 });

    const cards = page.locator(".hero--canvas .hero-photo-card");
    await expect(cards).toHaveCount(5);
    for (const card of await cards.all()) {
      await expect(card).toBeVisible();
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
    }
    const canvasWidth = await page.locator(".hero--canvas").evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }));
    expect(canvasWidth.scroll).toBeLessThanOrEqual(canvasWidth.client);

    const cursorBox = await page.locator(".hero-cursor").boundingBox();
    const cursorLabelBox = await page.locator(".hero-cursor__label").boundingBox();
    expect(cursorBox).not.toBeNull();
    expect(cursorLabelBox).not.toBeNull();
    expect(cursorLabelBox.x).toBeGreaterThanOrEqual(cursorBox.x);
    expect(cursorLabelBox.x).toBeLessThan(cursorBox.x + cursorBox.width + 40);
  });

  test("App Store + Google Play badges are present", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    await expect(page.getByRole("link", { name: /App Store/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Google Play/i })).toBeVisible();
  });

  test("retired scanner showcase stays off the page (SEO guard)", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    // Pulled 2026-07-11 so search engines index Infinite Canvas + shipped
    // features instead of the unshipped scanner/journaling method.
    await expect(page.locator("#mosaic-showcase")).toHaveCount(0);
    const body = (await page.locator("body").textContent()) ?? "";
    expect(body).not.toMatch(/S\.O\.A\.P\./);
    expect(body).not.toMatch(/scripture lens/i);
  });

  test("FAQ section renders all questions and each item expands", async ({ page }) => {
    await page.goto("/#faq");
    await waitForPageReady(page);
    const items = page.locator(".faq-item");
    await expect(items).toHaveCount(8);
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
    await page.evaluate(() => {
      const hero = document.getElementById("hero");
      window.scrollTo(0, hero?.offsetHeight ?? window.innerHeight);
    });
    await page.waitForTimeout(200);
    await expect(nav).toHaveAttribute("data-hidden", "false");
  });

  test("Floating nav close button collapses (does not dismiss) for the session", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForPageReady(page);
    // Scroll past hero so the nav is showing
    await page.evaluate(() => {
      const hero = document.getElementById("hero");
      window.scrollTo(0, hero?.offsetHeight ?? window.innerHeight);
    });
    await page.waitForTimeout(200);
    const nav = page.locator("#floating-nav");
    await expect(nav).toHaveAttribute("data-hidden", "false");
    // Click the × close button — visibility:hidden from waitForPageReady would
    // block click, so reset that.
    await page.addStyleTag({
      content: ".floating-nav { visibility: visible !important; opacity: 1 !important; }",
    });
    await page.locator("#floating-nav-close").click();
    // Should collapse, not disappear
    await expect(nav).toHaveAttribute("data-collapsed", "true");
    await expect(nav).toHaveAttribute("data-hidden", "false");
    // sessionStorage flag is set
    const stored = await page.evaluate(() =>
      sessionStorage.getItem("mbl_floating_nav_collapsed_v1")
    );
    expect(stored).toBe("1");
    // Clicking the collapsed pill re-expands it
    await nav.click();
    await expect(nav).toHaveAttribute("data-collapsed", "false");
    const clearedAfterReopen = await page.evaluate(() =>
      sessionStorage.getItem("mbl_floating_nav_collapsed_v1")
    );
    expect(clearedAfterReopen).toBeNull();
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

test.describe("Infinite Canvas — Living Sanctuary Board", () => {
  test("preserves every capability inside four readable chapters", async ({ page }) => {
    await page.goto("/mockups/canvas-spotlight.html");
    await waitForPageReady(page);

    await expect(page.locator(".sanctuary-stage")).toBeVisible();
    await expect(page.locator(".feature-chapter")).toHaveCount(4);
    await expect(page.locator("video")).toHaveCount(12);
    await expect(page.locator("body")).toContainText("Gold Threads");
    await expect(page.locator("body")).toContainText("1,000+ Stickers");
    await expect(page.locator("body")).toContainText("50+ Sacred Templates");
    await expect(page.locator("body")).toContainText("Lasso, Duplicate & Move Anywhere");
    await expect(page.locator("body")).toContainText("30+ people at once");
  });

  test("runs each reveal once and does not restart it after re-entry", async ({ page }) => {
    await page.goto("/mockups/canvas-spotlight.html");

    const hero = page.locator(".sanctuary-stage");
    const chapter = page.locator(".feature-chapter").first();
    await expect(hero).toHaveClass(/is-revealed/);
    await expect(page.locator(".stage-halo")).toHaveCSS("animation-name", "halo-breathe");
    expect(
      await page
        .locator(".feature-chapter")
        .evaluateAll((chapters) => chapters.map((item) => item.getAttribute("data-reveal")))
    ).toEqual(["pop", "flip", "spin", "flip"]);
    const entrance = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.className = "motion-reveal";
      probe.dataset.reveal = "spin";
      document.body.appendChild(probe);
      const style = getComputedStyle(probe);
      const values = {
        opacity: style.opacity,
        transform: style.transform,
        transitionDuration: style.transitionDuration,
      };
      probe.remove();
      return values;
    });
    expect(entrance.opacity).toBe("0");
    expect(entrance.transform).not.toBe("none");
    expect(entrance.transitionDuration).not.toBe("0s");

    await chapter.scrollIntoViewIfNeeded();
    await expect(chapter).toHaveClass(/is-revealed/);
    await expect(chapter).toHaveAttribute("data-reveal-count", "1");

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await chapter.scrollIntoViewIfNeeded();
    await expect(chapter).toHaveAttribute("data-reveal-count", "1");
  });

  test("reduced motion exposes a static final state and pauses every video", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/mockups/canvas-spotlight.html");

    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    const states = await page.locator(".motion-reveal").evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        return {
          opacity: style.opacity,
          transform: style.transform,
          animationDuration: style.animationDuration,
          transitionDuration: style.transitionDuration,
        };
      })
    );
    for (const state of states) {
      expect(state.opacity).toBe("1");
      expect(state.transform).toBe("none");
      expect(state.animationDuration).toBe("0s");
      expect(state.transitionDuration).toBe("0s");
    }
    expect(await page.locator("video").evaluateAll((videos) => videos.every((v) => v.paused))).toBe(
      true
    );
  });

  test("reveals the complete static experience when IntersectionObserver is unavailable", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "IntersectionObserver", {
        value: undefined,
        configurable: true,
      });
    });
    const getErrors = attachConsoleErrorWatch(page);
    await page.goto("/mockups/canvas-spotlight.html");

    await expect(page.locator("html")).toHaveAttribute("data-motion", "fallback");
    await expect(page.locator(".motion-reveal:not(.is-revealed)")).toHaveCount(0);
    expect(getErrors(), "observer fallback must not log errors").toHaveLength(0);
  });

  test("stays inside a 375px viewport and removes pointer-only depth", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/mockups/canvas-spotlight.html");

    const width = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(width.scroll).toBeLessThanOrEqual(width.client);

    for (const selector of [".sanctuary-stage", ".feature-chapter", ".media-frame"]) {
      const boxes = await page.locator(selector).evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        })
      );
      for (const box of boxes) {
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(375);
      }
    }
    await expect(page.locator("html")).toHaveAttribute("data-pointer-depth", "off");
  });

  test("hands the closing action to the parent download section", async ({ page }) => {
    await page.goto("/mockups/canvas-spotlight.html");
    const cta = page.locator(".cta");
    await expect(cta).toHaveAttribute("href", "../index.html#download");
    await expect(cta).toHaveAttribute("target", "_parent");
  });

  test("pauses spotlight media after it leaves the viewport", async ({ page }) => {
    await page.goto("/mockups/canvas-spotlight.html");
    const heroVideo = page.locator(".stage-board video");
    await heroVideo.evaluate((video) => video.scrollIntoView({ block: "center" }));
    await expect.poll(() => heroVideo.evaluate((video) => video.paused)).toBe(false);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => heroVideo.evaluate((video) => video.paused)).toBe(true);
  });

  test("loads the versioned spotlight and completes the parent-page handoff", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    const frame = page.locator("#canvas-flow iframe");
    await expect(frame).toHaveAttribute("src", "mockups/canvas-spotlight.html?v=5");
    await frame.contentFrame().locator(".cta").click();
    await expect(page).toHaveURL(/index\.html#download$/);
    await expect(page.locator("#download")).toBeInViewport();
  });
});
