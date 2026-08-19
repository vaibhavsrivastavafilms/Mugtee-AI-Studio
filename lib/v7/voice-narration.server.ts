import type { V7ScriptDocument } from '@/agents/v7/script-writer.server'
import type { V7CreativeBrief, V7ProductionSnapshot } from '@/types/v7/production'

const DIAGNOSTIC_INSTRUCTION_PATTERNS: RegExp[] = [
  /\bmake cinematic advertisement\b/i,
  /\bcamera\b/i,
  /\bclose-?up\b/i,
  /\bwide shot\b/i,
  /\bslow motion\b/i,
  /\bcut to\b/i,
  /\btransition\b/i,
  /\bmusic\b/i,
  /\bsfx\b/i,
  /\bvisual\b/i,
  /\bscene\b/i,
  /\blighting\b/i,
  /\blens\b/i,
]

export type V7NarrationSegment = {
  sceneNumber: number
  sceneId: string
  text: string
  durationSec: number
  emotion: string
}

export type V7NarrationDiagnostics = {
  charCount: number
  wordCount: number
  estimatedDurationSec: number
  warnings: string[]
}

export function buildNarrationSegmentsFromScript(params: {
  script: V7ScriptDocument
  brief: V7CreativeBrief
  snapshot?: V7ProductionSnapshot
}): V7NarrationSegment[] {
  return params.script.scenes
    .map((scene) => {
      const text = scene.narration.trim()
      return {
        sceneNumber: scene.number,
        sceneId:
          params.snapshot?.scenes.find((row) => row.number === scene.number)?.id ??
          `script-${scene.number}`,
        text,
        durationSec: scene.duration ?? params.brief.duration / Math.max(params.brief.sceneCount, 1),
        emotion: scene.emotion ?? params.brief.emotion,
      }
    })
    .filter((segment) => segment.text.length > 0)
}

export function joinNarrationText(segments: V7NarrationSegment[]): string {
  return segments
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join('\n\n')
}

export function estimateNarrationDurationSec(text: string): number {
  const words = text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  // ~150 wpm conversational narration
  return words > 0 ? (words / 150) * 60 : 0
}

export function collectNarrationDiagnostics(text: string): V7NarrationDiagnostics {
  const normalized = text.trim()
  const charCount = normalized.length
  const wordCount = normalized.length > 0 ? normalized.split(/\s+/).filter(Boolean).length : 0
  const estimatedDurationSec = estimateNarrationDurationSec(normalized)
  const warnings = DIAGNOSTIC_INSTRUCTION_PATTERNS
    .filter((pattern) => pattern.test(normalized))
    .map((pattern) => `Narration contains instruction-like token: ${pattern.source}`)
  return { charCount, wordCount, estimatedDurationSec, warnings }
}

export function assertNarrationFitsBrief(params: {
  narrationText: string
  briefDurationSec: number
  context: string
}) {
  const diagnostics = collectNarrationDiagnostics(params.narrationText)
  if (!params.narrationText.trim()) {
    throw new Error(`${params.context}: narration text is empty`)
  }

  // Hard stop for severe mismatch (prevents 184s voice for sub-60s videos).
  const hardCap = Math.max(params.briefDurationSec * 1.35, params.briefDurationSec + 12)
  if (diagnostics.estimatedDurationSec > hardCap) {
    throw new Error(
      `${params.context}: narration too long for target runtime (${Math.round(diagnostics.estimatedDurationSec)}s estimated vs ${Math.round(params.briefDurationSec)}s target)`
    )
  }

  if (diagnostics.warnings.length > 0) {
    console.warn(
      '[V7_NARRATION_DIAGNOSTIC]',
      JSON.stringify({
        context: params.context,
        warnings: diagnostics.warnings,
        wordCount: diagnostics.wordCount,
        charCount: diagnostics.charCount,
        estimatedDurationSec: diagnostics.estimatedDurationSec,
      })
    )
  }
}
