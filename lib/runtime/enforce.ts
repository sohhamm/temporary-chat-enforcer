import {adapterForUrl} from '../adapters'
import type {AdapterId, ProviderAdapter} from '../adapters/types'
import {installLocationWatcher, onLocationChange} from '../dom/spaNav'
import {waitFor} from '../dom/wait'
import {createBanner, type BannerState} from '../dom/warning'
import type {TabStatus} from '../messages'
import {getSettings, isSiteEnabled, updateSettings, watchSettings, type Settings} from '../settings'

const DETECT_TIMEOUT_MS = 4000

export interface EnforceController {
  getStatus(): TabStatus
  engage(): Promise<boolean>
  showBanner(): void
  destroy(): void
}

interface EnforceContext {
  adapter: ProviderAdapter
  settings: Settings
  updateBanner: (state: BannerState) => void
  redirectedFromHrefs: Set<string>
  setStatus: (status: TabStatus) => void
}

function shouldShowBanner(settings: Settings, state: BannerState): boolean {
  if (state.kind === 'hidden') return false
  if (settings.bannerMode === 'off') return false
  if (settings.bannerMode === 'warnings') return state.kind === 'warning'
  return true
}

export async function startEnforcement(): Promise<EnforceController> {
  let settings = await getSettings()
  let currentStatus: TabStatus = {kind: 'out-of-scope', host: window.location.hostname || null}
  let desiredBanner: BannerState = {kind: 'hidden'}

  const setStatus = (next: TabStatus) => {
    currentStatus = next
  }

  let cleanupNav: (() => void) | null = null
  let cleanupSettings: (() => void) | null = null
  let cleanupLocation: (() => void) | null = null
  let activeRunId = 0
  let redirectedFromHrefs = new Set<string>()

  const banner = createBanner({
    onDisableSite: async (id: AdapterId) => {
      await updateSettings(prev => ({
        ...prev,
        sites: {...prev.sites, [id]: {enabled: false}},
      }))
    },
    onEngage: async () => {
      await engage()
    },
  })

  const updateBanner = (state: BannerState) => {
    desiredBanner = state
    banner.update(shouldShowBanner(settings, state) ? state : {kind: 'hidden'})
  }

  const engage = async (): Promise<boolean> => {
    const url = new URL(window.location.href)
    const adapter = adapterForUrl(url)
    if (!adapter) return false

    const tempUrl = adapter.buildTemporaryUrl(url)
    if (tempUrl) {
      window.location.assign(tempUrl)
      return true
    }

    if (!adapter.activateViaDom) return false

    const providerId = adapter.id
    const provider = adapter.displayName
    const host = url.hostname

    updateBanner({kind: 'pending', providerId, provider})
    setStatus({kind: 'securing', providerId, provider, host})

    const attempted = await adapter.activateViaDom()
    if (attempted) {
      const ok = await waitFor(() => adapter.detectActive(), DETECT_TIMEOUT_MS)
      if (ok) {
        updateBanner({kind: 'confirmed', providerId, provider})
        setStatus({kind: 'active', providerId, provider, host})
        return true
      }
    }

    const reason = `Could not activate temporary chat on ${provider}.`
    updateBanner({kind: 'warning', providerId, provider, reason, canEngage: true})
    setStatus({kind: 'exposed', providerId, provider, host, reason, canEngage: true})
    return false
  }

  const evaluate = async () => {
    const runId = ++activeRunId
    const url = new URL(window.location.href)
    const adapter = adapterForUrl(url)

    if (!adapter) {
      updateBanner({kind: 'hidden'})
      setStatus({kind: 'out-of-scope', host: url.hostname || null})
      return
    }
    if (!isSiteEnabled(settings, adapter.id)) {
      updateBanner({kind: 'hidden'})
      setStatus({
        kind: 'off',
        providerId: adapter.id,
        provider: adapter.displayName,
        host: url.hostname,
        globalOff: !settings.enabled,
      })
      return
    }
    if (!adapter.isChatContext(url)) {
      updateBanner({kind: 'hidden'})
      setStatus({
        kind: 'non-chat',
        providerId: adapter.id,
        provider: adapter.displayName,
        host: url.hostname,
      })
      return
    }

    const ctx: EnforceContext = {adapter, settings, updateBanner, redirectedFromHrefs, setStatus}
    await runForUrl(ctx, url, () => runId === activeRunId)
  }

  cleanupNav = installLocationWatcher()
  cleanupLocation = onLocationChange(() => {
    void evaluate()
  })

  cleanupSettings = watchSettings(next => {
    const prev = settings
    settings = next
    redirectedFromHrefs = new Set()

    if (prev.bannerMode !== next.bannerMode) {
      if (shouldShowBanner(next, desiredBanner)) {
        banner.restore()
        banner.update(desiredBanner)
      } else {
        banner.update({kind: 'hidden'})
      }
    }

    const adapter = adapterForUrl(window.location.href)
    if (adapter && isSiteEnabled(prev, adapter.id) && !isSiteEnabled(next, adapter.id)) {
      void deactivate(adapter)
    }

    const siteToggleChanged =
      prev.enabled !== next.enabled ||
      (adapter != null && prev.sites[adapter.id]?.enabled !== next.sites[adapter.id]?.enabled)
    if (siteToggleChanged) {
      void evaluate()
    }
  })

  await evaluate()

  return {
    getStatus: () => {
      const dismissed = shouldShowBanner(settings, desiredBanner) && banner.isDismissed()
      if (
        currentStatus.kind === 'active' ||
        currentStatus.kind === 'securing' ||
        currentStatus.kind === 'exposed'
      ) {
        return {...currentStatus, bannerDismissed: dismissed}
      }
      return currentStatus
    },
    engage,
    showBanner: () => {
      if (shouldShowBanner(settings, desiredBanner)) {
        banner.restore()
        banner.update(desiredBanner)
      }
    },
    destroy: () => {
      cleanupLocation?.()
      cleanupNav?.()
      cleanupSettings?.()
      banner.destroy()
    },
  }
}

async function runForUrl(ctx: EnforceContext, url: URL, isCurrent: () => boolean): Promise<void> {
  const {adapter, updateBanner, setStatus} = ctx

  const providerId = adapter.id
  const provider = adapter.displayName
  const host = url.hostname

  if (adapter.isTemporaryUrl(url)) {
    updateBanner({kind: 'pending', providerId, provider})
    setStatus({kind: 'securing', providerId, provider, host})
    const ok = await waitFor(() => adapter.detectActive(), DETECT_TIMEOUT_MS)
    if (!isCurrent()) return
    if (ok) {
      updateBanner({kind: 'confirmed', providerId, provider})
      setStatus({kind: 'active', providerId, provider, host})
    } else {
      const reason = `Could not confirm temporary chat on ${provider}.`
      const actionUrl = adapter.buildTemporaryUrl(url) ?? undefined
      const canEngage = Boolean(actionUrl || adapter.activateViaDom)
      updateBanner({kind: 'warning', providerId, provider, reason, actionUrl, canEngage})
      setStatus({kind: 'exposed', providerId, provider, host, reason, canEngage, actionUrl})
    }
    return
  }

  if (adapter.isFreshChat(url)) {
    const tempUrl = adapter.buildTemporaryUrl(url)
    if (tempUrl && tempUrl !== url.href && !ctx.redirectedFromHrefs.has(url.href)) {
      ctx.redirectedFromHrefs.add(url.href)
      setStatus({kind: 'securing', providerId, provider, host})
      window.location.replace(tempUrl)
      return
    }
    if (adapter.activateViaDom) {
      updateBanner({kind: 'pending', providerId, provider})
      setStatus({kind: 'securing', providerId, provider, host})
      const attempted = await adapter.activateViaDom()
      if (!isCurrent()) return
      if (attempted) {
        const ok = await waitFor(() => adapter.detectActive(), DETECT_TIMEOUT_MS)
        if (!isCurrent()) return
        if (ok) {
          updateBanner({kind: 'confirmed', providerId, provider})
          setStatus({kind: 'active', providerId, provider, host})
          return
        }
      }
      const reason = `Could not activate temporary chat on ${provider}.`
      updateBanner({kind: 'warning', providerId, provider, reason, canEngage: true})
      setStatus({kind: 'exposed', providerId, provider, host, reason, canEngage: true})
      return
    }
    const reason = `Temporary chat is not available on ${provider}.`
    updateBanner({kind: 'warning', providerId, provider, reason})
    setStatus({kind: 'exposed', providerId, provider, host, reason, canEngage: false})
    return
  }

  updateBanner({kind: 'pending', providerId, provider})
  setStatus({kind: 'securing', providerId, provider, host})
  const ok = await waitFor(() => adapter.detectActive(), DETECT_TIMEOUT_MS)
  if (!isCurrent()) return
  if (ok) {
    updateBanner({kind: 'confirmed', providerId, provider})
    setStatus({kind: 'active', providerId, provider, host})
    return
  }
  const actionUrl = adapter.buildTemporaryUrl(url) ?? undefined
  const canEngage = Boolean(actionUrl || adapter.activateViaDom)
  const reason = `This is not a temporary chat on ${provider}.`
  updateBanner({kind: 'warning', providerId, provider, reason, actionUrl, canEngage})
  setStatus({kind: 'exposed', providerId, provider, host, reason, canEngage, actionUrl})
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
