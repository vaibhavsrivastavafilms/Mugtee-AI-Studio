export type FounderTestingCategory = 'bugs' | 'ux_issues' | 'launch_blockers'

export type FounderTestingItemId =
  | 'bugs_signup_login'
  | 'bugs_generation_save'
  | 'bugs_export_download'
  | 'bugs_mobile_layout'
  | 'ux_onboarding_empty'
  | 'ux_copy_confusing'
  | 'ux_loading_feedback'
  | 'blocker_auth'
  | 'blocker_billing'
  | 'blocker_trust_legal'
  | 'blocker_performance'

export type FounderTestingItem = {
  id: FounderTestingItemId
  category: FounderTestingCategory
  label: string
  description: string
}

export const FOUNDER_TESTING_ITEMS: FounderTestingItem[] = [
  {
    id: 'bugs_signup_login',
    category: 'bugs',
    label: 'Signup / login bugs',
    description: 'OAuth, session, or redirect issues',
  },
  {
    id: 'bugs_generation_save',
    category: 'bugs',
    label: 'Generation / save bugs',
    description: 'Pipeline failures, lost work, or bad error states',
  },
  {
    id: 'bugs_export_download',
    category: 'bugs',
    label: 'Export / download bugs',
    description: 'MP4, assets, or compile failures',
  },
  {
    id: 'bugs_mobile_layout',
    category: 'bugs',
    label: 'Mobile layout bugs',
    description: 'Overflow, overlap, or unusable touch targets',
  },
  {
    id: 'ux_onboarding_empty',
    category: 'ux_issues',
    label: 'Onboarding & empty states',
    description: 'Blank screens without guidance for new creators',
  },
  {
    id: 'ux_copy_confusing',
    category: 'ux_issues',
    label: 'Confusing copy',
    description: 'Pricing, limits, or step labels unclear',
  },
  {
    id: 'ux_loading_feedback',
    category: 'ux_issues',
    label: 'Loading feedback',
    description: 'Spinners without progress or skeletons',
  },
  {
    id: 'blocker_auth',
    category: 'launch_blockers',
    label: 'Auth blocker',
    description: 'Cannot sign up or persist session in production',
  },
  {
    id: 'blocker_billing',
    category: 'launch_blockers',
    label: 'Billing blocker',
    description: 'Limits, waitlist, or upgrade path broken',
  },
  {
    id: 'blocker_trust_legal',
    category: 'launch_blockers',
    label: 'Trust / legal blocker',
    description: 'Privacy, terms, contact, or footer missing',
  },
  {
    id: 'blocker_performance',
    category: 'launch_blockers',
    label: 'Performance blocker',
    description: 'Unacceptable load time or repeated crashes',
  },
]

export type FounderTestingState = Record<FounderTestingItemId, boolean>

export const FOUNDER_TESTING_STORAGE_KEY = 'mugtee_founder_testing_v1'

export function defaultFounderTestingState(): FounderTestingState {
  return Object.fromEntries(
    FOUNDER_TESTING_ITEMS.map((i) => [i.id, false])
  ) as FounderTestingState
}

export function readFounderTestingState(): FounderTestingState {
  if (typeof window === 'undefined') return defaultFounderTestingState()
  try {
    const raw = localStorage.getItem(FOUNDER_TESTING_STORAGE_KEY)
    if (!raw) return defaultFounderTestingState()
    const parsed = JSON.parse(raw) as Partial<FounderTestingState>
    const base = defaultFounderTestingState()
    for (const item of FOUNDER_TESTING_ITEMS) {
      const value = parsed[item.id]
      if (typeof value === 'boolean') base[item.id] = value
    }
    return base
  } catch {
    return defaultFounderTestingState()
  }
}

export function writeFounderTestingState(state: FounderTestingState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(FOUNDER_TESTING_STORAGE_KEY, JSON.stringify(state))
}

export function founderTestingProgress(state: FounderTestingState): {
  completed: number
  total: number
  percent: number
} {
  const total = FOUNDER_TESTING_ITEMS.length
  const completed = FOUNDER_TESTING_ITEMS.filter((i) => state[i.id]).length
  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 0,
  }
}

export const FOUNDER_CATEGORY_LABELS: Record<FounderTestingCategory, string> = {
  bugs: 'Bugs',
  ux_issues: 'UX issues',
  launch_blockers: 'Launch blockers',
}
