/**
 * Mugtee Storage Retention Policy (Production OS).
 * Regenerable media ages out; user/account data never auto-deletes.
 */

export const SAFE_DELETE_BUCKETS = [
  'reels',
  'project-assets',
  'media',
  'storyboards',
  'exports',
  'renders',
  'temporary',
  'cache',
  'preview',
  'thumbnails',
  'generated-images',
  'voiceovers',
  'music',
  'uploads',
] as const

export type SafeDeleteBucket = (typeof SAFE_DELETE_BUCKETS)[number]

/** Never auto-delete these buckets (account / brand). */
export const PROTECTED_BUCKETS = ['avatars', 'brand-assets'] as const

export type BucketPolicy = {
  id: string
  retention: string
  maxAgeDays: number
  /** Soft ceiling for free-plan hygiene (bytes). */
  maxSizeBytes: number
  cleanupJob: string
  visibility: 'public' | 'private'
  compression: 'none' | 'webp-preferred' | 'h264-preferred' | 'audio-aac'
  regenerable: boolean
}

/**
 * STEP 7 — Future-proof bucket architecture.
 * Migrate uploads off the monolithic `project-assets` / `media` buckets.
 */
export const TARGET_BUCKET_ARCHITECTURE: readonly BucketPolicy[] = [
  {
    id: 'uploads',
    retention: '7 days if unused',
    maxAgeDays: 7,
    maxSizeBytes: 200 * 1024 * 1024,
    cleanupJob: 'retention-cleanup + quota cron',
    visibility: 'private',
    compression: 'none',
    regenerable: true,
  },
  {
    id: 'projects',
    retention: 'keep while project active',
    maxAgeDays: 90,
    maxSizeBytes: 300 * 1024 * 1024,
    cleanupJob: 'orphan cleanup on project delete',
    visibility: 'private',
    compression: 'none',
    regenerable: true,
  },
  {
    id: 'renders',
    retention: '14 days',
    maxAgeDays: 14,
    maxSizeBytes: 400 * 1024 * 1024,
    cleanupJob: 'lifecycle: delete after export OR 14d',
    visibility: 'private',
    compression: 'h264-preferred',
    regenerable: true,
  },
  {
    id: 'exports',
    retention: '14 days',
    maxAgeDays: 14,
    maxSizeBytes: 400 * 1024 * 1024,
    cleanupJob: 'lifecycle: 14d',
    visibility: 'private',
    compression: 'h264-preferred',
    regenerable: true,
  },
  {
    id: 'storyboards',
    retention: '7 days',
    maxAgeDays: 7,
    maxSizeBytes: 150 * 1024 * 1024,
    cleanupJob: 'lifecycle: 7d',
    visibility: 'private',
    compression: 'webp-preferred',
    regenerable: true,
  },
  {
    id: 'voiceovers',
    retention: '30 days',
    maxAgeDays: 30,
    maxSizeBytes: 100 * 1024 * 1024,
    cleanupJob: 'lifecycle: 30d',
    visibility: 'private',
    compression: 'audio-aac',
    regenerable: true,
  },
  {
    id: 'music',
    retention: '30 days',
    maxAgeDays: 30,
    maxSizeBytes: 100 * 1024 * 1024,
    cleanupJob: 'lifecycle: 30d',
    visibility: 'private',
    compression: 'audio-aac',
    regenerable: true,
  },
  {
    id: 'generated-images',
    retention: '7 days',
    maxAgeDays: 7,
    maxSizeBytes: 200 * 1024 * 1024,
    cleanupJob: 'lifecycle: 7d',
    visibility: 'private',
    compression: 'webp-preferred',
    regenerable: true,
  },
  {
    id: 'temporary',
    retention: '24 hours',
    maxAgeDays: 1,
    maxSizeBytes: 100 * 1024 * 1024,
    cleanupJob: 'hourly / on export complete',
    visibility: 'private',
    compression: 'none',
    regenerable: true,
  },
  {
    id: 'cache',
    retention: '24 hours',
    maxAgeDays: 1,
    maxSizeBytes: 50 * 1024 * 1024,
    cleanupJob: 'hourly',
    visibility: 'private',
    compression: 'none',
    regenerable: true,
  },
  {
    id: 'avatars',
    retention: 'keep (user profile)',
    maxAgeDays: 3650,
    maxSizeBytes: 20 * 1024 * 1024,
    cleanupJob: 'none (manual)',
    visibility: 'public',
    compression: 'webp-preferred',
    regenerable: false,
  },
  {
    id: 'brand-assets',
    retention: 'keep (brand kit)',
    maxAgeDays: 3650,
    maxSizeBytes: 50 * 1024 * 1024,
    cleanupJob: 'none (manual)',
    visibility: 'private',
    compression: 'none',
    regenerable: false,
  },
] as const

export type RetentionRule = {
  id: string
  description: string
  /** Match path fragments (case-insensitive). Empty = whole bucket. */
  pathIncludes: string[]
  buckets: readonly string[]
  maxAgeDays: number
  favouriteExempt: boolean
}

/** STEP 6 — Automatic lifecycle policies. */
export const RETENTION_RULES: readonly RetentionRule[] = [
  {
    id: 'temporary-uploads',
    description: 'Temporary uploads / processing folders',
    pathIncludes: ['/temp/', '/tmp/', 'temporary', 'intermediate'],
    buckets: SAFE_DELETE_BUCKETS,
    maxAgeDays: 1, // 24 hours
    favouriteExempt: false,
  },
  {
    id: 'cache',
    description: 'Cache assets',
    pathIncludes: ['/cache/', 'cache'],
    buckets: ['cache', 'temporary', 'project-assets', 'media'],
    maxAgeDays: 1, // 24 hours
    favouriteExempt: false,
  },
  {
    id: 'storyboard-images',
    description: 'Storyboard images / frames',
    pathIncludes: ['storyboard', 'frame'],
    buckets: ['storyboards', 'project-assets', 'generated-images'],
    maxAgeDays: 7,
    favouriteExempt: true,
  },
  {
    id: 'preview-images',
    description: 'Preview images / old thumbnails',
    pathIncludes: ['preview', 'thumb'],
    buckets: ['preview', 'thumbnails', 'reels', 'project-assets', 'media'],
    maxAgeDays: 7,
    favouriteExempt: true,
  },
  {
    id: 'rendered-videos',
    description: 'Rendered videos / MP4 / MOV exports',
    pathIncludes: ['final-reel', '/export/', 'exports/', '.mp4', '.mov'],
    buckets: ['reels', 'exports', 'renders', 'project-assets'],
    maxAgeDays: 14,
    favouriteExempt: true,
  },
  {
    id: 'intermediate-after-export',
    description: 'Intermediate assets — delete immediately after export',
    pathIncludes: ['intermediate', '/tmp/', 'partial'],
    buckets: SAFE_DELETE_BUCKETS,
    maxAgeDays: 0,
    favouriteExempt: false,
  },
  {
    id: 'unused-uploads',
    description: 'Unused uploads',
    pathIncludes: ['/uploads/', 'upload'],
    buckets: ['media', 'uploads', 'project-assets'],
    maxAgeDays: 7,
    favouriteExempt: false,
  },
] as const

/** Free-plan storage ceiling (bytes). */
export const FREE_PLAN_STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024

export const STORAGE_WARN_RATIO = 0.8
export const STORAGE_AUTO_CLEAN_RATIO = 0.9
export const STORAGE_PAUSE_RENDERS_RATIO = 0.95

export function isSafeDeleteBucket(name: string): boolean {
  return (SAFE_DELETE_BUCKETS as readonly string[]).includes(name)
}

export function isProtectedBucket(name: string): boolean {
  return (PROTECTED_BUCKETS as readonly string[]).includes(name)
}
