export type AdapterId = 'chatgpt' | 'claude' | 'gemini'

export interface ProviderAdapter {
  readonly id: AdapterId
  readonly displayName: string
  readonly docsUrl: string

  matches(url: URL): boolean

  /** True for any page where the user could send a chat message (fresh landing or existing thread). */
  isChatContext(url: URL): boolean

  /** True for fresh "new chat" landings where auto-redirect to the temporary URL is acceptable. */
  isFreshChat(url: URL): boolean

  /** Cheap, synchronous URL-only check: does this URL itself indicate temporary/incognito mode? */
  isTemporaryUrl(url: URL): boolean

  /** Build the temporary-mode URL from a fresh landing URL. Return null if URL activation is not supported. */
  buildTemporaryUrl(url: URL): string | null

  /** Read the live DOM to confirm temporary mode is currently active. Runs in a content script. */
  detectActive(): boolean

  /** Best-effort DOM activation (used when URL activation is not available, e.g. Gemini). */
  activateViaDom?(): Promise<boolean>

  /** Build a URL that exits temporary mode. Return null if URL is already non-temporary. */
  deactivateUrl?(url: URL): string | null

  /** Best-effort DOM deactivation (used when URL deactivation is not available, e.g. Gemini). */
  deactivateViaDom?(): Promise<boolean>
}

export type AdapterStatus =
  | {kind: 'unsupported'}
  | {kind: 'disabled'}
  | {kind: 'confirmed'; adapter: ProviderAdapter}
  | {kind: 'pending'; adapter: ProviderAdapter}
  | {kind: 'warning'; adapter: ProviderAdapter; reason: string}
