import {useCallback, useEffect, useState} from 'react'
import {ADAPTERS, adapterForUrl} from '@/lib/adapters'
import type {AdapterId} from '@/lib/adapters/types'
import type {ContentRequest, EngageResponse, TabStatus} from '@/lib/messages'
import {computePopupView, type ActiveTabSnapshot} from '@/lib/popup/view'
import {
  getSettings,
  updateSettings,
  watchSettings,
  type BannerMode,
  type Settings,
} from '@/lib/settings'
import {ProviderIcon} from './ProviderIcon'

const INITIAL_TAB: ActiveTabSnapshot = {
  loading: true,
  tabId: null,
  url: null,
  adapter: null,
  liveStatus: null,
}

const BANNER_MODES: readonly {value: BannerMode; label: string}[] = [
  {value: 'always', label: 'Always'},
  {value: 'warnings', label: 'Warnings'},
  {value: 'off', label: 'Hidden'},
]

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [tab, setTab] = useState<ActiveTabSnapshot>(INITIAL_TAB)
  const [engaging, setEngaging] = useState(false)

  const refreshTab = useCallback(async () => {
    const next = await readActiveTab()
    setTab(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    void getSettings().then(next => {
      if (!cancelled) setSettings(next)
    })
    void readActiveTab().then(next => {
      if (!cancelled) setTab(next)
    })
    const stop = watchSettings(next => {
      if (cancelled) return
      setSettings(next)
      void readActiveTab().then(snapshot => {
        if (!cancelled) setTab(snapshot)
      })
    })
    return () => {
      cancelled = true
      stop()
    }
  }, [])

  if (!settings) {
    return <div className="loading">Loading…</div>
  }

  const onToggleGlobal = async () => {
    const next = await updateSettings(prev => ({...prev, enabled: !prev.enabled}))
    setSettings(next)
  }

  const onToggleSite = async (id: AdapterId) => {
    const next = await updateSettings(prev => ({
      ...prev,
      sites: {...prev.sites, [id]: {enabled: !prev.sites[id]?.enabled}},
    }))
    setSettings(next)
  }

  const onSelectBannerMode = async (bannerMode: BannerMode) => {
    const next = await updateSettings(prev => ({...prev, bannerMode}))
    setSettings(next)
    if (bannerMode !== 'off' && tab.tabId !== null) {
      await sendShowBanner(tab.tabId)
    }
    await refreshTab()
  }

  const onRestoreBanner = async () => {
    if (tab.tabId === null) return
    await sendShowBanner(tab.tabId)
    await refreshTab()
  }

  const onEngage = async (actionUrl?: string) => {
    if (engaging) return
    setEngaging(true)
    try {
      const engagedViaScript = tab.tabId !== null ? await sendEngage(tab.tabId) : false
      if (!engagedViaScript && actionUrl && tab.tabId !== null && browser.tabs) {
        await browser.tabs.update(tab.tabId, {url: actionUrl})
      }
      await refreshTab()
    } finally {
      setEngaging(false)
    }
  }

  const enabledCount = settings.enabled
    ? ADAPTERS.filter(a => settings.sites[a.id]?.enabled !== false).length
    : 0

  return (
    <div className="popup">
      <header className="header">
        <div className="brand">
          <img className="brand__icon" src="/icon/128.png" alt="" aria-hidden="true" />
          <span className="brand__name">Temporary Chat</span>
        </div>
        <Toggle
          checked={settings.enabled}
          onChange={onToggleGlobal}
          ariaLabel={settings.enabled ? 'Disable extension' : 'Enable extension'}
        />
      </header>

      <div className="content">
        <StatusCard
          tab={tab}
          settings={settings}
          engaging={engaging}
          onEngage={onEngage}
          onRestoreBanner={onRestoreBanner}
        />

        <section className="section">
          <div className="section__head">
            <span className="section__title">Sites</span>
            <span className="section__meta">
              {enabledCount} of {ADAPTERS.length} on
            </span>
          </div>
          <ul className="sites">
            {ADAPTERS.map(adapter => {
              const checked = settings.sites[adapter.id]?.enabled ?? true
              const active = settings.enabled && checked
              return (
                <li key={adapter.id} className={`site ${active ? '' : 'site--muted'}`}>
                  <div className="site__lead">
                    <span className="site__icon">
                      <ProviderIcon id={adapter.id} />
                    </span>
                    <div className="site__info">
                      <span className="site__name">{adapter.displayName}</span>
                      <span className="site__sub">{adapter.hostname}</span>
                    </div>
                  </div>
                  <Toggle
                    small
                    checked={checked}
                    onChange={() => onToggleSite(adapter.id)}
                    ariaLabel={`Enforce on ${adapter.displayName}`}
                    disabled={!settings.enabled}
                  />
                </li>
              )
            })}
          </ul>
        </section>

        <section className="section">
          <div className="section__head">
            <span className="section__title">On-page badge</span>
          </div>
          <div className="segmented" role="radiogroup" aria-label="On-page badge visibility">
            {BANNER_MODES.map(option => {
              const selected = settings.bannerMode === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`segmented__btn ${selected ? 'segmented__btn--active' : ''}`}
                  onClick={() => void onSelectBannerMode(option.value)}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <footer className="footer">
        <span className="footer__note">No data collected</span>
        <a
          className="footer__link"
          href="https://supercollective.studio"
          target="_blank"
          rel="noreferrer"
        >
          by Super Collective
        </a>
      </footer>
    </div>
  )
}

function StatusCard({
  tab,
  settings,
  engaging,
  onEngage,
  onRestoreBanner,
}: {
  tab: ActiveTabSnapshot
  settings: Settings
  engaging: boolean
  onEngage: (actionUrl?: string) => Promise<void>
  onRestoreBanner: () => Promise<void>
}) {
  const view = computePopupView(tab, settings)
  return (
    <section className="status" data-state={view.state}>
      <div className="status__top">
        <span className="status__title-wrap">
          <span className="dot" aria-hidden="true" />
          <h2 className="status__title">{view.title}</h2>
        </span>
        {view.host ? <span className="status__host">{view.host}</span> : null}
      </div>
      <p className="status__body">{view.body}</p>
      {view.canEngage || view.canRestoreBanner ? (
        <div className="status__actions">
          {view.canEngage ? (
            <button
              className="status__action"
              type="button"
              disabled={engaging}
              onClick={() => void onEngage(view.actionUrl)}
            >
              {engaging ? 'Switching…' : (view.actionLabel ?? 'Switch to temporary chat')}
            </button>
          ) : null}
          {view.canRestoreBanner ? (
            <button
              className="status__action status__action--secondary"
              type="button"
              onClick={() => void onRestoreBanner()}
            >
              Show badge on tab
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function Toggle({
  checked,
  onChange,
  ariaLabel,
  disabled,
  small,
}: {
  checked: boolean
  onChange: () => void
  ariaLabel: string
  disabled?: boolean
  small?: boolean
}) {
  return (
    <button
      className={[
        'toggle',
        checked ? 'toggle--on' : '',
        disabled ? 'toggle--disabled' : '',
        small ? 'toggle--small' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      type="button"
    >
      <span className="toggle__thumb" />
    </button>
  )
}

function isTabStatus(value: unknown): value is TabStatus {
  return typeof value === 'object' && value !== null && 'kind' in value
}

async function queryContentStatus(tabId: number): Promise<TabStatus | null> {
  if (typeof browser === 'undefined' || !browser.tabs?.sendMessage) return null
  try {
    const request: ContentRequest = {type: 'tce:get-status'}
    const response: unknown = await browser.tabs.sendMessage(tabId, request)
    return isTabStatus(response) ? response : null
  } catch {
    return null
  }
}

async function sendEngage(tabId: number): Promise<boolean> {
  if (typeof browser === 'undefined' || !browser.tabs?.sendMessage) return false
  try {
    const request: ContentRequest = {type: 'tce:engage'}
    const response = (await browser.tabs.sendMessage(tabId, request)) as EngageResponse | undefined
    return response?.ok === true
  } catch {
    return false
  }
}

async function sendShowBanner(tabId: number): Promise<boolean> {
  if (typeof browser === 'undefined' || !browser.tabs?.sendMessage) return false
  try {
    const request: ContentRequest = {type: 'tce:show-banner'}
    const response = (await browser.tabs.sendMessage(tabId, request)) as EngageResponse | undefined
    return response?.ok === true
  } catch {
    return false
  }
}

async function readActiveTab(): Promise<ActiveTabSnapshot> {
  if (typeof browser === 'undefined' || !browser.tabs) {
    return {loading: false, tabId: null, url: null, adapter: null, liveStatus: null}
  }
  try {
    const [tab] = await browser.tabs.query({active: true, currentWindow: true})
    const tabId = tab?.id ?? null
    const url = tab?.url ?? null
    const adapter = url ? adapterForUrl(url) : null
    const liveStatus = tabId !== null && adapter ? await queryContentStatus(tabId) : null
    return {loading: false, tabId, url, adapter, liveStatus}
  } catch {
    return {loading: false, tabId: null, url: null, adapter: null, liveStatus: null}
  }
}
