import {storage} from 'wxt/utils/storage'
import type {AdapterId} from './adapters/types'

export interface SiteSettings {
  enabled: boolean;
}

export interface Settings {
  /** Master switch. When false, the extension is a no-op everywhere. */
  enabled: boolean;
  /** Per-provider toggles. Defaults to true for any new provider. */
  sites: Record<AdapterId, SiteSettings>;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  sites: {
    chatgpt: { enabled: true },
    claude: { enabled: true },
    gemini: { enabled: true },
  },
};

const settingsItem = storage.defineItem<Settings>('sync:tce.settings', {
  fallback: DEFAULT_SETTINGS,
});

/** Read settings, merging stored values over defaults so adding a new provider doesn't break old installs. */
export async function getSettings(): Promise<Settings> {
  const stored = await settingsItem.getValue();
  return mergeWithDefaults(stored);
}

export async function setSettings(next: Settings): Promise<void> {
  await settingsItem.setValue(next);
}

export async function updateSettings(patch: (prev: Settings) => Settings): Promise<Settings> {
  const prev = await getSettings();
  const next = patch(prev);
  await setSettings(next);
  return next;
}

export function watchSettings(cb: (s: Settings) => void): () => void {
  return settingsItem.watch((value) => {
    cb(mergeWithDefaults(value));
  });
}

function mergeWithDefaults(stored: Settings | null | undefined): Settings {
  if (!stored) return structuredClone(DEFAULT_SETTINGS);
  return {
    enabled: stored.enabled ?? DEFAULT_SETTINGS.enabled,
    sites: {
      chatgpt: stored.sites?.chatgpt ?? { enabled: true },
      claude: stored.sites?.claude ?? { enabled: true },
      gemini: stored.sites?.gemini ?? { enabled: true },
    },
  };
}

export function isSiteEnabled(settings: Settings, id: AdapterId): boolean {
  return settings.enabled && settings.sites[id]?.enabled !== false;
}
