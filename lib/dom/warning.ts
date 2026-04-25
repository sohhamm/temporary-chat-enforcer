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
    }

export interface BannerOptions {
  /** Called when the user flips the in-banner toggle off, asking to disable enforcement on this site. */
  onDisableSite?(id: AdapterId): void | Promise<void>
}

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
  }

  .chip {
    pointer-events: auto;
    margin: 10px;
    display: inline-flex;
    align-items: stretch;
    overflow: hidden;
    border-radius: 8px;
    font-family: ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
    font-size: 12px;
    line-height: 1;
    letter-spacing: 0;
    backdrop-filter: blur(14px) saturate(140%);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
    border: 1px solid rgba(235, 230, 220, 0.14);
    box-shadow:
      0 1px 0 0 rgba(255, 255, 255, 0.04) inset,
      0 8px 24px rgba(0, 0, 0, 0.32),
      0 2px 6px rgba(0, 0, 0, 0.18);
    color: #ebe6dc;
    background: rgba(14, 16, 20, 0.86);
    opacity: 0;
    transform: translateY(-6px);
    animation: enter 280ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
  }

  @keyframes enter {
    to { opacity: 1; transform: translateY(0); }
  }

  .chip__head {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 7px 12px 7px 9px;
    border-right: 1px solid rgba(235, 230, 220, 0.1);
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.03),
      rgba(255, 255, 255, 0)
    );
  }

  .chip__brand {
    font-size: 9.5px;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(235, 230, 220, 0.7);
    line-height: 1;
  }

  .chip__tail {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 8px 7px 10px;
  }

  /* ── confirmed ── */
  .chip[data-kind="confirmed"] {
    border-color: rgba(110, 228, 154, 0.32);
    box-shadow:
      0 0 0 1px rgba(110, 228, 154, 0.12) inset,
      0 8px 28px rgba(0, 0, 0, 0.34),
      0 0 24px rgba(110, 228, 154, 0.18);
    background: rgba(8, 18, 13, 0.86);
  }

  /* ── pending ── */
  .chip[data-kind="pending"] {
    border-color: rgba(240, 178, 101, 0.3);
    background: rgba(20, 16, 10, 0.86);
  }

  /* ── warning ── */
  .chip[data-kind="warning"] {
    border-color: rgba(238, 115, 115, 0.36);
    box-shadow:
      0 0 0 1px rgba(238, 115, 115, 0.1) inset,
      0 8px 28px rgba(0, 0, 0, 0.36),
      0 0 24px rgba(238, 115, 115, 0.14);
    background: rgba(22, 12, 12, 0.9);
  }

  /* in-banner toggle (mirrors the popup mechanical switch) */
  .switch {
    --w: 30px;
    --h: 17px;
    --pad: 2.5px;
    position: relative;
    width: var(--w);
    height: var(--h);
    border-radius: 999px;
    border: 1px solid rgba(110, 228, 154, 0.45);
    background: rgba(110, 228, 154, 0.12);
    box-shadow:
      0 0 8px rgba(110, 228, 154, 0.22),
      inset 0 0 0 1px rgba(110, 228, 154, 0.04);
    cursor: pointer;
    transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
    flex: 0 0 auto;
  }

  .switch__thumb {
    position: absolute;
    top: var(--pad);
    width: calc(var(--h) - var(--pad) * 2 - 2px);
    height: calc(var(--h) - var(--pad) * 2 - 2px);
    border-radius: 50%;
    background: #6ee49a;
    box-shadow: 0 0 6px rgba(110, 228, 154, 0.7);
    left: calc(var(--w) - var(--h) + var(--pad));
    transition: left 200ms cubic-bezier(0.32, 1.6, 0.5, 1), background 160ms ease;
  }

  .chip[data-kind="pending"] .switch {
    border-color: rgba(240, 178, 101, 0.45);
    background: rgba(240, 178, 101, 0.1);
    box-shadow: 0 0 8px rgba(240, 178, 101, 0.18);
  }

  .chip[data-kind="pending"] .switch__thumb {
    background: #f0b265;
    box-shadow: 0 0 6px rgba(240, 178, 101, 0.6);
  }

  .chip[data-kind="warning"] .switch {
    border-color: rgba(238, 115, 115, 0.45);
    background: rgba(238, 115, 115, 0.1);
    box-shadow: 0 0 8px rgba(238, 115, 115, 0.18);
  }

  .chip[data-kind="warning"] .switch__thumb {
    background: #ee7373;
    box-shadow: 0 0 6px rgba(238, 115, 115, 0.6);
  }

  .switch:hover {
    filter: brightness(1.08);
  }

  .switch:active {
    transform: translateY(0.5px);
  }



  button {
    all: unset;
    cursor: pointer;
    box-sizing: border-box;
    font-family: inherit;
  }

  .engage {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 9px;
    font-size: 9.5px;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #ebe6dc;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(235, 230, 220, 0.18);
    border-radius: 5px;
    transition: background 120ms ease, border-color 120ms ease, transform 80ms ease;
  }

  .engage::after {
    content: "→";
    font-family: ui-serif, Georgia, serif;
    font-style: italic;
    font-size: 13px;
    letter-spacing: 0;
    transform: translateY(-0.5px);
  }

  .engage:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(235, 230, 220, 0.32);
  }

  .engage:active { transform: translateY(1px); }

  .close {
    width: 22px;
    height: 22px;
    display: inline-grid;
    place-items: center;
    border-radius: 5px;
    color: rgba(235, 230, 220, 0.55);
    font-size: 14px;
    line-height: 1;
    transition: background 120ms ease, color 120ms ease;
  }

  .close:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #ebe6dc;
  }

  /* Light host page tweak — keep chip dark for legibility on white pages */
  @media (prefers-color-scheme: light) {
    .chip {
      box-shadow:
        0 1px 0 0 rgba(255, 255, 255, 0.05) inset,
        0 10px 30px rgba(20, 18, 14, 0.18),
        0 2px 6px rgba(20, 18, 14, 0.08);
    }
  }
`

interface BannerHandle {
  update(state: BannerState): void
  destroy(): void
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

  // Per-session, in-memory dismissals keyed by `${kind}:${reason ?? ''}`.
  // A page refresh resets this — the banner can come back next visit.
  const dismissed = new Set<string>()

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
    if (dismissed.has(stateKey)) {
      root.replaceChildren()
      return
    }

    const chip = document.createElement('div')
    chip.className = 'chip'
    chip.dataset.kind = state.kind

    // Left zone: switch + label. Reads naturally "[switch] TEMP CHAT" — the
    // toggle directly controls the labeled feature.
    const head = document.createElement('span')
    head.className = 'chip__head'

    const providerId = state.providerId
    const switchBtn = document.createElement('button')
    switchBtn.className = 'switch'
    switchBtn.type = 'button'
    switchBtn.setAttribute('role', 'switch')
    switchBtn.setAttribute('aria-checked', 'true')
    switchBtn.setAttribute('aria-label', `Disable enforcement on ${state.provider}`)
    switchBtn.title = `Disable enforcement on ${state.provider}`
    const thumb = document.createElement('span')
    thumb.className = 'switch__thumb'
    switchBtn.appendChild(thumb)
    switchBtn.addEventListener('click', () => {
      void options.onDisableSite?.(providerId)
    })
    head.appendChild(switchBtn)

    const brand = document.createElement('span')
    brand.className = 'chip__brand'
    brand.textContent = 'Temp chat'
    head.appendChild(brand)

    chip.appendChild(head)

    // Right zone: action(s) + dismiss.
    const tail = document.createElement('span')
    tail.className = 'chip__tail'

    if (state.kind === 'warning' && state.actionUrl) {
      const actionUrl = state.actionUrl
      const action = document.createElement('button')
      action.className = 'engage'
      action.textContent = 'Engage'
      action.addEventListener('click', () => {
        window.location.assign(actionUrl)
      })
      tail.appendChild(action)
    }

    const close = document.createElement('button')
    close.className = 'close'
    close.type = 'button'
    close.setAttribute('aria-label', 'Dismiss until next refresh')
    close.title = 'Dismiss until next refresh'
    close.textContent = '×'
    close.addEventListener('click', () => {
      dismissed.add(stateKey)
      root.replaceChildren()
    })
    tail.appendChild(close)

    chip.appendChild(tail)
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
    destroy() {
      host.remove()
    },
  }
}
