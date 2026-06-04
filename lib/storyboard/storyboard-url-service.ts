/**
 * Storyboard URL helpers — shared types only in this barrel (safe for any import).
 * Server: `@/lib/storyboard/storyboard-url-service.server`
 * Client: `@/lib/storyboard/storyboard-url-service.client`
 * Backfill: `@/lib/storyboard/backfill-storyboard-assets.server`
 */
export type { StoryboardAsset } from '@/lib/storyboard/storyboard-asset'
export {
  extractStoragePathFromUrl,
  isDurableStoryboardPath,
  STORYBOARD_STORAGE_BUCKET,
} from '@/lib/storyboard/storyboard-asset'
