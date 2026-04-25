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

export function adapterForUrl(href: string): ProviderAdapter | null {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  return ADAPTERS.find(a => a.matches(url)) ?? null
}

export type {AdapterId, ProviderAdapter} from './types'
