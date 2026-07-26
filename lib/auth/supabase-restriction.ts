import { getSupabasePublicEnv } from '@/lib/supabase/env'

export type SupabaseRestrictionKind =
  | 'exceed_storage_size_quota'
  | 'billing_restriction'
  | 'project_paused'
  | 'spend_cap'
  | 'service_restricted'
  | 'unreachable'
  | 'none'

export type SupabaseProjectStatus = {
  ok: boolean
  kind: SupabaseRestrictionKind
  httpStatus: number | null
  reason: string | null
  supabaseUrl: string | null
  rawBodyPreview: string | null
}

const RESTRICTION_PATTERNS: Array<{ kind: SupabaseRestrictionKind; pattern: RegExp }> = [
  { kind: 'exceed_storage_size_quota', pattern: /exceed_storage_size_quota/i },
  { kind: 'spend_cap', pattern: /spend\s*cap|remove spend caps/i },
  { kind: 'project_paused', pattern: /project\s*(is\s*)?paused|paused due to inactivity/i },
  { kind: 'billing_restriction', pattern: /billing|upgrade their plan|payment/i },
  { kind: 'service_restricted', pattern: /service\s+for\s+this\s+project\s+is\s+restricted|service restricted/i },
]

export function classifySupabaseRestrictionText(
  text: string | null | undefined
): SupabaseRestrictionKind {
  if (!text?.trim()) return 'none'
  for (const { kind, pattern } of RESTRICTION_PATTERNS) {
    if (pattern.test(text)) return kind
  }
  return 'none'
}

export function isSupabaseInfrastructureRestriction(
  kind: SupabaseRestrictionKind
): boolean {
  return kind !== 'none' && kind !== 'unreachable'
}

function previewBody(body: string, max = 400): string {
  return body.replace(/\s+/g, ' ').trim().slice(0, max)
}

/**
 * Probe Supabase Auth health. Detects quota / billing / paused project restrictions.
 * Safe for browser + server. Never throws.
 */
export async function probeSupabaseProjectStatus(): Promise<SupabaseProjectStatus> {
  const env = getSupabasePublicEnv()
  if (!env) {
    return {
      ok: false,
      kind: 'unreachable',
      httpStatus: null,
      reason: 'Supabase public env missing',
      supabaseUrl: null,
      rawBodyPreview: null,
    }
  }

  try {
    const healthUrl = `${env.url.replace(/\/$/, '')}/auth/v1/health`
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        apikey: env.anonKey,
        Authorization: `Bearer ${env.anonKey}`,
      },
      cache: 'no-store',
    })

    const bodyText = await response.text().catch(() => '')
    const combined = `${response.status} ${bodyText}`
    const fromBody = classifySupabaseRestrictionText(combined)

    if (!response.ok || fromBody !== 'none') {
      return {
        ok: false,
        kind: fromBody === 'none' ? 'service_restricted' : fromBody,
        httpStatus: response.status,
        reason:
          fromBody !== 'none'
            ? fromBody
            : `Auth health returned HTTP ${response.status}`,
        supabaseUrl: env.url,
        rawBodyPreview: previewBody(bodyText),
      }
    }

    return {
      ok: true,
      kind: 'none',
      httpStatus: response.status,
      reason: null,
      supabaseUrl: env.url,
      rawBodyPreview: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const kind = classifySupabaseRestrictionText(message)
    return {
      ok: false,
      kind: kind === 'none' ? 'unreachable' : kind,
      httpStatus: null,
      reason: message,
      supabaseUrl: env.url,
      rawBodyPreview: null,
    }
  }
}

/** Classify AuthError / unknown OAuth failures for infrastructure restrictions. */
export function classifyAuthFailure(error: unknown): SupabaseRestrictionKind {
  if (!error) return 'none'
  if (typeof error === 'string') return classifySupabaseRestrictionText(error)
  if (error instanceof Error) {
    return classifySupabaseRestrictionText(
      `${error.name} ${error.message} ${(error as { cause?: unknown }).cause ?? ''}`
    )
  }
  try {
    return classifySupabaseRestrictionText(JSON.stringify(error))
  } catch {
    return 'none'
  }
}

export function logSupabaseProjectStatus(
  scope: string,
  status: SupabaseProjectStatus,
  extra?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV !== 'development') return
  console.warn(`[auth:${scope}] supabase project status`, {
    supabaseUrl: status.supabaseUrl,
    projectOk: status.ok,
    httpStatus: status.httpStatus,
    restrictionKind: status.kind,
    restrictionReason: status.reason,
    bodyPreview: status.rawBodyPreview,
    ...extra,
  })
}
