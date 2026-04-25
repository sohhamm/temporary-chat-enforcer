import {waitFor} from '../dom/wait'
import type {ProviderAdapter} from './types'

// Gemini has no documented URL parameter for temporary chat — activation goes through a
// sidebar icon button. Selectors below are taken from the live page; revalidate if Google
// rebuilds the sidebar.
const TEMP_BUTTON_SELECTORS = [
  '[data-test-id="temp-chat-button"]',
  'button[aria-label="Temporary chat" i]',
]

const ACTIVE_BUTTON_SELECTORS = [
  '[data-test-id="temp-chat-button"].temp-chat-on',
  'button[aria-label="Temporary chat" i].temp-chat-on',
]

const BUTTON_WAIT_MS = 4000

function findFirst(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel)
    if (el) return el
  }
  return null
}

function placeholderSignal(): boolean {
  const candidates = document.querySelectorAll<HTMLElement>(
    'input[placeholder], textarea[placeholder], [contenteditable][aria-label]',
  )
  for (const el of candidates) {
    const text = (
      el.getAttribute('placeholder') ??
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
    if (/^\s*temporary chat\s*$/i.test(h.textContent ?? '')) return true
  }
  return false
}

async function findButton(timeoutMs = BUTTON_WAIT_MS): Promise<HTMLElement | null> {
  const ok = await waitFor(() => findFirst(TEMP_BUTTON_SELECTORS) != null, timeoutMs)
  if (!ok) return null
  return findFirst(TEMP_BUTTON_SELECTORS)
}

export const geminiAdapter: ProviderAdapter = {
  id: 'gemini',
  displayName: 'Gemini',
  docsUrl:
    'https://support.google.com/gemini/answer/13275745?visit_id=638889059849455150-2388016392&p=temp_chats&rd=1#temp_chats',

  matches(url) {
    return url.hostname === 'gemini.google.com'
  },

  isChatContext(url) {
    const p = url.pathname
    if (p === '/' || p === '') return true
    if (p === '/app' || p === '/app/' || p.startsWith('/app/')) return true
    return false
  },

  isFreshChat(url) {
    // /app and /app/ are the main entry. /app/<id> is an existing conversation.
    const p = url.pathname
    if (p === '/' || p === '') return true
    if (p === '/app' || p === '/app/') return true
    return false
  },

  isTemporaryUrl() {
    // No URL signal exists today.
    return false
  },

  buildTemporaryUrl() {
    return null
  },

  detectActive() {
    if (findFirst(ACTIVE_BUTTON_SELECTORS)) return true
    if (placeholderSignal()) return true
    if (headingSignal()) return true
    return false
  },

  async activateViaDom() {
    const button = await findButton()
    if (!button) return false
    if (button.classList.contains('temp-chat-on')) return true
    button.click()
    return true
  },

  async deactivateViaDom() {
    const button = await findButton(2000)
    if (!button) return false
    if (!button.classList.contains('temp-chat-on')) return true
    button.click()
    return true
  },
}
