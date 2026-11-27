# Privacy Policy — Temporary Chat Enforcer

Last updated: 2026-11-27

Temporary Chat Enforcer is a free, open-source browser extension built by Super Collective.

## Data collection

**Temporary Chat Enforcer does not collect, store, or transmit any user data.**

- No chat prompts, responses, browsing history, or page content are ever read, logged, or sent
  anywhere.
- No analytics, telemetry, crash reporting, or remote assets (including remote fonts) are loaded or
  called.
- The extension makes **zero network requests**.

## Permissions used

- **`storage`** — stores only your local on/off toggles (master switch and per-provider
  enable/disable state) via `chrome.storage.sync` / `browser.storage.sync`. If you disable browser
  sync, preferences remain local to your device.
- **Host permissions (`chatgpt.com`, `claude.ai`, `gemini.google.com`, `grok.com`,
  `perplexity.ai`)** — required strictly to inject the content script that enables each provider's
  built-in temporary/incognito chat mode and displays the on-page status indicator. The extension
  does not run on any other website.

## Third-party AI providers

Temporary Chat Enforcer only activates each AI provider's native temporary/incognito chat mode.
Conversations remain governed by each provider's own privacy policy and short-term safety retention
rules (for example, ChatGPT, Claude, Gemini, Grok, and Perplexity may temporarily retain sessions
for safety monitoring).

## Contact

Questions or security reports: `support@supercollective.studio` or open an issue at
<https://github.com/sohhamm/temporary-chat-enforcer/issues>.
