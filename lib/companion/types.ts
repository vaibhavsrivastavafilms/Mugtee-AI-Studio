/** Creative brief built from discovery flow — drives script/storyboard prompts. */
export type CreativeBrief = {
  theme?: string
  emotion?: string
  audienceReaction?: string
  protagonist?: string
  tone?: string
  takeaway?: string
  completedAt?: string
}

export type CreatorMemory = {
  favoriteNiches?: string[]
  preferredHookStyle?: string
  preferredTone?: string
  preferredVisualStyle?: string
  preferredDuration?: number
  commonThemes?: string[]
  updatedAt?: string
}

export type DirectorNote = {
  id: string
  text: string
  sceneRef?: string | null
  createdAt: string
  sessionId: string
}

export type EmotionalDimensionLabel =
  | 'Strong'
  | 'Building'
  | 'High'
  | 'Smooth'
  | 'Needs lift'
  | 'Peak'
  | 'Steady'

export type EmotionalStoryAnalysis = {
  curiosity: EmotionalDimensionLabel
  emotion: EmotionalDimensionLabel
  visualPower: EmotionalDimensionLabel
  retention: EmotionalDimensionLabel
  storyFlow: EmotionalDimensionLabel
  summary: string
  analyzedAt: string
}

export type ViewerJourneySegment = {
  startSec: number
  endSec: number
  label: string
  emotion: string
  intensity: 'low' | 'medium' | 'high'
}

export type StoryExpansionSuggestion = {
  id: string
  title: string
  description: string
  type: 'sequel' | 'spinoff' | 'deep_dive' | 'series_hook'
}

export type ReflectionHighlight = 'hook' | 'story' | 'visuals' | 'ending' | 'voice'

export type DiscoveryStepId =
  | 'theme'
  | 'emotion'
  | 'audience_reaction'
  | 'protagonist'
  | 'takeaway'

export const DISCOVERY_STEP_ORDER: DiscoveryStepId[] = [
  'theme',
  'emotion',
  'audience_reaction',
  'protagonist',
  'takeaway',
]

export const DIRECTOR_NOTE_SESSION_CAP = 3
