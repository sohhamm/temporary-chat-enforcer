import {waitFor} from '../dom/wait'
import type {ProviderAdapter} from './types'

const INCOGNITO_COOKIE = 'pplx.is-incognito'
const APP_READY_SELECTOR = '#ask-input, textarea, [contenteditable="true"], main'
const ACTIVE_BUTTON_SELECTORS = [
  'button[aria-label*="exit incognito" i]',
  'button[aria-label*="turn off incognito" i]',
  'button[aria-label*="disable incognito" i]',
  'button[aria-pressed="true"][aria-label*="incognito" i]',
]
const TOGGLE_BUTTON_SELECTORS = [
  'button[aria-label*="incognito" i]',
  '[role="menuitem"][aria-label*="incognito" i]',
]

const READY_WAIT_MS = 10_000
const RETRY_ATTEMPTS = 8
const RETRY_WAIT_MS = 400

function readCookie(name: string): string | null {
  const raw = document.cookie
  if (!raw) return null
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    if (key === name) {
      return part.slice(idx + 1).trim()
    }
  }
  return null
}

function queryFirst(selectors: readonly string[]): HTMLElement | null {
  for (const sel of selectors) {
    try {
      const el = document.querySelector<HTMLElement>(sel)
      if (el) return el
    } catch {
      // Ignore unsupported selector syntax
    }
  }
  return null
}

function detectPerplexityActive(): boolean {
  const cookie = readCookie(INCOGNITO_COOKIE)
  if (cookie === 'true') return true
  if (cookie === 'false') return false
  return queryFirst(ACTIVE_BUTTON_SELECTORS) != null
}

function dispatchIncognitoShortcut(): void {
  const event = new KeyboardEvent('keydown', {
    key: ';',
    code: 'Semicolon',
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  })
  document.dispatchEvent(event)
}

export const perplexityAdapter: ProviderAdapter = {
  id: 'perplexity',
  displayName: 'Perplexity',
  hostname: 'perplexity.ai',

  matches(url) {
    return url.hostname === 'perplexity.ai' || url.hostname === 'www.perplexity.ai'
  },

  isChatContext(url) {
    const p = url.pathname
    if (p === '/' || p === '') return true
    if (p === '/search' || p === '/search/' || p.startsWith('/search/')) return true
    return false
  },

  isFreshChat(url) {
    const p = url.pathname
    return p === '/' || p === ''
  },

  isTemporaryUrl() {
    return false
  },

  buildTemporaryUrl() {
    return null
  },

  detectActive() {
    return detectPerplexityActive()
  },

  async activateViaDom() {
    if (detectPerplexityActive()) return true

    const ready = await waitFor(
      () => detectPerplexityActive() || document.querySelector(APP_READY_SELECTOR) != null,
      READY_WAIT_MS,
    )
    if (!ready) return false

    for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
      if (detectPerplexityActive()) return true
      dispatchIncognitoShortcut()
      const activated = await waitFor(() => detectPerplexityActive(), RETRY_WAIT_MS)
      if (activated) return true
    }

    const fallbackBtn = queryFirst(TOGGLE_BUTTON_SELECTORS)
    if (fallbackBtn && !detectPerplexityActive()) {
      fallbackBtn.click()
      return await waitFor(() => detectPerplexityActive(), 1_500)
    }

    return detectPerplexityActive()
  },

  async deactivateViaDom() {
    if (!detectPerplexityActive()) return true
    dispatchIncognitoShortcut()
    const deactivated = await waitFor(() => !detectPerplexityActive(), 1_500)
    if (deactivated) return true
    const fallbackBtn = queryFirst(TOGGLE_BUTTON_SELECTORS)
    if (fallbackBtn && detectPerplexityActive()) {
      fallbackBtn.click()
      return await waitFor(() => !detectPerplexityActive(), 1_500)
    }
    return !detectPerplexityActive()
  },
}
