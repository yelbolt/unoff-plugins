import { ConsentConfiguration } from '@unoff/ui'
import { UserIdentity, UserSession } from './user'

export type Platform = 'figma' | 'penpot' | 'sketch' | 'framer'

export type Service = 'MY_SERVICE'

export interface ContextItem {
  label: string
  id: Context
  isUpdated: boolean
  isNew?: boolean
  isActive: boolean
}

export interface BaseProps {
  service: Service
  userSession: UserSession
  userIdentity: UserIdentity
  userConsent: Array<ConsentConfiguration>
  plans: Plans
  planStatus: PlanStatus
  trialStatus: TrialStatus
  trialRemainingTime: number
  creditsCount: number
  creditsRenewalDate: number
  editor: Editor
  documentWidth: number
}

export type Context =
  | 'WELCOME'
  | 'EXAMPLES'
  | 'EXAMPLES_TODO_LIST'
  | 'EXAMPLES_COLOR_PALETTE'
  | 'EXAMPLES_LAYER_INSPECTOR'

export type PlanStatus = 'UNPAID' | 'PAID' | 'NOT_SUPPORTED'

export type TrialStatus = 'UNUSED' | 'PENDING' | 'EXPIRED' | 'SUSPENDED'

export type Editor =
  | 'figma'
  | 'figjam'
  | 'dev'
  | 'dev_vscode'
  | 'buzz'
  | 'penpot'
  | 'sketch'
  | 'framer'

export type AnnouncementsStatus =
  | 'NO_ANNOUNCEMENTS'
  | 'DISPLAY_ANNOUNCEMENTS_NOTIFICATION'
  | 'DISPLAY_ANNOUNCEMENTS_DIALOG'

export type OnboardingStatus = 'NO_ONBOARDING' | 'DISPLAY_ONBOARDING_DIALOG'

export interface AnnouncementsDigest {
  version: string
  status: AnnouncementsStatus
}

export type ModalContext =
  | 'EMPTY'
  | 'NOTIFICATION'
  | 'PREFERENCES'
  | 'LICENSE'
  | 'ANNOUNCEMENTS'
  | 'ONBOARDING'
  | 'REPORT'
  | 'CHAT'
  | 'FEEDBACK'
  | 'ABOUT'
  | 'TRY'
  | 'PRICING'
  | 'WELCOME_TO_PRO'
  | 'WELCOME_TO_TRIAL'

export type Plans = Array<'PLAN_A' | 'PLAN_B' | 'ACTIVATE'>
