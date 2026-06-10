# CLAUDE.md — MyBibleLens marketing site

This file guides Claude Code when working in the **MyBibleLens website repo** (`mybiblelens.us`). For the iOS app, see `/Users/denzelrigaud/Developer/Mybiblelens/CLAUDE.md`.

## What this repo is

A single-page marketing site served from GitHub Pages at **mybiblelens.us**. Plain HTML + CSS + vanilla JS, no build step. Tooling exists only for **automated testing + formatting** — do not introduce a bundler, framework, or SSR layer without an explicit user ask.

| Path                                                  | Purpose                                                                                                     |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `index.html`                                          | Landing page (sections: hero · repository · orb · pricing · about · footer). Single ~100 KB file by design. |
| `legal.html`                                          | Privacy / Terms / EULA / About / Mission. All legal copy lives here.                                        |
| `style.css`                                           | Legacy/external styles. **Most active styles live inline in `index.html` `<style>` block.**                 |
| `app.js`                                              | Legacy/external JS. Most active JS lives inline at the bottom of `index.html`.                              |
| `success.html`, `cancel.html`, `update-password.html` | Stripe redirect + auth pages. Stripe is currently dormant — don't extend these without user direction.      |
| `assets/`                                             | Static images.                                                                                              |
| `tests/`                                              | Playwright smoke + visual regression suite.                                                                 |

## Commands

```bash
npm run dev               # local preview at http://localhost:8765
npm run format            # Prettier write
npm run format:check      # Prettier check (CI uses this)
npm run test              # All Playwright tests (smoke + visual)
npm run test:smoke        # Smoke / behavior tests only
npm run test:visual       # Visual regression only (local — see note below)
npm run test:ci           # What CI runs (smoke only)
npm run test:update       # Update visual-regression baselines (only after intentional UI change)
npm run test:headed       # Playwright with visible browser
```

### Visual regression is local-only

Pixel baselines are captured on macOS. Linux Chromium in CI renders text at
different sub-pixel heights — the section's measured height shifts, so the
diff fails before running. **CI runs only smoke tests.** Run
`npm run test:visual` locally before intentional UI changes to confirm
what moved. (TODO: capture Linux baselines via `mcr.microsoft.com/playwright`
in Docker if we ever need cross-platform visual coverage.)

## Brand identity (locked — match the iOS app)

- **Tagline:** "Bringing people closer to God in an exciting and easy way!" (verbatim, with exclamation)
- **Framing:** "The World's First Sanctuary App" (primary descriptor — capitalized, exact wording across site/socials/schema). "Bible Productivity App" is allowed only as a secondary SEO descriptor in body copy, never the lead. NEVER "Christianity app".
- **Palette** (warm only — no cool tones):
  - Parchment `#F5F2ED` · Deep Brown `#3D2B1F` · Dark BG `#1A1008`
  - Gold `#b6751d` · Gold Pressed `#9a6218` · Gold Light `#D4921F`
  - Ember Gold `#D4921F` · Halo Gold `#F0C850`
- **Fonts:** Hammersmith One (display) · Inter (body) — loaded via Google Fonts
- **No cool blue / no neon / no electric.** Sanctuary palette only.

## Pricing model (matches iOS — keep in sync)

| Tier      | Price (one-time) | Seats  |
| --------- | ---------------- | ------ |
| Seeker    | Free             | 1      |
| Apostle   | $14.99           | 1      |
| Sanctuary | $29.99           | 3      |
| Kingdom   | $59.99           | 7      |
| Founding  | **$99.99**       | **14** |

All paid tiers get **identical features** — only seat count differs. No subscriptions. Lifetime ownership. Processed by Apple IAP / Google Play Billing — never Stripe in 2026-05+.

## UX rules (the sanctuary feel)

- **Heavenly motion only.** Subtle glow, slow rotations, breath-like pulses. No bouncy/spring or jarring transitions.
- **Apple-quality easing:** 180–220ms with `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Always pair animations with `@media (prefers-reduced-motion: reduce)`.**
- **Mobile-first.** Audit every change at 375px viewport (iPhone SE).
- **Contrast audit on every background change.** A dark-section background swap can leave dark-on-dark text invisible (it has happened — that's why we have visual regression now).
- **`text-wrap: balance`** on all H1/H2.

## Before declaring any UI change done

Run these in order:

1. `npm run format` — Prettier sweep
2. `npm run test` — Playwright smoke + visual regression
3. Local preview at `localhost:8765`, eyeball at desktop + 375px mobile width
4. Read the actual rendered HTML for any newly-painted section to check contrast
5. Confirm no console errors in the browser devtools

## Don't auto-push

Per `feedback_dont_auto_push_to_github.md` — never run `git push` without explicit user direction. Lint + commit locally; wait for "push it" / "big 3" / similar.

## Visual regression baselines

Live in `tests/__screenshots__/`. If a baseline diff is **intentional** (you changed the design on purpose), run `npm run test:update` and commit the new baselines alongside the code change. If a baseline diff is **unexpected**, treat it as a real regression and fix the code.

## CI

GitHub Actions workflow at `.github/workflows/ci.yml` runs `format:check` + Playwright on every push to `main` and on PRs. Don't merge if CI is red.
