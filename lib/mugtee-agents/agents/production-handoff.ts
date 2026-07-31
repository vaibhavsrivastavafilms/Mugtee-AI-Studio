/**
 * AGENTS 8–13 — Image / Video / Audio / Editor / Quality / Export
 * Executed by Production OS V3/V4. Handoff contract only.
 */

import { buildQualityEnginePlan } from '@/lib/mugtee-agents/agents/quality-engine'
import type { ProductionHandoffPlan } from '@/lib/mugtee-agents/types'

export const CREATOR_PACK_DELIVERABLES = [
  'MP4',
  'MOV',
  'Thumbnail',
  'Poster',
  'Storyboard PDF',
  'Screenplay PDF',
  'Creative Brief PDF',
  'Research PDF',
  'Character Bible PDF',
  'Environment Bible PDF',
  'Captions',
  'Creator Pack',
] as const

/** AGENT 8–13 handoff plan for Production OS. */
export function buildProductionHandoff(sceneCount: number): ProductionHandoffPlan {
  return {
    imageEngine: {
      sceneCount,
      regenerateFailed: true,
    },
    videoEngine: {
      clipSecMin: 4,
      clipSecMax: 10,
      antiSlideshow: true,
      perScene: true,
      lipSync: true,
      facialAnimation: true,
      particles: true,
      parallax: true,
    },
    audioEngine: {
      voice: true,
      dialogue: true,
      narration: true,
      music: true,
      ambient: true,
      sfx: true,
    },
    editor: {
      assembleTimeline: true,
      captions: true,
      colourGrade: true,
      transitions: true,
      motionGraphics: true,
    },
    qualityEngine: buildQualityEnginePlan(),
    exportEngine: {
      deliverables: [...CREATOR_PACK_DELIVERABLES],
      verifyBeforeExport: true,
    },
  }
}
