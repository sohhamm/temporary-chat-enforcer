import {chatgptAdapter} from './chatgpt'
import {claudeAdapter} from './claude'
import {geminiAdapter} from './gemini'
import type {AdapterId, ProviderAdapter} from './types'

export const ADAPTERS: readonly ProviderAdapter[] = [
  chatgptAdapter,
  claudeAdapter,
  geminiAdapter,
] as const

export const ADAPTERS_BY_ID: Readonly<Record<AdapterId, ProviderAdapter>> = {
  chatgpt: chatgptAdapter,
  claude: claudeAdapter,
  gemini: geminiAdapter,
}

export function adapterForUrl(href: string | URL): ProviderAdapter | null {
  let url: URL
  if (typeof href !== 'string') {
    url = href
  } else {
    try {
      url = new URL(href)
    } catch {
      return null
    }
  }
  return ADAPTERS.find(a => a.matches(url)) ?? null
}

export type {AdapterId, ProviderAdapter} from './types'
