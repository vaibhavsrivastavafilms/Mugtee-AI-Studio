/** Canonical first-party analytics event names (stored as analytics_events.event). */

export const AnalyticsEvents = {

  HOMEPAGE_VISIT: 'homepage_visit',

  SIGNUP_STARTED: 'signup_started',

  SIGNUP_COMPLETED: 'signup_completed',

  PROJECT_CREATED: 'project_created',

  GENERATION_STARTED: 'generation_started',

  GENERATION_COMPLETED: 'generation_completed',

  GENERATION_FAILED: 'generation_failed',

  RESUME_GENERATION: 'resume_generation',

  STORYBOARD_VIEWED: 'storyboard_viewed',

  DIRECTOR_MODE_OPENED: 'director_mode_opened',

  EXPORT_STARTED: 'export_started',

  EXPORT_COMPLETED: 'export_completed',

  FEEDBACK_SUBMITTED: 'feedback_submitted',

  REGENERATE_HOOK: 'regenerate_hook',

  REGENERATE_SCENE: 'regenerate_scene',

  REGENERATE_CAPTIONS: 'regenerate_captions',

  REGENERATE_VISUAL_DIRECTION: 'regenerate_visual_direction',

} as const



export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents]



/** Core funnel events with strongly-typed metadata expectations. */

export type FunnelEvent =

  | 'homepage_visit'

  | 'signup_completed'

  | 'project_created'

  | 'generation_started'

  | 'generation_completed'

  | 'generation_failed'

  | 'storyboard_viewed'

  | 'export_completed'

  | 'resume_generation'



export type AnalyticsMetadata = {

  projectId?: string | null

  niche?: string

  duration?: number

  duration_ms?: number

  generationStep?: string

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


