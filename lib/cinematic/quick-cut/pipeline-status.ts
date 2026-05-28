/** Client-safe types and UI helpers — server logic in pipeline-status.server.ts */

export type QuickCutPipelineStep = 'script' | 'images' | 'voice' | 'video'

export type QuickCutStepStatus = 'live' | 'fallback' | 'skipped'

export type QuickCutPipelineStatus = {
  steps: Record<QuickCutPipelineStep, QuickCutStepStatus>
  missingKeys: string[]
  live: boolean
}

export function formatMissingKeysHint(missingKeys: string[]): string {
  if (missingKeys.length === 0) return ''
  return `Configure ${missingKeys.join(', ')} in your environment for fully live generation.`
}
