import { getSupabasePublicEnv } from '@/lib/supabase/env'

export type LaunchChecklistItemId =
  | 'auth_working'
  | 'project_creation'
  | 'save_project'
  | 'reload_project'
  | 'export_working'
  | 'download_working'
  | 'mobile_responsive'
  | 'pricing_visible'
  | 'feedback_active'
  | 'analytics_active'

export type LaunchChecklistItem = {
  id: LaunchChecklistItemId
  label: string
  description: string
  autoProbe?: boolean
}

export const LAUNCH_CHECKLIST_ITEMS: LaunchChecklistItem[] = [
  {
    id: 'auth_working',
    label: 'Authentication Working',
    description: 'Sign up, sign in, and session persistence',
    autoProbe: true,
  },
  {
    id: 'project_creation',
    label: 'Project Creation Working',
    description: 'Quick Cut or Director flow creates a project',
  },
  {
    id: 'save_project',
    label: 'Save Project Working',
    description: 'Auto-save and manual save persist to library',
  },
  {
    id: 'reload_project',
    label: 'Reload Project Working',
    description: 'Open saved project from Projects and continue',
  },
  {
    id: 'export_working',
    label: 'Export Working',
    description: 'Compile / export pipeline completes without error',
  },
  {
    id: 'download_working',
    label: 'Download Working',
    description: 'MP4, script, and asset downloads succeed',
  },
  {
    id: 'mobile_responsive',
    label: 'Mobile Responsive',
    description: 'Create, studio, and projects usable on phone widths',
  },
  {
    id: 'pricing_visible',
    label: 'Pricing Visible',
    description: 'Pricing page reachable from nav and homepage',
    autoProbe: true,
  },
  {
    id: 'feedback_active',
    label: 'Feedback Collection Active',
    description: 'Post-generation feedback modal and API',
    autoProbe: true,
  },
  {
    id: 'analytics_active',
    label: 'Analytics Tracking Active',
    description: 'PostHog or internal analytics bootstrapped',
    autoProbe: true,
  },
]

export const LAUNCH_READINESS_STORAGE_KEY = 'mugtee_launch_readiness_v1'

export type LaunchChecklistState = Record<LaunchChecklistItemId, boolean>

export function defaultChecklistState(): LaunchChecklistState {
  return Object.fromEntries(
    LAUNCH_CHECKLIST_ITEMS.map((item) => [item.id, false])
  ) as LaunchChecklistState
}

export function readChecklistState(): LaunchChecklistState {
  if (typeof window === 'undefined') return defaultChecklistState()
  try {
    const raw = localStorage.getItem(LAUNCH_READINESS_STORAGE_KEY)
    if (!raw) return defaultChecklistState()
    const parsed = JSON.parse(raw) as Partial<LaunchChecklistState>
    return { ...defaultChecklistState(), ...parsed }
  } catch {
    return defaultChecklistState()
  }
}

export function writeChecklistState(state: LaunchChecklistState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LAUNCH_READINESS_STORAGE_KEY, JSON.stringify(state))
}

export type AutoProbeResult = {
  passed: boolean
  hint: string
}

export async function probeRouteExists(path: string): Promise<boolean> {
  try {
    const res = await fetch(path, { method: 'HEAD', cache: 'no-store' })
    return res.ok || res.status === 405
  } catch {
    return false
  }
}

export async function runAutoProbes(): Promise<Partial<Record<LaunchChecklistItemId, AutoProbeResult>>> {
  const supabase = getSupabasePublicEnv()
  const analyticsKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()

  const [pricingOk, feedbackOk] = await Promise.all([
    probeRouteExists('/pricing'),
    probeRouteExists('/api/feedback'),
  ])

  return {
    auth_working: {
      passed: Boolean(supabase?.url && supabase?.anonKey),
      hint: supabase ? 'Supabase env configured' : 'Missing NEXT_PUBLIC_SUPABASE_URL or anon key',
    },
    pricing_visible: {
      passed: pricingOk,
      hint: pricingOk ? '/pricing responds' : '/pricing unreachable',
    },
    feedback_active: {
      passed: feedbackOk,
      hint: feedbackOk ? '/api/feedback reachable' : 'Feedback API unreachable',
    },
    analytics_active: {
      passed: Boolean(analyticsKey),
      hint: analyticsKey ? 'NEXT_PUBLIC_POSTHOG_KEY set' : 'Set NEXT_PUBLIC_POSTHOG_KEY for product analytics',
    },
  }
}

export function checklistProgress(state: LaunchChecklistState): {
  completed: number
  total: number
  percent: number
} {
  const total = LAUNCH_CHECKLIST_ITEMS.length
  const completed = LAUNCH_CHECKLIST_ITEMS.filter((item) => state[item.id]).length
  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 0,
  }
}
