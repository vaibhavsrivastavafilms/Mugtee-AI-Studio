import type {
  AnalyticsEventName,
  AnalyticsEventRow,
  AnalyticsMetadata,
} from '@/lib/analytics/events'
import { AnalyticsEvents, projectIdFromMetadata } from '@/lib/analytics/events'
import { ONBOARDING_KEYS } from '@/lib/onboarding/onboarding-state'

const SESSION_KEY = 'mugtee:analytics-session:v1'
const BATCH_MS = 400
const PAGE_VIEW_DEBOUNCE_MS = 8000

let sessionId: string | null = null
let batchQueue: Array<Record<string, unknown>> = []
let batchTimer: ReturnType<typeof setTimeout> | null = null
const debouncedPageViews = new Map<string, number>()

function ensureSession(): string {
  if (sessionId) return sessionId
  if (typeof window === 'undefined') return ''
  try {
    const cached = sessionStorage.getItem(SESSION_KEY)
    if (cached) {
      sessionId = cached
      return cached
    }
    const fresh =
      crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(SESSION_KEY, fresh)
    sessionId = fresh
    return fresh
  } catch {
    return ''
  }
}

function flushBatch(): void {
  if (typeof window === 'undefined' || batchQueue.length === 0) return
  const events = batchQueue.splice(0)
  fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events }),
    keepalive: true,
  }).catch(() => {})
}

function scheduleBatch(body: Record<string, unknown>): void {
  batchQueue.push(body)
  if (batchTimer) return
  batchTimer = setTimeout(() => {
    batchTimer = null
    flushBatch()
  }, BATCH_MS)
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushBatch)
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushBatch()
  })
}

export type TrackEventPayload = {
  projectId?: string | null
  page?: string | null
  metadata?: AnalyticsMetadata
}

export type BuildAnalyticsEventRowInput = {
  event: AnalyticsEventName | string
  page?: string | null
  userId?: string | null
  sessionId?: string | null
  metadata?: AnalyticsMetadata
}

/** @deprecated Use BuildAnalyticsEventRowInput */
export type ServerTrackInput = BuildAnalyticsEventRowInput

function warnAnalyticsValidation(message: string, detail?: unknown): void {
  try {
    console.warn('[analytics]', message, detail ?? '')
  } catch {
    /* ignore */
  }
}

function normalizeMetadata(metadata?: AnalyticsMetadata): AnalyticsMetadata {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {}
  return { ...metadata }
}

export function validateAnalyticsEventRow(input: BuildAnalyticsEventRowInput): boolean {
  const event = String(input.event || '').trim()
  if (!event) {
    warnAnalyticsValidation('missing event name', input)
    return false
  }
  try {
    JSON.stringify(normalizeMetadata(input.metadata))
  } catch {
    warnAnalyticsValidation('metadata not JSON-serializable', input)
    return false
  }
  return true
}

/** Canonical row builder for analytics_events (id, created_at are DB-generated). */
export function buildAnalyticsEventRow(
  input: BuildAnalyticsEventRowInput
): AnalyticsEventRow | null {
  const event = String(input.event || '').trim().slice(0, 80)
  if (!event) {
    warnAnalyticsValidation('missing event name', input)
    return null
  }

  let metadata = normalizeMetadata(input.metadata)
  try {
    JSON.stringify(metadata)
  } catch {
    warnAnalyticsValidation('metadata not JSON-serializable; using empty object', input)
    metadata = {}
  }

  return {
    user_id: input.userId ?? null,
    session_id: input.sessionId ? String(input.sessionId).slice(0, 80) : null,
    event,
    page: input.page ? String(input.page).slice(0, 400) : null,
    metadata,
  }
}

function mergeTrackMetadata(payload: TrackEventPayload): AnalyticsMetadata {
  const base = normalizeMetadata(payload.metadata)
  if (payload.projectId) {
    base.projectId = payload.projectId
  }
  return base
}

function currentPage(): string | null {
  if (typeof location === 'undefined') return null
  return location.pathname + location.search
}

const PAGE_VIEW_EVENTS = new Set<string>([
  AnalyticsEvents.LANDING_PAGE_VIEWED,
  AnalyticsEvents.HOMEPAGE_VISIT,
  'visitor_opened_site',
])

function shouldDebouncePageView(event: string, page: string | null): boolean {
  if (!PAGE_VIEW_EVENTS.has(event)) return false
  const key = `${event}:${page || '/'}`
  const now = Date.now()
  const last = debouncedPageViews.get(key) ?? 0
  if (now - last < PAGE_VIEW_DEBOUNCE_MS) return true
  debouncedPageViews.set(key, now)
  return false
}

/** Client-side fire-and-forget event tracking (batched to /api/analytics/events). */
export function trackEvent(event: AnalyticsEventName | string, payload: TrackEventPayload = {}) {
  if (typeof window === 'undefined') return
  try {
    const page = payload.page ?? currentPage()
    if (shouldDebouncePageView(String(event), page)) return

    const metadata = mergeTrackMetadata(payload)
    if (!validateAnalyticsEventRow({ event, page, metadata })) {
      /* warn only — still attempt insert with sanitized row */
    }
    scheduleBatch({
      event,
      page,
      session_id: ensureSession(),
      metadata,
    })
  } catch {
    /* never block UX */
  }
}

/** Track an internal error for admin visibility. Fire-and-forget. */
export function trackError(
  category: string,
  message: string,
  context?: AnalyticsMetadata
): void {
  trackEvent(AnalyticsEvents.ANALYTICS_ERROR, {
    metadata: {
      category: String(category).slice(0, 64),
      message: String(message).slice(0, 500),
      ...context,
    },
  })
}

/** Fire a funnel event once per browser (localStorage flag). */
export function trackOnce(
  storageKey: string,
  event: AnalyticsEventName | string,
  payload: TrackEventPayload = {}
): void {
  if (typeof window === 'undefined') return
  const flagKey = `mugtee:analytics:once:${storageKey}`
  try {
    if (localStorage.getItem(flagKey)) return
    localStorage.setItem(flagKey, new Date().toISOString())
  } catch {
    /* quota — still attempt track */
  }
  trackEvent(event, payload)
}

/** First-time user helpers aligned with onboarding localStorage keys. */
export function trackFirstProjectCreated(payload: TrackEventPayload = {}): void {
  trackOnce(ONBOARDING_KEYS.hasCreatedProject, AnalyticsEvents.FIRST_PROJECT_CREATED, payload)
  trackEvent(AnalyticsEvents.NEW_PROJECT_CREATED, payload)
}

export function trackFirstGenerationStarted(payload: TrackEventPayload = {}): void {
  trackOnce('first_generation_started', AnalyticsEvents.FIRST_GENERATION_STARTED, payload)
}

export function trackFirstGenerationCompleted(payload: TrackEventPayload = {}): void {
  trackOnce(ONBOARDING_KEYS.firstGeneration, AnalyticsEvents.FIRST_GENERATION_COMPLETED, payload)
}

/** Parse client/API body into buildAnalyticsEventRow input (supports legacy keys). */
export function parseAnalyticsEventBody(
  body: Record<string, unknown>,
  defaults: { userId?: string | null; sessionId?: string | null } = {}
): BuildAnalyticsEventRowInput | null {
  const event = String(body.event ?? body.event_name ?? body.event_type ?? '')
    .trim()
    .slice(0, 80)
  if (!event) {
    warnAnalyticsValidation('missing event in request body', body)
    return null
  }

  const rawMeta =
    typeof body.metadata === 'object' && body.metadata !== null && !Array.isArray(body.metadata)
      ? ({ ...(body.metadata as AnalyticsMetadata) } as AnalyticsMetadata)
      : ({} as AnalyticsMetadata)

  const legacyProjectId = body.project_id ? String(body.project_id).slice(0, 36) : null
  if (legacyProjectId && !projectIdFromMetadata(rawMeta)) {
    rawMeta.projectId = legacyProjectId
  }

  if (body.referrer) rawMeta.referrer = String(body.referrer).slice(0, 400)
  if (body.device) rawMeta.device = String(body.device).slice(0, 24)

  const page =
    (body.page ? String(body.page) : null) ||
    (body.url ? String(body.url) : null) ||
    null

  return {
    event,
    page: page ? page.slice(0, 400) : null,
    userId: defaults.userId ?? null,
    sessionId: body.session_id ? String(body.session_id) : defaults.sessionId ?? null,
    metadata: rawMeta,
  }
}
