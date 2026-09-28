# angelokoch.ch

Personal portfolio for Angelo Koch — 3D interior & product visualisation, Zürich.
Static site: Vite (vanilla JS), GSAP + ScrollTrigger + SplitText, Lenis. No framework, no backend,
no cookies, no trackers, no external requests at runtime (fonts are self-hosted).

Coding agents: read [`AGENTS.md`](AGENTS.md) first.

## Quick start

```sh
git clone https://github.com/akangelokoch-cloud/portfolio.git
cd portfolio
npm install
npm run dev            # http://localhost:5173
```

## Collaboration workflow

1. `git pull` before starting.
2. Make changes and check them in `npm run dev` (desktop and a phone-sized window, EN and DE).
3. `npm run build` must succeed.
4. Commit and `git push` to `main`.
5. Angelo pulls, runs `npm run build` and uploads the contents of `dist/` by FTP (see Deploy).

Editing copy, layout, styles and clip titles/order only needs Node. Adding new video clips needs the
original reels and ffmpeg (steps 1–3b below), which only happens on Angelo's machine.

## Requirements

- Node 20+ and npm
- For encoding videos: `ffmpeg` (with libx264 + libvpx-vp9), `ffprobe`, `cwebp`, `jq`
  (macOS: `brew install ffmpeg webp jq`)

## Workflow: add clips → encode → confirm → build → deploy

All commands run from the repo root.

### 1. Add clips

Drop the original 9:16 reels into a folder named **`ak portfolio/`** placed *next to* the repo folder
(a sibling, not inside it, so the large originals are never committed). These files are treated as
read-only originals: the scripts only read them and never move, rename or modify them.

### 2. Register them in `scripts/clips.conf`

One line per clip:

```
source file | category | order | title EN | title DE
panton.mp4  | passion  | 3     | Panton Pool | Panton-Pool
```

- `category` is `atmospheric`, `product` or `passion`. A category with no clips is not shown on the
  site, so the Product section appears automatically as soon as a product clip is listed.
- `order` sets the order on the page (and within a section).
- Clips in `ak portfolio/` that aren't listed are skipped, and the script says so.

### 3. Encode

```sh
npm install
npm run encode          # only new or changed clips
FORCE=1 npm run encode  # re-encode everything
```

For each clip, writes to `public/videos/` (lowercase, slugified names):

| File | Use |
| --- | --- |
| `slug.play.mp4` / `slug.play.webm` | Desktop. H.264 CRF 24 / VP9 CRF 34, 1080×1920, no audio, faststart |
| `slug.mobile.play.mp4` | Phones. 720×1280 |
| `slug.poster.webp` / `slug.mobile.poster.webp` | First frame, q80. Shown instantly; the video fades in over it |

It also regenerates `public/videos/manifest.json` (file names, duration, category, EN/DE title, order).
Non-9:16 sources are scaled and centre-cropped to 9:16.

### 3b. Hero gallery wall

```sh
npm run wall
```

Grabs four stills from **every** clip in `ak portfolio/` (including ones not listed in `clips.conf`, e.g.
city and interstellar) into `public/images/wall/` (400×712 WebP) and writes `wall.json`. The hero wall
is rendered from that list at build time. Re-run it whenever clips are added.

### 4. Confirm

Open `public/videos/manifest.json` and check the categories and titles, then:

```sh
npm run dev            # http://localhost:5173 (also on your LAN IP, for testing on an iPhone)
```

### 5. Build

```sh
npm run build          # → dist/
npm run preview        # serve the production build locally
```

The sections, posters and default (EN) text are rendered into `index.html` at build time from
`manifest.json` and `src/i18n.json`, so they're present before any JS runs.

### 6. Deploy

The encoded videos in `public/videos/` must be deployed (commit them for Vercel, or upload them by FTP).
The originals in `ak portfolio/` are not needed on the server and shouldn't be committed.

#### Option A: Vercel + DNS

1. `public/videos/` is committed, so the repo is deployable as is.
2. In Vercel, **Add New → Project** and import the repo (Root Directory stays the repo root).
   The framework, build command and output directory come from `vercel.json`
   (Vite, `npm run build`, `dist`).
3. **Settings → Domains**: add `angelokoch.ch` and `www.angelokoch.ch`, and set `www` to redirect to the apex.
4. At the domain registrar (DNS for angelokoch.ch):
   - `A` record `@` → `76.76.21.21`
   - `CNAME` record `www` → `cname.vercel-dns.com`
   (Or follow the exact values Vercel shows on the Domains page. HTTPS is issued automatically.)

#### Option B: plain FTP (any static host, e.g. Apache)

1. `npm run build`
2. Upload the **contents** of `dist/` (including the hidden `.htaccess`) to the web root of
   angelokoch.ch.
3. `.htaccess` handles HTTPS / no-www redirects, MIME types (`.webm`, `.webp`, `.woff2`) and caching.
   The server must support HTTP range requests for video (Apache does by default).

After deploying, check the link preview with an Open Graph checker, WhatsApp or an email draft. The
preview uses `og-image.jpg` (1200×630).

## Hero

Angelo's portrait in a glass frame, with his name split around it ("Angelo" left, "Koch" right; stacked
on phones). Behind it is a tilted wall of stills from all his work, drifting in columns (CSS animation,
paused while the hero is off screen). After the loader, the portrait opens up, the name slides out from
behind it and the wall fades in. On scroll, the name spreads apart and the wall recedes. Reduced motion
gets a static wall and no intro.

## Playback

Each category is a pinned section. The active clip loops muted and inline while the section is in view
and pauses when it isn't (IntersectionObserver). Each clip gets 110vh of scroll, with a 45vh clip-path
wipe between clips. The poster (first frame) shows until playback starts, e.g. in iOS Low Power Mode.
`prefers-reduced-motion` gets no smooth scrolling, no wipes or text animation, and glass without
pointer motion.

(An earlier scroll-scrub mode was A/B-tested and dropped in favour of autoplay.)

## Language

EN by default, with an EN/DE toggle in the nav. The choice is kept in `localStorage` (not a cookie).
`?lang=de` opens the German version directly, which is handy for German-language applications.
All strings live in `src/i18n.json`.

## Structure

```
portfolio/
  AGENTS.md             rules for coding agents
  index.html            page shell ({{t:key}} and <!--@…--> placeholders are filled at build)
  vite.config.js        build + the plugin that renders sections from manifest.json / i18n.json
  vercel.json
  scripts/encode.sh     ffmpeg pipeline
  scripts/wall.sh       stills for the hero gallery wall
  scripts/clips.conf    clip list: category, order, titles
  src/main.js           boot: loader, Lenis, modules
  src/i18n.json         all copy, EN + DE
  src/lib/stages.js     pinned sections, autoplay, wipes, lazy loading
  src/lib/glass.js      liquid glass: SVG edge refraction (Chromium desktop), pointer highlight
  src/lib/motion.js     phone tilt, accent morph, section transitions, hero intro + wall
  src/lib/reveal.js     masked line reveals, animated language swap
  src/lib/loader.js     % loader (fonts + hero portrait)
  src/styles/main.css
  public/               fonts (OFL, licences included), images, videos, favicon, og-image
```

## Design notes

- Liquid glass is used on the nav pill, the phone bezel, clip captions, the contact card and the
  "Hire me" button, with at most three on screen at once. Chromium desktop gets an SVG
  `feDisplacementMap` edge refraction (`backdrop-filter: url(#…)`). Safari and Firefox get blur and
  saturation only. Phones get a lighter blur and no displacement.
- Accent colours per section, sampled from the clips: hero/contact `#E8561B`, atmospheric `#D9913F`
  (lamp light in the interior clip), product `#C4322B` (warm tones of the USM render), passion `#B8237A → #6B44E8` (the Panton floor
  and the violet curtain in the portrait).
- Type: Instrument Serif (display) and Inter Tight (text). Both are self-hosted and under the SIL OFL.
