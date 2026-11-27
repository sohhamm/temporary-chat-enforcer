# Temporary Chat Enforcer

A small, privacy-first browser extension by [Super Collective](https://supercollective.studio) that
auto-enables the **native temporary / incognito chat mode** on the LLM web apps you actually use,
and warns you when it isn't active.

It does not invent a new "private mode." It just makes sure the one each provider already ships is
on by default, so you don't have to remember to click the button every time you open a new chat.

## Supported providers

| Provider                         | Activation | How                                                                  |
| -------------------------------- | ---------- | -------------------------------------------------------------------- |
| **ChatGPT** (`chatgpt.com`)      | URL flag   | Redirects fresh landings to `chatgpt.com/?temporary-chat=true`.      |
| **Claude** (`claude.ai`)         | URL flag   | Redirects fresh landings to `claude.ai/new?incognito`.               |
| **Gemini** (`gemini.google.com`) | DOM click  | Waits for the in-page **Temporary chat** button and clicks it.       |
| **Grok** (`grok.com`)            | DOM click  | Waits for the in-page **Private** button and clicks it.              |
| **Perplexity** (`perplexity.ai`) | Shortcut   | Triggers native Incognito mode (`Ctrl+;`) and confirms cookie state. |

If you visit any other site, the extension does nothing.

## What you'll see

- A compact **green pill** at the top of the page when temporary mode is confirmed active.
- A **red warning pill** if temporary mode isn't active (for example, on an existing non-temporary
  chat) with an **Engage** action button across all supported providers.
- The extension popup shows live status for the current tab, an **Engage temporary chat** button
  when exposed, a master switch, and per-site toggles. Turning a site **off** while in temporary
  mode also exits the temporary chat.

## Install

### From source

Use Bun 1.4.5+ (pinned in `.bun-version`) and Node.js 22.22.2+, 24.15.0+, or 26+.

```sh
git clone https://github.com/sohhamm/temporary-chat-enforcer.git
cd temporary-chat-enforcer
bun install --frozen-lockfile
bun run build
```

Then load the unpacked extension in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select `dist/chrome-mv3/`.

For Firefox: `bun run build:firefox` and load from `dist/firefox-mv2/`.

Store release archives: `bun run zip` (Chrome Web Store) and `bun run zip:firefox` (Firefox
Add-ons).

### Development

`bun dev` starts WXT without launching a browser. Load `dist/chrome-mv3-dev/` manually.

```sh
bun dev               # Hot-reload dev server (Chrome)
bun dev:firefox       # Same, but for Firefox
bun run format        # Format with bun fmt (.oxfmtrc.json)
bun run lint          # Type-aware lint with bun lint (.oxlintrc.json)
bun run check         # Format check + lint
bun run typecheck     # Typecheck with bun check
bun run test          # Unit tests with bun test
bun run build         # Production Chrome MV3 build
bun run build:firefox # Production Firefox MV2 build
```

> Note: `bun lint` currently requires Bun canary (`1.4.5-canary.20261121.1` or newer, which CI
> pins). `bun fmt`, `bun check`, and `bun test` run on stable Bun 1.4.5.

## Permissions & privacy

The extension requests the absolute minimum:

- `storage` — saves your toggle preferences via `chrome.storage.sync`.
- `host_permissions` for `chatgpt.com`, `claude.ai`, `gemini.google.com`, `grok.com`, and
  `perplexity.ai` — injects the content script that flips each provider's native temporary-chat
  toggle.

It does **not** request `tabs`, `activeTab`, `cookies`, `webRequest`, or any other elevated
permission. It loads no external assets, makes zero network requests, and collects no telemetry. See
[`PRIVACY.md`](./PRIVACY.md) for the full privacy policy.

## How it works

Each provider implements `ProviderAdapter` in `lib/adapters/types.ts`. The runtime
(`lib/runtime/enforce.ts`) drives the decision tree on page load and every SPA navigation, keeps the
active tab status synced for the popup (`lib/messages.ts`), and renders the isolated Shadow DOM
status pill (`lib/dom/warning.ts`).

## Project layout

```
entrypoints/
  content.ts            — content script, runs at document_start on the 3 hosts
  popup/                — React 19 popup (live tab status, Engage CTA, master + per-site toggles)
lib/
  adapters/
    types.ts            — ProviderAdapter contract
    chatgpt.ts          — ChatGPT adapter
    claude.ts           — Claude adapter
    gemini.ts           — Gemini adapter
    grok.ts             — Grok adapter
    perplexity.ts       — Perplexity adapter
    index.ts            — registry + adapterForUrl()
  dom/
    spaNav.ts           — pushState/replaceState/popstate watcher
    wait.ts             — waitFor() MutationObserver helper
    warning.ts          — Shadow DOM banner
  popup/
    view.ts             — pure popup view-state mapper
  runtime/
    enforce.ts          — main orchestrator + live status controller
  messages.ts           — content script <-> popup message contract
  settings.ts           — chrome.storage.sync wrapper with default-merge
tests/
  adapters.test.ts      — adapter URL routing + Gemini DOM activation tests
  banner.test.ts        — Shadow DOM banner tests
  popup-view.test.ts    — popup state-machine tests
  settings.test.ts      — settings merge + toggle tests
wxt.config.ts           — MV3/MV2 manifest, permissions, Firefox AMO metadata
PRIVACY.md              — Chrome Web Store / AMO privacy policy
```

## Known limitations

- **Selectors drift.** Gemini and the DOM fallbacks for ChatGPT/Claude rely on attributes and class
  names that providers can change without notice. If activation breaks, open an issue with the new
  DOM snippet.
- **Provider retention rules still apply.** Temporary mode reduces what's stored, but each provider
  still retains temporary sessions briefly for safety review. Check each provider's privacy policy
  for exact terms.
- **Auto-redirect on fresh landings is unconditional** when the site is enabled. To start a regular
  chat, toggle the site off from the in-page pill or popup.

## Contributing

Issues, adapter PRs, and selector updates are welcome. Before opening a PR, run:

```sh
bun run check && bun run typecheck && bun run test && bun run build && bun run build:firefox
```

## License

MIT. See `LICENSE`.
