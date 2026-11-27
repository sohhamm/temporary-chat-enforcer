import {storage} from 'wxt/utils/storage'
import {
  DEFAULT_SETTINGS,
  isSiteEnabled,
  mergeWithDefaults,
  type BannerMode,
  type Settings,
  type SiteSettings,
} from './settings-model'

export {
  DEFAULT_SETTINGS,
  isSiteEnabled,
  mergeWithDefaults,
  type BannerMode,
  type Settings,
  type SiteSettings,
}

const settingsItem = storage.defineItem<Settings>('sync:tce.settings', {
  fallback: DEFAULT_SETTINGS,
})

export async function getSettings(): Promise<Settings> {
  const stored = await settingsItem.getValue()
  return mergeWithDefaults(stored)
}

export async function setSettings(next: Settings): Promise<void> {
  await settingsItem.setValue(next)
}

export async function updateSettings(patch: (prev: Settings) => Settings): Promise<Settings> {
  const prev = await getSettings()
  const next = patch(prev)
  await setSettings(next)
  return next
}

export function watchSettings(cb: (s: Settings) => void): () => void {
  return settingsItem.watch(value => {
    cb(mergeWithDefaults(value))
  })
}
