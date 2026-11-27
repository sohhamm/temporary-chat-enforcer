import type {ProviderAdapter} from '../adapters/types'
import type {TabStatus} from '../messages'
import {isSiteEnabled, type Settings} from '../settings-model'

export type PopupStateKey = 'active' | 'exposed' | 'off' | 'idle' | 'pending'

export interface ActiveTabSnapshot {
  loading: boolean
  tabId: number | null
  url: string | null
  adapter: ProviderAdapter | null
  liveStatus: TabStatus | null
}

export interface PopupView {
  state: PopupStateKey
  title: string
  host: string | null
  body: string
  canEngage?: boolean
  canRestoreBanner?: boolean
  actionLabel?: string
  actionUrl?: string
}

const SUPPORTED_SITES_NOTE = 'Runs automatically on ChatGPT, Claude, Gemini, Grok, and Perplexity.'

function parseUrl(href: string | null): URL | null {
  if (!href) return null
  try {
    return new URL(href)
  } catch {
    return null
  }
}

export function computePopupView(tab: ActiveTabSnapshot, settings: Settings): PopupView {
  if (tab.loading) {
    return {
      state: 'pending',
      title: 'Checking tab…',
      host: null,
      body: 'Reading the current page.',
    }
  }

  const url = parseUrl(tab.url)
  const host = url?.hostname ?? null

  if (tab.liveStatus) {
    const live = tab.liveStatus
    switch (live.kind) {
      case 'out-of-scope':
        return {
          state: 'idle',
          title: 'Inactive on this tab',
          host: live.host,
          body: SUPPORTED_SITES_NOTE,
        }
      case 'non-chat':
        return {
          state: 'idle',
          title: 'Not a chat page',
          host: live.host,
          body: `Enforcement starts automatically when you open a ${live.provider} chat.`,
        }
      case 'off':
        return {
          state: 'off',
          title: live.globalOff ? 'Extension paused' : `Paused on ${live.provider}`,
          host: live.host,
          body: live.globalOff
            ? 'Turn the extension back on to enforce temporary chats.'
            : `Enable ${live.provider} below to enforce temporary chats.`,
        }
      case 'securing':
        return {
          state: 'pending',
          title: 'Enabling temporary chat…',
          host: live.host,
          body: `Waiting for ${live.provider} to confirm temporary mode.`,
          canRestoreBanner: live.bannerDismissed === true && settings.bannerMode === 'always',
        }
      case 'active':
        return {
          state: 'active',
          title: 'Temporary chat active',
          host: live.host,
          body: `${live.provider} is in native temporary mode.`,
          canRestoreBanner: live.bannerDismissed === true && settings.bannerMode === 'always',
        }
      case 'exposed':
        return {
          state: 'exposed',
          title: 'Not a temporary chat',
          host: live.host,
          body: live.reason,
          canEngage: live.canEngage,
          canRestoreBanner: live.bannerDismissed === true && settings.bannerMode !== 'off',
          actionLabel: 'Switch to temporary chat',
          actionUrl: live.actionUrl,
        }
    }
  }

  if (!tab.adapter) {
    return {
      state: 'idle',
      title: 'Inactive on this tab',
      host,
      body: SUPPORTED_SITES_NOTE,
    }
  }

  const adapter = tab.adapter

  if (!isSiteEnabled(settings, adapter.id)) {
    return {
      state: 'off',
      title: !settings.enabled ? 'Extension paused' : `Paused on ${adapter.displayName}`,
      host,
      body: !settings.enabled
        ? 'Turn the extension back on to enforce temporary chats.'
        : `Enable ${adapter.displayName} below to enforce temporary chats.`,
    }
  }

  if (url && !adapter.isChatContext(url)) {
    return {
      state: 'idle',
      title: 'Not a chat page',
      host,
      body: `Enforcement starts automatically when you open a ${adapter.displayName} chat.`,
    }
  }

  if (url && adapter.isTemporaryUrl(url)) {
    return {
      state: 'active',
      title: 'Temporary chat active',
      host,
      body: `${adapter.displayName} is in native temporary mode.`,
    }
  }

  if (url && adapter.buildTemporaryUrl(url) === null) {
    return {
      state: 'pending',
      title: 'Reload tab to detect',
      host,
      body: `Refresh this ${adapter.displayName} tab so the extension can attach.`,
    }
  }

  const actionUrl = url ? (adapter.buildTemporaryUrl(url) ?? undefined) : undefined
  return {
    state: 'exposed',
    title: 'Not a temporary chat',
    host,
    body: `This ${adapter.displayName} page is not in temporary mode.`,
    canEngage: Boolean(actionUrl),
    actionLabel: 'Switch to temporary chat',
    actionUrl,
  }
}
