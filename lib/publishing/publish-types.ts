/** Publishing layer architecture — export remains source of truth. */

export type PublishDestinationId =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'linkedin'
  | 'facebook'

export type PublishStatus = 'ready' | 'draft' | 'publishing' | 'published' | 'failed'

export type PublishDestination = {
  id: PublishDestinationId
  label: string
  status: PublishStatus
  /** Requires completed MP4 from export_jobs / videoUrl */
  requiresExport: true
  scheduledAt?: string | null
  publishedUrl?: string | null
  error?: string | null
}

export const PUBLISH_DESTINATIONS: Array<{
  id: PublishDestinationId
  label: string
  description: string
}> = [
  { id: 'youtube', label: 'YouTube', description: 'Shorts & long-form' },
  { id: 'instagram', label: 'Instagram', description: 'Reels & Stories' },
  { id: 'tiktok', label: 'TikTok', description: 'Vertical feed' },
  { id: 'linkedin', label: 'LinkedIn', description: 'Professional reach' },
  { id: 'facebook', label: 'Facebook', description: 'Pages & groups' },
]

export function isPublishLayerEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_PUBLISH_LAYER === 'true'
}

/** Publish always consumes export artifact — never bypasses Remotion/FFmpeg. */
export type PublishJobDraft = {
  projectId: string
  exportJobId: string | null
  videoUrl: string
  destinationId: PublishDestinationId
  status: PublishStatus
  caption?: string
  hashtags?: string[]
}
