import type {AdapterId} from '../adapters/types'

export type BannerState =
  | {kind: 'hidden'}
  | {kind: 'pending'; providerId: AdapterId; provider: string}
  | {kind: 'confirmed'; providerId: AdapterId; provider: string}
  | {
      kind: 'warning'
      providerId: AdapterId
      provider: string
      reason: string
      actionUrl?: string
      canEngage?: boolean
    }

export interface BannerOptions {
  onDisableSite?(id: AdapterId): void | Promise<void>
  onEngage?(): void | Promise<void>
  onDismiss?(): void
}

const HOST_ID = 'tce-banner-host'
const Z_INDEX = '2147483647'

const STYLES = `
  :host { all: initial; }

  .root {
    position: fixed;
    top: 10px;
    left: 0;
    right: 0;
    z-index: ${Z_INDEX};
    display: flex;
    justify-content: center;
    pointer-events: none;
  }

  .chip {
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    padding: 0 6px 0 11px;
    border-radius: 999px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: -0.005em;
    line-height: 1;
    color: #f4f4f5;
    background: rgba(24, 24, 27, 0.9);
    backdrop-filter: blur(12px) saturate(140%);
    -webkit-backdrop-filter: blur(12px) saturate(140%);
    border: 1px solid rgba(255, 255, 255, 0.11);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.05) inset,
      0 6px 20px rgba(0, 0, 0, 0.28),
      0 1px 3px rgba(0, 0, 0, 0.18);
    -webkit-font-smoothing: antialiased;
    animation: tce-enter 160ms ease-out;
  }

  @keyframes tce-enter {
    from {
      opacity: 0;
      transform: translateY(-4px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .chip[data-kind="warning"] {
    background: rgba(34, 17, 18, 0.94);
    border-color: rgba(239, 68, 68, 0.42);
    color: #fee2e2;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex: 0 0 auto;
    background: #71717a;
  }

  .chip[data-kind="confirmed"] .dot { background: #22c55e; }
  .chip[data-kind="pending"] .dot {
    background: #f59e0b;
    animation: tce-pulse 1.3s ease-in-out infinite;
  }
  .chip[data-kind="warning"] .dot { background: #ef4444; }

  @keyframes tce-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  .label {
    color: inherit;
    white-space: nowrap;
  }

  .sep {
    width: 1px;
    height: 14px;
    background: rgba(255, 255, 255, 0.12);
    flex: 0 0 auto;
  }

  button {
    all: unset;
    cursor: pointer;
    box-sizing: border-box;
    font-family: inherit;
  }

  button:focus-visible {
    outline: 2px solid #f4f4f5;
    outline-offset: 2px;
  }

  .engage {
    height: 22px;
    padding: 0 9px;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 600;
    color: #18181b;
    background: #fafafa;
    transition: background 120ms ease;
  }

  .engage:hover { background: #e4e4e7; }

  .switch {
    --w: 28px;
    --h: 16px;
    --pad: 2px;
    position: relative;
    width: var(--w);
    height: var(--h);
    border-radius: 999px;
    background: #22c55e;
    flex: 0 0 auto;
    transition: opacity 120ms ease;
  }

  .chip[data-kind="pending"] .switch { background: #f59e0b; }
  .chip[data-kind="warning"] .switch { background: #ef4444; }

  .switch:hover { opacity: 0.86; }

  .switch__thumb {
    position: absolute;
    top: var(--pad);
    left: calc(var(--w) - var(--h) + var(--pad));
    width: calc(var(--h) - var(--pad) * 2);
    height: calc(var(--h) - var(--pad) * 2);
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  }

  .close {
    width: 22px;
    height: 22px;
    display: inline-grid;
    place-items: center;
    border-radius: 50%;
    color: rgba(244, 244, 245, 0.62);
    font-size: 15px;
    line-height: 1;
    transition: background 120ms ease, color 120ms ease;
  }

  .close:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }

  @media (prefers-color-scheme: light) {
    .chip {
      color: #18181b;
      background: rgba(255, 255, 255, 0.92);
      border-color: rgba(24, 24, 27, 0.12);
      box-shadow:
        0 1px 0 rgba(255, 255, 255, 0.7) inset,
        0 6px 20px rgba(0, 0, 0, 0.1),
        0 1px 3px rgba(0, 0, 0, 0.06);
    }

    .chip[data-kind="warning"] {
      color: #991b1b;
      background: rgba(254, 242, 242, 0.96);
      border-color: #fca5a5;
    }

    .sep {
      background: rgba(24, 24, 27, 0.12);
    }

    .engage {
      color: #ffffff;
      background: #18181b;
    }

    .engage:hover { background: #27272a; }

    .close { color: #71717a; }
    .close:hover {
      background: rgba(24, 24, 27, 0.08);
      color: #18181b;
    }

    button:focus-visible {
      outline-color: #18181b;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .chip,
    .chip[data-kind="pending"] .dot {
      animation: none;
    }
  }
`

export interface BannerHandle {
  update(state: BannerState): void
  restore(): void
  isDismissed(): boolean
  destroy(): void
}

function labelFor(state: Exclude<BannerState, {kind: 'hidden'}>): string {
  switch (state.kind) {
    case 'confirmed':
      return 'Temporary chat'
    case 'pending':
      return 'Enabling temporary chat…'
    case 'warning':
      return 'Not a temporary chat'
  }
}

function stateKeyFor(state: Exclude<BannerState, {kind: 'hidden'}>): string {
  return `${state.kind}:${'reason' in state ? state.reason : ''}`
}

export function createBanner(options: BannerOptions = {}): BannerHandle {
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

  const dismissed = new Set<string>()
  let lastState: BannerState = {kind: 'hidden'}

  const mount = () => {
    if (!host.isConnected && document.body) {
      document.body.appendChild(host)
    } else if (!host.isConnected && document.documentElement) {
      document.documentElement.appendChild(host)
    }
  }

  const render = (state: BannerState) => {
    lastState = state
    if (state.kind === 'hidden') {
      root.replaceChildren()
      return
    }

    const stateKey = stateKeyFor(state)
    if (dismissed.has(stateKey)) {
      root.replaceChildren()
      return
    }

    const chip = document.createElement('div')
    chip.className = 'chip'
    chip.dataset.kind = state.kind
    if (state.kind === 'warning') {
      chip.title = state.reason
      chip.setAttribute('role', 'status')
      chip.setAttribute('aria-label', state.reason)
    }

    const dot = document.createElement('span')
    dot.className = 'dot'
    dot.setAttribute('aria-hidden', 'true')
    chip.appendChild(dot)

    const label = document.createElement('span')
    label.className = 'label'
    label.textContent = labelFor(state)
    chip.appendChild(label)

    if (state.kind === 'warning' && (state.actionUrl || (state.canEngage && options.onEngage))) {
      const actionUrl = state.actionUrl
      const action = document.createElement('button')
      action.className = 'engage'
      action.type = 'button'
      action.textContent = 'Switch'
      action.addEventListener('click', () => {
        if (actionUrl) {
          window.location.assign(actionUrl)
        } else {
          void options.onEngage?.()
        }
      })
      chip.appendChild(action)
    }

    const sep = document.createElement('span')
    sep.className = 'sep'
    sep.setAttribute('aria-hidden', 'true')
    chip.appendChild(sep)

    const providerId = state.providerId
    const switchBtn = document.createElement('button')
    switchBtn.className = 'switch'
    switchBtn.type = 'button'
    switchBtn.setAttribute('role', 'switch')
    switchBtn.setAttribute('aria-checked', 'true')
    switchBtn.setAttribute('aria-label', `Pause enforcement on ${state.provider}`)
    switchBtn.title = `Pause on ${state.provider}`
    const thumb = document.createElement('span')
    thumb.className = 'switch__thumb'
    switchBtn.appendChild(thumb)
    switchBtn.addEventListener('click', () => {
      void options.onDisableSite?.(providerId)
    })
    chip.appendChild(switchBtn)

    const close = document.createElement('button')
    close.className = 'close'
    close.type = 'button'
    close.setAttribute('aria-label', 'Hide badge on this tab')
    close.title = 'Hide badge (restore from extension popup)'
    close.textContent = '×'
    close.addEventListener('click', () => {
      dismissed.add(stateKey)
      root.replaceChildren()
      options.onDismiss?.()
    })
    chip.appendChild(close)

    root.replaceChildren(chip)
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
      ensureMounted()
      render(state)
    },
    restore() {
      dismissed.clear()
      ensureMounted()
      render(lastState)
    },
    isDismissed() {
      if (lastState.kind === 'hidden') return false
      return dismissed.has(stateKeyFor(lastState))
    },
    destroy() {
      host.remove()
    },
  }
}
