// Work sections: a pinned stage per category holding one or more clips inside the phone frame.
// The active clip loops muted and inline; everything pauses when the stage is out of view.
// Scrolling through a stage wipes (clip-path) from one clip to the next and swaps the caption.
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getLang, onLangChange } from './i18n.js'

const VH_PER_CLIP = 110
const WIPE_VH = 45
const pad = (n) => String(n).padStart(2, '0')

const stages = []
let loadingEnabled = false

class Stage {
  constructor(el, opts) {
    this.el = el
    this.opts = opts
    this.pin = el.querySelector('.stage__pin')
    this.titleEl = el.querySelector('[data-clip-title]')
    this.indexEl = el.querySelector('[data-clip-index]')
    this.clips = [...el.querySelectorAll('[data-clip]')].map((fig) => ({
      fig,
      video: fig.querySelector('video'),
      requested: false,
      wipe: 0,
    }))
    this.active = 0
    this.inView = false
    this.totalVh = VH_PER_CLIP * this.clips.length + WIPE_VH * (this.clips.length - 1)

    // Desktop pins the whole stage (text beside the phone); mobile pins only the render, below the text.
    const media = el.querySelector('.stage__media')
    gsap.matchMedia().add({ mobile: '(max-width: 767px)', desktop: '(min-width: 768px)' }, ({ conditions }) => {
      this.st = ScrollTrigger.create({
        trigger: conditions.mobile ? media : el,
        start: 'top top',
        end: () => `+=${(this.totalVh / 100) * window.innerHeight}`,
        pin: conditions.mobile ? media : this.pin,
        // GSAP turns this off by default when the pin's parent is flex (mobile).
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => this.update(self.progress),
      })
    })

    // Lazy-load one section ahead: the first clip while the previous section is on screen,
    // the rest once this stage comes into view.
    ScrollTrigger.create({
      trigger: el,
      start: () => `top bottom+=${window.innerHeight * 2}`,
      once: true,
      onEnter: () => {
        this.wantLoad = true
        if (loadingEnabled) this.load(this.clips[0])
      },
    })
    ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      once: true,
      onEnter: () => {
        this.wantAll = true
        if (loadingEnabled) this.loadAll()
      },
    })

    this.io = new IntersectionObserver(
      ([e]) => {
        this.inView = e.isIntersecting
        this.syncPlayback()
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    this.io.observe(el)

    onLangChange(() => this.setCaption(this.active, true))
    this.update(0)
  }

  loadAll() {
    const [first, ...rest] = this.clips
    this.load(first)
    if (!rest.length) return
    let started = false
    const go = () => {
      if (started) return
      started = true
      rest.forEach((c) => this.load(c))
    }
    if (first.video.readyState >= 3) return go()
    first.video.addEventListener('canplaythrough', go, { once: true })
    setTimeout(go, 2500)
  }

  load(clip) {
    if (clip.requested) return
    clip.requested = true
    const { fig, video } = clip
    const d = fig.dataset
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')

    const sources = this.opts.mobileVideo
      ? [[d.mobilePlay, 'video/mp4']]
      : this.opts.preferMp4
        ? [[d.play, 'video/mp4'], [d.playWebm, 'video/webm']]
        : [[d.playWebm, 'video/webm'], [d.play, 'video/mp4']]
    sources.forEach(([src, type]) => {
      const s = document.createElement('source')
      s.src = src
      s.type = type
      video.appendChild(s)
    })
    video.preload = 'auto'

    // The poster (= first frame) stays until real playback starts, e.g. in iOS Low Power Mode.
    video.addEventListener('playing', () => fig.classList.add('is-ready'), { once: true })
    video.addEventListener('loadeddata', () => this.syncPlayback(), { once: true })
    video.addEventListener('error', () => fig.classList.remove('is-ready'))
    video.load()
  }

  // Map pinned progress to the active clip and each clip's wipe amount.
  update(progress) {
    const pos = progress * this.totalVh
    let active = 0
    this.clips.forEach((clip, i) => {
      if (i === 0) return
      const wipeStart = i * VH_PER_CLIP + (i - 1) * WIPE_VH
      clip.wipe = gsap.utils.clamp(0, 1, (pos - wipeStart) / WIPE_VH)
      if (clip.wipe >= 0.5) active = i
    })
    this.applyWipes()
    if (active !== this.active) {
      this.active = active
      this.setCaption(active)
    }
    this.syncPlayback()
  }

  applyWipes() {
    const reduced = this.opts.reducedMotion
    this.clips.forEach((clip, i) => {
      if (i === 0) return
      const w = reduced ? (clip.wipe >= 0.5 ? 1 : 0) : gsap.parseEase('power2.inOut')(clip.wipe)
      if (w === clip.appliedWipe) return
      clip.appliedWipe = w
      clip.fig.style.clipPath = w >= 1 ? 'none' : `inset(${((1 - w) * 100).toFixed(2)}% 0 0 0)`
      // Incoming render settles from a slight zoom; outgoing one recedes.
      if (!reduced) {
        clip.fig.style.transform = w > 0 && w < 1 ? `scale(${(1.08 - 0.08 * w).toFixed(4)})` : ''
        const prev = this.clips[i - 1].fig
        prev.style.transform = w > 0 && w < 1 ? `scale(${(1 - 0.04 * w).toFixed(4)})` : ''
      }
    })
  }

  setCaption(i, instant = false) {
    const fig = this.clips[i].fig
    const title = fig.dataset[getLang() === 'de' ? 'titleDe' : 'titleEn']
    this.indexEl.textContent = `${pad(i + 1)} / ${pad(this.clips.length)}`
    if (instant || this.opts.reducedMotion) {
      gsap.killTweensOf(this.titleEl)
      gsap.set(this.titleEl, { autoAlpha: 1, y: 0 })
      this.titleEl.textContent = title
      return
    }
    gsap.to(this.titleEl, {
      autoAlpha: 0,
      y: -8,
      duration: 0.2,
      ease: 'power1.in',
      overwrite: true,
      onComplete: () => {
        this.titleEl.textContent = title
        gsap.fromTo(this.titleEl, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out' })
      },
    })
  }

  // Only clips that are visible (active, or mid-wipe) play, and only while the stage is in view.
  syncPlayback() {
    const wiping = (c) => c && c.wipe > 0 && c.wipe < 1
    this.clips.forEach((clip, i) => {
      const visible = i === this.active || wiping(clip) || wiping(this.clips[i + 1])
      const shouldPlay = this.inView && clip.requested && visible
      const v = clip.video
      if (shouldPlay && v.paused) v.play().catch(() => {})
      else if (!shouldPlay && !v.paused) v.pause()
    })
  }
}

// Called once the loader is done so video fetches never compete with fonts and hero stills.
export function enableLoading() {
  loadingEnabled = true
  stages.forEach((s) => {
    if (s.wantAll) s.loadAll()
    else if (s.wantLoad) s.load(s.clips[0])
  })
}

export function initStages(opts) {
  document.querySelectorAll('[data-stage]').forEach((el) => stages.push(new Stage(el, opts)))
  // Mobile Safari may pause media when the tab is backgrounded; resync on return.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') stages.forEach((s) => s.syncPlayback())
  })
  return stages
}
