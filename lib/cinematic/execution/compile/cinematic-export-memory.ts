export type ExportMemoryEntry = {
  title: string
  hook: string
  niche: string
  filmRhythm: string
  exportedAt: number
}

const STORAGE_KEY = 'mugtee:export-memory:v1'
const MAX_ENTRIES = 12

export function readExportMemory(): ExportMemoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ExportMemoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeExportMemory(entry: ExportMemoryEntry): void {
  if (typeof window === 'undefined') return
  const prev = readExportMemory().filter((e) => e.title !== entry.title)
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([entry, ...prev].slice(0, MAX_ENTRIES))
    )
  } catch {
    /* ignore */
  }
}

export function cinematicRenderHistory(): ExportMemoryEntry[] {
  return readExportMemory()
}
