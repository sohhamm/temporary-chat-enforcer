import type {ProviderAdapter} from './types'

const INCOGNITO_PARAM = 'incognito'

function hasIncognitoParam(url: URL): boolean {
  // The visible Claude URL is `/new?incognito` — a flag-style param with no value.
  return url.searchParams.has(INCOGNITO_PARAM)
}

export const claudeAdapter: ProviderAdapter = {
  id: 'claude',
  displayName: 'Claude',
  docsUrl: 'https://support.claude.com/en/articles/12260368-using-incognito-chats',

  matches(url) {
    return url.hostname === 'claude.ai' || url.hostname === 'www.claude.ai'
  },

  isChatContext(url) {
    const p = url.pathname
    if (p === '/' || p === '') return true
    if (p === '/new' || p === '/new/') return true
    if (p.startsWith('/chat/')) return true
    if (p.startsWith('/project/') && p.includes('/chat/')) return true
    return false
  },

  isFreshChat(url) {
    // claude.ai/ and claude.ai/new are starting points eligible for auto-redirect.
    // /chat/<id> is an existing conversation — warn but don't redirect away.
    const p = url.pathname
    if (p === '/' || p === '') return true
    if (p === '/new' || p === '/new/') return true
    return false
  },

  isTemporaryUrl(url) {
    return hasIncognitoParam(url)
  },

  buildTemporaryUrl(url) {
    // Canonical incognito entry is /new?incognito (flag-style, no `=`).
    return `${url.origin}/new?${INCOGNITO_PARAM}`
  },

  detectActive() {
    if (hasIncognitoParam(new URL(window.location.href))) return true
    // Claude shows a header strip with a ghost icon and the text "Incognito chat" while in incognito.
    const text = document.body?.textContent ?? ''
    if (/incognito chat/i.test(text.slice(0, 2000))) return true
    return false
  },

  deactivateUrl(url) {
    if (!hasIncognitoParam(url)) return null
    return `${url.origin}/`
  },
}
