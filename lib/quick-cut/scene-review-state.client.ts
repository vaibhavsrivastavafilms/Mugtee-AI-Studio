'use client'

export type SceneReviewStatus = 'pending' | 'approved' | 'locked'

const APPROVED_KEY = 'mugtee:scene-review-approved:v1'
const LOCKED_KEY = 'mugtee:scene-review-locked:v1'

function readMap(key: string): Record<string, string[]> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {}
  } catch {
    return {}
  }
}

function writeMap(key: string, data: Record<string, string[]>) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(key, JSON.stringify(data))
  } catch {
    /* quota */
  }
}

export function getApprovedSceneIds(projectKey: string): Set<string> {
  return new Set(readMap(APPROVED_KEY)[projectKey] ?? [])
}

export function getLockedSceneIds(projectKey: string): Set<string> {
  return new Set(readMap(LOCKED_KEY)[projectKey] ?? [])
}

export function getSceneReviewStatus(
  projectKey: string,
  sceneId: string
): SceneReviewStatus {
  if (getLockedSceneIds(projectKey).has(sceneId)) return 'locked'
  if (getApprovedSceneIds(projectKey).has(sceneId)) return 'approved'
  return 'pending'
}

export function approveScene(projectKey: string, sceneId: string): void {
  const locked = getLockedSceneIds(projectKey)
  if (locked.has(sceneId)) return
  const all = readMap(APPROVED_KEY)
  const set = new Set(all[projectKey] ?? [])
  set.add(sceneId)
  all[projectKey] = [...set]
  writeMap(APPROVED_KEY, all)
}

export function unapproveScene(projectKey: string, sceneId: string): void {
  const all = readMap(APPROVED_KEY)
  const set = new Set(all[projectKey] ?? [])
  set.delete(sceneId)
  all[projectKey] = [...set]
  writeMap(APPROVED_KEY, all)
}

export function lockScene(projectKey: string, sceneId: string): void {
  approveScene(projectKey, sceneId)
  const all = readMap(LOCKED_KEY)
  const set = new Set(all[projectKey] ?? [])
  set.add(sceneId)
  all[projectKey] = [...set]
  writeMap(LOCKED_KEY, all)
}

export function unlockScene(projectKey: string, sceneId: string): void {
  const all = readMap(LOCKED_KEY)
  const set = new Set(all[projectKey] ?? [])
  set.delete(sceneId)
  all[projectKey] = [...set]
  writeMap(LOCKED_KEY, all)
}

export function isSceneApproved(projectKey: string, sceneId: string): boolean {
  return getSceneReviewStatus(projectKey, sceneId) === 'approved' || getSceneReviewStatus(projectKey, sceneId) === 'locked'
}

export function isSceneLocked(projectKey: string, sceneId: string): boolean {
  return getSceneReviewStatus(projectKey, sceneId) === 'locked'
}

export type SceneApprovalSummary = {
  approved: number
  locked: number
  pending: number
  total: number
  withImages: number
}

export function computeSceneApprovalSummary(
  projectKey: string,
  scenes: { id: string; imageUrl?: string | null }[]
): SceneApprovalSummary {
  const withImages = scenes.filter((s) => s.imageUrl?.trim())
  let approved = 0
  let locked = 0
  for (const scene of withImages) {
    const status = getSceneReviewStatus(projectKey, scene.id)
    if (status === 'locked') locked++
    else if (status === 'approved') approved++
  }
  const counted = approved + locked
  return {
    approved: counted,
    locked,
    pending: Math.max(0, withImages.length - counted),
    total: scenes.length,
    withImages: withImages.length,
  }
}
