export type { CameraLanguageCue } from '@/lib/cinematic/storyboard/emotional-camera-language'
export type { SceneWeight } from '@/lib/cinematic/storyboard/cinematic-scene-weight'
export type { ShotEscalationMemory } from '@/lib/cinematic/storyboard/shot-escalation-memory'
export type { VisualRhythmCalibration } from '@/lib/cinematic/storyboard/visual-rhythm-calibration'

export {
  applyEscalationToScene,
  buildShotEscalationMemory,
} from '@/lib/cinematic/storyboard/shot-escalation-memory'
export {
  cameraLanguageForSceneIndex,
  emotionalCameraLanguage,
  formatCameraLanguageBlock,
} from '@/lib/cinematic/storyboard/emotional-camera-language'
export {
  cinematicSceneWeight,
  dominantSceneIndex,
  rankScenesByWeight,
} from '@/lib/cinematic/storyboard/cinematic-scene-weight'
export {
  applyCalibratedDurations,
  calibrateVisualRhythm,
} from '@/lib/cinematic/storyboard/visual-rhythm-calibration'
