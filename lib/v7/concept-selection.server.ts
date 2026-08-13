import 'server-only'

import type { SupabaseServerClient } from '@/lib/supabase/server'
import { getV7Production, updateV7Production } from '@/lib/v7/db.server'
import {
  mergeConceptSelectionTimeline,
  type V7Concept,
} from '@/lib/v7/concept-selection.core'
import type { V7CreativeBrief } from '@/types/v7/production'

export {
  applySelectedConceptToBrief,
  isAwaitingConceptSelection,
  readConceptSelectionState,
  validateConceptIndex,
} from '@/lib/v7/concept-selection.core'
export type { V7Concept, V7ConceptSelectionState } from '@/lib/v7/concept-selection.core'

export async function persistConceptSelectionAwaiting(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  concepts: V7Concept[]
  brief: V7CreativeBrief
}): Promise<void> {
  const snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
  const timeline = mergeConceptSelectionTimeline(snapshot?.production.timeline_json ?? null, {
    awaiting: true,
    concepts: params.concepts,
    selectedIndex: null,
    selectedAt: null,
  })

  await updateV7Production(params.supabase, params.productionId, params.userId, {
    status: 'planning',
    current_stage: 'idea',
    creative_brief: params.brief,
    timeline_json: timeline,
  })
}
