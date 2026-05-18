// @ts-check
const { expect } = require("@playwright/test");

/**
 * Wait for fonts + critical above-the-fold content to be ready so screenshots
 * are stable. Without this, the gold-shimmer title and font swaps cause flaky
 * pixel diffs.
 */
async function waitForPageReady(page) {
  await page.evaluate(() => document.fonts.ready);
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
      .orb-section::before,
      .pricing-card-wrapper:nth-child(5) .pricing-card::after,
      .floating-nav,
      .scroll-halo,
      /* Scripture Canvas dynamic elements: positions are JS-driven and
         non-deterministic by frame. Hide them for stable baselines. */
      .collab-cursor,
      .canvas-photo {
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
      .repo-card,
      .pricing-card-wrapper {
        opacity: 1 !important;
        transform: none !important;
      }
    `,
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

module.exports = { waitForPageReady, snapshot, attachConsoleErrorWatch };
