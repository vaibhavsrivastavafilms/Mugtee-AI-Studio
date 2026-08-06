import type { ProductionPlan } from '@/types/v3/production'
import {
  inferDurationSecFromPrompt,
  normalizeProductionPlanning,
  PRODUCTION_DEFAULT_DURATION_SEC,
} from '@/lib/v7/production-planning'

function inferTitle(prompt: string): string {
  const trimmed = prompt.trim()
  if (trimmed.length <= 120) return trimmed
  return `${trimmed.slice(0, 117)}...`
}

export function buildDeterministicProductionPlan(userPrompt: string): ProductionPlan {
  const lower = userPrompt.toLowerCase()
  const isVertical =
    lower.includes('reel') ||
    lower.includes('short') ||
    lower.includes('tiktok') ||
    lower.includes('instagram')

  const plan = normalizeProductionPlanning({
    prompt: userPrompt,
    duration: inferDurationSecFromPrompt(userPrompt) ?? PRODUCTION_DEFAULT_DURATION_SEC,
  })

  const style = lower.includes('black and white') || lower.includes('black & white')
    ? 'black and white'
    : lower.includes('logo')
      ? 'minimal brand'
      : 'cinematic documentary'

  return {
    title: inferTitle(userPrompt),
    duration: plan.duration,
    platform: lower.includes('youtube') ? 'YouTube Shorts' : 'Instagram',
    language: lower.includes('gujarati') ? 'Gujarati' : lower.includes('hindi') ? 'Hindi' : 'English',
    aspectRatio: isVertical ? '9:16' : '16:9',
    style,
    sceneCount: plan.sceneCount,
    voice: lower.includes('silent') ? 'No narration' : 'Warm narrator',
    music: lower.includes('silent') ? 'Minimal ambient' : 'Ambient cinematic',
    characterConsistency: !lower.includes('logo'),
    tone: lower.includes('experimental') ? 'experimental' : 'engaging',
    pacing: plan.duration <= 15 ? 'fast' : 'moderate',
    location: lower.includes('ahmedabad') ? 'Ahmedabad' : undefined,
  }
}
