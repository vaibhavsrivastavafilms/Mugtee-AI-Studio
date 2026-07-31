/**
 * V4 Creator Pack — every professional deliverable in one archive.
 */

export type ProductionOsV4PackageItemId =
  | 'video_mp4'
  | 'video_mov'
  | 'thumbnail'
  | 'poster'
  | 'storyboard_pdf'
  | 'screenplay_pdf'
  | 'research_report_pdf'
  | 'creative_brief_pdf'
  | 'shot_list_pdf'
  | 'character_bible_pdf'
  | 'environment_bible_pdf'
  | 'captions_srt'
  | 'voiceover'
  | 'music'
  | 'creator_pack'
  | 'project_archive'

export type ProductionOsV4PackageItem = {
  id: ProductionOsV4PackageItemId
  label: string
  required: boolean
  available: boolean
  regenerable: boolean
}

export const PRODUCTION_OS_V4_PACKAGE_CATALOG: readonly ProductionOsV4PackageItem[] = [
  { id: 'video_mp4', label: 'Professional MP4', required: true, available: true, regenerable: true },
  { id: 'video_mov', label: 'Professional MOV', required: false, available: false, regenerable: true },
  { id: 'thumbnail', label: 'Thumbnail', required: true, available: true, regenerable: true },
  { id: 'poster', label: 'Poster', required: true, available: true, regenerable: true },
  { id: 'storyboard_pdf', label: 'Storyboard PDF', required: false, available: true, regenerable: true },
  { id: 'screenplay_pdf', label: 'Screenplay PDF', required: false, available: true, regenerable: false },
  { id: 'research_report_pdf', label: 'Research Report PDF', required: false, available: true, regenerable: false },
  { id: 'creative_brief_pdf', label: 'Creative Brief PDF', required: false, available: true, regenerable: false },
  { id: 'shot_list_pdf', label: 'Shot List PDF', required: false, available: true, regenerable: false },
  { id: 'character_bible_pdf', label: 'Character Bible PDF', required: false, available: true, regenerable: false },
  { id: 'environment_bible_pdf', label: 'Environment Bible PDF', required: false, available: true, regenerable: false },
  { id: 'captions_srt', label: 'Captions (SRT)', required: true, available: true, regenerable: true },
  { id: 'voiceover', label: 'Voiceover', required: false, available: true, regenerable: true },
  { id: 'music', label: 'Music', required: false, available: false, regenerable: true },
  { id: 'creator_pack', label: 'Creator Pack', required: true, available: true, regenerable: true },
  { id: 'project_archive', label: 'Project Archive', required: true, available: true, regenerable: false },
] as const

/** Permanent vs temporary storage policy for V4. */
export const V4_STORAGE_POLICY = {
  temporary: [
    'storyboard images',
    'intermediate frames',
    'preview videos',
    'temporary renders',
    'caches',
  ],
  permanent: [
    'projects',
    'metadata',
    'scripts',
    'research',
    'creative briefs',
    'user preferences',
    'brand kits',
    'character bible',
    'environment bible',
  ],
} as const
