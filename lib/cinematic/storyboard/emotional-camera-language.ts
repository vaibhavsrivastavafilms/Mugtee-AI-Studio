import { scenePacingRole } from '@/lib/cinematic/regen-context'

export type CameraLanguageCue = {
  framing: string
  movement: string
  emotionalIntent: string
}

const LANGUAGE: Record<string, CameraLanguageCue> = {
  hook: {
    framing: 'off-center portrait or detail insert',
    movement: 'stillness with subtle drift',
    emotionalIntent: 'pattern interrupt — curiosity before commitment',
  },
  tension: {
    framing: 'medium close — subject slightly off-axis',
    movement: 'handheld motivation — slow push',
    emotionalIntent: 'unease gathering — viewer leans in',
  },
  peak: {
    framing: 'intimate close or locked two-shot',
    movement: 'slow push-in or held stillness',
    emotionalIntent: 'emotional crest — breath held',
  },
  release: {
    framing: 'wider frame — context returns',
    movement: 'controlled pull-back',
    emotionalIntent: 'exhale — space to feel',
  },
  aftertaste: {
    framing: 'still frame on residue',
    movement: 'minimal — hold on echo',
    emotionalIntent: 'memory — what lingers after the cut',
  },
}

export function emotionalCameraLanguage(role: string): CameraLanguageCue {
  return LANGUAGE[role] ?? {
    framing: 'motivated cinematic framing',
    movement: 'restrained motivated movement',
    emotionalIntent: 'directed presence — not decorative',
  }
}

export function cameraLanguageForSceneIndex(
  sceneIndex: number,
  totalScenes: number
): CameraLanguageCue {
  const role = scenePacingRole(sceneIndex, totalScenes || 1)
  return emotionalCameraLanguage(role)
}

export function formatCameraLanguageBlock(cue: CameraLanguageCue): string {
  return `${cue.framing} · ${cue.movement} · ${cue.emotionalIntent}`
}
