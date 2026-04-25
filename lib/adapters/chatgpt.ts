import type {ProviderAdapter} from './types'

const TEMP_PARAM = 'temporary-chat'

function hasTempParam(url: URL): boolean {
  return url.searchParams.get(TEMP_PARAM) === 'true'
}

export const chatgptAdapter: ProviderAdapter = {
  id: 'chatgpt',
  displayName: 'ChatGPT',
  docsUrl: 'https://help.openai.com/en/articles/8914046-temporary-chats-faq',

  matches(url) {
    return url.hostname === 'chatgpt.com' || url.hostname === 'www.chatgpt.com'
  },

  isChatContext(url) {
    // /, /c/<id>, /g/<id>/c/<id>, /g/<id> (custom GPT). Excludes /settings, /pricing, /share/<id> (read-only), /auth, etc.
    const p = url.pathname
    if (p === '/' || p === '') return true
    if (p.startsWith('/c/')) return true
    if (p.startsWith('/g/')) return true
    return false
  },

  isFreshChat(url) {
    // Root only. Existing /c/<id> threads should warn but not auto-redirect away.
    if (url.pathname === '/' || url.pathname === '') return true
    return false
  },

  isTemporaryUrl(url) {
    return hasTempParam(url)
  },

  buildTemporaryUrl(url) {
    // Canonical fresh temporary-chat entry — used both for redirect on landing and the
    // "Start new temporary chat" action from an existing-chat warning.
    return `${url.origin}/?${TEMP_PARAM}=true`
  },

  detectActive() {
    if (hasTempParam(new URL(window.location.href))) return true
    // Fallback: ChatGPT shows a "Temporary Chat" label/badge in the header when active.
    // Scan all header-ish elements rather than just the first; sites often have multiple.
    const headers = document.querySelectorAll('header, [data-testid="conversation-header"]')
    for (const h of headers) {
      if (/temporary chat/i.test(h.textContent ?? '')) return true
    }
    return false
  },

  deactivateUrl(url) {
    // Drop the temporary-chat flag by going home; preserves no chat state, which is
    // intentional — temp chats are not persisted anyway.
    if (!hasTempParam(url)) return null
    return `${url.origin}/`
  },
}
