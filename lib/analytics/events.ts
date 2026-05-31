/** Canonical first-party analytics event names (stored as analytics_events.event). */

export const AnalyticsEvents = {
  // Landing & funnel
  LANDING_PAGE_VIEWED: 'landing_page_viewed',
  HOMEPAGE_VISIT: 'homepage_visit',

  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',

  FIRST_PROJECT_CREATED: 'first_project_created',
  PROJECT_CREATED: 'project_created',
  NEW_PROJECT_CREATED: 'new_project_created',
  PROJECT_OPENED: 'project_opened',

  FIRST_GENERATION_STARTED: 'first_generation_started',
  FIRST_GENERATION_COMPLETED: 'first_generation_completed',
  GENERATION_STARTED: 'generation_started',
  GENERATION_COMPLETED: 'generation_completed',
  GENERATION_FAILED: 'generation_failed',
  GENERATION_STEP_PERF: 'generation_step_perf',
  RESUME_GENERATION: 'resume_generation',

  PROJECT_EXPORTED: 'project_exported',
  EXPORT_STARTED: 'export_started',
  EXPORT_COMPLETED: 'export_completed',

  // Homepage engagement
  HERO_CTA_CLICKED: 'hero_cta_clicked',
  EXAMPLE_OUTPUT_VIEWED: 'example_output_viewed',
  TESTIMONIAL_VIEWED: 'testimonial_viewed',
  PRICING_VIEWED: 'pricing_viewed',
  FINAL_CTA_CLICKED: 'final_cta_clicked',

  // Creator actions
  REGENERATE_CLICKED: 'regenerate_clicked',
  IMPROVE_HOOK_CLICKED: 'improve_hook_clicked',
  IMPROVE_SCRIPT_CLICKED: 'improve_script_clicked',

  STORYBOARD_VIEWED: 'storyboard_viewed',
  DIRECTOR_MODE_OPENED: 'director_mode_opened',

  FEEDBACK_SUBMITTED: 'feedback_submitted',
  PRICING_PAGE_VIEW: 'pricing_page_view',
  UPGRADE_CLICK: 'upgrade_click',
  UPGRADE_WAITLIST_JOINED: 'upgrade_waitlist_joined',
  PAYMENT_ATTEMPT: 'payment_attempt',

  REGENERATE_HOOK: 'regenerate_hook',
  REGENERATE_SCENE: 'regenerate_scene',
  REGENERATE_CAPTIONS: 'regenerate_captions',
  REGENERATE_VISUAL_DIRECTION: 'regenerate_visual_direction',

  REWRITE_ACTION_USED: 'rewrite_action_used',
  REWRITE_SUCCESS: 'rewrite_success',
  REWRITE_ACCEPT: 'rewrite_accept',
  REWRITE_REVERT: 'rewrite_revert',

  /** Internal error visibility — category in metadata (openai, api, timeout, export). */
  ANALYTICS_ERROR: 'analytics_error',
} as const

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents]

/** Core funnel events with strongly-typed metadata expectations. */
export type FunnelEvent =
  | 'landing_page_viewed'
  | 'homepage_visit'
  | 'signup_started'
  | 'signup_completed'
  | 'first_project_created'
  | 'project_created'
  | 'first_generation_started'
  | 'first_generation_completed'
  | 'generation_started'
  | 'generation_completed'
  | 'generation_failed'
  | 'project_exported'
  | 'export_completed'
  | 'storyboard_viewed'
  | 'resume_generation'

export type AnalyticsMetadata = {
  projectId?: string | null
  niche?: string
  duration?: number
  duration_ms?: number
  generationStep?: string
  generation_start_time?: number
  generation_end_time?: number
  success?: boolean
  failure?: string | null
  source?: string
  resume_from?: string | null
  resume?: boolean
  style?: string
  mock?: boolean
  message?: string
  step?: string
  scene_count?: number
  asset?: string
  video?: boolean
  package?: boolean
  rating?: string
  has_text?: boolean
  provider?: string
  first_visit?: boolean
  workflow?: string
  referrer?: string | null
  device?: string | null
  category?: string
  section?: string
  [key: string]: unknown
}

/** Row shape for analytics_events inserts (production schema). */
export type AnalyticsEventRow = {
  user_id: string | null
  session_id: string | null
  event: string
  page: string | null
  metadata: AnalyticsMetadata
}

/** Stored analytics event (includes DB-generated fields). */
export type AnalyticsEvent = AnalyticsEventRow & {
  id?: string
  created_at?: string
}

export const FeedbackRatings = ['excellent', 'good', 'average', 'weak'] as const
export type FeedbackRating = (typeof FeedbackRatings)[number]

export const FEEDBACK_RATING_SCORE: Record<FeedbackRating, number> = {
  excellent: 100,
  good: 75,
  average: 50,
  weak: 25,
}

/** Read projectId from metadata (supports legacy project_id key). */
export function projectIdFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): string | null {
  const m = metadata ?? {}
  const id = m.projectId ?? m.project_id
  return typeof id === 'string' && id.trim() ? id : null
}
