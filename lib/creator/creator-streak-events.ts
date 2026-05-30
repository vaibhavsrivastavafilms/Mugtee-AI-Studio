import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  recordExportCompleted,
  recordWorkflowCreated,
} from '@/lib/creator/creator-streak'

let cachedUserId: string | null | undefined

async function resolveUserId(): Promise<string | null> {
  if (cachedUserId !== undefined) return cachedUserId
  try {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      cachedUserId = null
      return null
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    cachedUserId = user?.id ?? null
    return cachedUserId
  } catch {
    cachedUserId = null
    return null
  }
}

/** Fire-and-forget — increments workflow count for streak stats. */
export function streakRecordWorkflowCreated(): void {
  void resolveUserId().then((id) => {
    if (id) recordWorkflowCreated(id)
  })
}

/** Fire-and-forget — increments export count for streak stats. */
export function streakRecordExportCompleted(): void {
  void resolveUserId().then((id) => {
    if (id) recordExportCompleted(id)
  })
}

export function streakClearUserCache(): void {
  cachedUserId = undefined
}
