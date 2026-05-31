import type { GeneratedScene } from '@/lib/cinematic/generation'
import {
  deriveThumbnailConcept,
  resolveActiveThumbnailUrl,
} from '@/lib/cinematic/thumbnail-cover'
import { creatorBlueprintById } from '@/lib/cinematic/creator-blueprints'
import { buildQuickCutScriptText } from '@/lib/quick-cut/download-script'
import { slugifyExportBase } from '@/lib/quick-cut/download-scene-image'
import type { WorkspaceTargetPlatform } from '@/stores/studio-workspace-store'

export { deriveThumbnailConcept } from '@/lib/cinematic/thumbnail-cover'

export type ContentReadinessState = {
  hookReady: boolean
  scriptReady: boolean
  storyboardReady: boolean
  captionReady: boolean
  thumbnailReady: boolean
}

export function sceneHasImage(scene: GeneratedScene): boolean {
  return Boolean(
    scene.imageUrl?.trim() ||
      scene.storyboardImages?.some((img) => img.url?.trim())
  )
}

export function deriveCaptionLines(input: {
  hook?: string
  script?: string
  cta?: string
  payoff?: string
}): string[] {
  const lines: string[] = []
  if (input.hook?.trim()) lines.push(input.hook.trim())
  if (input.script?.trim()) {
    lines.push(
      ...input.script
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 6)
    )
  }
  if (input.payoff?.trim()) lines.push(input.payoff.trim())
  if (input.cta?.trim() && input.cta.trim() !== input.payoff?.trim()) {
    lines.push(input.cta.trim())
  }
  return lines.length > 0 ? lines : []
}

export function deriveContentReadiness(input: {
  hook?: string
  script?: string
  scenes?: GeneratedScene[]
  cta?: string
  payoff?: string
  title?: string
  visualStyleLabel?: string | null
  thumbnailImageUrl?: string | null
}): ContentReadinessState {
  const scenes = input.scenes ?? []
  const captionLines = deriveCaptionLines(input)

  return {
    hookReady: Boolean(input.hook?.trim()),
    scriptReady: Boolean(input.script?.trim()),
    storyboardReady: scenes.length > 0 && scenes.some(sceneHasImage),
    captionReady: captionLines.length > 0,
    thumbnailReady: Boolean(
      resolveActiveThumbnailUrl(input.thumbnailImageUrl, scenes) ||
        deriveThumbnailConcept({
          hook: input.hook,
          title: input.title,
          scenes,
          visualStyleLabel: input.visualStyleLabel,
        }).trim()
    ),
  }
}

export function resolveDefaultPlatform(blueprintId: string | null): WorkspaceTargetPlatform {
  const suggested = creatorBlueprintById(blueprintId)?.suggestedPlatform
  if (suggested?.startsWith('youtube')) return 'youtube'
  if (suggested === 'instagram_reel') return 'instagram'
  return 'instagram'
}

export function buildOutputExportText(input: {
  title?: string
  hook?: string
  script?: string
  scriptBeats?: { narration: string; duration: string; emotion: string }[]
  payoff?: string
  cta?: string
  captions?: string[]
  thumbnailConcept?: string
}): string {
  const sections: string[] = []

  if (input.title?.trim()) {
    sections.push(`TITLE\n${input.title.trim()}`)
  }
  if (input.hook?.trim()) {
    sections.push(`HOOK\n${input.hook.trim()}`)
  }
  if (input.script?.trim() || input.scriptBeats?.length) {
    sections.push(
      buildQuickCutScriptText({
        title: '',
        hook: '',
        script: input.script ?? '',
        scriptBeats: input.scriptBeats,
        payoff: input.payoff,
        cta: input.cta,
        isUnlimited: true,
      }).replace(/^(TITLE|HOOK|SCRIPT|NARRATION BEATS|PAYOFF|CTA)\n/gm, (match) =>
        match === 'SCRIPT\n' || match === 'NARRATION BEATS\n' ? 'SCRIPT\n' : match
      )
    )
  }
  const captions = input.captions ?? []
  if (captions.length > 0) {
    sections.push(`CAPTIONS\n${captions.join('\n')}`)
  }
  if (input.thumbnailConcept?.trim()) {
    sections.push(`THUMBNAIL IDEA\n${input.thumbnailConcept.trim()}`)
  }

  const body = sections.join('\n\n').trim()
  return body
    ? `${body}\n\n---\nGenerated with Mugtee AI Studio · https://mugtee.in`
    : ''
}

export function downloadClientBlob(text: string, filename: string, mime: string): boolean {
  try {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 800)
    return true
  } catch {
    return false
  }
}

export function exportStamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

export function exportBaseName(title?: string): string {
  return `mugtee-${slugifyExportBase(title || 'project', 'project')}-${exportStamp()}`
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    return true
  } catch {
    return false
  }
}

export function buildStoryboardExportJson(scenes: GeneratedScene[]): string {
  return JSON.stringify(
    scenes.map((scene, index) => ({
      index: index + 1,
      id: scene.id,
      title: scene.title,
      description: scene.description,
      duration: scene.duration,
      imageUrl: scene.imageUrl ?? null,
      imagePrompt: scene.imagePrompt ?? null,
      storyboardImages: scene.storyboardImages?.map((img) => img.url).filter(Boolean) ?? [],
    })),
    null,
    2
  )
}
