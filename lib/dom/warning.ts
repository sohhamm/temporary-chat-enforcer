export type BannerState =
  | {kind: 'hidden'}
  | {kind: 'pending'; provider: string}
  | {kind: 'confirmed'; provider: string}
  | {kind: 'warning'; provider: string; reason: string; actionUrl?: string}

const HOST_ID = 'tce-banner-host'
const Z_INDEX = '2147483647'

const STYLES = `
  :host { all: initial; }
  .root {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: ${Z_INDEX};
    display: flex;
    justify-content: center;
    pointer-events: none;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .pill {
    pointer-events: auto;
    margin: 8px;
    padding: 8px 12px;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.2;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: opacity 200ms ease, transform 200ms ease;
  }
  .pill[data-kind="confirmed"] {
    background: rgba(20, 83, 45, 0.92);
    color: #d1fae5;
    border: 1px solid rgba(167, 243, 208, 0.4);
  }
  .pill[data-kind="pending"] {
    background: rgba(30, 41, 59, 0.92);
    color: #cbd5e1;
    border: 1px solid rgba(148, 163, 184, 0.4);
  }
  .pill[data-kind="warning"] {
    background: rgba(127, 29, 29, 0.95);
    color: #fee2e2;
    border: 1px solid rgba(252, 165, 165, 0.5);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    flex: 0 0 auto;
  }
  .pill[data-kind="pending"] .dot {
    animation: pulse 1.4s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
  button {
    all: unset;
    cursor: pointer;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 12px;
    background: rgba(255,255,255,0.15);
    color: inherit;
  }
  button:hover { background: rgba(255,255,255,0.25); }
  .close {
    margin-left: 4px;
    width: 18px;
    height: 18px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    font-size: 16px;
    background: transparent;
  }
  .close:hover { background: rgba(255,255,255,0.15); }
`

interface BannerHandle {
  update(state: BannerState): void
  destroy(): void
}

export function createBanner(): BannerHandle {
  const existing = document.getElementById(HOST_ID)
  if (existing) existing.remove()

  const host = document.createElement('div')
  host.id = HOST_ID
  const shadow = host.attachShadow({mode: 'open'})

  const style = document.createElement('style')
  style.textContent = STYLES
  shadow.appendChild(style)

  const root = document.createElement('div')
  root.className = 'root'
  shadow.appendChild(root)

  let dismissedKey = ''

  const mount = () => {
    if (!host.isConnected && document.body) {
      document.body.appendChild(host)
    } else if (!host.isConnected && document.documentElement) {
      document.documentElement.appendChild(host)
    }
  }

  const render = (state: BannerState) => {
    if (state.kind === 'hidden') {
      root.replaceChildren()
      return
    }

    const stateKey = `${state.kind}:${'reason' in state ? state.reason : ''}`
    if (state.kind === 'warning' && dismissedKey === stateKey) {
      root.replaceChildren()
      return
    }

    const pill = document.createElement('div')
    pill.className = 'pill'
    pill.dataset.kind = state.kind

    const dot = document.createElement('span')
    dot.className = 'dot'
    pill.appendChild(dot)

    const label = document.createElement('span')
    if (state.kind === 'confirmed') {
      label.textContent = `Temporary chat active on ${state.provider}`
    } else if (state.kind === 'pending') {
      label.textContent = `Activating temporary chat on ${state.provider}…`
    } else {
      label.textContent = state.reason
    }
    pill.appendChild(label)

    if (state.kind === 'warning' && state.actionUrl) {
      const actionUrl = state.actionUrl
      const action = document.createElement('button')
      action.textContent = 'Start temporary chat'
      action.addEventListener('click', () => {
        window.location.assign(actionUrl)
      })
      pill.appendChild(action)
    }

    if (state.kind === 'warning') {
      const close = document.createElement('button')
      close.className = 'close'
      close.setAttribute('aria-label', 'Dismiss')
      close.textContent = '×'
      close.addEventListener('click', () => {
        dismissedKey = stateKey
        root.replaceChildren()
      })
      pill.appendChild(close)
    }

    root.replaceChildren(pill)
  }

  const ensureMounted = () => {
    if (document.body) {
      mount()
      return true
    }
    return false
  }

  if (!ensureMounted()) {
    document.addEventListener('DOMContentLoaded', () => ensureMounted(), {once: true})
  }

  return {
    update(state) {
      if (state.kind !== 'warning') {
        // Reset dismissal when state changes away from warning so a future warning re-shows.
        dismissedKey = ''
      }
      ensureMounted()
      render(state)
    },
    destroy() {
      host.remove()
    },
  }
}
