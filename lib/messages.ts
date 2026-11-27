import type {AdapterId} from './adapters/types'

export type TabStatus =
  | {kind: 'out-of-scope'; host: string | null}
  | {kind: 'non-chat'; providerId: AdapterId; provider: string; host: string}
  | {kind: 'off'; providerId: AdapterId; provider: string; host: string; globalOff: boolean}
  | {
      kind: 'securing'
      providerId: AdapterId
      provider: string
      host: string
      bannerDismissed?: boolean
    }
  | {
      kind: 'active'
      providerId: AdapterId
      provider: string
      host: string
      bannerDismissed?: boolean
    }
  | {
      kind: 'exposed'
      providerId: AdapterId
      provider: string
      host: string
      reason: string
      canEngage: boolean
      actionUrl?: string
      bannerDismissed?: boolean
    }

export type ContentRequest =
  | {type: 'tce:get-status'}
  | {type: 'tce:engage'}
  | {type: 'tce:show-banner'}

export interface EngageResponse {
  ok: boolean
}
