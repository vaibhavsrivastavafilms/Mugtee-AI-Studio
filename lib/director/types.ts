import type { ContentAngleId } from '@/lib/cinematic/content-angle-engine'
import type { StoryDirectorPackage } from '@/lib/ai/director/story-director-engine'

export const DIRECTOR_STUDIO_STAGES = [
  'idea',
  'story-direction',
  'director-treatment',
  'story-package',
  'blueprint',
  'character-bible',
  'cinematography',
  'storyboard-planning',
  'voice-direction',
  'music-direction',
  'motion-direction',
  'director-approval',
  'generate-assets',
  'export',
] as const

export type DirectorStudioStage = (typeof DIRECTOR_STUDIO_STAGES)[number]

export type StoryDirectionOption = {
  id: string
  angleId: ContentAngleId
  title: string
  logline: string
  hook: string
  emotionalPromise: string
  audience: string
}

export type DirectorTreatment = {
  genre: string
  mood: string
  emotionalArc: string
  visualStyle: string
  cameraLanguage: string
  lightingStyle: string
  colorPalette: string
  musicDirection: string
  referenceFilms: string[]
}

export type DirectorBlueprint = {
  title: string
  hook: string
  summary: string
  script: string
  sceneBeats: Array<{ index: number; beat: string; durationSec?: number }>
  locked: boolean
  approved: boolean
}

export type CharacterBibleEntry = {
  id: string
  name: string
  role: string
  appearance: string
  wardrobe: string
  motivation: string
  arc: string
}

export type CharacterBible = {
  protagonist: CharacterBibleEntry | null
  supporting: CharacterBibleEntry[]
  visualRules: string[]
}

export type SceneCameraLanguage = {
  sceneIndex: number
  shotType: string
  lens: string
  movement: string
  framing: string
  lighting: string
  notes: string
}

export type CameraLanguagePlan = {
  globalStyle: string
  scenes: SceneCameraLanguage[]
}

export type StoryboardPlanScene = {
  sceneIndex: number
  visualPrompt: string
  cameraSetup: string
  composition: string
  mood: string
  transition: string
}

export type StoryboardPlan = {
  scenes: StoryboardPlanScene[]
}

export type VoiceProfile = {
  narratorTone: string
  pacing: string
  emphasis: string
  dialect: string
  sceneNotes: Record<string, string>
}

export type MusicDirection = {
  genre: string
  tempo: string
  instrumentation: string
  emotionalCurve: string
  referenceTracks: string[]
}

export type MotionPlanScene = {
  sceneIndex: number
  motionStyle: string
  durationSec: number
  transition: string
}

export type MotionPlan = {
  globalPacing: string
  scenes: MotionPlanScene[]
}

export type DirectorStageProgress = Partial<Record<DirectorStudioStage, 'pending' | 'in_progress' | 'complete'>>

/** Snapshot passed into generation APIs after director approval. */
export type DirectorStudioContext = {
  activeStoryDirection?: StoryDirectionOption | null
  directorTreatment?: DirectorTreatment | null
  storyDirectorPackage?: StoryDirectorPackage | null
  characterBible?: CharacterBible | null
  cameraLanguage?: CameraLanguagePlan | null
  storyboardPlan?: StoryboardPlan | null
  voiceProfile?: VoiceProfile | null
  musicDirection?: MusicDirection | null
  motionPlan?: MotionPlan | null
  blueprint?: DirectorBlueprint | null
}

export const EMPTY_DIRECTOR_TREATMENT: DirectorTreatment = {
  genre: '',
  mood: '',
  emotionalArc: '',
  visualStyle: '',
  cameraLanguage: '',
  lightingStyle: '',
  colorPalette: '',
  musicDirection: '',
  referenceFilms: [],
}

export const EMPTY_DIRECTOR_BLUEPRINT: DirectorBlueprint = {
  title: '',
  hook: '',
  summary: '',
  script: '',
  sceneBeats: [],
  locked: false,
  approved: false,
}
