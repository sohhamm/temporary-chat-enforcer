import {useEffect, useState, type ReactNode} from 'react'
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

type StateKey = 'active' | 'exposed' | 'off' | 'idle' | 'sensing'

const MONOGRAM: Record<AdapterId, string> = {
  chatgpt: 'Ch',
  claude: 'Cl',
  gemini: 'Ge',
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
    return <div className="loading">Booting console</div>
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

  const enabledCount = ADAPTERS.filter(a => settings.sites[a.id]?.enabled !== false).length

  return (
    <div className="popup">
      <header className="header">
        <img className="mark" src="/icon/icon.svg" alt="" aria-hidden="true" />
        <div className="title">
          <span className="title__name">Temporary chat</span>
        </div>
        <Toggle
          checked={settings.enabled}
          onChange={onToggleGlobal}
          ariaLabel={settings.enabled ? 'Disable extension' : 'Enable extension'}
        />
      </header>

      <StateCard tab={tab} settings={settings} />

      <section className="sites-section">
        <div className="sites-section__head">
          <span className="sites-section__kicker">Providers</span>
          <span className="sites-section__count">
            {pad2(enabledCount)} / {pad2(ADAPTERS.length)} engaged
          </span>
        </div>
        <ul className="sites">
          {ADAPTERS.map(adapter => {
            const enabled = settings.enabled && settings.sites[adapter.id]?.enabled !== false
            return (
              <li key={adapter.id} className={`site ${enabled ? 'site--enabled' : ''}`}>
                <div className="site__monogram" aria-hidden="true">
                  {MONOGRAM[adapter.id]}
                </div>
                <div className="site__meta">
                  <span className="site__name">
                    <span
                      className={`led ${enabled ? 'led--phosphor' : 'led--off'}`}
                      aria-hidden="true"
                    />
                    {adapter.displayName}
                  </span>
                  <span className="site__host">
                    {hostnameOf(adapter)}
                    <a
                      className="site__docs"
                      href={adapter.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      docs
                    </a>
                  </span>
                </div>
                <Toggle
                  small
                  checked={settings.sites[adapter.id]?.enabled ?? true}
                  onChange={() => onToggleSite(adapter.id)}
                  ariaLabel={`Enforce on ${adapter.displayName}`}
                  disabled={!settings.enabled}
                />
              </li>
            )
          })}
        </ul>
      </section>

      <footer className="footer">
        <span className="footer__sig">temporary chat enforcer</span>
      </footer>
    </div>
  )
}

function StateCard({tab, settings}: {tab: CurrentTab; settings: Settings}) {
  const view = computeView(tab, settings)
  return (
    <section className="state" data-state={view.state}>
      <div className="state__bar" aria-hidden="true" />
      <div className="state__head">
        <span className="state__kicker">
          <span className={`led ${ledVariant(view.state)}`} aria-hidden="true" />
          <span>{view.kicker}</span>
          {view.host ? <span className="host">{view.host}</span> : null}
        </span>
      </div>
      <h2 className="state__word">{view.word}</h2>
      <p className="state__body">{view.body}</p>
    </section>
  )
}

interface StateView {
  state: StateKey
  word: string
  kicker: string
  host: string | null
  body: ReactNode
}

function computeView(tab: CurrentTab, settings: Settings): StateView {
  if (tab.url === null) {
    return {
      state: 'sensing',
      word: 'Sensing…',
      kicker: 'Status',
      host: null,
      body: 'Reading the active tab.',
    }
  }

  if (!tab.adapter) {
    let host = ''
    try {
      host = new URL(tab.url).hostname
    } catch {
      host = tab.url
    }
    return {
      state: 'idle',
      word: 'Idle.',
      kicker: 'Out of scope',
      host: host || null,
      body: (
        <>
          Not a supported provider. The console is dormant on <code>{host || 'this page'}</code>.
        </>
      ),
    }
  }

  const adapter = tab.adapter
  const host = safeHost(tab.url)

  if (!isSiteEnabled(settings, adapter.id)) {
    const reason = !settings.enabled
      ? 'Master switch is off.'
      : `Enforcement on ${adapter.displayName} is off.`
    return {
      state: 'off',
      word: 'Off.',
      kicker: adapter.displayName,
      host,
      body: `${reason} Toggle it on to enforce temporary chat.`,
    }
  }

  let isTemp = false
  try {
    isTemp = adapter.isTemporaryUrl(new URL(tab.url))
  } catch {
    isTemp = false
  }

  if (isTemp) {
    return {
      state: 'active',
      word: 'Active.',
      kicker: adapter.displayName,
      host,
      body: 'Temporary chat is engaged.',
    }
  }

  return {
    state: 'exposed',
    word: 'Exposed.',
    kicker: adapter.displayName,
    host,
    body: 'This URL is not a temporary chat. The on-page banner can switch it.',
  }
}

function ledVariant(state: StateKey): string {
  switch (state) {
    case 'active':
      return 'led--phosphor'
    case 'sensing':
      return 'led--amber'
    case 'exposed':
      return 'led--crimson'
    default:
      return 'led--off'
  }
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

function safeHost(href: string | null): string | null {
  if (!href) return null
  try {
    return new URL(href).hostname
  } catch {
    return null
  }
}

function hostnameOf(adapter: ProviderAdapter): string {
  switch (adapter.id) {
    case 'chatgpt':
      return 'chatgpt.com'
    case 'claude':
      return 'claude.ai'
    case 'gemini':
      return 'gemini.google.com'
  }
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

async function readActiveTab(): Promise<CurrentTab> {
  if (typeof browser === 'undefined' || !browser.tabs) {
    return {url: null, adapter: null}
  }
  try {
    const [tab] = await browser.tabs.query({active: true, currentWindow: true})
    const url = tab?.url ?? null
    return {url, adapter: url ? adapterForUrl(url) : null}
  } catch {
    return {url: null, adapter: null}
  }
}
