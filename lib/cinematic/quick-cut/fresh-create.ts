import { clearQuickCutPreview } from '@/lib/cinematic/quick-cut/preview-session'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

/** Clear preview session + in-memory generation store for a new Quick Cut. */
export function resetQuickCutForFreshCreate() {
  clearQuickCutPreview()
  useQuickCutGenerationStore.getState().reset({ clearProject: true })
}
