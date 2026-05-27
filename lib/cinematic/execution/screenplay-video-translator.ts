import type { CinematicGenerationOutput } from '@/lib/cinematic/generation'
import { scenePacingRole } from '@/lib/cinematic/regen-context'
import { motionForScene } from '@/lib/cinematic/execution/cinematic-motion-system'

export type FilmShot = {
  sceneId: string
  sceneIndex: number
  durationSec: number
  visualPrompt: string
  motion: ReturnType<typeof motionForScene>
  narration: string
  transition: 'cut' | 'dissolve' | 'hold'
}

export type FilmAssemblyPlan = {
  totalDuration: number
  shots: FilmShot[]
  hook: string
  voicePacingWpm: number
}

export function translateScreenplayToFilmPlan(
  output: CinematicGenerationOutput
): FilmAssemblyPlan {
  const shots: FilmShot[] = output.scenes.map((scene, i) => {
    const sceneIndex = i + 1
    const role = scenePacingRole(sceneIndex, output.scenes.length || 1)
    const motion = motionForScene(role, scene.duration)
    return {
      sceneId: scene.id,
      sceneIndex,
      durationSec: scene.duration,
      visualPrompt: scene.visualPrompt,
      motion,
      narration: scene.description,
      transition: role === 'aftertaste' ? 'hold' : role === 'peak' ? 'dissolve' : 'cut',
    }
  })

  const totalDuration = shots.reduce((s, shot) => s + shot.durationSec, 0)

  return {
    totalDuration,
    shots,
    hook: output.hook,
    voicePacingWpm: totalDuration <= 30 ? 128 : totalDuration <= 60 ? 118 : 108,
  }
}

export function buildCinematicVideoPipeline(
  output: CinematicGenerationOutput
): FilmAssemblyPlan {
  return translateScreenplayToFilmPlan(output)
}
