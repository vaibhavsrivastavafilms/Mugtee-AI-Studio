import {
  FeatureUsageFeatures,
  isFeatureUsageFeature,
  parseFeatureUsageProjectId,
  type FeatureUsageFeature,
} from '@/lib/analytics/feature-usage-constants'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export {
  FeatureUsageFeatures,
  isFeatureUsageFeature,
  parseFeatureUsageProjectId,
  type FeatureUsageFeature,
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

    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()
    await supabase.from('feature_usage_events').insert(row)
  } catch {
    /* never block workflow */
  }
}
