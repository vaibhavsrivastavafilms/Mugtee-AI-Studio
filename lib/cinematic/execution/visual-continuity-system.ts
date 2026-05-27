import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { scenePacingRole } from '@/lib/cinematic/regen-context'

export type ContinuityContext = {
  palette: string
  environment: string
  lighting: string
  cameraProgression: string
}

export function buildContinuityContext(
  scenes: GeneratedScene[],
  currentIndex: number,
  niche: CinematicNiche
): ContinuityContext | null {
  if (currentIndex <= 1 || !scenes.length) return null
  const prior = scenes[currentIndex - 2]
  if (!prior) return null

  const role = scenePacingRole(currentIndex, scenes.length)
  const cameraProgression =
    role === 'peak'
      ? 'tighten frame from prior establish'
      : role === 'aftertaste'
        ? 'pull back from prior intimacy'
        : 'motivated progression from prior angle'

  return {
    palette: prior.colorPalette,
    environment: prior.environment,
    lighting: prior.lightingMood,
    cameraProgression,
  }
}

export function buildContinuityPromptBlock(ctx: ContinuityContext | null): string {
  if (!ctx) return ''
  return [
    'Visual continuity from prior beat:',
    `- Maintain palette: ${ctx.palette}`,
    `- Environment thread: ${ctx.environment}`,
    `- Lighting continuity: ${ctx.lighting}`,
    `- Camera: ${ctx.cameraProgression}`,
  ].join('\n')
}

export function harmonizeSceneVisuals(
  scenes: GeneratedScene[],
  niche: CinematicNiche
): GeneratedScene[] {
  if (scenes.length < 2) return scenes
  const anchor = scenes[0]
  return scenes.map((scene, i) => {
    if (i === 0) return scene
    return {
      ...scene,
      colorPalette: scene.colorPalette || anchor.colorPalette,
      environment: scene.environment || anchor.environment,
    }
  })
}
