/** Per-output-card generation status for progressive UI. */

export type SectionId =
  | 'contentDirectorBrief'
  | 'hook'
  | 'script'
  | 'visualDirection'
  | 'storyboard'
  | 'captions'
  | 'thumbnail'
  | 'voice'
  | 'export'

export type SectionGenerationStatus = 'idle' | 'generating' | 'completed' | 'failed'

export type SectionStatusMap = Record<SectionId, SectionGenerationStatus>

export const INITIAL_SECTION_STATUS: SectionStatusMap = {
  contentDirectorBrief: 'idle',
  hook: 'idle',
  script: 'idle',
  visualDirection: 'idle',
  storyboard: 'idle',
  captions: 'idle',
  thumbnail: 'idle',
  voice: 'idle',
  export: 'idle',
}

export const SECTION_STATUS_LABELS: Record<SectionId, string> = {
  contentDirectorBrief: 'Content brief',
  hook: 'Hook',
  script: 'Script',
  visualDirection: 'Visual direction',
  storyboard: 'Storyboard',
  captions: 'Captions',
  thumbnail: 'Thumbnail',
  voice: 'Voice',
  export: 'Export',
}

export const SECTION_READY_LABELS: Record<SectionId, string> = {
  contentDirectorBrief: 'Content brief ready',
  hook: 'Hook ready',
  script: 'Script ready',
  visualDirection: 'Visual direction ready',
  storyboard: 'Storyboard ready',
  captions: 'Captions ready',
  thumbnail: 'Thumbnail ready',
  voice: 'Voice ready',
  export: 'Export ready',
}

export function resetSectionStatus(): SectionStatusMap {
  return { ...INITIAL_SECTION_STATUS }
}
