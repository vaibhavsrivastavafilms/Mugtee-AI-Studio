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
  context: RewriteContext = {}
): Promise<RewriteApiResult> {
  const res = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRewritePayload(selection, variant, context)),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.error) {
    throw new Error(String(data?.error || 'Rewrite failed'))
  }

  const output = String(data.output || data.raw || '').trim()
  if (!output) {
    throw new Error('Empty rewrite returned')
  }

  return { output, raw: data.raw }
}
