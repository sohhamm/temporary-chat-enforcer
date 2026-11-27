import {describe, expect, it} from 'bun:test'
import {DEFAULT_SETTINGS, isSiteEnabled, mergeWithDefaults} from '@/lib/settings-model'

describe('settings', () => {
  it('merges partial stored settings over defaults without dropping new providers', () => {
    const merged = mergeWithDefaults({
      enabled: true,
      sites: {
        chatgpt: {enabled: false},
        claude: {enabled: true},
        gemini: undefined as unknown as {enabled: boolean},
        grok: undefined as unknown as {enabled: boolean},
        perplexity: undefined as unknown as {enabled: boolean},
      },
    })
    expect(merged.enabled).toBe(true)
    expect(merged.bannerMode).toBe('always')
    expect(merged.sites.chatgpt.enabled).toBe(false)
    expect(merged.sites.claude.enabled).toBe(true)
    expect(merged.sites.gemini.enabled).toBe(true)
    expect(merged.sites.grok.enabled).toBe(true)
    expect(merged.sites.perplexity.enabled).toBe(true)
  })

  it('preserves valid bannerMode and falls back for unknown values', () => {
    expect(mergeWithDefaults({bannerMode: 'warnings'}).bannerMode).toBe('warnings')
    expect(mergeWithDefaults({bannerMode: 'off'}).bannerMode).toBe('off')
    expect(mergeWithDefaults({bannerMode: 'invalid' as never}).bannerMode).toBe('always')
  })

  it('returns fresh default clone when storage is empty', () => {
    const merged = mergeWithDefaults(null)
    expect(merged).toEqual(DEFAULT_SETTINGS)
    expect(merged).not.toBe(DEFAULT_SETTINGS)
  })

  it('evaluates isSiteEnabled against master and per-site flags', () => {
    expect(isSiteEnabled(DEFAULT_SETTINGS, 'chatgpt')).toBe(true)
    expect(isSiteEnabled({...DEFAULT_SETTINGS, enabled: false}, 'chatgpt')).toBe(false)
    expect(
      isSiteEnabled(
        {
          ...DEFAULT_SETTINGS,
          sites: {...DEFAULT_SETTINGS.sites, gemini: {enabled: false}},
        },
        'gemini',
      ),
    ).toBe(false)
  })
})
