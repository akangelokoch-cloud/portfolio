import strings from '../i18n.json'

const STORAGE_KEY = 'ak-lang'
let lang = 'en'
const listeners = new Set()
let textHandler = (el, text) => {
  el.textContent = text
}

export const getLang = () => lang
export const t = (key) => strings[lang]?.[key] ?? strings.en[key] ?? ''
export const onLangChange = (fn) => listeners.add(fn)
// reveal.js takes over text swaps for split (animated) elements.
export const setTextHandler = (fn) => {
  textHandler = fn
}

function apply(instant) {
  const root = document.documentElement
  root.lang = lang === 'de' ? 'de-CH' : 'en'

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const text = t(el.dataset.i18n)
    if (el.textContent !== text) textHandler(el, text, instant)
  })
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)))
  document.querySelectorAll('[data-i18n-alt]').forEach((el) => (el.alt = t(el.dataset.i18nAlt)))
  document.querySelectorAll('[data-alt-clip]').forEach((img) => {
    const src = img.closest('[data-clip]') || img
    const title = src.dataset[lang === 'de' ? 'titleDe' : 'titleEn']
    if (title) img.alt = t('clipAlt').replace('{title}', title)
  })
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('metaDescription'))
  document.querySelector('[data-loader]')?.setAttribute('aria-label', t('loading'))

  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)))
  listeners.forEach((fn) => fn(lang, instant))
}

export function setLang(next, { instant = false } = {}) {
  if (!strings[next] || next === lang) return
  lang = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {}
  apply(instant)
}

export function initI18n() {
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)))

  let stored = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {}
  const fromUrl = new URLSearchParams(location.search).get('lang')
  const initial = fromUrl && strings[fromUrl] ? fromUrl : stored && strings[stored] ? stored : 'en'
  if (initial !== 'en') setLang(initial, { instant: true })
}
