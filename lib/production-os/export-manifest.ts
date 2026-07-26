/**
 * One-click Production OS export package contract.
 * Wired into Creator Pack + MP4/MOV when those assets exist.
 */

export type ProductionOsExportFormat = 'mp4' | 'mov' | 'webm' | 'gif'

export type ProductionOsAspectRatio = '9:16' | '16:9' | '1:1' | '4:5'

export type ProductionOsExportQuality = '720p' | '1080p' | '1440p' | '4k'

export type ProductionOsPackageItemId =
  | 'video_mp4'
  | 'video_mov'
  | 'captions_srt'
  | 'voiceover'
  | 'music'
  | 'project_archive'
  | 'storyboard_pdf'
  | 'screenplay_pdf'
  | 'creative_brief_pdf'
  | 'research_report_pdf'
  | 'thumbnail'
  | 'social_captions'
  | 'hashtags'

export type ProductionOsPackageItem = {
  id: ProductionOsPackageItemId
  label: string
  required: boolean
  /** Whether the current pipeline can produce this asset. */
  available: boolean
}

export const PRODUCTION_OS_PACKAGE_CATALOG: readonly ProductionOsPackageItem[] = [
  { id: 'video_mp4', label: 'Final MP4', required: true, available: true },
  { id: 'video_mov', label: 'Final MOV', required: false, available: false },
  { id: 'captions_srt', label: 'Captions (SRT)', required: true, available: true },
  { id: 'voiceover', label: 'Voiceover', required: false, available: true },
  { id: 'music', label: 'Music bed', required: false, available: false },
  { id: 'project_archive', label: 'Project archive', required: true, available: true },
  { id: 'storyboard_pdf', label: 'Storyboard PDF', required: false, available: true },
  { id: 'screenplay_pdf', label: 'Screenplay PDF', required: false, available: false },
  { id: 'creative_brief_pdf', label: 'Creative Brief PDF', required: false, available: false },
  { id: 'research_report_pdf', label: 'Research Report PDF', required: false, available: true },
  { id: 'thumbnail', label: 'Thumbnail', required: false, available: true },
  { id: 'social_captions', label: 'Social captions', required: false, available: true },
  { id: 'hashtags', label: 'Hashtags', required: false, available: true },
] as const

export type ProductionOsExportRequest = {
  formats: ProductionOsExportFormat[]
  aspectRatio: ProductionOsAspectRatio
  quality: ProductionOsExportQuality
  maxDurationSec: number
  include: ProductionOsPackageItemId[]
}

export function defaultProductionOsExportRequest(): ProductionOsExportRequest {
  return {
    formats: ['mp4'],
    aspectRatio: '9:16',
    quality: '1080p',
    maxDurationSec: 180,
    include: PRODUCTION_OS_PACKAGE_CATALOG.filter((item) => item.available).map(
      (item) => item.id
    ),
  }
}
