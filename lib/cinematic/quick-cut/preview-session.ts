import type { QuickCutOrchestrationResult } from '@/lib/cinematic/quick-cut/orchestrate-quick-cut'

import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import type { DirectorMode } from '@/lib/cinematic/director-modes'
import { ensureScenesHaveImagePrompts } from '@/lib/cinematic/generation'
import { ensureScenesHavePreviewUrls } from '@/lib/cinematic/scene-preview-url'
import { REEL_EXPORT_PROGRESS_CAP } from '@/lib/reels/export-poll.client'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
const PREVIEW_KEY = 'mugtee:quick-cut:preview:v1'
const PENDING_KEY_SESSION = 'mugtee:quick-cut:pending:session:v1'
const PENDING_KEY_LOCAL = 'mugtee:quick-cut:pending:local:v1'

export type QuickCutPending = {
  prompt: string
  style: string
  duration: number
  imageNote?: string
  voiceNote?: string
  keywords?: string[]
  language?: ProjectLanguage
  directorMode?: DirectorMode
  blueprintId?: string | null
}

export function saveQuickCutPreview(result: QuickCutOrchestrationResult) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(result))
}

export function loadQuickCutPreview(): QuickCutOrchestrationResult | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(PREVIEW_KEY)
    if (!raw) return null
    return JSON.parse(raw) as QuickCutOrchestrationResult
  } catch {
    return null
  }
}

export function clearQuickCutPreview() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(PREVIEW_KEY)
}

/** Rehydrate Quick Cut store from session preview after refresh (export poll / downloads). */
export function restoreQuickCutPreviewSession(options?: { allowOnFreshCreate?: boolean }): boolean {
  if (typeof window === 'undefined') return false
  if (options?.allowOnFreshCreate === false) return false
  const preview = loadQuickCutPreview()
  if (!preview) return false

  const state = useQuickCutGenerationStore.getState()
  if (state.isGenerating || state.isComplete || state.prompt.trim()) return false

  const scenes = ensureScenesHavePreviewUrls(
    ensureScenesHaveImagePrompts(preview.output.scenes)
  )
  const videoUrl = preview.videoUrl ?? null
  const renderPollUrl = preview.renderPollUrl ?? null
  const videoPending = Boolean(renderPollUrl) && !videoUrl
  const hasContent =
    scenes.length > 0 &&
    Boolean(preview.voiceUrl ?? preview.project.voice?.audioUrl ?? preview.project.script?.trim())

  useQuickCutGenerationStore.setState({
    prompt: preview.project.prompt,
    title: preview.project.title,
    hook: preview.project.hook,
    script: preview.project.script,
    scenes,
    storyboard: scenes,
    voiceUrl: preview.voiceUrl ?? preview.project.voice?.audioUrl ?? null,
    videoUrl,
    renderPollUrl,
    renderError: preview.renderError ?? null,
    savedProjectId: preview.savedProjectId ?? null,
    mock: preview.mock,
    pipeline: preview.pipeline,
    isComplete: hasContent,
    isGenerating: false,
    error: null,
    generationStep: videoUrl ? 'complete' : videoPending ? 'render' : 'complete',
    progress: videoUrl ? 100 : videoPending ? REEL_EXPORT_PROGRESS_CAP : 100,
    eta: 0,
    generationStatus: 'completed',
    studioReviewMode: false,
  })

  void useQuickCutGenerationStore.getState().syncVideoRenderConfig()
  return true
}

export function saveQuickCutPending(pending: QuickCutPending) {
  if (typeof window === 'undefined') return
  const payload = JSON.stringify(pending)
  try {
    localStorage.setItem(PENDING_KEY_LOCAL, payload)
  } catch {
    /* quota / private mode */
  }
  sessionStorage.setItem(PENDING_KEY_SESSION, payload)
}

export function loadQuickCutPending(): QuickCutPending | null {
  if (typeof window === 'undefined') return null
  try {
    const raw =
      localStorage.getItem(PENDING_KEY_LOCAL) ??
      sessionStorage.getItem(PENDING_KEY_SESSION)
    if (!raw) return null
    return JSON.parse(raw) as QuickCutPending
  } catch {
    return null
  }
}

export function clearQuickCutPending() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PENDING_KEY_LOCAL)
  sessionStorage.removeItem(PENDING_KEY_SESSION)
}
