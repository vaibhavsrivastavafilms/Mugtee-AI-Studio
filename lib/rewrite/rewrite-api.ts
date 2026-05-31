import type { StoryBible } from '@/lib/cinematic/story-bible'
import {
  buildRewritePayload,
  type RewriteContext,
  type RewriteVariant,
} from '@/lib/rewrite/rewrite-actions'

export type RewriteApiResult = {
  output: string
  raw?: string
}

export async function requestRewriteSelection(
  selection: string,
  variant: RewriteVariant,
  context: RewriteContext & {
    storyBible?: StoryBible | null
    language?: string
  } = {}
): Promise<RewriteApiResult> {
  const res = await fetch('/api/ai/rewrite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      selectedText: selection,
      contentType: context.content_type,
      rewriteAction: variant,
      projectNiche: context.niche,
      storyBible: context.storyBible ?? undefined,
      language: context.language,
      full_script: context.full_text,
      title: context.title,
      platform: context.platform,
      tone: context.tone,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.error) {
    throw new Error(String(data?.error || 'Rewrite failed'))
  }

  const output = String(data.rewrittenText || data.output || data.raw || '').trim()
  if (!output) {
    throw new Error('Empty rewrite returned')
  }

  return { output, raw: data.raw ?? output }
}

/** Legacy payload builder — still used by `/api/ai/generate` rewrite_selection mode. */
export { buildRewritePayload }
