// Minimal % loader: hero portrait. Skipped entirely when everything is already cached.
import { gsap } from 'gsap'

export function runLoader() {
  const el = document.querySelector('[data-loader]')
  const num = el?.querySelector('[data-loader-num]')
  if (!el) return Promise.resolve()

  const tasks = [...document.querySelectorAll('.hero__photo img')].map((img) =>
    img.complete ? Promise.resolve() : img.decode().catch(() => {}),
  )
  const total = tasks.length
  let done = 0
  const shown = { v: 0 }
  const render = () => {
    const v = Math.round(shown.v)
    num.textContent = v
    el.setAttribute('aria-valuenow', v)
  }
  tasks.forEach((p) =>
    Promise.resolve(p)
      .catch(() => {})
      .then(() => {
        done += 1
        gsap.to(shown, { v: (done / total) * 100, duration: 0.4, ease: 'power2.out', onUpdate: render, overwrite: true })
      }),
  )

  const started = performance.now()
  const all = Promise.all(tasks.map((p) => Promise.resolve(p).catch(() => {})))
  const timeout = new Promise((r) => setTimeout(r, 4500))

  return Promise.race([all, timeout]).then(
    () =>
      new Promise((resolve) => {
        const fast = performance.now() - started < 120
        if (fast) {
          el.classList.add('is-done')
          resolve()
          return
        }
        gsap.to(shown, {
          v: 100,
          duration: 0.3,
          onUpdate: render,
          onComplete() {
            gsap.to(el, {
              autoAlpha: 0,
              duration: 0.45,
              ease: 'power2.inOut',
              onComplete() {
                el.classList.add('is-done')
              },
            })
            resolve()
          },
        })
      }),
  )
}
