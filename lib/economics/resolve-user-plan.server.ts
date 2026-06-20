import 'server-only'

import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { normalizePlanTier } from '@/lib/economics/plan-economics'

export async function resolveUserPlanType(userId: string): Promise<string> {
  const service = createSupabaseServiceClient()
  if (!service) return 'FREE'
  const { data } = await service
    .from('profiles')
    .select('plan_type')
    .eq('id', userId)
    .maybeSingle()
  return normalizePlanTier(data?.plan_type ?? 'FREE')
}
