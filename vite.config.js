import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const root = dirname(fileURLToPath(import.meta.url))

// Section order, accent colours (sampled from the clips) and which side the phone sits on.
// A section without clips in the manifest is not rendered.
const SECTIONS = [
  { key: 'atmospheric', accent: '#D9913F' },
  { key: 'product', accent: '#C4322B' },
  { key: 'passion', accent: '#B8237A', accent2: '#6B44E8' },
]

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const pad = (n) => String(n).padStart(2, '0')

function load() {
  const manifest = JSON.parse(readFileSync(resolve(root, 'public/videos/manifest.json'), 'utf8'))
  const i18n = JSON.parse(readFileSync(resolve(root, 'src/i18n.json'), 'utf8'))
  return { manifest: [...manifest].sort((a, b) => a.order - b.order), en: i18n.en }
}

function clipFigure(clip, en, eager) {
  const f = clip.files
  const alt = en.clipAlt.replace('{title}', clip.title.en)
  return `
          <figure class="clip" data-clip data-slug="${esc(clip.slug)}" data-duration="${clip.duration}"
            data-title-en="${esc(clip.title.en)}" data-title-de="${esc(clip.title.de)}"
            data-play="videos/${f.play}" data-play-webm="videos/${f.playWebm}" data-mobile-play="videos/${f.mobilePlay}">
            <picture>
              <source media="(max-width: 767px)" srcset="videos/${f.mobilePoster}" type="image/webp" />
              <img class="clip__poster" src="videos/${f.poster}" alt="${esc(alt)}" data-alt-clip
                width="1080" height="1920" decoding="async" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} />
            </picture>
            <video class="clip__video" muted playsinline preload="none" disablepictureinpicture disableremoteplayback
              aria-hidden="true" tabindex="-1"></video>
          </figure>`
}

function renderStages({ manifest, en }) {
  let side = 'left'
  let n = 0
  return SECTIONS.map((s) => {
    const clips = manifest.filter((c) => c.category === s.key)
    if (!clips.length) return ''
    n += 1
    const html = `
    <section class="stage" id="${s.key}" data-stage data-side="${side}" data-accent="${s.accent}"
      data-accent2="${s.accent2 || s.accent}" aria-labelledby="${s.key}-title">
      <div class="stage__pin">
        <div class="glow" aria-hidden="true"></div>
        <div class="stage__media">
          <div class="phone glass" data-glass data-tilt>
            <div class="phone__screen">${clips.map((c, i) => clipFigure(c, en, false)).join('')}
              <span class="phone__island" aria-hidden="true"></span>
            </div>
          </div>
        </div>
        <div class="stage__text">
          <div class="stage__card">
            <span class="stage__num" aria-hidden="true">${pad(n)}</span>
            <h2 id="${s.key}-title" class="stage__title" data-i18n="${s.key}Title" data-reveal>${esc(en[s.key + 'Title'])}</h2>
            <p class="stage__copy" data-i18n="${s.key}Text" data-reveal>${esc(en[s.key + 'Text'])}</p>
          </div>
          <p class="caption glass" data-glass>
            <span class="caption__index" data-clip-index>01 / ${pad(clips.length)}</span>
            <span class="caption__title" data-clip-title>${esc(clips[0].title.en)}</span>
          </p>
        </div>
      </div>
    </section>`
    side = side === 'left' ? 'right' : 'left'
    return html
  }).join('\n')
}

// Hero gallery wall: stills from every reel (scripts/wall.sh), in columns that loop endlessly.
// Each column's track holds its tiles twice so a -50% translate loops seamlessly.
const WALL_COLS = 7
const WALL_ROWS = 6

function renderWall() {
  let files = []
  try {
    files = JSON.parse(readFileSync(resolve(root, 'public/images/wall/wall.json'), 'utf8'))
  } catch {
    return ''
  }
  if (!files.length) return ''
  // Interleave by clip so neighbouring tiles come from different reels.
  const byClip = new Map()
  files.forEach((f) => {
    const k = f.replace(/-\d+\.webp$/, '')
    byClip.set(k, [...(byClip.get(k) || []), f])
  })
  const seq = []
  for (let i = 0; seq.length < files.length; i++) byClip.forEach((l) => l[i] && seq.push(l[i]))

  const cols = Array.from({ length: WALL_COLS }, (_, c) => {
    const tiles = Array.from({ length: WALL_ROWS }, (_, r) => seq[(c * 7 + r) % seq.length])
    const imgs = [...tiles, ...tiles]
      .map((f) => `<img src="images/wall/${f}" alt="" width="400" height="712" decoding="async" fetchpriority="low" />`)
      .join('')
    const dur = 70 + ((c * 17) % 5) * 9
    return `
          <div class="wall__col" style="--dur:${dur}s"><div class="wall__track">${imgs}</div></div>`
  }).join('')
  return `<div class="wall" aria-hidden="true"><div class="wall__plane">${cols}
        </div></div>`
}

function akPortfolio() {
  return {
    name: 'ak-portfolio-html',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const data = load()
        return html
          .replace('<!--@stages-->', renderStages(data))
          .replace('<!--@hero-wall-->', renderWall())
          .replace(
            '<!--@preload-portrait-->',
            `<link rel="preload" as="image" href="images/ak.mobile.webp" media="(max-width: 767px)" type="image/webp" fetchpriority="high" />
    <link rel="preload" as="image" href="images/ak.webp" media="(min-width: 768px)" type="image/webp" fetchpriority="high" />`,
          )
          .replace(/\{\{t:(\w+)\}\}/g, (_, k) => {
            if (!(k in data.en)) throw new Error(`Missing i18n key: ${k}`)
            return esc(data.en[k])
          })
      },
    },
    handleHotUpdate({ file, server }) {
      if (/(manifest|i18n|wall)\.json$/.test(file)) server.ws.send({ type: 'full-reload' })
    },
  }
}

export default defineConfig({
  root,
  base: './',
  plugins: [akPortfolio()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    assetsInlineLimit: 0,
  },
  server: { host: true },
})
