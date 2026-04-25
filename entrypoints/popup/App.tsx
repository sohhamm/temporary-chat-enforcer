import {useEffect, useState} from 'react'
import {ADAPTERS, adapterForUrl} from '@/lib/adapters'
import type {AdapterId, ProviderAdapter} from '@/lib/adapters/types'
import {
  getSettings,
  isSiteEnabled,
  updateSettings,
  watchSettings,
  type Settings,
} from '@/lib/settings'

interface CurrentTab {
  url: string | null
  adapter: ProviderAdapter | null
}

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [tab, setTab] = useState<CurrentTab>({url: null, adapter: null})

  useEffect(() => {
    void getSettings().then(setSettings)
    const stop = watchSettings(setSettings)
    return stop
  }, [])

  useEffect(() => {
    void readActiveTab().then(setTab)
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

  return (
    <div className="popup">
      <header className="popup__header">
        <h1>Temporary Chat Enforcer</h1>
        <Toggle
          checked={settings.enabled}
          onChange={onToggleGlobal}
          ariaLabel="Enable extension"
        />
      </header>

      <CurrentSiteCard tab={tab} settings={settings} />

      <section className="popup__section">
        <h2>Supported sites</h2>
        <ul className="sites">
          {ADAPTERS.map(adapter => (
            <li key={adapter.id} className="sites__row">
              <div className="sites__meta">
                <span className="sites__name">{adapter.displayName}</span>
                <a
                  className="sites__docs"
                  href={adapter.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  docs
                </a>
              </div>
              <Toggle
                checked={settings.sites[adapter.id]?.enabled ?? true}
                onChange={() => onToggleSite(adapter.id)}
                ariaLabel={`Enable on ${adapter.displayName}`}
                disabled={!settings.enabled}
              />
            </li>
          ))}
        </ul>
      </section>

      <footer className="popup__footer">
        Auto-enables native temporary/incognito chat. Warns when it isn't active.
      </footer>
    </div>
  )
}

function CurrentSiteCard({tab, settings}: {tab: CurrentTab; settings: Settings}) {
  if (tab.url === null) {
    return (
      <div className="card card--neutral">
        <div className="card__title">Current tab</div>
        <div className="card__body">Detecting…</div>
      </div>
    )
  }

  if (!tab.adapter) {
    let host = ''
    try {
      host = new URL(tab.url).hostname
    } catch {
      host = tab.url
    }
    return (
      <div className="card card--neutral">
        <div className="card__title">Current tab</div>
        <div className="card__body">
          <code>{host || 'unknown'}</code> isn't a supported provider.
        </div>
      </div>
    )
  }

  const adapter = tab.adapter
  if (!isSiteEnabled(settings, adapter.id)) {
    return (
      <div className="card card--warn">
        <div className="card__title">{adapter.displayName}</div>
        <div className="card__body">
          Disabled. Toggle it on below to enforce temporary chat.
        </div>
      </div>
    )
  }

  let isTemp = false
  try {
    isTemp = adapter.isTemporaryUrl(new URL(tab.url))
  } catch {
    isTemp = false
  }

  return (
    <div className={`card ${isTemp ? 'card--ok' : 'card--warn'}`}>
      <div className="card__title">{adapter.displayName}</div>
      <div className="card__body">
        {isTemp
          ? 'Current URL indicates temporary chat. The page banner shows the live status.'
          : 'Current URL is not a temporary chat URL. The page banner shows the live status.'}
      </div>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  ariaLabel,
  disabled,
}: {
  checked: boolean
  onChange: () => void
  ariaLabel: string
  disabled?: boolean
}) {
  return (
    <button
      className={`toggle ${checked ? 'toggle--on' : ''} ${disabled ? 'toggle--disabled' : ''}`}
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

async function readActiveTab(): Promise<CurrentTab> {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    return {url: null, adapter: null}
  }
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true})
    const url = tab?.url ?? null
    return {url, adapter: url ? adapterForUrl(url) : null}
  } catch {
    return {url: null, adapter: null}
  }
}
