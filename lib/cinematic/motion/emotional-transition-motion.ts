import { scenePacingRole } from '@/lib/cinematic/regen-context'

export type EmotionalTransitionMotion = {
  fromRole: string
  toRole: string
  motionCue: string
  fadeMs: number
}

const TRANSITIONS: Record<string, string> = {
  'hook→tension': 'subtle push — curiosity becomes urgency',
  'tension→peak': 'slow dissolve — breath held at crest',
  'peak→release': 'controlled pull-back — exhale into space',
  'release→aftertaste': 'held stillness — memory lingers',
  'tension→release': 'gentle cut — stakes settle',
  'hook→peak': 'accelerated dissolve — hook to crest',
  'tension→aftertaste': 'soft landing — tension resolves quietly',
}

export function emotionalTransitionMotion(
  fromIndex: number,
  toIndex: number,
  totalScenes: number
): EmotionalTransitionMotion {
  const fromRole = scenePacingRole(fromIndex, totalScenes || 1)
  const toRole = scenePacingRole(toIndex, totalScenes || 1)
  const key = `${fromRole}→${toRole}`
  const motionCue =
    TRANSITIONS[key] ??
    (toRole === 'peak'
      ? 'dissolve into intimacy'
      : fromRole === 'peak'
        ? 'pull back with restraint'
        : 'motivated cut — rhythm preserved')

  const fadeMs =
    toRole === 'peak'
      ? 520
      : fromRole === 'peak'
        ? 460
        : toRole === 'aftertaste'
          ? 540
          : fromRole === 'hook'
            ? 380
            : 340

  return { fromRole, toRole, motionCue, fadeMs }
}

export function averageTransitionFadeMs(totalScenes: number): number {
  if (totalScenes <= 1) return 400
  let sum = 0
  for (let i = 1; i < totalScenes; i++) {
    sum += emotionalTransitionMotion(i, i + 1, totalScenes).fadeMs
  }
  return Math.round(sum / (totalScenes - 1))
}
