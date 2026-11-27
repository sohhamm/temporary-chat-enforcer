import {defineConfig} from 'wxt'

const chromeProfile = process.env.CHROME_PROFILE
const cometProfile = process.env.COMET_PROFILE
const chromiumProfile = cometProfile ?? chromeProfile
const manualBrowser = process.env.WXT_MANUAL_BROWSER === '1'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  outDir: 'dist',
  webExt: {
    disabled: manualBrowser,
    binaries: {
      chrome: '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev',
      comet: '/Applications/Comet.app/Contents/MacOS/Comet',
    },
    startUrls: ['https://chatgpt.com/'],
    ...(chromiumProfile
      ? {
          chromiumProfile,
          keepProfileChanges: true,
        }
      : {}),
  },
  manifest: ({browser}) => ({
    name: 'Temporary Chat Enforcer',
    version: '1.0.0',
    description:
      'Auto-enables native temporary/incognito chat mode on ChatGPT, Claude, Gemini, Grok, and Perplexity and warns when it is not active.',
    homepage_url: 'https://github.com/sohhamm/temporary-chat-enforcer',
    permissions: ['storage'],
    host_permissions: [
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
    action: {
      default_title: 'Temporary Chat Enforcer',
    },
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'temporary-chat-enforcer@supercollective.studio',
              strict_min_version: '128.0',
              data_collection_permissions: {
                required: ['none'],
              },
            },
          },
        }
      : {}),
  }),
})
