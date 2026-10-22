import { Language } from './translations'

export interface TrialEvent {
  date: number
  trialTime: number
}

export interface TourEvent {
  feature: 'NEXT_STEP' | 'LEARN_MORE' | 'END_TOUR'
}

export interface PricingEvent {
  feature: 'VIEW_PRICING' | 'GO_TO_CHECKOUT' | 'GO_TO_PLAN_A' | 'GO_TO_PLAN_B'
}

export interface LanguageEvent {
  lang: Language
}
