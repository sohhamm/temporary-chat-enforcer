import type {ContentRequest} from '@/lib/messages'
import {startEnforcement} from '@/lib/runtime/enforce'

function isContentRequest(msg: unknown): msg is ContentRequest {
  if (typeof msg !== 'object' || msg === null || !('type' in msg)) return false
  const {type} = msg as {type: unknown}
  return type === 'tce:get-status' || type === 'tce:engage' || type === 'tce:show-banner'
}

export default defineContentScript({
  matches: [
    'https://chatgpt.com/*',
    'https://www.chatgpt.com/*',
    'https://claude.ai/*',
    'https://www.claude.ai/*',
    'https://gemini.google.com/*',
    'https://grok.com/*',
    'https://www.grok.com/*',
    'https://perplexity.ai/*',
    'https://www.perplexity.ai/*',
  ],
  runAt: 'document_start',
  async main() {
    try {
      const controller = await startEnforcement()

      browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (!isContentRequest(message)) return undefined

        if (message.type === 'tce:get-status') {
          sendResponse(controller.getStatus())
          return undefined
        }

        if (message.type === 'tce:show-banner') {
          controller.showBanner()
          sendResponse({ok: true})
          return undefined
        }

        if (message.type === 'tce:engage') {
          void controller.engage().then(
            ok => sendResponse({ok}),
            () => sendResponse({ok: false}),
          )
          return true
        }

        return undefined
      })
    } catch (err) {
      console.warn('[temporary-chat-enforcer] failed to start', err)
    }
  },
})
