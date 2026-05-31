import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RewriteContentType, RewriteVariant } from '@/lib/rewrite/rewrite-actions'

/** Fire-and-forget persist of an accepted rewrite — never blocks UI. */
export function persistProjectEdit(input: {
  projectId: string
  contentType: RewriteContentType
  beforeText: string
  afterText: string
  rewriteAction: RewriteVariant
}): void {
  void (async () => {
    try {
      const supabase = createSupabaseBrowserClient()
      if (!supabase) return
      await supabase.from('project_edits').insert({
        project_id: input.projectId,
        content_type: input.contentType,
        before_text: input.beforeText,
        after_text: input.afterText,
        rewrite_action: input.rewriteAction,
      })
    } catch {
      /* optional audit trail — silent fail */
    }
  })()
}
