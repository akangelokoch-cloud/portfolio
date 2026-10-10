import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { reducedMotion, mobileMQ, finePointer, isChromium, isSafari, useMobileVideo } from './lib/env.js'
import { initI18n, t } from './lib/i18n.js'
import { initReveal, playHero } from './lib/reveal.js'
import { runLoader } from './lib/loader.js'
import { initGlass } from './lib/glass.js'
import { initTilt, initAccent, initSectionTransitions, initHero } from './lib/motion.js'
import { initStages, enableLoading } from './lib/stages.js'

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
window.scrollTo(0, 0)

const desktopFx = finePointer && !mobileMQ.matches

// Smooth wheel scrolling on desktop only; touch keeps native (iOS) scrolling.
let lenis = null
if (!reducedMotion) {
  lenis = new Lenis({ autoRaf: false, lerp: 0.1, smoothWheel: true, syncTouch: false })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  lenis.stop()
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]')
  if (!a) return
  const id = a.getAttribute('href').slice(1)
  const target = id === 'top' ? 0 : document.getElementById(id)
  if (target === null) return
  e.preventDefault()
  if (lenis) lenis.scrollTo(target, { duration: 1.4 })
  else if (target === 0) window.scrollTo(0, 0)
  else target.scrollIntoView()
  if (target !== 0) target.focus?.({ preventScroll: true })
})

// mailto does nothing without a mail app, so also copy the address and say so.
const mailBtn = document.querySelector('[data-mail]')
let mailTimer
mailBtn?.addEventListener('click', () => {
  const label = mailBtn.querySelector('[data-i18n="hireMe"]')
  const status = mailBtn.querySelector('[data-mail-status]')
  navigator.clipboard
    ?.writeText(mailBtn.getAttribute('href').slice(7))
    .then(() => {
      label.textContent = t('mailCopied')
      status.textContent = t('mailCopied')
      clearTimeout(mailTimer)
      mailTimer = setTimeout(() => {
        label.textContent = t('hireMe')
        status.textContent = ''
      }, 2000)
    })
    .catch(() => {})
})

initI18n()
initReveal({ reducedMotion })
initStages({
  reducedMotion,
  mobileVideo: useMobileVideo,
  preferMp4: isSafari,
})
initAccent({ reducedMotion })
initGlass({
  // SVG refraction only where it renders (Chromium) and is affordable (desktop).
  refract: isChromium && desktopFx,
  pointer: desktopFx && !reducedMotion,
})
const playHeroIntro = initHero({ reducedMotion, pointer: desktopFx && !reducedMotion })
if (!reducedMotion) {
  if (desktopFx) initTilt()
  initSectionTransitions({ mobile: () => mobileMQ.matches })
}

runLoader().then(() => {
  lenis?.start()
  playHeroIntro()
  playHero()
  enableLoading()
  ScrollTrigger.refresh()
})
document.fonts?.ready.then(() => ScrollTrigger.refresh())
