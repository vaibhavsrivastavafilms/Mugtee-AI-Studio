/**
 * Multi-input ingestion — creator never builds prompts.
 * Mugtee accepts idea, voice, image, PDF, URL, brand brief, etc.
 */

export type CompanionInputKind =
  | 'idea'
  | 'voice_note'
  | 'image'
  | 'pdf'
  | 'website'
  | 'youtube'
  | 'document'
  | 'brand_brief'

export type CompanionInputAttachment = {
  kind: CompanionInputKind
  /** Raw text (idea / transcript / extracted PDF text). */
  text?: string
  /** Remote or signed URL for media / docs. */
  url?: string
  mimeType?: string
  fileName?: string
  /** Duration for voice notes (sec). */
  durationSec?: number
}

export type CompanionCreativeIntent = {
  goal?: string
  audience?: string
  platform?: 'youtube_short' | 'instagram_reel' | 'tiktok' | 'youtube' | 'other'
  tone?: string
  emotion?: string
  language?: string
  durationSec?: number
  brandName?: string
}

export type CompanionProductionRequest = {
  /** Primary idea or first attachment text. */
  idea: string
  attachments?: CompanionInputAttachment[]
  intent?: CompanionCreativeIntent
  projectId?: string | null
}

/** Normalize any attachment set into a single creative seed for the pipeline. */
export function resolveCompanionSeed(request: CompanionProductionRequest): {
  seedText: string
  sources: CompanionInputKind[]
  intent: CompanionCreativeIntent
} {
  const sources: CompanionInputKind[] = []
  const chunks: string[] = []

  const idea = request.idea?.trim()
  if (idea) {
    chunks.push(idea)
    sources.push('idea')
  }

  for (const att of request.attachments ?? []) {
    sources.push(att.kind)
    if (att.text?.trim()) {
      chunks.push(`[${att.kind}] ${att.text.trim()}`)
    } else if (att.url?.trim()) {
      chunks.push(`[${att.kind}] Source: ${att.url.trim()}`)
    }
  }

  const seedText = chunks.join('\n\n').trim() || idea || 'Untitled creative project'
  return {
    seedText,
    sources: [...new Set(sources)],
    intent: {
      durationSec: 60,
      language: 'en',
      platform: 'youtube_short',
      ...request.intent,
    },
  }
}
