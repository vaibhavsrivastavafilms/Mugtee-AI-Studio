/** Weighted frequency entry for director memory aggregates. */
export type MemoryFrequencyEntry = {
  count: number
  weight: number
}

export type MemoryFrequencyMap = Record<string, MemoryFrequencyEntry>

export type StoryMemory = {
  frameworks: MemoryFrequencyMap
  hookStyles: MemoryFrequencyMap
  emotionalArcs: MemoryFrequencyMap
  projectCount: number
  lastProjectId?: string | null
}

export type VisualMemory = {
  shotTypes: MemoryFrequencyMap
  lighting: MemoryFrequencyMap
  colorPalettes: MemoryFrequencyMap
  composition: MemoryFrequencyMap
  cameraMovements: MemoryFrequencyMap
  projectCount: number
}

export type VoiceMemory = {
  narratorTones: MemoryFrequencyMap
  pacing: MemoryFrequencyMap
  intensity: MemoryFrequencyMap
  narrationTypes: MemoryFrequencyMap
  projectCount: number
}

export type MotionMemory = {
  motionStyles: MemoryFrequencyMap
  zoomUsage: MemoryFrequencyMap
  panUsage: MemoryFrequencyMap
  driftUsage: MemoryFrequencyMap
  pacing: MemoryFrequencyMap
  projectCount: number
}

export type CreatorPreferences = {
  avgSceneCount: number
  avgDurationSec: number
  preferredFramework: string | null
  preferredGenre: string | null
  preferredMood: string | null
  projectCount: number
}

export type CreatorMemoryProfile = {
  id: string
  userId: string
  storyMemory: StoryMemory
  visualMemory: VisualMemory
  voiceMemory: VoiceMemory
  motionMemory: MotionMemory
  creatorPreferences: CreatorPreferences
  createdAt: string
  updatedAt: string
}

export type MemoryScores = {
  story: number
  visual: number
  voice: number
  motion: number
  preferences: number
  overall: number
}

export type DirectorProjectAnalysis = {
  projectId: string
  storyMemory: Partial<StoryMemory>
  visualMemory: Partial<VisualMemory>
  voiceMemory: Partial<VoiceMemory>
  motionMemory: Partial<MotionMemory>
  creatorPreferences: Partial<CreatorPreferences>
}

export const EMPTY_STORY_MEMORY: StoryMemory = {
  frameworks: {},
  hookStyles: {},
  emotionalArcs: {},
  projectCount: 0,
}

export const EMPTY_VISUAL_MEMORY: VisualMemory = {
  shotTypes: {},
  lighting: {},
  colorPalettes: {},
  composition: {},
  cameraMovements: {},
  projectCount: 0,
}

export const EMPTY_VOICE_MEMORY: VoiceMemory = {
  narratorTones: {},
  pacing: {},
  intensity: {},
  narrationTypes: {},
  projectCount: 0,
}

export const EMPTY_MOTION_MEMORY: MotionMemory = {
  motionStyles: {},
  zoomUsage: {},
  panUsage: {},
  driftUsage: {},
  pacing: {},
  projectCount: 0,
}

export const EMPTY_CREATOR_PREFERENCES: CreatorPreferences = {
  avgSceneCount: 0,
  avgDurationSec: 0,
  preferredFramework: null,
  preferredGenre: null,
  preferredMood: null,
  projectCount: 0,
}
