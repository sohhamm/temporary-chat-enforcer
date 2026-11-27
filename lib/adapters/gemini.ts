import {waitFor} from '../dom/wait'
import type {ProviderAdapter} from './types'

const ACCOUNT_PREFIX_RE = /^\/u\/\d+(?=\/|$)/
const TEMPORARY_CHAT_HEADING_RE = /^\s*temporary chat\s*$/i
const EXIT_TEMP_LABEL_RE = /(?:turn off|exit|leave|disable).*temporary chat/i

const TEMP_BUTTON_SELECTORS = [
  'temp-chat-button button',
  'button:has(mat-icon[fonticon="gemini_chat_temp"])',
  'button:has(mat-icon[data-mat-icon-name="gemini_chat_temp"])',
  'button[data-test-id="temp-chat-button"]',
  '[data-test-id="temp-chat-button"]',
  'button[aria-label*="temporary chat" i]',
]

const ACTIVE_SELECTORS = [
  'temp-chat-button.temp-chat-on',
  'temp-chat-button button.temp-chat-on',
  'temp-chat-button button[aria-pressed="true"]',
  '[data-test-id="temp-chat-button"].temp-chat-on',
  'button[aria-label*="temporary chat" i].temp-chat-on',
  'button[aria-label*="temporary chat" i][aria-pressed="true"]',
  'mat-icon[fonticon="gemini_chat_temp_filled"]',
  'mat-icon[data-mat-icon-name="gemini_chat_temp_filled"]',
]

const SIDE_NAV_CONTAINER_SELECTOR = '.sidenav-with-history-container'
const SIDE_NAV_TOGGLE_SELECTOR = 'button[data-test-id="side-nav-menu-button"]'

const BUTTON_WAIT_MS = 10_000
const EXPANDED_BUTTON_WAIT_MS = 3_000

function stripAccountPrefix(pathname: string): string {
  const stripped = pathname.replace(ACCOUNT_PREFIX_RE, '')
  return stripped === '' ? '/' : stripped
}

function querySafe(selector: string): HTMLElement | null {
  try {
    return document.querySelector<HTMLElement>(selector)
  } catch {
    return null
  }
}

function findFirst(selectors: readonly string[]): HTMLElement | null {
  for (const sel of selectors) {
    const el = querySafe(sel)
    if (el) return el
  }
  return null
}

function isSidebarCollapsed(): boolean {
  const nav = querySafe(SIDE_NAV_CONTAINER_SELECTOR)
  return Boolean(nav?.classList.contains('collapsed'))
}

function activeButtonLabelSignal(): boolean {
  const btn = findFirst(TEMP_BUTTON_SELECTORS)
  if (!btn) return false
  const label = btn.getAttribute('aria-label') ?? ''
  return EXIT_TEMP_LABEL_RE.test(label)
}

function placeholderSignal(): boolean {
  const candidates = document.querySelectorAll<HTMLElement>(
    'input[placeholder], textarea[placeholder], [contenteditable][aria-label], [contenteditable][data-placeholder]',
  )
  for (const el of candidates) {
    const text = (
      el.getAttribute('placeholder') ??
      el.getAttribute('data-placeholder') ??
      el.getAttribute('aria-label') ??
      ''
    ).toLowerCase()
    if (text.includes('temporary chat')) return true
  }
  return false
}

function headingSignal(): boolean {
  const headings = document.querySelectorAll<HTMLElement>('h1, h2, h3, [role="heading"]')
  for (const h of headings) {
    if (TEMPORARY_CHAT_HEADING_RE.test(h.textContent ?? '')) return true
  }
  return false
}

function detectGeminiActive(): boolean {
  if (findFirst(ACTIVE_SELECTORS)) return true
  if (activeButtonLabelSignal()) return true
  if (placeholderSignal()) return true
  if (headingSignal()) return true
  return false
}

async function findButton(timeoutMs = BUTTON_WAIT_MS): Promise<HTMLElement | null> {
  const ready = await waitFor(
    () =>
      findFirst(TEMP_BUTTON_SELECTORS) != null ||
      (isSidebarCollapsed() && querySafe(SIDE_NAV_TOGGLE_SELECTOR) != null),
    timeoutMs,
  )
  if (!ready) return null

  const direct = findFirst(TEMP_BUTTON_SELECTORS)
  if (direct) return direct

  if (isSidebarCollapsed()) {
    const toggle = querySafe(SIDE_NAV_TOGGLE_SELECTOR)
    toggle?.click()
    const appeared = await waitFor(
      () => findFirst(TEMP_BUTTON_SELECTORS) != null,
      EXPANDED_BUTTON_WAIT_MS,
    )
    if (appeared) return findFirst(TEMP_BUTTON_SELECTORS)
  }

  return null
}

export const geminiAdapter: ProviderAdapter = {
  id: 'gemini',
  displayName: 'Gemini',
  hostname: 'gemini.google.com',

  matches(url) {
    return url.hostname === 'gemini.google.com'
  },

  isChatContext(url) {
    const p = stripAccountPrefix(url.pathname)
    if (p === '/' || p === '') return true
    if (p === '/app' || p === '/app/' || p.startsWith('/app/')) return true
    return false
  },

  isFreshChat(url) {
    const p = stripAccountPrefix(url.pathname)
    if (p === '/' || p === '') return true
    if (p === '/app' || p === '/app/') return true
    return false
  },

  isTemporaryUrl() {
    return false
  },

  buildTemporaryUrl() {
    return null
  },

  detectActive() {
    return detectGeminiActive()
  },

  async activateViaDom() {
    if (detectGeminiActive()) return true
    const button = await findButton()
    if (!button) return false
    if (detectGeminiActive()) return true
    button.click()
    return true
  },

  async deactivateViaDom() {
    if (!detectGeminiActive()) return true
    const button = await findButton(3_000)
    if (!button) return false
    if (!detectGeminiActive()) return true
    button.click()
    return true
  },
}
