export type CreatorQueueStatus = 'idea' | 'ready' | 'in_progress' | 'exported'

export type CreatorQueueItem = {
  id: string
  title: string
  prompt: string
  niche?: string
  status: CreatorQueueStatus
  createdAt: string
  updatedAt: string
}

const STORAGE_PREFIX = 'mugtee:creator:queue:v1'

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`
}

function readQueue(userId: string): CreatorQueueItem[] {
  if (typeof window === 'undefined' || !userId) return []
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as CreatorQueueItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(userId: string, items: CreatorQueueItem[]): void {
  if (typeof window === 'undefined' || !userId) return
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

export function getCreatorQueue(userId: string): CreatorQueueItem[] {
  return readQueue(userId).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export function addQueueIdea(
  userId: string,
  input: { title: string; prompt: string; niche?: string }
): CreatorQueueItem {
  const now = new Date().toISOString()
  const item: CreatorQueueItem = {
    id: crypto.randomUUID(),
    title: input.title.trim() || input.prompt.trim().slice(0, 60),
    prompt: input.prompt.trim(),
    niche: input.niche,
    status: 'idea',
    createdAt: now,
    updatedAt: now,
  }
  const items = [item, ...readQueue(userId)]
  writeQueue(userId, items)
  return item
}

export function updateQueueItemStatus(
  userId: string,
  id: string,
  status: CreatorQueueStatus
): CreatorQueueItem | null {
  const items = readQueue(userId)
  const idx = items.findIndex((i) => i.id === id)
  if (idx === -1) return null
  const updated: CreatorQueueItem = {
    ...items[idx],
    status,
    updatedAt: new Date().toISOString(),
  }
  items[idx] = updated
  writeQueue(userId, items)
  return updated
}

export function removeQueueItem(userId: string, id: string): void {
  writeQueue(
    userId,
    readQueue(userId).filter((i) => i.id !== id)
  )
}

export const QUEUE_STATUS_LABEL: Record<CreatorQueueStatus, string> = {
  idea: 'Idea Saved',
  ready: 'Ready',
  in_progress: 'In Progress',
  exported: 'Exported',
}

export const QUEUE_STATUS_ORDER: CreatorQueueStatus[] = [
  'idea',
  'ready',
  'in_progress',
  'exported',
]

export function nextQueueStatus(current: CreatorQueueStatus): CreatorQueueStatus {
  const idx = QUEUE_STATUS_ORDER.indexOf(current)
  if (idx === -1 || idx >= QUEUE_STATUS_ORDER.length - 1) return current
  return QUEUE_STATUS_ORDER[idx + 1]
}
