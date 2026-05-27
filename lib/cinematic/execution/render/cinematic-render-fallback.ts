import type { RenderProviderResult } from '@/lib/cinematic/execution/render/cinematic-render-provider'

export function cinematicRenderFallback(): RenderProviderResult {
  return {
    ok: true,
    status: 'preparing',
    presenceLine: 'Your story holds its atmosphere — motion will follow.',
    provider: 'stub',
  }
}

export function shouldFallbackRender(error: unknown): boolean {
  if (!error) return false
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error)
  return (
    msg.includes('timeout') ||
    msg.includes('unavailable') ||
    msg.includes('quota') ||
    msg.includes('network')
  )
}
