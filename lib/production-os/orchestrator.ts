import {
  PRODUCTION_OS_PHASES,
  clampProductionOsDurationSec,
  type ProductionOsPhaseDefinition,
  type ProductionOsPhaseId,
  type ProductionOsPhaseStatus,
} from '@/lib/production-os/phases'
import { productionOsProgressLine } from '@/lib/production-os/progress-copy'
import {
  defaultProductionOsExportRequest,
  type ProductionOsExportRequest,
} from '@/lib/production-os/export-manifest'
import {
  runProductionOsQualityGate,
  type ProductionOsQualityReport,
} from '@/lib/production-os/quality-gate'

export type ProductionOsRunPlan = {
  idea: string
  durationSec: number
  phases: Array<{
    id: ProductionOsPhaseId
    title: string
    progressLine: string
    engineStatus: ProductionOsPhaseDefinition['engineStatus']
    status: ProductionOsPhaseStatus
  }>
  exportRequest: ProductionOsExportRequest
  terminalDeliverable: 'mp4'
}

/**
 * Build the Production OS run plan for an idea.
 * Does not execute engines — maps the product contract onto the existing stack.
 */
export function buildProductionOsRunPlan(input: {
  idea: string
  durationSec?: number
  skipResearch?: boolean
}): ProductionOsRunPlan {
  const durationSec = clampProductionOsDurationSec(input.durationSec ?? 60)

  return {
    idea: input.idea.trim(),
    durationSec,
    phases: PRODUCTION_OS_PHASES.map((phase) => ({
      id: phase.id,
      title: phase.title,
      progressLine: productionOsProgressLine(phase.id),
      engineStatus: phase.engineStatus,
      status:
        input.skipResearch && phase.id === 'deep_research'
          ? ('skipped' as const)
          : phase.engineStatus === 'planned'
            ? ('pending' as const)
            : ('pending' as const),
    })),
    exportRequest: {
      ...defaultProductionOsExportRequest(),
      maxDurationSec: durationSec,
    },
    terminalDeliverable: 'mp4',
  }
}

export function evaluateProductionOsExportReadiness(input: {
  scenesCount: number
  scenesWithImages: number
  hasVoice: boolean
  hasCaptions: boolean
  hasVideo: boolean
  durationSec: number
}): ProductionOsQualityReport {
  return runProductionOsQualityGate(input)
}

/** Human-readable pipeline summary for companion / HUD. */
export function describeProductionOsPipeline(): string {
  return PRODUCTION_OS_PHASES.map((phase, index) => {
    const mark =
      phase.engineStatus === 'integrated'
        ? '●'
        : phase.engineStatus === 'partial'
          ? '◐'
          : '○'
    return `${index + 1}. ${mark} ${phase.title}`
  }).join('\n')
}
