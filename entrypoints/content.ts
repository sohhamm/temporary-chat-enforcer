import {startEnforcement} from '@/lib/runtime/enforce'

export default defineContentScript({
  matches: [
    'https://chatgpt.com/*',
    'https://www.chatgpt.com/*',
    'https://claude.ai/*',
    'https://www.claude.ai/*',
    'https://gemini.google.com/*',
  ],
  runAt: 'document_start',
  async main() {
    try {
      await startEnforcement()
    } catch (err) {
      console.warn('[temporary-chat-enforcer] failed to start', err)
    }
  },
})
