import type { GeneratedScene } from '@/lib/cinematic/generation'
import {
  findScenesMissingExportImages,
  resolveSceneExportAssetPath,
  resolveSceneExportImageUrl,
  sceneHasExportableStoryboard,
} from '@/lib/export/scene-export-validation'

const PLACEHOLDER_HOST = 'images.unsplash.com'

/** True when the URL points at a generated/uploaded still (not a preview placeholder). */
export function isRealSceneImageUrl(url: string | null | undefined): boolean {
  const trimmed = url?.trim()
  if (!trimmed) return false
  if (trimmed.includes(PLACEHOLDER_HOST)) return false
  return true
}

export type SceneImageFailureReason =
  | 'never_generated'
  | 'placeholder_only'
  | 'url_null'
  | 'saved_storage_no_url'
  | 'generating'

export type SceneImageDiagnostic = {
  sceneIndex: number
  sceneId: string
  title: string
  status: 'FOUND' | 'MISSING'
  imageUrl: string | null
  imageAssetPath: string | null
  storyboardImageCount: number
  storyboardUrls: string[]
  storyboardAssetPaths: string[]
  failureReason: SceneImageFailureReason | null
  missingAssetIds: string[]
}

export type StoryboardExportReport = {
  projectId: string | null
  exportReady: boolean
  failedValidationRule: string | null
  missingAssetIds: string[]
  sceneCount: number
  storyboardAssetCount: number
  scenes: SceneImageDiagnostic[]
  perSceneSummary: string[]
}

/** Client export gate — real URL or persisted storage path (not preview placeholders). */
export function sceneHasClientExportableImage(scene: GeneratedScene): boolean {
  if (scene.imageAssetPath?.trim()) return true
  if (isRealSceneImageUrl(scene.imageUrl)) return true
  return (
    scene.storyboardImages?.some(
      (img) => isRealSceneImageUrl(img.url) || Boolean(img.assetPath?.trim())
    ) ?? false
  )
}

export function classifySceneImageFailure(
  scene: GeneratedScene,
  isGenerating = false
): SceneImageFailureReason | null {
  if (sceneHasClientExportableImage(scene)) return null
  if (isGenerating) return 'generating'

  const url = scene.imageUrl?.trim() ?? null
  const assetPath = scene.imageAssetPath?.trim() ?? null
  const storyboard = scene.storyboardImages ?? []
  const storyboardUrls = storyboard.map((img) => img.url?.trim()).filter(Boolean) as string[]
  const storyboardPaths = storyboard
    .map((img) => img.assetPath?.trim())
    .filter(Boolean) as string[]

  const hasPlaceholderOnly =
    (url && !isRealSceneImageUrl(url)) ||
    (storyboardUrls.length > 0 && storyboardUrls.every((u) => !isRealSceneImageUrl(u)))

  if (!url && !assetPath && storyboard.length === 0) return 'never_generated'
  if (hasPlaceholderOnly && !assetPath && storyboardPaths.length === 0) return 'placeholder_only'
  if (!url && (assetPath || storyboardPaths.length > 0)) return 'saved_storage_no_url'
  return 'url_null'
}

export function buildSceneImageDiagnostics(
  scenes: GeneratedScene[],
  isGenerating = false
): SceneImageDiagnostic[] {
  return scenes.map((scene, index) => {
    const storyboard = scene.storyboardImages ?? []
    const storyboardUrls = storyboard.map((img) => img.url?.trim() ?? null)
    const storyboardAssetPaths = storyboard.map((img) => img.assetPath?.trim() ?? null)
    const exportable = sceneHasClientExportableImage(scene)
    const failureReason = exportable ? null : classifySceneImageFailure(scene, isGenerating)

    const missingAssetIds: string[] = []
    if (!exportable) {
      if (scene.id) missingAssetIds.push(scene.id)
      for (const img of storyboard) {
        if (img.id && !isRealSceneImageUrl(img.url) && !img.assetPath?.trim()) {
          missingAssetIds.push(img.id)
        }
      }
    }

    return {
      sceneIndex: index + 1,
      sceneId: scene.id,
      title: scene.title?.trim() || `Scene ${index + 1}`,
      status: exportable ? 'FOUND' : 'MISSING',
      imageUrl: scene.imageUrl?.trim() ?? null,
      imageAssetPath: scene.imageAssetPath?.trim() ?? null,
      storyboardImageCount: storyboard.length,
      storyboardUrls: storyboardUrls.filter(Boolean) as string[],
      storyboardAssetPaths: storyboardAssetPaths.filter(Boolean) as string[],
      failureReason,
      missingAssetIds,
    }
  })
}

export function buildStoryboardExportReport(input: {
  projectId?: string | null
  scenes: GeneratedScene[]
  isGenerating?: boolean
}): StoryboardExportReport {
  const sceneDiagnostics = buildSceneImageDiagnostics(input.scenes, input.isGenerating)
  const storyboardAssetCount = sceneDiagnostics.reduce(
    (sum, scene) =>
      sum +
      (scene.imageAssetPath ? 1 : 0) +
      scene.storyboardAssetPaths.length,
    0
  )
  const missingScenes = sceneDiagnostics.filter((s) => s.status === 'MISSING')
  const exportReady =
    input.scenes.length > 0 &&
    missingScenes.length === 0 &&
    !input.isGenerating

  let failedValidationRule: string | null = null
  if (input.isGenerating) {
    failedValidationRule = 'generation_in_progress'
  } else if (input.scenes.length < 1) {
    failedValidationRule = 'no_scenes'
  } else if (missingScenes.length > 0) {
    const reasons = new Set(
      missingScenes.map((s) => s.failureReason).filter(Boolean) as SceneImageFailureReason[]
    )
    if (reasons.has('placeholder_only')) {
      failedValidationRule = 'storyboard_images_placeholder_only'
    } else if (reasons.has('never_generated')) {
      failedValidationRule = 'storyboard_images_never_generated'
    } else if (reasons.has('url_null')) {
      failedValidationRule = 'storyboard_images_url_null'
    } else {
      failedValidationRule = 'storyboard_images_missing'
    }
  }

  const missingAssetIds = missingScenes.flatMap((s) => s.missingAssetIds)

  const perSceneSummary = sceneDiagnostics.map(
    (s) => `Scene ${s.sceneIndex} image: ${s.status}`
  )

  return {
    projectId: input.projectId?.trim() ?? null,
    exportReady,
    failedValidationRule,
    missingAssetIds,
    sceneCount: input.scenes.length,
    storyboardAssetCount,
    scenes: sceneDiagnostics,
    perSceneSummary,
  }
}

/** Server-side diagnostics after hydration (URL or storage path). */
export function buildServerSceneImageDiagnostics(scenes: GeneratedScene[]): SceneImageDiagnostic[] {
  return scenes.map((scene, index) => {
    const storyboard = scene.storyboardImages ?? []
    const exportable = sceneHasExportableStoryboard(scene)
    const resolvedUrl = resolveSceneExportImageUrl(scene)
    const resolvedPath = resolveSceneExportAssetPath(scene)

    let failureReason: SceneImageFailureReason | null = null
    if (!exportable) {
      if (!resolvedUrl && !resolvedPath && storyboard.length === 0) {
        failureReason = 'never_generated'
      } else if (resolvedUrl && !isRealSceneImageUrl(resolvedUrl) && !resolvedPath) {
        failureReason = 'placeholder_only'
      } else {
        failureReason = 'url_null'
      }
    }

    const missingAssetIds: string[] = []
    if (!exportable && scene.id) missingAssetIds.push(scene.id)

    return {
      sceneIndex: index + 1,
      sceneId: scene.id,
      title: scene.title?.trim() || `Scene ${index + 1}`,
      status: exportable ? 'FOUND' : 'MISSING',
      imageUrl: resolvedUrl,
      imageAssetPath: resolvedPath,
      storyboardImageCount: storyboard.length,
      storyboardUrls: storyboard.map((img) => img.url?.trim()).filter(Boolean) as string[],
      storyboardAssetPaths: storyboard
        .map((img) => img.assetPath?.trim())
        .filter(Boolean) as string[],
      failureReason,
      missingAssetIds,
    }
  })
}

export function logStoryboardExportReport(
  label: string,
  report: StoryboardExportReport
): void {
  if (typeof console === 'undefined') return
  console.group(`[MUGTEE EXPORT] ${label}`)
  console.log('projectId', report.projectId)
  console.log('sceneCount', report.sceneCount)
  console.log('storyboardAssetCount', report.storyboardAssetCount)
  console.log('exportReady', report.exportReady)
  if (report.failedValidationRule) {
    console.warn('failedValidationRule', report.failedValidationRule)
  }
  if (report.missingAssetIds.length) {
    console.warn('missingAssetIds', report.missingAssetIds)
  }
  for (const line of report.perSceneSummary) {
    const scene = report.scenes.find((s) => line.startsWith(`Scene ${s.sceneIndex} `))
    const detail = scene
      ? {
          imageUrl: scene.imageUrl,
          imageAssetPath: scene.imageAssetPath,
          storyboardUrls: scene.storyboardUrls,
          storyboardAssetPaths: scene.storyboardAssetPaths,
          failureReason: scene.failureReason,
        }
      : {}
    console.log(line, detail)
  }
  console.groupEnd()
}

export function clientStoryboardReadiness(
  scenes: GeneratedScene[],
  isGenerating = false
): { ready: boolean; missing: ReturnType<typeof findScenesMissingExportImages> } {
  if (isGenerating || scenes.length < 1) {
    return { ready: false, missing: findScenesMissingExportImages(scenes) }
  }
  const missing = scenes
    .map((scene, index) => ({ scene, index: index + 1, id: scene.id, title: scene.title?.trim() || `Scene ${index + 1}` }))
    .filter(({ scene }) => !sceneHasClientExportableImage(scene))
    .map(({ index, id, title }) => ({ index, id, title }))
  return { ready: missing.length === 0, missing }
}
