// @ts-check
const { expect } = require("@playwright/test");

/**
 * Wait for fonts + critical above-the-fold content to be ready so screenshots
 * are stable. Without this, the gold-shimmer title and font swaps cause flaky
 * pixel diffs.
 */
async function waitForPageReady(page) {
  await page.evaluate(() => document.fonts.ready);
  // Dismiss the first-visit language picker so it doesn't intercept clicks or
  // cover the page during functional + visual checks. Seeding mbl_lang keeps it
  // dismissed for the rest of the session (mirrors a returning visitor).
  await page.evaluate(() => {
    try {
      localStorage.setItem("mbl_lang", "en");
    } catch (e) {}
    const m = document.getElementById("lang-modal");
    if (m) {
      m.classList.remove("is-open");
      m.hidden = true;
    }
  });
  // Pause animations + hide non-deterministic elements for stable visual diffs.
  // (Particles spawn at random positions each pageload, ::before light shafts
  //  rotate continuously — both would otherwise cause flaky pixel diffs.)
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-play-state: paused !important;
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        transition: none !important;
      }
      .hero-particles,
      .hero::before,
      .hero::after,
      .pricing-card-wrapper:nth-child(5) .pricing-card::after,
      .floating-nav,
      .scroll-halo,
      .lang-globe,
      .lang-modal,
      /* Scripture Canvas dynamic elements: positions are JS-driven and
         non-deterministic by frame. Hide them for stable baselines. */
      .collab-cursor,
      .canvas-photo,
      .canvas-sticker {
        opacity: 0 !important;
        visibility: hidden !important;
      }
      /* Lock the floating feature nodes at their CSS default positions
         (animations are paused above, but inline left/top from JS would
         still drift the nodes — force them back to --nx/--ny). */
      .scripture-canvas .canvas-node {
        left: var(--nx) !important;
        top: var(--ny) !important;
        translate: none !important;
      }
      /* Lock mosaic tiles at frame 0 of their float animation so the showcase
         snapshot is deterministic. Tiles stay visible — only the wobble is paused. */
      .mosaic-tile {
        animation: none !important;
        transform: rotate(var(--tile-rot, 0deg)) !important;
      }
      /* Lock the gold-shimmer text gradient to a stable midpoint so the
         hero title doesn't sweep mid-snapshot. */
      .hero-title { background-position: 50% 50% !important; }
      /* Force final state for GSAP scroll-trigger animations — otherwise
         fullPage screenshots vary based on scroll timing during capture. */
      .ipad-showcase,
      .pricing-card-wrapper {
        opacity: 1 !important;
        transform: none !important;
      }
    `,
  });
  // Freeze <video> elements at their first frame — an autoplaying loop
  // (e.g. the Lens phone preview) renders a different frame every capture.
  await page.evaluate(async () => {
    const videos = Array.from(document.querySelectorAll("video"));
    await Promise.all(
      videos.map(async (v) => {
        v.pause();
        if (v.readyState < 2) {
          await new Promise((resolve) => {
            v.addEventListener("loadeddata", resolve, { once: true });
            v.load();
            setTimeout(resolve, 1500);
          });
        }
        v.currentTime = 0;
        await new Promise((resolve) => {
          v.addEventListener("seeked", resolve, { once: true });
          setTimeout(resolve, 500);
        });
      })
    );
  });
  // Force-complete any in-flight GSAP timelines if GSAP is loaded.
  await page.evaluate(() => {
    if (typeof window.gsap !== "undefined") {
      window.gsap.globalTimeline.progress(1);
      if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach((t) => t.refresh());
    }
  });
  await page.waitForTimeout(260);
}

/**
 * Force every lazy spotlight iframe to load and finish its height animation.
 * Sections below the flow (Lens showcase, pricing, FAQ) otherwise keep getting
 * pushed down mid-capture as each iframe loads and the auto-resize script
 * re-measures it (`transition: height 200ms` makes each jump a slide).
 */
async function settleLazyFlows(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, window.innerHeight - 100);
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
  });
  await page.waitForLoadState("networkidle");
  // Outlast the auto-resize retry timers (fire up to 2200ms after load).
  await page.waitForTimeout(2400);
}

/**
 * Wait until a section's bounding box stops moving. Sections that sit below
 * the lazy-loaded spotlight iframes get pushed down in steps as each iframe
 * loads and the auto-resize script re-measures it — screenshotting before the
 * shifts finish captures the wrong region of the page.
 */
async function waitForStableBox(
  page,
  locator,
  { checks = 3, interval = 300, timeout = 15000 } = {}
) {
  const deadline = Date.now() + timeout;
  let prev = null;
  let stable = 0;
  while (Date.now() < deadline) {
    const box = await locator.boundingBox();
    if (prev && box && Math.abs(box.y - prev.y) < 1 && Math.abs(box.height - prev.height) < 1) {
      stable += 1;
      if (stable >= checks) return;
    } else {
      stable = 0;
    }
    prev = box;
    await page.waitForTimeout(interval);
  }
}

/** Stable screenshot helper — applies consistent treatment before snapshot. */
async function snapshot(page, name) {
  await waitForPageReady(page);
  await expect(page).toHaveScreenshot(name, { fullPage: true });
}

/** Assert no uncaught console errors fired during a page load. */
function attachConsoleErrorWatch(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[console.error] ${msg.text()}`);
  });
  return () => errors;
}

module.exports = {
  waitForPageReady,
  settleLazyFlows,
  waitForStableBox,
  snapshot,
  attachConsoleErrorWatch,
};
