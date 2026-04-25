import {adapterForUrl} from '../adapters'
import type {AdapterId, ProviderAdapter} from '../adapters/types'
import {createBanner, type BannerState} from '../dom/warning'
import {installLocationWatcher, onLocationChange} from '../dom/spaNav'
import {waitFor} from '../dom/wait'
import {
  getSettings,
  isSiteEnabled,
  updateSettings,
  watchSettings,
  type Settings,
} from '../settings'

const DETECT_TIMEOUT_MS = 4000

interface EnforceContext {
  adapter: ProviderAdapter
  settings: Settings
  banner: ReturnType<typeof createBanner>
  /** Latch so we don't repeat redirects within the same SPA session. */
  redirectedFromHrefs: Set<string>
}

export async function startEnforcement() {
  let settings = await getSettings()
  const banner = createBanner({
    onDisableSite: async (id: AdapterId) => {
      await updateSettings(prev => ({
        ...prev,
        sites: {...prev.sites, [id]: {enabled: false}},
      }))
    },
  })
  let cleanupNav: (() => void) | null = null
  let activeRunId = 0
  let redirectedFromHrefs = new Set<string>()

  const evaluate = async () => {
    const runId = ++activeRunId
    const url = new URL(window.location.href)
    const adapter = adapterForUrl(url.href)

    if (!adapter) {
      banner.update({kind: 'hidden'})
      return
    }
    if (!isSiteEnabled(settings, adapter.id)) {
      banner.update({kind: 'hidden'})
      return
    }
    if (!adapter.isChatContext(url)) {
      banner.update({kind: 'hidden'})
      return
    }

    const ctx: EnforceContext = {adapter, settings, banner, redirectedFromHrefs}
    await runForUrl(ctx, url, () => runId === activeRunId)
  }

  cleanupNav = installLocationWatcher()
  onLocationChange(() => {
    void evaluate()
  })

  watchSettings(next => {
    const prev = settings
    settings = next
    redirectedFromHrefs = new Set()
    const adapter = adapterForUrl(window.location.href)
    if (adapter && isSiteEnabled(prev, adapter.id) && !isSiteEnabled(next, adapter.id)) {
      void deactivate(adapter)
    }
    void evaluate()
  })

  await evaluate()

  return () => {
    cleanupNav?.()
    banner.destroy()
  }
}

async function runForUrl(
  ctx: EnforceContext,
  url: URL,
  isCurrent: () => boolean,
): Promise<void> {
  const {adapter, banner} = ctx

  const providerId = adapter.id
  const provider = adapter.displayName

  // Already on a temporary URL → confirm via DOM.
  if (adapter.isTemporaryUrl(url)) {
    banner.update({kind: 'pending', providerId, provider})
    const ok = await waitFor(() => adapter.detectActive(), DETECT_TIMEOUT_MS)
    if (!isCurrent()) return
    if (ok) {
      banner.update({kind: 'confirmed', providerId, provider})
    } else {
      banner.update({
        kind: 'warning',
        providerId,
        provider,
        reason: `Could not confirm temporary chat on ${provider}.`,
      })
    }
    return
  }

  // Fresh landing → try to activate.
  if (adapter.isFreshChat(url)) {
    const tempUrl = adapter.buildTemporaryUrl(url)
    if (tempUrl && tempUrl !== url.href && !ctx.redirectedFromHrefs.has(url.href)) {
      ctx.redirectedFromHrefs.add(url.href)
      window.location.replace(tempUrl)
      return
    }
    if (adapter.activateViaDom) {
      banner.update({kind: 'pending', providerId, provider})
      const attempted = await adapter.activateViaDom()
      if (!isCurrent()) return
      if (attempted) {
        const ok = await waitFor(() => adapter.detectActive(), DETECT_TIMEOUT_MS)
        if (!isCurrent()) return
        if (ok) {
          banner.update({kind: 'confirmed', providerId, provider})
          return
        }
      }
      banner.update({
        kind: 'warning',
        providerId,
        provider,
        reason: `Could not activate temporary chat on ${provider}.`,
      })
      return
    }
    banner.update({
      kind: 'warning',
      providerId,
      provider,
      reason: `Temporary chat is not available on ${provider}.`,
    })
    return
  }

  // Existing chat thread that isn't temporary.
  banner.update({kind: 'pending', providerId, provider})
  const ok = await waitFor(() => adapter.detectActive(), DETECT_TIMEOUT_MS)
  if (!isCurrent()) return
  if (ok) {
    banner.update({kind: 'confirmed', providerId, provider})
    return
  }
  const tempUrl = adapter.buildTemporaryUrl(url) ?? undefined
  banner.update({
    kind: 'warning',
    providerId,
    provider,
    reason: `This is not a temporary chat on ${provider}.`,
    actionUrl: tempUrl,
  })
}

async function deactivate(adapter: ProviderAdapter): Promise<void> {
  const url = new URL(window.location.href)
  const target = adapter.deactivateUrl?.(url)
  if (target && target !== url.href) {
    window.location.replace(target)
    return
  }
  if (adapter.deactivateViaDom) {
    await adapter.deactivateViaDom()
  }
}
