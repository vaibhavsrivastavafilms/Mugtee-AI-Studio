// MUGTEE V3.2 — Last-Workspace Memory (Photoshop/Figma recovery).
//
// Tiny localStorage helper that remembers the most recently opened project so the
// next visit can soft-restore the user back into their creative context.
//
// EXTREME LOW CREDIT MODE: zero deps, ~30 lines.

const KEY = 'mugtee:last-workspace:v1'

export type LastWorkspace = {
  project_id: string
  title?: string
  at: number   // timestamp ms
}

export function rememberWorkspace(project_id: string, title?: string) {
  if (typeof window === 'undefined') return
  try {
    const row: LastWorkspace = { project_id, title, at: Date.now() }
    localStorage.setItem(KEY, JSON.stringify(row))
  } catch {}
}

export function readLastWorkspace(): LastWorkspace | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LastWorkspace
    // Drop entries older than 14 days — keeps the recovery slot fresh.
    if (Date.now() - (parsed.at || 0) > 14 * 24 * 60 * 60 * 1000) return null
    return parsed
  } catch { return null }
}

export function clearLastWorkspace() {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(KEY) } catch {}
}
