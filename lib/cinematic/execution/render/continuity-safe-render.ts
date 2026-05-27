import type { CinematicRenderBlueprint } from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'

export function continuitySafeRender(blueprint: CinematicRenderBlueprint): {
  canProceed: boolean
  presenceLine: string
} {
  if (blueprint.shots.length < 1) {
    return {
      canProceed: false,
      presenceLine: 'Your beats are still forming — atmosphere preserved.',
    }
  }
  return {
    canProceed: true,
    presenceLine: blueprint.presenceLine,
  }
}
