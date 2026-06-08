import { clearQuickCutPreview } from '@/lib/cinematic/quick-cut/preview-session'
import { clearGenerationActivityLog } from '@/lib/quick-cut/generation-activity.client'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

/** Clear preview session + in-memory generation store for a new Quick Cut. */
export function resetQuickCutForFreshCreate() {
  clearQuickCutPreview()
  clearGenerationActivityLog()
  const store = useQuickCutGenerationStore.getState()
  store.reset({ clearProject: true })
  void store.syncVideoRenderConfig()
}
