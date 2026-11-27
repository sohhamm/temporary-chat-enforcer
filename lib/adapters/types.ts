export type AdapterId = 'chatgpt' | 'claude' | 'gemini' | 'grok' | 'perplexity'

export interface ProviderAdapter {
  readonly id: AdapterId
  readonly displayName: string
  readonly hostname: string

  readonly matches: (url: URL) => boolean
  readonly isChatContext: (url: URL) => boolean
  readonly isFreshChat: (url: URL) => boolean
  readonly isTemporaryUrl: (url: URL) => boolean
  readonly buildTemporaryUrl: (url: URL) => string | null
  readonly detectActive: () => boolean
  readonly activateViaDom?: () => Promise<boolean>
  readonly deactivateUrl?: (url: URL) => string | null
  readonly deactivateViaDom?: () => Promise<boolean>
}
