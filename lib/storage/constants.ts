export const PROJECT_ASSETS_BUCKET = 'project-assets' as const
/** Signed URLs expire after 1 hour — never persist in DB. */
export const SIGNED_URL_TTL_SEC = 60 * 60

export function storyboardStoragePath(params: {
  userId: string
  projectId: string
  sceneId: string
  suffix?: string
}): string {
  const stamp = params.suffix ?? `${Date.now()}`
  return `${params.userId}/${params.projectId}/storyboard/${params.sceneId}_${stamp}.png`
}

export function projectStoragePrefix(userId: string, projectId: string): string {
  return `${userId}/${projectId}/`
}
