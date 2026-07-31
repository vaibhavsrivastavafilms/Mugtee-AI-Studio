/**
 * Mugtee Story-to-Film Automation Engine — agent contracts.
 * Creator never sees prompts unless Advanced Mode is on.
 */

import type { CompanionInputKind } from '@/lib/production-os/v4/input'
import type { CharacterBible } from '@/lib/production-os/v4/character-bible'
import type { EnvironmentBible } from '@/lib/production-os/v4/environment-bible'

export type MugteeAgentId =
  | 'idea_analyzer'
  | 'story_engine'
  | 'screenplay_engine'
  | 'character_director'
  | 'environment_director'
  | 'storyboard_engine'
  | 'prompt_engine'
  | 'image_engine'
  | 'video_engine'
  | 'audio_engine'
  | 'editor'
  | 'quality_engine'
  | 'export_engine'

/** @deprecated Use story_engine */
export type LegacyStoryAgentId = 'story_architect' | 'storyboard_director'

export type AgentRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'handoff'

export type CreativeBrief = {
  genre: string
  theme: string
  audience: string
  emotion: string
  language: string
  durationSec: number
  platform: string
  mainCharacters: string[]
  supportingCharacters: string[]
  conflict: string
  ending: string
  moral: string
  setting: string
  idea: string
  sources: CompanionInputKind[]
  /** Pixar-inspired stylised 3D — locked for the whole film */
  animationStyle: 'pixar_stylised_3d'
}

export type StoryEngineOutput = {
  story: string
  dialogueLanguage: string
  familyFriendly: true
  childSafe: true
  original: true
  sceneList: Array<{
    sceneNumber: number
    summary: string
    dialogue: string
    durationSec: number
  }>
  beginning: string
  middle: string
  climax: string
  ending: string
}

/** @deprecated Use StoryEngineOutput */
export type StoryArchitectOutput = StoryEngineOutput

export type ProductionScreenplayScene = {
  sceneNumber: number
  location: string
  time: string
  characters: string[]
  action: string
  dialogue: string
  emotion: string
  cameraDirection: string
  lighting: string
  durationSec: number
  transition: string
}

export type CharacterTurnaround = {
  front: string
  back: string
  left: string
  right: string
}

export type CharacterExpressionSheet = {
  happy: string
  angry: string
  shocked: string
}

export type CharacterBibleEntry = CharacterBible & {
  age: string
  appearance: string
  personality: string
  accessories: string
  bodyShape: string
  referencePrompt: string
  turnaround: CharacterTurnaround
  expressionSheet: CharacterExpressionSheet
  turnaroundPrompt: string
  animationStyle: 'pixar_stylised_3d'
}

export type StoryboardPanel = {
  sceneNumber: number
  camera: string
  lens: string
  composition: string
  lighting: string
  movement: string
  characters: string[]
  characterPlacement: string
  environment: string
  dialogue: string
  emotion: string
  timingSec: number
}

export type ProductionPromptBatch = {
  batchIndex: number
  sceneNumbers: number[]
  prompts: Array<{
    sceneNumber: number
    prompt: string
    negativePrompt: string
    speakingCharacter: string
    listeningCharacter: string
    dialogue: string
    lipSyncGuidance: string
    animationInstructions: string
    animationStyle: 'pixar_stylised_3d'
  }>
}

export type QualityEnginePlan = {
  verifyCharacterConsistency: true
  verifyEnvironmentConsistency: true
  verifySceneContinuity: true
  verifyVoiceSync: true
  verifyCaptionTiming: true
  verifyMissingAssets: true
  verifyBrokenClips: true
  verifyAudioMix: true
  /** Regenerate only failed scenes — never restart the whole movie */
  regenerateFailedScenesOnly: true
}

/** Agents 8–13 — executed by Production OS / quality / export. */
export type ProductionHandoffPlan = {
  imageEngine: { sceneCount: number; regenerateFailed: true }
  videoEngine: {
    clipSecMin: number
    clipSecMax: number
    antiSlideshow: true
    perScene: true
    lipSync: true
    facialAnimation: true
    particles: true
    parallax: true
  }
  audioEngine: {
    voice: true
    dialogue: true
    narration: true
    music: true
    ambient: true
    sfx: true
  }
  editor: {
    assembleTimeline: true
    captions: true
    colourGrade: true
    transitions: true
    motionGraphics: true
  }
  qualityEngine: QualityEnginePlan
  exportEngine: {
    deliverables: string[]
    verifyBeforeExport: true
  }
}

export type MugteeAgentPackage = {
  version: 'mugtee-story-to-film-v1'
  creativeBrief: CreativeBrief
  story: StoryEngineOutput
  screenplay: ProductionScreenplayScene[]
  characters: CharacterBibleEntry[]
  environment: EnvironmentBible
  storyboard: StoryboardPanel[]
  /** Hidden unless advancedMode */
  promptBatches: ProductionPromptBatch[]
  handoff: ProductionHandoffPlan
  companionLine: string
  advancedMode: boolean
  createdAt: string
}

export type RunMugteeAgentsInput = {
  idea: string
  attachments?: Array<{ kind: CompanionInputKind; text?: string; url?: string }>
  durationSec?: number
  language?: string
  platform?: string
  audience?: string
  style?: string
  advancedMode?: boolean
}
