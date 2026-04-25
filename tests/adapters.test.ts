import {describe, expect, it} from 'vitest'
import {ADAPTERS_BY_ID, adapterForUrl} from '@/lib/adapters'

const url = (s: string) => new URL(s)

describe('adapterForUrl', () => {
  it('matches each provider by hostname', () => {
    expect(adapterForUrl('https://chatgpt.com/')?.id).toBe('chatgpt')
    expect(adapterForUrl('https://www.chatgpt.com/c/abc')?.id).toBe('chatgpt')
    expect(adapterForUrl('https://claude.ai/new?incognito')?.id).toBe('claude')
    expect(adapterForUrl('https://gemini.google.com/app')?.id).toBe('gemini')
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
    expect(a.buildTemporaryUrl(url('https://claude.ai/'))).toBe(
      'https://claude.ai/new?incognito',
    )
    expect(a.buildTemporaryUrl(url('https://claude.ai/chat/abc?foo=bar'))).toBe(
      'https://claude.ai/new?incognito',
    )
  })
})

describe('gemini adapter', () => {
  const a = ADAPTERS_BY_ID.gemini

  it('isFreshChat: root and /app', () => {
    expect(a.isFreshChat(url('https://gemini.google.com/'))).toBe(true)
    expect(a.isFreshChat(url('https://gemini.google.com/app'))).toBe(true)
    expect(a.isFreshChat(url('https://gemini.google.com/app/'))).toBe(true)
    expect(a.isFreshChat(url('https://gemini.google.com/app/conv-id'))).toBe(false)
  })

  it('isChatContext: includes /app/<id>', () => {
    expect(a.isChatContext(url('https://gemini.google.com/app'))).toBe(true)
    expect(a.isChatContext(url('https://gemini.google.com/app/conv-id'))).toBe(true)
    expect(a.isChatContext(url('https://gemini.google.com/about'))).toBe(false)
  })

  it('isTemporaryUrl: never (no URL signal exists)', () => {
    expect(a.isTemporaryUrl(url('https://gemini.google.com/app'))).toBe(false)
    expect(a.isTemporaryUrl(url('https://gemini.google.com/app?temporary=true'))).toBe(false)
  })

  it('buildTemporaryUrl: returns null', () => {
    expect(a.buildTemporaryUrl(url('https://gemini.google.com/app'))).toBeNull()
  })
})
