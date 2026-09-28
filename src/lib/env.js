// Environment detection. Everything here is decided once at load.
const ua = navigator.userAgent

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
export const mobileMQ = matchMedia('(max-width: 767px)')
export const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches
export const isChromium = !!navigator.userAgentData?.brands?.some((b) => /Chromium/i.test(b.brand))
export const isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua)

// Small video variants for phone-sized viewports (decided once; layout itself is CSS).
export const useMobileVideo = mobileMQ.matches

if (reducedMotion) document.documentElement.classList.add('reduced')
