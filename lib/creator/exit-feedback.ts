/** Creator Exit Intelligence — triggers, reasons, and client-side dedupe. */

export const EXIT_FEEDBACK_TRIGGERS = [
  'usage_limit',
  'pricing_leave',
  'export_inactive',
  'account_delete',
] as const

export type ExitFeedbackTrigger = (typeof EXIT_FEEDBACK_TRIGGERS)[number]

export const EXIT_FEEDBACK_REASONS = [
  { value: 'just_exploring', label: 'Just exploring' },
  { value: 'output_quality', label: 'Output quality' },
  { value: 'missing_features', label: 'Missing features' },
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'confusing_workflow', label: 'Confusing workflow' },
  { value: 'will_return_later', label: 'Will return later' },
  { value: 'other', label: 'Other' },
] as const

export type ExitFeedbackReason = (typeof EXIT_FEEDBACK_REASONS)[number]['value']

export const EXIT_FEEDBACK_REQUEST_EVENT = 'mugtee:exit-feedback-request'

export type ExitFeedbackRequestDetail = {
  trigger: ExitFeedbackTrigger
}

function storageKey(trigger: ExitFeedbackTrigger): string {
  return `mugtee:exit-feedback:${trigger}`
}

function readStorage(trigger: ExitFeedbackTrigger): Storage | null {
  if (typeof window === 'undefined') return null
  return trigger === 'pricing_leave' ? window.sessionStorage : window.localStorage
}

export function hasExitFeedbackForTrigger(trigger: ExitFeedbackTrigger): boolean {
  const storage = readStorage(trigger)
  if (!storage) return false
  return storage.getItem(storageKey(trigger)) === '1'
}

export function markExitFeedbackShown(trigger: ExitFeedbackTrigger): void {
  const storage = readStorage(trigger)
  if (!storage) return
  storage.setItem(storageKey(trigger), '1')
}

/** Dispatch exit-feedback modal request (deduped per trigger). Safe from non-React code. */
export function requestExitFeedback(trigger: ExitFeedbackTrigger): void {
  if (typeof window === 'undefined') return
  if (hasExitFeedbackForTrigger(trigger)) return
  window.dispatchEvent(
    new CustomEvent<ExitFeedbackRequestDetail>(EXIT_FEEDBACK_REQUEST_EVENT, {
      detail: { trigger },
    })
  )
}

export function formatExitReason(reason: string): string {
  const match = EXIT_FEEDBACK_REASONS.find((r) => r.value === reason)
  return match?.label ?? reason.replace(/_/g, ' ')
}
