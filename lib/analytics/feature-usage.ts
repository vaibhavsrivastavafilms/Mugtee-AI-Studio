import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

/** Canonical feature keys tracked for admin intelligence. */
export const FeatureUsageFeatures = {
  HOOK_GENERATION: 'hook_generation',
  SCRIPT_GENERATION: 'script_generation',
  STORYBOARD_GENERATION: 'storyboard_generation',
  IMAGE_GENERATION: 'image_generation',
  VOICE_GENERATION: 'voice_generation',
  VIDEO_GENERATION: 'video_generation',
  EXPORT: 'export',
  REPURPOSING: 'repurposing',
  SERIES_CREATION: 'series_creation',
} as const

export type FeatureUsageFeature =
  (typeof FeatureUsageFeatures)[keyof typeof FeatureUsageFeatures]

const FEATURE_SET = new Set<string>(Object.values(FeatureUsageFeatures))

export function isFeatureUsageFeature(value: string): value is FeatureUsageFeature {
  return FEATURE_SET.has(value)
}

export function parseFeatureUsageProjectId(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const o = raw as Record<string, unknown>
  const id = o.projectId ?? o.project_id ?? o.savedProjectId
  if (typeof id !== 'string') return undefined
  const trimmed = id.trim()
  return trimmed || undefined
}

/** Fire-and-forget insert; never throws to callers. */
export async function trackFeatureUsage(
  userId: string,
  feature: FeatureUsageFeature,
  projectId?: string | null
): Promise<void> {
  if (!userId || !isFeatureUsageFeature(feature)) return

  const row = {
    user_id: userId,
    feature,
    project_id: projectId?.trim() || null,
  }

  try {
    const service = createSupabaseServiceClient()
    if (service) {
      await service.from('feature_usage_events').insert(row)
      return
    }

    const supabase = createSupabaseServerClient()
    await supabase.from('feature_usage_events').insert(row)
  } catch {
    /* never block workflow */
  }
}
