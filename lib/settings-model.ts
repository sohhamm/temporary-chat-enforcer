import type {AdapterId} from './adapters/types'

export type BannerMode = 'always' | 'warnings' | 'off'

export interface SiteSettings {
  enabled: boolean
}

export interface Settings {
  enabled: boolean
  bannerMode: BannerMode
  sites: Record<AdapterId, SiteSettings>
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  bannerMode: 'always',
  sites: {
    chatgpt: {enabled: true},
    claude: {enabled: true},
    gemini: {enabled: true},
    grok: {enabled: true},
    perplexity: {enabled: true},
  },
}

function normalizeBannerMode(value: unknown): BannerMode {
  if (value === 'always' || value === 'warnings' || value === 'off') return value
  return DEFAULT_SETTINGS.bannerMode
}

export function mergeWithDefaults(stored: Partial<Settings> | null | undefined): Settings {
  if (!stored) return structuredClone(DEFAULT_SETTINGS)
  return {
    enabled: stored.enabled ?? DEFAULT_SETTINGS.enabled,
    bannerMode: normalizeBannerMode(stored.bannerMode),
    sites: {
      chatgpt: stored.sites?.chatgpt ?? {enabled: true},
      claude: stored.sites?.claude ?? {enabled: true},
      gemini: stored.sites?.gemini ?? {enabled: true},
      grok: stored.sites?.grok ?? {enabled: true},
      perplexity: stored.sites?.perplexity ?? {enabled: true},
    },
  }
}

export function isSiteEnabled(settings: Settings, id: AdapterId): boolean {
  return settings.enabled && settings.sites[id]?.enabled !== false
}
