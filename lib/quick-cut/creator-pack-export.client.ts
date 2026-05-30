import type { GeneratedScene } from '@/lib/cinematic/generation'
import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'
import { buildScriptDocBlob } from '@/lib/export-docx'
import {
  hasExportableNarration,
  hasExportableSceneImages,
  hasExportableScript,
  isRealSceneImageUrl,
} from '@/lib/quick-cut/asset-availability'
import { fetchMp3Blob } from '@/lib/quick-cut/download-audio'
import {
  fetchSceneImageBlob,
  sceneImageFilename,
  slugifyExportBase,
} from '@/lib/quick-cut/download-scene-image'
import { buildQuickCutScriptText } from '@/lib/quick-cut/download-script'
import { buildStoryboardExportPayload } from '@/lib/quick-cut/download-storyboard-package'
import type { DeepResearchReport } from '@/types/deep-research'
import {
  blobToUint8Array,
  createStoreZip,
  textToUint8Array,
  type ZipEntry,
} from '@/lib/quick-cut/zip-store.client'

export type CreatorPackExportInput = {
  title: string
  hook: string
  script: string
  scriptBeats?: { narration: string; duration: string; emotion: string }[]
  payoff?: string
  cta?: string
  scenes: GeneratedScene[]
  voiceUrl: string | null
  researchReport?: DeepResearchReport | null
  savedProjectId?: string | null
  isUnlimited?: boolean
  isGenerating?: boolean
}

export type CreatorPackMetadata = {
  format: 'mugtee-creator-pack'
  exportedAt: string
  projectId: string | null
  title: string
  included: string[]
  warnings: string[]
}

export type CreatorPackExportResult = {
  blob: Blob
  filename: string
  metadata: CreatorPackMetadata
}

export type CreatorPackExportProgress = {
  phase: string
  progress: number
}

function resolveThumbnailPrompt(input: CreatorPackExportInput): string | null {
  const ideas = input.researchReport?.finalSummary?.thumbnailIdeas
  if (ideas?.length) {
    return ideas.map((idea, i) => `${i + 1}. ${idea}`).join('\n')
  }

  const firstPrompt = input.scenes.find(
    (scene) => scene.imagePrompt?.trim() || scene.visualPrompt?.trim()
  )
  const prompt = firstPrompt?.imagePrompt?.trim() || firstPrompt?.visualPrompt?.trim()
  return prompt || null
}

/** Assembles a Creator Pack ZIP from project store data. Skips missing assets. */
export async function buildCreatorPackZip(
  input: CreatorPackExportInput,
  onProgress?: (update: CreatorPackExportProgress) => void
): Promise<CreatorPackExportResult> {
  const report = (phase: string, progress: number) => onProgress?.({ phase, progress })

  const exportBase = slugifyExportBase(input.title || 'mugtee-reel', 'mugtee-reel')
  const zipFilename = `${exportBase}-creator-pack.zip`
  const entries: ZipEntry[] = []
  const included: string[] = []
  const warnings: string[] = []

  const scriptInput = {
    title: input.title,
    hook: input.hook,
    script: input.script,
    scriptBeats: input.scriptBeats,
    payoff: input.payoff,
    cta: input.cta,
    isUnlimited: input.isUnlimited,
  }

  report('Collecting text assets…', 5)

  if (input.title.trim()) {
    entries.push({ path: 'title.txt', data: textToUint8Array(input.title.trim()) })
    included.push('title.txt')
  } else {
    warnings.push('title.txt skipped — no title available')
  }

  if (input.hook.trim()) {
    entries.push({ path: 'hook.txt', data: textToUint8Array(input.hook.trim()) })
    included.push('hook.txt')
  } else {
    warnings.push('hook.txt skipped — no hook available')
  }

  if (hasExportableScript(scriptInput)) {
    const scriptText = buildQuickCutScriptText(scriptInput)
    entries.push({ path: 'script.txt', data: textToUint8Array(scriptText) })
    included.push('script.txt')

    const docBlob = buildScriptDocBlob({
      title: input.title.trim() || 'Mugtee Script',
      body: scriptText,
      isUnlimited: input.isUnlimited,
    })
    entries.push({
      path: 'script.docx',
      data: await blobToUint8Array(docBlob),
    })
    included.push('script.docx')
  } else {
    warnings.push('script.txt skipped — no script content available')
    warnings.push('script.docx skipped — no script content available')
  }

  report('Building storyboard…', 20)

  if (input.scenes.length > 0) {
    const payload = buildStoryboardExportPayload({
      title: input.title,
      hook: input.hook,
      script: input.script,
      scenes: input.scenes,
      voiceUrl: input.voiceUrl,
    })
    entries.push({
      path: 'storyboard.json',
      data: textToUint8Array(JSON.stringify(payload, null, 2)),
    })
    included.push('storyboard.json')
  } else {
    warnings.push('storyboard.json skipped — no scenes available')
  }

  report('Fetching scene images…', 35)

  if (hasExportableSceneImages(input.scenes, input.isGenerating)) {
    let imageCount = 0
    for (let i = 0; i < input.scenes.length; i++) {
      const scene = input.scenes[i]
      const url = scene.imageUrl?.trim() || resolveScenePreviewUrl(scene, i)
      if (!isRealSceneImageUrl(url)) continue

      try {
        const blob = await fetchSceneImageBlob(url, 'vertical')
        const filename = sceneImageFilename(exportBase, i, 'jpg', 'vertical')
        entries.push({
          path: `scene-images/${filename}`,
          data: await blobToUint8Array(blob),
        })
        imageCount += 1
        report(`Fetching scene images… (${imageCount})`, 35 + Math.round((imageCount / input.scenes.length) * 25))
      } catch {
        warnings.push(`scene-images/scene-${i + 1} skipped — image fetch failed`)
      }
    }

    if (imageCount > 0) {
      included.push(`scene-images/ (${imageCount} files)`)
    } else {
      warnings.push('scene-images/ skipped — no exportable scene images')
    }
  } else {
    warnings.push('scene-images/ skipped — no exportable scene images')
  }

  report('Fetching narration…', 65)

  if (hasExportableNarration(input.voiceUrl)) {
    try {
      const audioBlob = await fetchMp3Blob(input.voiceUrl!)
      entries.push({
        path: 'narration.mp3',
        data: await blobToUint8Array(audioBlob),
      })
      included.push('narration.mp3')
    } catch {
      warnings.push('narration.mp3 skipped — audio fetch failed')
    }
  } else {
    warnings.push('narration.mp3 skipped — no voiceover available')
  }

  report('Adding thumbnail prompt…', 80)

  const thumbnailPrompt = resolveThumbnailPrompt(input)
  if (thumbnailPrompt) {
    entries.push({
      path: 'thumbnail-prompt.txt',
      data: textToUint8Array(thumbnailPrompt),
    })
    included.push('thumbnail-prompt.txt')
  } else {
    warnings.push('thumbnail-prompt.txt skipped — no thumbnail prompt available')
  }

  report('Finalizing archive…', 90)

  const metadata: CreatorPackMetadata = {
    format: 'mugtee-creator-pack',
    exportedAt: new Date().toISOString(),
    projectId: input.savedProjectId ?? null,
    title: input.title || 'Untitled reel',
    included,
    warnings,
  }

  entries.push({
    path: 'project-metadata.json',
    data: textToUint8Array(JSON.stringify(metadata, null, 2)),
  })
  included.push('project-metadata.json')

  if (entries.length < 2) {
    throw new Error('No exportable assets found for Creator Pack.')
  }

  const blob = createStoreZip(entries)
  report('Creator Pack ready', 100)

  return { blob, filename: zipFilename, metadata }
}

export function triggerCreatorPackDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
