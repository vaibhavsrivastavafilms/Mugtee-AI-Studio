import type { CinematicProjectState } from '@/stores/cinematic-project'

export type FlowAuditFinding = {
  step: string
  severity: 'low' | 'medium' | 'high'
  message: string
  friction: string
}

const OPERATIONAL_PATTERNS = [
  /api/i,
  /generat(e|ing|ion)/i,
  /render(ing)?/i,
  /pipeline/i,
  /workflow/i,
  /configur/i,
  /optimiz/i,
  /prompt/i,
]

export function auditCinematicFlow(
  state: Pick<CinematicProjectState, 'script' | 'scenes' | 'voice' | 'hook' | 'status'>
): FlowAuditFinding[] {
  const findings: FlowAuditFinding[] = []

  if (!state.hook.trim()) {
    findings.push({
      step: 'preview',
      severity: 'medium',
      message: 'Opening beat not yet felt',
      friction: 'Story may feel unanchored before hook lands',
    })
  }
  if (state.scenes.length < 2) {
    findings.push({
      step: 'scenes',
      severity: 'high',
      message: 'Visual sequence too thin',
      friction: 'Creator may feel export is packaging, not film',
    })
  }
  if (!state.voice?.audioUrl && state.status === 'compile') {
    findings.push({
      step: 'voiceover',
      severity: 'low',
      message: 'Voice not yet embodied',
      friction: 'Compile may feel silent — optional but immersive',
    })
  }

  return findings
}

export function detectOperationalLanguage(text: string): string[] {
  return OPERATIONAL_PATTERNS.filter((p) => p.test(text)).map((p) => p.source)
}

export function storytellingInterruptionMap(
  findings: FlowAuditFinding[]
): Record<string, string[]> {
  return findings.reduce<Record<string, string[]>>((acc, f) => {
    acc[f.step] = acc[f.step] ?? []
    acc[f.step].push(f.friction)
    return acc
  }, {})
}

export function cinematicImmersionScore(
  findings: FlowAuditFinding[]
): number {
  const penalty = findings.reduce(
    (s, f) => s + (f.severity === 'high' ? 0.2 : f.severity === 'medium' ? 0.1 : 0.05),
    0
  )
  return Math.max(0, Math.min(1, 1 - penalty))
}
