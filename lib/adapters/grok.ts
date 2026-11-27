import {waitFor} from '../dom/wait'
import type {ProviderAdapter} from './types'

const PRIVATE_TEXT_RE = /^private(?:\s+chat)?$/i
const EXIT_PRIVATE_LABEL_RE =
  /(?:turn off|exit|leave|disable).*private|switch to (?:regular|normal|standard) chat/i
const PRIVATE_NOTICE_RE = /this chat won['’]t appear in your history/i
const PRIVATE_HEADING_RE = /^\s*private chat\s*$/i

const PRIVATE_BUTTON_SELECTORS = [
  'button[aria-label*="private chat" i]',
  'a[aria-label*="private chat" i]',
  'button[aria-label="Private" i]',
  'a[href*="#private"]',
  'button[data-testid*="private" i]',
]

const BUTTON_WAIT_MS = 10_000
const HYDRATION_RETRY_ATTEMPTS = 10
const HYDRATION_RETRY_WAIT_MS = 400

function querySafe(selector: string): HTMLElement | null {
  try {
    return document.querySelector<HTMLElement>(selector)
  } catch {
    return null
  }
}

function findPrivateButton(): HTMLElement | null {
  for (const sel of PRIVATE_BUTTON_SELECTORS) {
    const el = querySafe(sel)
    if (el) return el
  }

  const interactive = document.querySelectorAll<HTMLElement>('button, a[role="button"], a[href]')
  for (const el of interactive) {
    const text = (el.textContent ?? '').trim()
    if (PRIVATE_TEXT_RE.test(text)) return el
  }

  return null
}

function isPrivateUrl(url: URL): boolean {
  if (url.hash.toLowerCase() === '#private') return true
  if (url.searchParams.get('private') === 'true') return true
  return false
}

function buttonActiveState(btn: HTMLElement): boolean | null {
  const ariaPressed = btn.getAttribute('aria-pressed')
  if (ariaPressed === 'true') return true
  if (btn.hasAttribute('data-pressed')) return true

  const state = (btn.getAttribute('data-state') ?? '').toLowerCase()
  if (state === 'on' || state === 'active' || state === 'checked') return true
  if (btn.getAttribute('data-active') === 'true') return true

  const label = btn.getAttribute('aria-label') ?? ''
  if (EXIT_PRIVATE_LABEL_RE.test(label)) return true

  if (ariaPressed === 'false') return false
  return null
}

function visibleNoticeSignal(): boolean {
  const nodes = document.querySelectorAll<HTMLElement>('p, span, div, h1, h2, h3, [role="heading"]')
  for (const node of nodes) {
    if (node.children.length > 2) continue
    const text = (node.textContent ?? '').trim()
    if (!text) continue
    if (PRIVATE_NOTICE_RE.test(text)) return true
    if (
      (node.tagName === 'H1' ||
        node.tagName === 'H2' ||
        node.tagName === 'H3' ||
        node.getAttribute('role') === 'heading') &&
      PRIVATE_HEADING_RE.test(text)
    ) {
      return true
    }
  }
  return false
}

function detectGrokActive(): boolean {
  try {
    if (isPrivateUrl(new URL(window.location.href))) return true
  } catch {
    // Ignore malformed test URLs
  }

  const btn = findPrivateButton()
  if (btn) {
    const explicit = buttonActiveState(btn)
    if (explicit !== null) return explicit
  }

  return visibleNoticeSignal()
}

async function waitForPrivateButton(timeoutMs = BUTTON_WAIT_MS): Promise<HTMLElement | null> {
  const ok = await waitFor(() => findPrivateButton() != null, timeoutMs)
  if (!ok) return null
  return findPrivateButton()
}

export const grokAdapter: ProviderAdapter = {
  id: 'grok',
  displayName: 'Grok',
  hostname: 'grok.com',

  matches(url) {
    return url.hostname === 'grok.com' || url.hostname === 'www.grok.com'
  },

  isChatContext(url) {
    const p = url.pathname
    if (p === '/' || p === '') return true
    if (p === '/c' || p === '/c/' || p.startsWith('/c/')) return true
    if (p === '/chat' || p === '/chat/' || p.startsWith('/chat/')) return true
    if (p.startsWith('/project/') && p.includes('/chat/')) return true
    return false
  },

  isFreshChat(url) {
    const p = url.pathname
    if (p === '/' || p === '') return true
    if (p === '/c' || p === '/c/') return true
    if (p === '/chat' || p === '/chat/') return true
    return false
  },

  isTemporaryUrl(url) {
    return isPrivateUrl(url)
  },

  buildTemporaryUrl() {
    return null
  },

  detectActive() {
    return detectGrokActive()
  },

  async activateViaDom() {
    if (detectGrokActive()) return true
    const initial = await waitForPrivateButton()
    if (!initial) return false

    for (let attempt = 0; attempt < HYDRATION_RETRY_ATTEMPTS; attempt++) {
      if (detectGrokActive()) return true
      const button = findPrivateButton()
      if (!button) return false
      button.click()
      const activated = await waitFor(() => detectGrokActive(), HYDRATION_RETRY_WAIT_MS)
      if (activated) return true
    }

    return detectGrokActive()
  },

  async deactivateViaDom() {
    if (!detectGrokActive()) return true
    const button = await waitForPrivateButton(3_000)
    if (!button) return false
    if (!detectGrokActive()) return true
    button.click()
    return true
  },
}
