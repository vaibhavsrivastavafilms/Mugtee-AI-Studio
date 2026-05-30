import type { QuickCutOrchestrationResult } from '@/lib/cinematic/quick-cut/orchestrate-quick-cut'

import type { ProjectLanguage } from '@/lib/cinematic/language-detection'

const PREVIEW_KEY = 'mugtee:quick-cut:preview:v1'
const PENDING_KEY_SESSION = 'mugtee:quick-cut:pending:session:v1'
const PENDING_KEY_LOCAL = 'mugtee:quick-cut:pending:local:v1'

export type QuickCutPending = {
  prompt: string
  style: string
  duration: number
  imageNote?: string
  voiceNote?: string
  keywords?: string[]
  language?: ProjectLanguage
}

export function saveQuickCutPreview(result: QuickCutOrchestrationResult) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(result))
}

export function loadQuickCutPreview(): QuickCutOrchestrationResult | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(PREVIEW_KEY)
    if (!raw) return null
    return JSON.parse(raw) as QuickCutOrchestrationResult
  } catch {
    return null
  }
}

export function clearQuickCutPreview() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(PREVIEW_KEY)
}

export function saveQuickCutPending(pending: QuickCutPending) {
  if (typeof window === 'undefined') return
  const payload = JSON.stringify(pending)
  try {
    localStorage.setItem(PENDING_KEY_LOCAL, payload)
  } catch {
    /* quota / private mode */
  }
  sessionStorage.setItem(PENDING_KEY_SESSION, payload)
}

export function loadQuickCutPending(): QuickCutPending | null {
  if (typeof window === 'undefined') return null
  try {
    const raw =
      localStorage.getItem(PENDING_KEY_LOCAL) ??
      sessionStorage.getItem(PENDING_KEY_SESSION)
    if (!raw) return null
    return JSON.parse(raw) as QuickCutPending
  } catch {
    return null
  }
}

export function clearQuickCutPending() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PENDING_KEY_LOCAL)
  sessionStorage.removeItem(PENDING_KEY_SESSION)
}
