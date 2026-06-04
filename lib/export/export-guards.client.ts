'use client'

import { validateExportReadinessInput } from '@/lib/export/export-schema'

export const EXPORT_GUARD_MESSAGES = {
  noProject: 'Save your project before exporting.',
  noScript: 'Generate storyboard before exporting.',
  noScenes: 'Generate storyboard before exporting.',
  incomplete: 'Project data incomplete — finish storyboard generation first.',
} as const

export type ExportGuardInput = {
  projectId?: string | null
  script?: string | null
  hook?: string | null
  scenes: Array<{ id: string; title?: string | null; imageUrl?: string | null; imageAssetPath?: string | null }>
  voiceUrl?: string | null
  requireVoice?: boolean
}

export type ExportGuardResult = {
  allowed: boolean
  message: string | null
  issues: string[]
}

export function evaluateExportGuard(input: ExportGuardInput): ExportGuardResult {
  const hasScript = Boolean(input.script?.trim() || input.hook?.trim())
  const issues: string[] = []

  if (!input.projectId?.trim()) {
    issues.push(EXPORT_GUARD_MESSAGES.noProject)
  }
  if (input.scenes.length < 1) {
    issues.push(EXPORT_GUARD_MESSAGES.noScenes)
  }
  if (!hasScript && input.scenes.length < 1) {
    issues.push(EXPORT_GUARD_MESSAGES.noScript)
  }

  const schema = validateExportReadinessInput({
    projectId: input.projectId,
    script: input.script ?? input.hook,
    voiceUrl: input.voiceUrl,
    scenes: input.scenes,
  })
  if (!schema.ok) {
    issues.push(schema.message)
  }

  if (input.requireVoice && !input.voiceUrl?.trim()) {
    issues.push('Add voice narration before exporting.')
  }

  const unique = [...new Set(issues)]
  return {
    allowed: unique.length === 0,
    message: unique[0] ?? null,
    issues: unique,
  }
}

export function showExportError(message: string): void {
  if (typeof window === 'undefined') return
  mugteeExportWarn('guard_blocked', { message })
}

function mugteeExportWarn(stage: string, payload: Record<string, unknown>): void {
  if (typeof console !== 'undefined') {
    console.warn(`[MUGTEE EXPORT] ${stage}`, payload)
  }
}
