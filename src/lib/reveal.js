// Masked line-by-line text reveals (GSAP SplitText) + animated language swaps.
// Work-section text ([data-reveal="scrub"]) is tied to scroll instead: the title rises line by line and the
// copy fills in word by word, filling the hold on the first clip before the wipe to the next one.
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { setText, setTextHandler } from './i18n.js'

gsap.registerPlugin(ScrollTrigger, SplitText)

const items = new Map()
const heroItems = []
let reduced = false

function split(item) {
  const words = item.scrub && item.el.matches('p')
  item.split = SplitText.create(item.el, {
    type: words ? 'lines, words' : 'lines',
    ...(words ? {} : { mask: 'lines' }),
    aria: 'none',
    linesClass: 'line',
    autoSplit: true,
    onSplit(self) {
      item.el.classList.add('is-split')
      if (item.scrub) return buildScrub(item, self)
      gsap.set(self.lines, { yPercent: item.played ? 0 : 110 })
    },
  })
}

// Rebuilt on every split (resize, language swap) and set to the current scroll progress.
function buildScrub(item, self) {
  item.tl?.kill()
  const tl = gsap.timeline({ paused: true })
  if (self.words.length) {
    tl.fromTo(self.words, { opacity: 0.12 }, { opacity: 1, duration: 1, ease: 'none', stagger: 0.35 })
  } else {
    tl.fromTo(self.lines, { yPercent: 110 }, { yPercent: 0, duration: 1, ease: 'power2.out', stagger: 0.35 })
  }
  tl.progress(item.progress)
  item.tl = tl
}

// Scroll ranges, as the trigger's top edge in viewport heights from the top of the viewport.
// Desktop: from the stage entering until just before the first wipe (stages.js wipes at 110vh into the pin).
// Mobile: only the render pins, so the card reveals while it scrolls up the screen above it.
const RANGES = {
  desktop: { title: [0.6, 0.05], copy: [0.35, -0.95] },
  mobile: { title: [0.9, 0.55], copy: [0.8, -0.1] },
}

function scrubTrigger(item) {
  const stage = item.el.closest('[data-stage]')
  const key = item.el.matches('p') ? 'copy' : 'title'
  gsap.matchMedia().add({ mobile: '(max-width: 767px)', desktop: '(min-width: 768px)' }, ({ conditions }) => {
    const [from, to] = RANGES[conditions.mobile ? 'mobile' : 'desktop'][key]
    ScrollTrigger.create({
      trigger: conditions.mobile ? stage.querySelector('.stage__card') : stage,
      start: () => `top ${from * window.innerHeight}px`,
      end: () => `top ${to * window.innerHeight}px`,
      // After the stage pins, so their spacing is already in place.
      refreshPriority: -1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        item.progress = self.progress
        item.tl?.progress(self.progress)
      },
    })
  })
}

function play(item, delay = 0) {
  if (item.played) return
  item.played = true
  gsap.to(item.split.lines, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09, delay })
}

let refreshTimer
function swapText(el, text, instant) {
  const item = items.get(el)
  if (!item || reduced || instant) {
    if (item?.split) item.split.revert()
    setText(el, text)
    if (item && !reduced) split(item)
    return
  }
  gsap.to(el, {
    autoAlpha: 0,
    duration: 0.18,
    ease: 'power1.in',
    onComplete() {
      item.split.revert()
      setText(el, text)
      split(item)
      gsap.to(el, { autoAlpha: 1, duration: 0.35, ease: 'power1.out' })
      clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 60)
    },
  })
}

export function initReveal({ reducedMotion }) {
  reduced = reducedMotion
  setTextHandler(swapText)
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    const scrub = el.dataset.reveal === 'scrub'
    const item = { el, split: null, played: reduced, scrub, progress: 0 }
    items.set(el, item)
    if (reduced) return
    split(item)
    if (el.dataset.reveal === 'hero') {
      heroItems.push(item)
      return
    }
    if (scrub) return scrubTrigger(item)
    const trigger = el.closest('[data-stage], .contact') || el
    ScrollTrigger.create({
      trigger,
      start: 'top 62%',
      once: true,
      onEnter: () => play(item, el.matches('p') ? 0.12 : 0),
    })
  })
}

export function playHero() {
  heroItems.forEach((item, i) => play(item, i * 0.14))
}
