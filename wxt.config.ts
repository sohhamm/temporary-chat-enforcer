import {defineConfig} from 'wxt'

const chromeProfile = process.env.CHROME_PROFILE
const cometProfile = process.env.COMET_PROFILE
const chromiumProfile = cometProfile ?? chromeProfile
const manualBrowser = process.env.WXT_MANUAL_BROWSER === '1'

// https://wxt.dev/api/config.html
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
  manifest: {
    name: 'Temporary Chat Enforcer',
    description:
      'Auto-enables native temporary/incognito chat mode on supported LLM web apps and warns when it is not active.',
    permissions: ['storage'],
    host_permissions: [
      'https://chatgpt.com/*',
      'https://claude.ai/*',
      'https://gemini.google.com/*',
    ],
    action: {
      default_title: 'Temporary Chat Enforcer',
    },
  },
})
