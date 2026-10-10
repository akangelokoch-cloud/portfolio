# AGENTS.md

Personal portfolio for Angelo Koch (angelokoch.ch). Static site: Vite + vanilla JS, GSAP (ScrollTrigger,
SplitText), Lenis. No framework, no backend, no cookies, no trackers, no runtime requests to third parties.
`README.md` has the full background; this file is the working rules.

## Workflow

1. `git pull` before changing anything.
2. `npm install` (first time, or when `package.json` changed).
3. Make the change. Check it with `npm run dev` at desktop width and ≤767px, in EN and DE (`?lang=de`).
4. `npm run build` must succeed. It fails on missing i18n keys.
5. Commit with a short, descriptive message and `git push` to `main`.

`dist/` is committed so it can be pulled and uploaded by FTP: run `npm run build` and commit `dist/` with every change. Never commit `node_modules/`.

## Where things live

| Change | File |
| --- | --- |
| Any visible text (EN + DE) | `src/i18n.json` |
| Page structure (hero, contact, footer, nav) | `index.html` |
| Work sections (generated at build) | `renderStages()` in `vite.config.js` |
| Section order / accent colours | `SECTIONS` in `vite.config.js` |
| Clip titles and order | `public/videos/manifest.json` (and `scripts/clips.conf`, keep both in sync) |
| Styles | `src/styles/main.css` (sections marked `/* ---------- Name ---------- */`) |
| Scroll/video behaviour | `src/lib/stages.js` |
| Hero intro, tilt, accent morph | `src/lib/motion.js` |
| Glass effect | `src/lib/glass.js` |

## Rules

- **Text:** never hard-code copy in HTML or JS. Add a key to both `en` and `de` in `src/i18n.json`, then use
  `{{t:key}}` plus `data-i18n="key"` in `index.html` (see existing elements). German is Swiss German
  orthography (no ß).
- **Build-time HTML:** `index.html` contains placeholders (`{{t:key}}`, `<!--@stages-->`, `<!--@hero-wall-->`,
  `<!--@preload-portrait-->`) that `vite.config.js` fills in. Don't remove them.
- **Videos:** don't run `npm run encode` or `npm run wall`. They need the original reels in `../ak portfolio/`,
  which are not in this repo. Don't edit or re-encode files in `public/videos/` or `public/images/wall/`.
- **No external requests:** no CDNs, Google Fonts, analytics, embeds or trackers. Self-host any asset.
- **Accessibility:** keep `prefers-reduced-motion` handling (see `.reduced` class and the reduced-motion
  block in `main.css`), alt text via i18n, `aria-*` labels, and keyboard focus styles.
- **Performance:** images as WebP with a `.mobile` variant for ≤767px; lazy-load anything below the fold.
- **Dependencies:** don't add npm packages unless clearly necessary.
- **Secrets:** this repo is public. Never commit passwords, FTP credentials, API keys or `.env` files.
- Match the existing code style: 2-space indent, no semicolons, single quotes, short comments only where
  the code can't explain itself.
