import { clearQuickCutPreview } from '@/lib/cinematic/quick-cut/preview-session'
import { clearCinematicStoryPackage } from '@/lib/cinematic-story-engine'
import { clearMugteeAgentPackage } from '@/lib/mugtee-agents'
import { clearGenerationActivityLog } from '@/lib/quick-cut/generation-activity.client'
import { clearProductionOsV2Events } from '@/lib/production-os/v2/event-bus.client'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

/** Clear preview session + in-memory generation store for a new Quick Cut. */
export function resetQuickCutForFreshCreate() {
  clearQuickCutPreview()
  clearGenerationActivityLog()
  clearProductionOsV2Events()
  clearCinematicStoryPackage()
  clearMugteeAgentPackage()
  const store = useQuickCutGenerationStore.getState()
  store.reset({ clearProject: true })
  void store.syncVideoRenderConfig()
}
