import {afterEach, beforeEach, describe, expect, it} from 'bun:test'
import {Window} from 'happy-dom'
import {ADAPTERS_BY_ID, adapterForUrl} from '@/lib/adapters'

const url = (s: string) => new URL(s)

describe('adapterForUrl', () => {
  it('matches each provider by hostname', () => {
    expect(adapterForUrl('https://chatgpt.com/')?.id).toBe('chatgpt')
    expect(adapterForUrl('https://www.chatgpt.com/c/abc')?.id).toBe('chatgpt')
    expect(adapterForUrl('https://claude.ai/new?incognito')?.id).toBe('claude')
    expect(adapterForUrl('https://www.claude.ai/new')?.id).toBe('claude')
    expect(adapterForUrl('https://gemini.google.com/app')?.id).toBe('gemini')
    expect(adapterForUrl('https://grok.com/')?.id).toBe('grok')
    expect(adapterForUrl('https://www.grok.com/c#private')?.id).toBe('grok')
    expect(adapterForUrl('https://www.perplexity.ai/')?.id).toBe('perplexity')
    expect(adapterForUrl('https://perplexity.ai/search/test')?.id).toBe('perplexity')
  })

  it('accepts an already-parsed URL', () => {
    expect(adapterForUrl(url('https://claude.ai/new'))?.id).toBe('claude')
    expect(adapterForUrl(url('https://example.com/'))).toBeNull()
  })

  it('returns null for unsupported hosts and invalid URLs', () => {
    expect(adapterForUrl('https://example.com/')).toBeNull()
    expect(adapterForUrl('not-a-url')).toBeNull()
  })
})

describe('chatgpt adapter', () => {
  const a = ADAPTERS_BY_ID.chatgpt

  it('isFreshChat: only root', () => {
    expect(a.isFreshChat(url('https://chatgpt.com/'))).toBe(true)
    expect(a.isFreshChat(url('https://chatgpt.com/?model=o1'))).toBe(true)
    expect(a.isFreshChat(url('https://chatgpt.com/c/abc'))).toBe(false)
    expect(a.isFreshChat(url('https://chatgpt.com/g/g-xyz'))).toBe(false)
  })

  it('isChatContext: root, /c/<id>, /g/<id>', () => {
    expect(a.isChatContext(url('https://chatgpt.com/'))).toBe(true)
    expect(a.isChatContext(url('https://chatgpt.com/c/abc'))).toBe(true)
    expect(a.isChatContext(url('https://chatgpt.com/g/g-xyz'))).toBe(true)
    expect(a.isChatContext(url('https://chatgpt.com/settings'))).toBe(false)
    expect(a.isChatContext(url('https://chatgpt.com/auth/login'))).toBe(false)
  })

  it('isTemporaryUrl: only when temporary-chat=true', () => {
    expect(a.isTemporaryUrl(url('https://chatgpt.com/?temporary-chat=true'))).toBe(true)
    expect(a.isTemporaryUrl(url('https://chatgpt.com/?temporary-chat=false'))).toBe(false)
    expect(a.isTemporaryUrl(url('https://chatgpt.com/'))).toBe(false)
    expect(a.isTemporaryUrl(url('https://chatgpt.com/c/abc?temporary-chat=true'))).toBe(true)
  })

  it('buildTemporaryUrl: canonical fresh URL regardless of input', () => {
    expect(a.buildTemporaryUrl(url('https://chatgpt.com/'))).toBe(
      'https://chatgpt.com/?temporary-chat=true',
    )
    expect(a.buildTemporaryUrl(url('https://chatgpt.com/c/abc?model=o1'))).toBe(
      'https://chatgpt.com/?temporary-chat=true',
    )
  })

  it('deactivateUrl: strips temporary-chat flag by returning root', () => {
    expect(a.deactivateUrl?.(url('https://chatgpt.com/?temporary-chat=true'))).toBe(
      'https://chatgpt.com/',
    )
    expect(a.deactivateUrl?.(url('https://chatgpt.com/'))).toBeNull()
  })
})

describe('claude adapter', () => {
  const a = ADAPTERS_BY_ID.claude

  it('isFreshChat: root and /new', () => {
    expect(a.isFreshChat(url('https://claude.ai/'))).toBe(true)
    expect(a.isFreshChat(url('https://claude.ai/new'))).toBe(true)
    expect(a.isFreshChat(url('https://claude.ai/new?incognito'))).toBe(true)
    expect(a.isFreshChat(url('https://claude.ai/chat/abc'))).toBe(false)
    expect(a.isFreshChat(url('https://claude.ai/projects'))).toBe(false)
  })

  it('isChatContext: includes /chat/<id> and project chats', () => {
    expect(a.isChatContext(url('https://claude.ai/'))).toBe(true)
    expect(a.isChatContext(url('https://claude.ai/new'))).toBe(true)
    expect(a.isChatContext(url('https://claude.ai/chat/abc'))).toBe(true)
    expect(a.isChatContext(url('https://claude.ai/project/p-1/chat/c-1'))).toBe(true)
    expect(a.isChatContext(url('https://claude.ai/settings'))).toBe(false)
    expect(a.isChatContext(url('https://claude.ai/projects'))).toBe(false)
  })

  it('isTemporaryUrl: when ?incognito flag is present', () => {
    expect(a.isTemporaryUrl(url('https://claude.ai/new?incognito'))).toBe(true)
    expect(a.isTemporaryUrl(url('https://claude.ai/new?incognito=1'))).toBe(true)
    expect(a.isTemporaryUrl(url('https://claude.ai/new'))).toBe(false)
    expect(a.isTemporaryUrl(url('https://claude.ai/chat/abc?incognito'))).toBe(true)
  })

  it('buildTemporaryUrl: canonical /new?incognito with no trailing =', () => {
    expect(a.buildTemporaryUrl(url('https://claude.ai/'))).toBe('https://claude.ai/new?incognito')
    expect(a.buildTemporaryUrl(url('https://claude.ai/chat/abc?foo=bar'))).toBe(
      'https://claude.ai/new?incognito',
    )
  })

  it('deactivateUrl: strips incognito flag by returning root', () => {
    expect(a.deactivateUrl?.(url('https://claude.ai/new?incognito'))).toBe('https://claude.ai/')
    expect(a.deactivateUrl?.(url('https://claude.ai/new'))).toBeNull()
  })
})

describe('gemini adapter', () => {
  const a = ADAPTERS_BY_ID.gemini
  let dom: Window

  beforeEach(() => {
    dom = new Window({url: 'https://gemini.google.com/app'})
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.document,
      MutationObserver: dom.MutationObserver,
    })
  })

  afterEach(async () => {
    await dom.happyDOM.close()
  })

  it('isFreshChat: root, /app, and multi-account /u/<n>/app', () => {
    expect(a.isFreshChat(url('https://gemini.google.com/'))).toBe(true)
    expect(a.isFreshChat(url('https://gemini.google.com/app'))).toBe(true)
    expect(a.isFreshChat(url('https://gemini.google.com/app/'))).toBe(true)
    expect(a.isFreshChat(url('https://gemini.google.com/u/1/app'))).toBe(true)
    expect(a.isFreshChat(url('https://gemini.google.com/u/0/app/'))).toBe(true)
    expect(a.isFreshChat(url('https://gemini.google.com/app/conv-id'))).toBe(false)
    expect(a.isFreshChat(url('https://gemini.google.com/u/1/app/conv-id'))).toBe(false)
  })

  it('isChatContext: includes /app/<id> and /u/<n>/app/<id>', () => {
    expect(a.isChatContext(url('https://gemini.google.com/app'))).toBe(true)
    expect(a.isChatContext(url('https://gemini.google.com/app/conv-id'))).toBe(true)
    expect(a.isChatContext(url('https://gemini.google.com/u/2/app'))).toBe(true)
    expect(a.isChatContext(url('https://gemini.google.com/u/2/app/conv-id'))).toBe(true)
    expect(a.isChatContext(url('https://gemini.google.com/about'))).toBe(false)
  })

  it('isTemporaryUrl: never (no URL signal exists)', () => {
    expect(a.isTemporaryUrl(url('https://gemini.google.com/app'))).toBe(false)
    expect(a.isTemporaryUrl(url('https://gemini.google.com/app?temporary=true'))).toBe(false)
  })

  it('buildTemporaryUrl: returns null', () => {
    expect(a.buildTemporaryUrl(url('https://gemini.google.com/app'))).toBeNull()
  })

  it('detectActive: recognizes active button class, aria-pressed, icon, placeholder, and heading signals', () => {
    expect(a.detectActive()).toBe(false)

    dom.document.body.innerHTML = `<button data-test-id="temp-chat-button" class="temp-chat-on"></button>`
    expect(a.detectActive()).toBe(true)

    dom.document.body.innerHTML = `<temp-chat-button><button aria-pressed="true"></button></temp-chat-button>`
    expect(a.detectActive()).toBe(true)

    dom.document.body.innerHTML = `<button><mat-icon fonticon="gemini_chat_temp_filled"></mat-icon></button>`
    expect(a.detectActive()).toBe(true)

    dom.document.body.innerHTML = `<textarea placeholder="Ask a temporary chat question"></textarea>`
    expect(a.detectActive()).toBe(true)

    dom.document.body.innerHTML = `<h1>Temporary chat</h1>`
    expect(a.detectActive()).toBe(true)
  })

  it('activateViaDom and deactivateViaDom toggle the 2026 <temp-chat-button> element', async () => {
    dom.document.body.innerHTML = `<temp-chat-button><button aria-pressed="false"></button></temp-chat-button>`
    const btn = dom.document.querySelector('temp-chat-button button')!
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('aria-pressed') !== 'true'
      btn.setAttribute('aria-pressed', String(next))
    })

    expect(await a.activateViaDom?.()).toBe(true)
    expect(btn.getAttribute('aria-pressed')).toBe('true')

    expect(await a.deactivateViaDom?.()).toBe(true)
    expect(btn.getAttribute('aria-pressed')).toBe('false')
  })

  it('activateViaDom expands a collapsed sidebar to reveal the temp-chat button', async () => {
    dom.document.body.innerHTML = `
      <div class="sidenav-with-history-container collapsed">
        <button data-test-id="side-nav-menu-button"></button>
      </div>
    `
    const nav = dom.document.querySelector('.sidenav-with-history-container')!
    const hamburger = dom.document.querySelector('[data-test-id="side-nav-menu-button"]')!
    let clickedTemp = false
    hamburger.addEventListener('click', () => {
      nav.classList.remove('collapsed')
      const wrapper = dom.document.createElement('temp-chat-button')
      const tempBtn = dom.document.createElement('button')
      tempBtn.addEventListener('click', () => {
        clickedTemp = true
        tempBtn.setAttribute('aria-pressed', 'true')
      })
      wrapper.appendChild(tempBtn)
      nav.appendChild(wrapper)
    })

    expect(await a.activateViaDom?.()).toBe(true)
    expect(clickedTemp).toBe(true)
    expect(a.detectActive()).toBe(true)
  })
})

describe('grok adapter', () => {
  const a = ADAPTERS_BY_ID.grok
  let dom: Window

  beforeEach(() => {
    dom = new Window({url: 'https://grok.com/'})
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.document,
      MutationObserver: dom.MutationObserver,
    })
  })

  afterEach(async () => {
    await dom.happyDOM.close()
  })

  it('isFreshChat: root, /c, and /chat', () => {
    expect(a.isFreshChat(url('https://grok.com/'))).toBe(true)
    expect(a.isFreshChat(url('https://grok.com/c'))).toBe(true)
    expect(a.isFreshChat(url('https://grok.com/c#private'))).toBe(true)
    expect(a.isFreshChat(url('https://grok.com/c/conv-123'))).toBe(false)
    expect(a.isFreshChat(url('https://grok.com/imagine'))).toBe(false)
  })

  it('isChatContext: includes /c/<id> and excludes non-chat pages', () => {
    expect(a.isChatContext(url('https://grok.com/'))).toBe(true)
    expect(a.isChatContext(url('https://grok.com/c/conv-123'))).toBe(true)
    expect(a.isChatContext(url('https://grok.com/imagine'))).toBe(false)
    expect(a.isChatContext(url('https://grok.com/settings'))).toBe(false)
  })

  it('isTemporaryUrl: detects #private hash and ?private=true', () => {
    expect(a.isTemporaryUrl(url('https://grok.com/c#private'))).toBe(true)
    expect(a.isTemporaryUrl(url('https://grok.com/#private'))).toBe(true)
    expect(a.isTemporaryUrl(url('https://grok.com/?private=true'))).toBe(true)
    expect(a.isTemporaryUrl(url('https://grok.com/'))).toBe(false)
  })

  it('detectActive: recognizes Grok private notice and Base UI button state without false positives from SSR scripts', () => {
    expect(a.detectActive()).toBe(false)

    // Next.js RSC script payload in body must NOT trigger false positive when button says aria-pressed="false"
    dom.document.body.innerHTML = `
      <header><button type="button" aria-pressed="false" aria-label="Switch to Private Chat">Private</button></header>
      <script>self.__next_f.push([1,"This chat won't appear in your history and will not be used to train models."])</script>
    `
    expect(a.detectActive()).toBe(false)

    dom.document.body.innerHTML = `<p>This chat won't appear in your history and will not be used to train models.</p>`
    expect(a.detectActive()).toBe(true)

    dom.document.body.innerHTML = `<button type="button" aria-pressed="true" aria-label="Exit Private Chat" data-pressed>Private</button>`
    expect(a.detectActive()).toBe(true)
  })

  it('activateViaDom retries across SSR hydration until the Private button toggles active', async () => {
    dom.document.body.innerHTML = `<header><button type="button" aria-pressed="false" aria-label="Switch to Private Chat">Private</button></header>`
    const btn = dom.document.querySelector('button')!
    let clicks = 0
    btn.addEventListener('click', () => {
      clicks += 1
      // Simulate first click hitting unhydrated SSR HTML, second click hitting hydrated React handler
      if (clicks >= 2) {
        btn.setAttribute('aria-pressed', 'true')
        btn.setAttribute('aria-label', 'Exit Private Chat')
        btn.setAttribute('data-pressed', '')
      }
    })

    expect(await a.activateViaDom?.()).toBe(true)
    expect(clicks).toBe(2)
    expect(a.detectActive()).toBe(true)

    btn.addEventListener('click', () => {
      btn.setAttribute('aria-pressed', 'false')
      btn.setAttribute('aria-label', 'Switch to Private Chat')
      btn.removeAttribute('data-pressed')
    })

    expect(await a.deactivateViaDom?.()).toBe(true)
    expect(a.detectActive()).toBe(false)
  })
})

describe('perplexity adapter', () => {
  const a = ADAPTERS_BY_ID.perplexity
  let dom: Window

  beforeEach(() => {
    dom = new Window({url: 'https://www.perplexity.ai/'})
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.document,
      KeyboardEvent: dom.KeyboardEvent,
      MutationObserver: dom.MutationObserver,
    })
  })

  afterEach(async () => {
    await dom.happyDOM.close()
  })

  it('isFreshChat: root only', () => {
    expect(a.isFreshChat(url('https://www.perplexity.ai/'))).toBe(true)
    expect(a.isFreshChat(url('https://perplexity.ai/'))).toBe(true)
    expect(a.isFreshChat(url('https://www.perplexity.ai/search/hello-123'))).toBe(false)
    expect(a.isFreshChat(url('https://www.perplexity.ai/discover'))).toBe(false)
  })

  it('isChatContext: root and /search/* only', () => {
    expect(a.isChatContext(url('https://www.perplexity.ai/'))).toBe(true)
    expect(a.isChatContext(url('https://www.perplexity.ai/search/hello-123'))).toBe(true)
    expect(a.isChatContext(url('https://www.perplexity.ai/discover'))).toBe(false)
    expect(a.isChatContext(url('https://www.perplexity.ai/settings'))).toBe(false)
    expect(a.isChatContext(url('https://www.perplexity.ai/library'))).toBe(false)
  })

  it('detectActive: reads pplx.is-incognito cookie authoritatively', () => {
    expect(a.detectActive()).toBe(false)

    dom.document.cookie = 'pplx.is-incognito=false; path=/'
    expect(a.detectActive()).toBe(false)

    dom.document.cookie = 'pplx.is-incognito=true; path=/'
    expect(a.detectActive()).toBe(true)
  })

  it('activateViaDom and deactivateViaDom dispatch Ctrl+; without double-toggling', async () => {
    dom.document.body.innerHTML = `<main><div id="ask-input" contenteditable="true"></div></main>`
    dom.document.cookie = 'pplx.is-incognito=false; path=/'

    let shortcuts = 0
    dom.document.addEventListener('keydown', e => {
      const ke = e as unknown as KeyboardEvent
      if (ke.ctrlKey && ke.key === ';') {
        shortcuts += 1
        const currentlyOn = dom.document.cookie.includes('pplx.is-incognito=true')
        dom.document.cookie = `pplx.is-incognito=${currentlyOn ? 'false' : 'true'}; path=/`
      }
    })

    expect(await a.activateViaDom?.()).toBe(true)
    expect(shortcuts).toBe(1)
    expect(a.detectActive()).toBe(true)

    // Calling activate again when already active must NOT toggle it off
    expect(await a.activateViaDom?.()).toBe(true)
    expect(shortcuts).toBe(1)
    expect(a.detectActive()).toBe(true)

    expect(await a.deactivateViaDom?.()).toBe(true)
    expect(shortcuts).toBe(2)
    expect(a.detectActive()).toBe(false)
  })
})
