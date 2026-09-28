// Liquid glass: SVG edge refraction (Chromium desktop only) + pointer-driven specular highlight.
import { gsap } from 'gsap'

const SVG_NS = 'http://www.w3.org/2000/svg'

// Displacement map for a rounded rect: pixels within `band` of the edge are pulled toward the
// centre (R = x, G = y, 128 = no shift), which bends the backdrop like a thick glass rim.
function displacementMap(w, h, radius, band) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(w, h)
  const d = img.data
  const hw = w / 2
  const hh = h / 2
  const r = Math.min(radius, hw, hh)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hw
      const py = y + 0.5 - hh
      const qx = Math.abs(px) - (hw - r)
      const qy = Math.abs(py) - (hh - r)
      let dist
      let nx = 0
      let ny = 0
      if (qx > 0 && qy > 0) {
        const len = Math.hypot(qx, qy) || 1
        dist = r - len
        nx = (qx / len) * Math.sign(px)
        ny = (qy / len) * Math.sign(py)
      } else if (qx > qy) {
        dist = hw - Math.abs(px)
        nx = Math.sign(px)
      } else {
        dist = hh - Math.abs(py)
        ny = Math.sign(py)
      }
      let m = 0
      if (dist < band && dist > 0) {
        const k = 1 - dist / band
        m = k * k
      }
      const i = (y * w + x) * 4
      d[i] = 128 - nx * m * 127
      d[i + 1] = 128 - ny * m * 127
      d[i + 2] = 128
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL('image/png')
}

function setupRefraction(elements) {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.position = 'absolute'
  const defs = document.createElementNS(SVG_NS, 'defs')
  svg.appendChild(defs)
  document.body.appendChild(svg)

  elements.forEach((el, i) => {
    const id = `lg-${i}`
    const filter = document.createElementNS(SVG_NS, 'filter')
    filter.setAttribute('id', id)
    filter.setAttribute('x', '0')
    filter.setAttribute('y', '0')
    filter.setAttribute('width', '100%')
    filter.setAttribute('height', '100%')
    filter.setAttribute('filterUnits', 'userSpaceOnUse')
    filter.setAttribute('color-interpolation-filters', 'sRGB')
    const feImage = document.createElementNS(SVG_NS, 'feImage')
    feImage.setAttribute('result', 'map')
    feImage.setAttribute('preserveAspectRatio', 'none')
    const feDisp = document.createElementNS(SVG_NS, 'feDisplacementMap')
    feDisp.setAttribute('in', 'SourceGraphic')
    feDisp.setAttribute('in2', 'map')
    feDisp.setAttribute('xChannelSelector', 'R')
    feDisp.setAttribute('yChannelSelector', 'G')
    filter.append(feImage, feDisp)
    defs.appendChild(filter)

    let last = ''
    const build = () => {
      const w = Math.round(el.offsetWidth)
      const h = Math.round(el.offsetHeight)
      const key = `${w}x${h}`
      if (!w || !h || key === last) return
      last = key
      const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
      const band = Math.min(28, Math.min(w, h) * 0.32)
      filter.setAttribute('width', w)
      filter.setAttribute('height', h)
      feImage.setAttribute('width', w)
      feImage.setAttribute('height', h)
      feImage.setAttribute('href', displacementMap(w, h, radius, band))
      feDisp.setAttribute('scale', String(Math.round(band * 1.6)))
      el.style.setProperty('--refract', `url(#${id})`)
      el.setAttribute('data-refract', '')
    }
    new ResizeObserver(build).observe(el)
  })
}

export function initGlass({ refract, pointer }) {
  const glass = [...document.querySelectorAll('[data-glass]')]
  if (refract) setupRefraction(glass)
  if (!pointer) return

  // Highlight follows the pointer; values are set per glass element (cheaper than on :root).
  const state = { x: 0, y: 0 }
  const setters = glass.map((el) => ({
    x: gsap.quickSetter(el, '--px'),
    y: gsap.quickSetter(el, '--py'),
  }))
  const toX = gsap.quickTo(state, 'x', { duration: 0.9, ease: 'power3.out' })
  const toY = gsap.quickTo(state, 'y', { duration: 0.9, ease: 'power3.out' })
  addEventListener(
    'pointermove',
    (e) => {
      toX((e.clientX / innerWidth) * 2 - 1)
      toY((e.clientY / innerHeight) * 2 - 1)
    },
    { passive: true },
  )
  gsap.ticker.add(() => {
    const x = state.x.toFixed(3)
    const y = state.y.toFixed(3)
    if (x === state.lx && y === state.ly) return
    state.lx = x
    state.ly = y
    setters.forEach((s) => {
      s.x(x)
      s.y(y)
    })
  })
}
