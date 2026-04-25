# Temporary Chat Enforcer

A small, privacy-first browser extension that auto-enables the **native temporary / incognito chat
mode** on the LLM web apps you actually use, and warns you when it isn't active.

It does not invent a new "private mode." It just makes sure the one each provider already ships is
on by default, so you don't have to remember to click the button every time you open a new chat.

## Supported providers

| Provider                         | Activation | How                                                             |
| -------------------------------- | ---------- | --------------------------------------------------------------- |
| **ChatGPT** (`chatgpt.com`)      | URL flag   | Redirects fresh landings to `chatgpt.com/?temporary-chat=true`. |
| **Claude** (`claude.ai`)         | URL flag   | Redirects fresh landings to `claude.ai/new?incognito`.          |
| **Gemini** (`gemini.google.com`) | DOM click  | Waits for the in-page **Temporary chat** button and clicks it.  |

If you visit any other site, the extension does nothing.

## What you'll see

- A small **green pill** at the top of the page when temporary mode is confirmed active: _"Temporary
  chat active on ChatGPT"_.
- A **red warning pill** if the extension can't activate or confirm temporary mode (for example, on
  an existing non-temporary chat). On URL-based providers the warning includes a **Start temporary
  chat** button.
- The extension popup gives you a master toggle and per-site toggles. Turning a site **off** while
  you're already in temporary mode also exits the temporary chat (URL-based providers redirect home;
  Gemini clicks the button to toggle off).

## Install

### From source (recommended for now)

The extension is not yet published to the Chrome Web Store. To run it locally:

```sh
git clone https://github.com/<your-org>/temporary-chat-enforcer.git
cd temporary-chat-enforcer
bun install
bun run build
```

Then load the unpacked extension in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select `.output/chrome-mv3/` (or `dist/chrome-mv3/`, depending on
   your WXT version).

For Firefox: `bun run build:firefox` and load from `.output/firefox-mv2/`.

### Development

```sh
bun dev          # Hot-reload dev server (Chrome)
bun dev:firefox  # Same, but for Firefox
bun run compile  # tsc --noEmit
bun run test     # Vitest unit tests
bun run build    # Production build
```

## Permissions

The extension requests the absolute minimum:

- `storage` — to save your toggle preferences (master switch and per-site enable/disable) via
  `chrome.storage.sync`.
- `host_permissions` for `chatgpt.com`, `claude.ai`, `gemini.google.com` — to inject the content
  script that flips the native temporary-chat toggle.

It does **not** request `tabs`, `activeTab`, `cookies`, `webRequest`, or any other elevated
permission. It does not talk to the network. It does not collect telemetry.

## Privacy

- The extension reads only the URL and a few specific DOM elements on the three supported domains,
  and only to decide whether temporary mode is active.
- No content (chat text, prompts, responses) is ever read, stored, or transmitted.
- Your toggle preferences are stored via `chrome.storage.sync`, which Chrome syncs to your Google
  account if Chrome Sync is enabled. You can opt out by disabling Chrome Sync.
- This extension cannot make a chat private if the provider itself doesn't support it. Temporary /
  incognito chats are still subject to each provider's own retention rules (for example, Gemini
  saves them for 72 hours; ChatGPT may retain temporary chats for up to 30 days for safety review).
  Read each provider's docs (linked from the popup) for the exact terms.

## How it works

The extension is built on a small **adapter** abstraction (`lib/adapters/types.ts`) that each
provider implements. Every adapter answers a fixed set of questions about a URL — _is this a chat
page?_ _is this a fresh landing where I can redirect?_ _is this URL already a temporary chat?_ —
plus optional DOM-based activation/deactivation hooks for providers without a URL flag.

The runtime (`lib/runtime/enforce.ts`) drives the decision tree on each page load and on every SPA
navigation:

1. If the host doesn't match any adapter, do nothing.
2. If the user has disabled this site, do nothing.
3. If the URL already indicates temporary mode, wait for the DOM to confirm, then show the green
   pill.
4. If it's a fresh chat landing and the adapter has a URL form for temporary mode, redirect to it.
5. If the adapter only supports DOM activation (Gemini), wait for the button to mount and click it.
6. If it's an existing chat that isn't temporary, show the warning pill — with a one-click action
   button when the adapter can build a fresh temporary URL.

Detection is deliberately tolerant. Each adapter checks several signals (URL flags, header text,
button class, input placeholders, heading text) so that a small DOM redesign doesn't silently break
enforcement.

The warning banner is rendered into a Shadow DOM at the maximum z-index so the host page's styles
can't reach it, and it's dismissible per-state so the same warning won't keep popping back.

## Project layout

```
entrypoints/
  background.ts         — service worker (placeholder, reserved for cross-tab signaling)
  content.ts            — content script, runs at document_start on the 3 hosts
  popup/                — React 19 popup (master + per-site toggles, current-tab status)
lib/
  adapters/
    types.ts            — ProviderAdapter contract
    chatgpt.ts          — ChatGPT adapter
    claude.ts           — Claude adapter
    gemini.ts           — Gemini adapter
    index.ts            — registry + adapterForUrl()
  dom/
    spaNav.ts           — pushState/replaceState/popstate watcher
    wait.ts             — waitFor() MutationObserver helper
    warning.ts          — Shadow DOM banner
  runtime/
    enforce.ts          — main orchestrator
  settings.ts           — chrome.storage.sync wrapper with default-merge
tests/
  adapters.test.ts      — Vitest unit tests for adapter URL routing
wxt.config.ts           — manifest, permissions, host list
```

## Adding a new provider

1. Implement `ProviderAdapter` in `lib/adapters/<provider>.ts`. Cover at minimum:
   - `matches(url)` — hostname check.
   - `isChatContext(url)` / `isFreshChat(url)` — which paths are chat pages and which are eligible
     for auto-redirect.
   - `isTemporaryUrl(url)` — cheap URL-only check.
   - `buildTemporaryUrl(url)` — return the canonical temporary URL or `null` if the provider has no
     URL form.
   - `detectActive()` — read the live DOM. Use multiple signals.
   - Optional `activateViaDom`, `deactivateUrl`, `deactivateViaDom`.
2. Register the adapter in `lib/adapters/index.ts`.
3. Add the host to `wxt.config.ts` `host_permissions` and `entrypoints/content.ts` `matches`.
4. Add the new `AdapterId` to `lib/adapters/types.ts` and to `DEFAULT_SETTINGS.sites` in
   `lib/settings.ts`.
5. Write Vitest cases in `tests/adapters.test.ts` covering URL routing for the new provider.
6. Manually verify activation and detection against the live site before opening a PR.

## Known limitations

- **Selectors drift.** Gemini and the DOM fallbacks for ChatGPT/Claude rely on attributes and class
  names that providers can change without notice. If activation breaks, the most likely cause is a
  redesign — open an issue with the new DOM and we'll update the adapter.
- **Gemini existing chats.** When you open an old Gemini conversation that wasn't temporary, the
  warning pill has no action button, because Gemini has no URL form for temporary mode. Use the
  in-page Temporary chat button in Gemini's sidebar.
- **Provider retention rules still apply.** Temporary mode reduces what's stored, but does not
  eliminate it. See each provider's docs.
- **Auto-redirect on fresh landings is unconditional** when the site is enabled. If you specifically
  want a non-temporary chat, disable the site in the popup first (which also exits the current
  temporary session).

## Contributing

Issues, adapter PRs, and selector updates are welcome.

When opening an issue:

- For broken activation/detection, include the provider, the URL, and a screenshot or DOM snippet of
  the affected element (with attributes and class names).
- For new provider requests, link the provider's documentation for their native temporary/incognito
  mode. The extension only enforces modes the provider already supports — we won't ship a fake
  "private mode."

When opening a PR:

- Run `bun run compile && bun run test && bun run build` and make sure all three pass.
- For adapter changes, manually verify the flow against the live site (fresh chat, existing chat,
  settings page should all behave correctly).

## License

MIT. See `LICENSE`.

## Acknowledgements

Built on [WXT](https://wxt.dev). Inspired by the simple observation that "remember to click the
button" is not a privacy strategy.
