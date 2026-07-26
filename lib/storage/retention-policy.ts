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
  'thumbnails',
  'generated-images',
] as const

export type SafeDeleteBucket = (typeof SAFE_DELETE_BUCKETS)[number]

/** Future bucket architecture (Phase 6). */
export const TARGET_BUCKET_ARCHITECTURE = [
  'avatars',
  'brand-assets',
  'uploads',
  'projects',
  'renders',
  'exports',
  'storyboards',
  'generated-images',
  'temporary',
  'cache',
  'voiceovers',
  'music',
  'thumbnails',
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

export const RETENTION_RULES: readonly RetentionRule[] = [
  {
    id: 'temporary-renders',
    description: 'Temporary renders',
    pathIncludes: ['/temp/', '/tmp/', 'temporary', 'intermediate'],
    buckets: SAFE_DELETE_BUCKETS,
    maxAgeDays: 7,
    favouriteExempt: false,
  },
  {
    id: 'preview-images',
    description: 'Preview images',
    pathIncludes: ['preview', 'thumb'],
    buckets: SAFE_DELETE_BUCKETS,
    maxAgeDays: 14,
    favouriteExempt: true,
  },
  {
    id: 'completed-exports',
    description: 'Completed exports / final reels',
    pathIncludes: ['final-reel', '/export/', 'exports/'],
    buckets: ['reels', 'exports', 'project-assets'],
    maxAgeDays: 30,
    favouriteExempt: true,
  },
  {
    id: 'unused-uploads',
    description: 'Unused uploads',
    pathIncludes: ['/uploads/', 'upload'],
    buckets: ['media', 'uploads', 'project-assets'],
    maxAgeDays: 1,
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
