import type {
  AnalyticsEventName,
  AnalyticsEventRow,
  AnalyticsMetadata,
} from '@/lib/analytics/events'
import { projectIdFromMetadata } from '@/lib/analytics/events'

const SESSION_KEY = 'mugtee:analytics-session:v1'
let sessionId: string | null = null

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

/** Client-side fire-and-forget event tracking. */
export function trackEvent(event: AnalyticsEventName, payload: TrackEventPayload = {}) {
  if (typeof window === 'undefined') return
  try {
    const metadata = mergeTrackMetadata(payload)
    if (!validateAnalyticsEventRow({ event, page: payload.page ?? currentPage(), metadata })) {
      /* warn only — still attempt insert with sanitized row */
    }
    const body = {
      event,
      page: payload.page ?? currentPage(),
      session_id: ensureSession(),
      metadata,
    }
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* never block UX */
  }
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
