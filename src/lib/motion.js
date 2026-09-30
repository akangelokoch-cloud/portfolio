// Phone tilt (desktop), accent colour morph between sections, section entry transitions.
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initTilt() {
  const phones = [...document.querySelectorAll('[data-tilt]')]
  const visible = new Set()
  const io = new IntersectionObserver((entries) =>
    entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target))),
  )
  const movers = new Map(
    phones.map((p) => {
      io.observe(p)
      gsap.set(p, { transformPerspective: 1400 })
      return [
        p,
        {
          rx: gsap.quickTo(p, 'rotationX', { duration: 1.1, ease: 'power3.out' }),
          ry: gsap.quickTo(p, 'rotationY', { duration: 1.1, ease: 'power3.out' }),
        },
      ]
    }),
  )
  const MAX = 4
  addEventListener(
    'pointermove',
    (e) => {
      const nx = (e.clientX / innerWidth) * 2 - 1
      const ny = (e.clientY / innerHeight) * 2 - 1
      visible.forEach((p) => {
        const m = movers.get(p)
        m.ry(nx * MAX)
        m.rx(-ny * MAX)
      })
    },
    { passive: true },
  )
}

export function initAccent({ reducedMotion }) {
  const root = document.documentElement
  const meta = document.querySelector('meta[name="theme-color"]')
  document.querySelectorAll('[data-accent]').forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle(self) {
        if (!self.isActive) return
        gsap.to(root, {
          '--accent': section.dataset.accent,
          '--accent2': section.dataset.accent2 || section.dataset.accent,
          duration: reducedMotion ? 0 : 1.4,
          ease: 'power2.inOut',
          overwrite: true,
        })
      },
    })
  })
  // Keep browser chrome dark; accent stays inside the page.
  meta?.setAttribute('content', '#120D0B')
}

// Scale + crossfade as a section's frame comes into view.
export function initSectionTransitions({ mobile }) {
  document.querySelectorAll('[data-stage]').forEach((stage) => {
    const target = mobile() ? stage.querySelector('.phone__screen') : stage.querySelector('.phone')
    const from = mobile() ? { scale: 1.12 } : { scale: 0.86, autoAlpha: 0.2, y: 60 }
    const to = mobile() ? { scale: 1 } : { scale: 1, autoAlpha: 1, y: 0 }
    gsap.fromTo(target, from, {
      ...to,
      ease: 'none',
      scrollTrigger: { trigger: stage, start: 'top bottom', end: 'top top', scrub: true },
    })
  })
}

// Hero: gallery wall of every render behind the portrait. Intro after the loader, scroll-out,
// pointer parallax on the wall, and the wall pauses whenever the hero is off screen.
export function initHero({ reducedMotion, pointer }) {
  const hero = document.querySelector('.hero')
  if (!hero) return () => {}
  const wall = hero.querySelector('.wall')
  const plane = hero.querySelector('.wall__plane')
  const photo = hero.querySelector('.hero__photo')
  const portrait = hero.querySelector('.hero__portrait')
  const first = hero.querySelector('.hero__word--first > span')
  const last = hero.querySelector('.hero__word--last > span')
  const fadeIns = hero.querySelectorAll('[data-hero-in]')

  if (wall) {
    new IntersectionObserver(([e]) => wall.classList.toggle('is-paused', !e.isIntersecting)).observe(hero)
  }
  if (reducedMotion) return () => {}

  // Hidden until the loader is gone (the loader covers the page until then).
  gsap.set(wall, { autoAlpha: 0, scale: 1.08 })
  gsap.set(photo, { clipPath: 'inset(50% 0% 50% 0% round 28px)' })
  gsap.set(photo.querySelector('img'), { scale: 1.25 })
  gsap.set(portrait, { autoAlpha: 0 })
  const words = hero.querySelectorAll('.hero__word')
  words.forEach((w) => w.classList.add('is-clipped'))
  gsap.set(first, { xPercent: 105 })
  gsap.set(last, { xPercent: -105 })
  gsap.set(fadeIns, { autoAlpha: 0, y: 16 })

  // Scroll-out: portrait lifts, the name parts, the wall drifts back.
  const out = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
  gsap.to(hero.querySelector('.hero__stage'), { y: -90, scale: 0.94, ease: 'none', scrollTrigger: out })
  gsap.to(hero.querySelector('.hero__word--first'), { xPercent: -14, ease: 'none', scrollTrigger: out })
  gsap.to(hero.querySelector('.hero__word--last'), { xPercent: 14, ease: 'none', scrollTrigger: out })
  gsap.to(plane, { yPercent: -6, scale: 1.12, ease: 'none', scrollTrigger: out })
  gsap.to(hero.querySelector('.hero__inner'), {
    autoAlpha: 0,
    ease: 'none',
    scrollTrigger: { trigger: hero, start: '25% top', end: 'bottom 15%', scrub: true },
  })

  if (pointer && wall) {
    const wx = gsap.quickTo(wall, 'x', { duration: 1.6, ease: 'power3.out' })
    const wy = gsap.quickTo(wall, 'y', { duration: 1.6, ease: 'power3.out' })
    addEventListener(
      'pointermove',
      (e) => {
        wx(-((e.clientX / innerWidth) * 2 - 1) * 26)
        wy(-((e.clientY / innerHeight) * 2 - 1) * 18)
      },
      { passive: true },
    )
  }

  // Returned to main.js and played once the loader has finished.
  return () =>
    gsap
      .timeline({ defaults: { ease: 'expo.out' } })
      .to(wall, { autoAlpha: 1, scale: 1, duration: 2.4, ease: 'power2.out' }, 0)
      .to(portrait, { autoAlpha: 1, duration: 0.6, ease: 'power1.out' }, 0.1)
      .to(photo, { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.5 }, 0.1)
      .to(photo.querySelector('img'), { scale: 1, duration: 2.2 }, 0.1)
      .to(
        [first, last],
        { xPercent: 0, duration: 1.5, onComplete: () => words.forEach((w) => w.classList.remove('is-clipped')) },
        0.55,
      )
      .to(fadeIns, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.12, ease: 'power3.out' }, 1)
}
