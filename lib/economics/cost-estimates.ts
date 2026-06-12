import 'server-only'

/** USD estimates per 60s reel — used for admin COGS dashboard (not billing). */
export const UNIT_COST_USD = {
  perplexityResearch: 0.08,
  geminiHookScript: 0.004,
  gpt4oMiniStoryboard: 0.002,
  openaiImagePerScene: 0.015,
  fluxImagePerScene: 0.025,
  draftImagePerScene: 0.003,
  elevenLabsVoice60s: 0.042,
  openaiTtsVoice60s: 0.013,
  remotionExport60s: 0.12,
  runwaySceneVideoPerSec: 0.12,
  supabaseStoragePerReel: 0.001,
} as const

export const MAX_RENDER_RETRIES = 2

export function estimateGenerationCostUsd(input: {
  sceneCount: number
  mode: 'draft' | 'creator' | 'cinematic'
  researchLive: boolean
  voiceElevenLabs: boolean
  runwaySeconds?: number
}): number {
  const scenes = Math.max(1, input.sceneCount)
  let total = UNIT_COST_USD.geminiHookScript + UNIT_COST_USD.gpt4oMiniStoryboard

  if (input.researchLive) total += UNIT_COST_USD.perplexityResearch

  if (input.mode === 'draft') {
    total += scenes * UNIT_COST_USD.draftImagePerScene
    total += UNIT_COST_USD.openaiTtsVoice60s
  } else {
    total += scenes * UNIT_COST_USD.openaiImagePerScene
    total += input.voiceElevenLabs
      ? UNIT_COST_USD.elevenLabsVoice60s
      : UNIT_COST_USD.openaiTtsVoice60s
  }

  if (input.runwaySeconds && input.runwaySeconds > 0) {
    total += input.runwaySeconds * UNIT_COST_USD.runwaySceneVideoPerSec
  }

  total += UNIT_COST_USD.supabaseStoragePerReel
  return Math.round(total * 1000) / 1000
}

export function estimateExportCostUsd(durationSec: number): number {
  const ratio = Math.max(0.25, durationSec / 60)
  return Math.round(UNIT_COST_USD.remotionExport60s * ratio * 1000) / 1000
}

export function estimateMonthlyCogsUsd(input: {
  generations: number
  exports: number
  avgGenerationUsd?: number
  avgExportUsd?: number
}): number {
  const gen = input.avgGenerationUsd ?? 0.25
  const exp = input.avgExportUsd ?? 0.12
  return Math.round((input.generations * gen + input.exports * exp) * 100) / 100
}

export function grossMarginPct(revenueInr: number, cogsUsd: number, usdToInr = 84): number {
  if (revenueInr <= 0) return 0
  const cogsInr = cogsUsd * usdToInr
  return Math.round(((revenueInr - cogsInr) / revenueInr) * 1000) / 10
}
