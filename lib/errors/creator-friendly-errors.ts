/**
 * Maps HTTP status codes and raw errors to creator-safe copy.
 * Use in generation, export, save, and auth flows — never surface stack traces.
 */

export type CreatorErrorContext = 'generation' | 'export' | 'save' | 'auth' | 'generic'

const CONTEXT_DEFAULT: Record<CreatorErrorContext, string> = {
  generation: 'Generation failed. Try again in a moment.',
  export: 'Export failed. Try again in a moment.',
  save: 'Could not save your project. Try again in a moment.',
  auth: 'Sign-in failed. Please try again.',
  generic: 'Something went wrong. Try again in a moment.',
}

const HTTP_MESSAGES: Record<number, string> = {
  400: 'That request could not be completed. Check your inputs and try again.',
  401: 'Please sign in again to continue.',
  403: 'This action is not available on your current plan.',
  404: 'We could not find that item. Refresh and try again.',
  408: 'This step took too long — your work is saved. Try again.',
  429: 'You have hit a usage limit. Upgrade or try again later.',
  500: 'Our servers had a hiccup. Try again in a moment.',
  502: 'Our servers had a hiccup. Try again in a moment.',
  503: 'Mugtee is busy right now. Try again in a moment.',
  504: 'This step took too long — your work is saved. Try again.',
}

const TECHNICAL =
  /failed|error|unexpected|required|missing|provider|queue|processing|render|invalid|timeout|quota|unauthor|internal server|http\s*\d|json|stack|exception|econnrefused|fetch/i

export function creatorFriendlyFromHttp(
  status: number,
  context: CreatorErrorContext = 'generic'
): string {
  return HTTP_MESSAGES[status] ?? CONTEXT_DEFAULT[context]
}

export function creatorFriendlyMessage(
  err: unknown,
  context: CreatorErrorContext = 'generic'
): string {
  const fallback = CONTEXT_DEFAULT[context]

  if (typeof err === 'object' && err !== null && 'status' in err) {
    const status = Number((err as { status: number }).status)
    if (Number.isFinite(status) && status >= 400) {
      return creatorFriendlyFromHttp(status, context)
    }
  }

  if (err instanceof Error) {
    const msg = err.message.trim()
    if (!msg) return fallback
    if (RAW_SAFE.has(msg)) return msg
    if (msg.startsWith('Cannot export reel —')) return msg
    if (TECHNICAL.test(msg)) return fallback
    return msg
  }

  if (typeof err === 'string' && err.trim()) {
    const msg = err.trim()
    if (msg.startsWith('Cannot export reel —')) return msg
    if (!TECHNICAL.test(msg)) return msg
  }

  return fallback
}

/** Messages already written for creators — pass through unchanged. */
const RAW_SAFE = new Set([
  'Export job expired — retry export',
  'Connection lost — your work is saved. Try again.',
  'This step took too long — your work is saved. Try again.',
  'Reel export timed out — try again',
  'Story shaping paused — your premise is saved',
  'Story shaping paused — try again',
])

export function creatorFriendlyFromResponse(
  res: Response,
  body: { error?: string } | null,
  context: CreatorErrorContext = 'generic'
): string {
  const raw = typeof body?.error === 'string' ? body.error.trim() : ''
  if (raw && !TECHNICAL.test(raw)) return raw
  return creatorFriendlyFromHttp(res.status, context)
}
