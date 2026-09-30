// Masked line-by-line text reveals (GSAP SplitText) + animated language swaps.
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { setText, setTextHandler } from './i18n.js'

gsap.registerPlugin(ScrollTrigger, SplitText)

const items = new Map()
const heroItems = []
let reduced = false

function split(item) {
  item.split = SplitText.create(item.el, {
    type: 'lines',
    mask: 'lines',
    aria: 'none',
    linesClass: 'line',
    autoSplit: true,
    onSplit(self) {
      item.el.classList.add('is-split')
      gsap.set(self.lines, { yPercent: item.played ? 0 : 110 })
    },
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
    const item = { el, split: null, played: reduced }
    items.set(el, item)
    if (reduced) return
    split(item)
    if (el.dataset.reveal === 'hero') {
      heroItems.push(item)
      return
    }
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
