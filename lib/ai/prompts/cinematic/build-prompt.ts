import type { CinematicNiche } from '@/lib/cinematic/niches'
import { buildNicheLayer } from '@/lib/cinematic/niches'
import { buildPacingLayer } from '@/lib/ai/prompts/cinematic/pacing-layer'
import { buildVisualLayer } from '@/lib/ai/prompts/cinematic/visual-layer'
import { intentPromptFragment, parseCinematicIntent } from '@/lib/cinematic/execution/cinematic-intent-engine'
import { buildScreenplayIntelligenceNote } from '@/lib/cinematic/execution/screenplay-intelligence-engine'
import {
  buildCaptionLayer,
  buildHookLayer,
  buildOutputFormatLayer,
} from '@/lib/ai/prompts/cinematic/output-format'

export type CinematicPromptInput = {
  topic: string
  platform: string
  tone: string
  duration: number
  niche: CinematicNiche
}

export function buildCinematicScriptPrompt(input: CinematicPromptInput): string {
  const { topic, platform, tone, duration, niche } = input
  const sceneTarget = duration <= 30 ? 4 : duration <= 60 ? 6 : 8
  const intent = parseCinematicIntent({ topic, tone, duration, niche })

  return [
    `Creator brief:
- Idea: "${topic}"
- Platform: ${platform} (vertical 9:16)
- Tone: ${tone}
- Locked niche: ${niche}`,
    intentPromptFragment(intent),
    buildScreenplayIntelligenceNote({ topic, duration, tone, niche }),
    buildNicheLayer(niche),
    buildHookLayer(),
    buildPacingLayer(duration),
    buildVisualLayer(),
    buildCaptionLayer(),
    buildOutputFormatLayer(sceneTarget, duration),
  ].join('\n\n')
}

// Back-compat re-export for existing imports
export { CINEMATIC_SYSTEM_PROMPT } from '@/lib/ai/prompts/cinematic/system'
