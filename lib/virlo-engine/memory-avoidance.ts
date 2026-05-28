import type { StoryStructureId, VirloMemorySnapshot } from '@/lib/virlo-engine/types'

export const VIRLO_MEMORY_KEY = 'mugtee:virlo:recent:v1'
const MAX_RECENT = 12

export type VirloMemoryRecord = {
  structureIds: StoryStructureId[]
  hookPatterns: string[]
  openingMoves: string[]
  updatedAt: number
}

const SERVER_MEMORY = new Map<string, VirloMemoryRecord>()

function emptyRecord(): VirloMemoryRecord {
  return { structureIds: [], hookPatterns: [], openingMoves: [], updatedAt: 0 }
}

function trimRecord(record: VirloMemoryRecord): VirloMemoryRecord {
  return {
    structureIds: record.structureIds.slice(-MAX_RECENT),
    hookPatterns: record.hookPatterns.slice(-MAX_RECENT),
    openingMoves: record.openingMoves.slice(-MAX_RECENT),
    updatedAt: record.updatedAt,
  }
}

function readBrowserMemory(): VirloMemoryRecord {
  if (typeof window === 'undefined') return emptyRecord()
  try {
    const raw = window.localStorage.getItem(VIRLO_MEMORY_KEY)
    if (!raw) return emptyRecord()
    const parsed = JSON.parse(raw) as Partial<VirloMemoryRecord>
    return trimRecord({
      structureIds: Array.isArray(parsed.structureIds)
        ? parsed.structureIds.filter(Boolean) as StoryStructureId[]
        : [],
      hookPatterns: Array.isArray(parsed.hookPatterns)
        ? parsed.hookPatterns.filter((p): p is string => typeof p === 'string')
        : [],
      openingMoves: Array.isArray(parsed.openingMoves)
        ? parsed.openingMoves.filter((p): p is string => typeof p === 'string')
        : [],
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    })
  } catch {
    return emptyRecord()
  }
}

function writeBrowserMemory(record: VirloMemoryRecord): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(VIRLO_MEMORY_KEY, JSON.stringify(trimRecord(record)))
  } catch {
    /* quota or private mode — ignore */
  }
}

function sessionKey(sessionSeed?: string | number): string {
  return sessionSeed != null ? String(sessionSeed) : '__default__'
}

function readServerMemory(sessionSeed?: string | number): VirloMemoryRecord {
  return SERVER_MEMORY.get(sessionKey(sessionSeed)) ?? emptyRecord()
}

function writeServerMemory(record: VirloMemoryRecord, sessionSeed?: string | number): void {
  SERVER_MEMORY.set(sessionKey(sessionSeed), trimRecord(record))
}

export function loadRecentMemory(sessionSeed?: string | number): VirloMemorySnapshot {
  const browser = readBrowserMemory()
  const server = readServerMemory(sessionSeed)
  return {
    structureIds: [...new Set([...browser.structureIds, ...server.structureIds])].slice(
      -MAX_RECENT
    ),
    hookPatterns: [...new Set([...browser.hookPatterns, ...server.hookPatterns])].slice(
      -MAX_RECENT
    ),
    openingMoves: [...new Set([...browser.openingMoves, ...server.openingMoves])].slice(
      -MAX_RECENT
    ),
  }
}

export function recordVirloUsage(
  usage: {
    structureId: StoryStructureId
    hookPattern: string
    openingMove: string
  },
  sessionSeed?: string | number
): void {
  const now = Date.now()
  const browser = readBrowserMemory()
  const server = readServerMemory(sessionSeed)

  const append = (record: VirloMemoryRecord): VirloMemoryRecord =>
    trimRecord({
      structureIds: [...record.structureIds, usage.structureId],
      hookPatterns: [...record.hookPatterns, usage.hookPattern],
      openingMoves: [...record.openingMoves, usage.openingMove],
      updatedAt: now,
    })

  writeBrowserMemory(append(browser))
  writeServerMemory(append(server), sessionSeed)
}

export function shouldAvoidStructure(
  id: StoryStructureId,
  memory: VirloMemorySnapshot
): boolean {
  const recent = memory.structureIds.slice(-4)
  return recent.includes(id) && recent.filter((x) => x === id).length >= 2
}

export function pickFreshHookPattern(
  candidates: string[],
  memory: VirloMemorySnapshot,
  seed: number
): string {
  const fresh = candidates.filter((p) => !memory.hookPatterns.slice(-6).includes(p))
  const pool = fresh.length ? fresh : candidates
  return pool[Math.abs(seed) % pool.length] ?? candidates[0] ?? 'recognition-mirror'
}
