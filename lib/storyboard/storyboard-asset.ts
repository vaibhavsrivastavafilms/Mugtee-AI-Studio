/** Durable storyboard reference — persist path; refresh imageUrl at read/export time. */
export type StoryboardAsset = {
  assetPath: string
  imageUrl?: string
}

export const STORYBOARD_STORAGE_BUCKET = 'project-assets'

const STORAGE_OBJECT_PATH =
  /\/storage\/v1\/object\/(?:public|sign|authenticated)\/project-assets\/(.+?)(?:\?|$)/i

/** Extract bucket object path from a Supabase storage URL, if present. */
export function extractStoragePathFromUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  const trimmed = url.trim()
  const match = STORAGE_OBJECT_PATH.exec(trimmed)
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1])
    } catch {
      return match[1]
    }
  }
  return null
}

export function isDurableStoryboardPath(path: string | null | undefined): boolean {
  if (!path?.trim()) return false
  const p = path.trim()
  if (p.startsWith('data:') || p.startsWith('blob:')) return false
  return !p.includes('..')
}
