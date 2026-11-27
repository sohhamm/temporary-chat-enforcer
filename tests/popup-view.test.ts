import {describe, expect, it} from 'bun:test'
import {ADAPTERS_BY_ID} from '@/lib/adapters'
import {computePopupView, type ActiveTabSnapshot} from '@/lib/popup/view'
import {DEFAULT_SETTINGS, type Settings} from '@/lib/settings-model'

function makeSnapshot(overrides: Partial<ActiveTabSnapshot> = {}): ActiveTabSnapshot {
  return {
    loading: false,
    tabId: 1,
    url: null,
    adapter: null,
    liveStatus: null,
    ...overrides,
  }
}

describe('computePopupView', () => {
  it('shows pending while initial tab query is in flight', () => {
    const view = computePopupView(makeSnapshot({loading: true}), DEFAULT_SETTINGS)
    expect(view.state).toBe('pending')
    expect(view.title).toBe('Checking tab…')
  })

  it('shows idle on non-LLM tabs where Chrome omits tab.url', () => {
    const view = computePopupView(makeSnapshot({loading: false, url: null}), DEFAULT_SETTINGS)
    expect(view.state).toBe('idle')
    expect(view.title).toBe('Inactive on this tab')
  })

  it('shows idle on non-chat pages of supported providers (settings, projects, about)', () => {
    const view = computePopupView(
      makeSnapshot({
        url: 'https://chatgpt.com/settings',
        adapter: ADAPTERS_BY_ID.chatgpt,
      }),
      DEFAULT_SETTINGS,
    )
    expect(view.state).toBe('idle')
    expect(view.title).toBe('Not a chat page')
  })

  it('shows active on Gemini when content script reports live DOM confirmation', () => {
    const view = computePopupView(
      makeSnapshot({
        url: 'https://gemini.google.com/app',
        adapter: ADAPTERS_BY_ID.gemini,
        liveStatus: {
          kind: 'active',
          providerId: 'gemini',
          provider: 'Gemini',
          host: 'gemini.google.com',
        },
      }),
      DEFAULT_SETTINGS,
    )
    expect(view.state).toBe('active')
    expect(view.title).toBe('Temporary chat active')
  })

  it('prompts reload on Gemini when content script has not attached yet instead of falsely showing exposed', () => {
    const view = computePopupView(
      makeSnapshot({
        url: 'https://gemini.google.com/app',
        adapter: ADAPTERS_BY_ID.gemini,
        liveStatus: null,
      }),
      DEFAULT_SETTINGS,
    )
    expect(view.state).toBe('pending')
    expect(view.title).toBe('Reload tab to detect')
  })

  it('exposes switch action when live status is exposed and engageable', () => {
    const view = computePopupView(
      makeSnapshot({
        url: 'https://chatgpt.com/c/123',
        adapter: ADAPTERS_BY_ID.chatgpt,
        liveStatus: {
          kind: 'exposed',
          providerId: 'chatgpt',
          provider: 'ChatGPT',
          host: 'chatgpt.com',
          reason: 'This is not a temporary chat on ChatGPT.',
          canEngage: true,
          actionUrl: 'https://chatgpt.com/?temporary-chat=true',
        },
      }),
      DEFAULT_SETTINGS,
    )
    expect(view.state).toBe('exposed')
    expect(view.canEngage).toBe(true)
    expect(view.actionUrl).toBe('https://chatgpt.com/?temporary-chat=true')
  })

  it('reports paused when master or per-site switch is disabled', () => {
    const disabledMaster: Settings = {...DEFAULT_SETTINGS, enabled: false}
    const masterView = computePopupView(
      makeSnapshot({
        url: 'https://claude.ai/new',
        adapter: ADAPTERS_BY_ID.claude,
      }),
      disabledMaster,
    )
    expect(masterView.state).toBe('off')
    expect(masterView.title).toBe('Extension paused')

    const disabledClaude: Settings = {
      ...DEFAULT_SETTINGS,
      sites: {
        ...DEFAULT_SETTINGS.sites,
        claude: {enabled: false},
      },
    }
    const siteView = computePopupView(
      makeSnapshot({
        url: 'https://claude.ai/new',
        adapter: ADAPTERS_BY_ID.claude,
      }),
      disabledClaude,
    )
    expect(siteView.state).toBe('off')
    expect(siteView.title).toBe('Paused on Claude')
  })

  it('offers Show badge on tab when dismissed and allowed by bannerMode', () => {
    const activeDismissed = makeSnapshot({
      url: 'https://grok.com/',
      adapter: ADAPTERS_BY_ID.grok,
      liveStatus: {
        kind: 'active',
        providerId: 'grok',
        provider: 'Grok',
        host: 'grok.com',
        bannerDismissed: true,
      },
    })

    expect(computePopupView(activeDismissed, DEFAULT_SETTINGS).canRestoreBanner).toBe(true)
    expect(
      computePopupView(activeDismissed, {...DEFAULT_SETTINGS, bannerMode: 'warnings'})
        .canRestoreBanner,
    ).toBe(false)
    expect(
      computePopupView(activeDismissed, {...DEFAULT_SETTINGS, bannerMode: 'off'}).canRestoreBanner,
    ).toBe(false)
  })
})
