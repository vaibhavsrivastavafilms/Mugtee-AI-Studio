import {
  ASSEMBLY_REVEAL_MS,
  ASSEMBLY_TEXT_INTERVAL_MS,
  assemblyDurationMs,
  delay,
  scenesReadyForAssembly,
  type CinematicGenerationState,
} from '@/lib/cinematic/quick-cut/cinematic-assembly-timing'
import type { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

type StoreState = ReturnType<typeof useQuickCutGenerationStore.getState>
type GetState = () => StoreState
type SetState = (patch: Partial<StoreState>) => void

/**
 * Presentation-only cinematic assembly after storyboard images complete.
 * Runs in parallel with voice/render — does not await API work.
 */
export async function runCinematicAssemblyPresentation(
  get: GetState,
  set: SetState
): Promise<void> {
  const { scenes } = get()
  if (!scenesReadyForAssembly(scenes)) {
    return
  }

  const totalMs = assemblyDurationMs(scenes.length)
  const assembleMs = Math.max(
    1800,
    totalMs - ASSEMBLY_REVEAL_MS - 400
  )
  const lineCount = Math.max(
    1,
    Math.floor(assembleMs / ASSEMBLY_TEXT_INTERVAL_MS)
  )

  const startedAt = Date.now()
  set({
    generationState: 'assembling' satisfies CinematicGenerationState,
    assemblyLineIndex: 0,
    assemblyPreviewAutoplay: false,
    activeStageTab: 'visuals',
    stageTabPinned: false,
  })

  for (let i = 0; i < lineCount; i++) {
    if (get().generationState !== 'assembling') return
    set({ assemblyLineIndex: i % 4 })
    await delay(ASSEMBLY_TEXT_INTERVAL_MS)
  }

  const assembleElapsed = Date.now() - startedAt
  if (assembleElapsed < assembleMs) {
    await delay(assembleMs - assembleElapsed)
  }

  set({ generationState: 'revealing' })
  await delay(ASSEMBLY_REVEAL_MS)

  set({
    generationState: 'preview',
    assemblyPreviewAutoplay: true,
    assemblyLineIndex: 0,
  })

  const remaining = totalMs - (Date.now() - startedAt)
  if (remaining > 0) {
    await delay(remaining)
  }
}
