import { execFileSync } from 'node:child_process'
import { accessSync, constants, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const OLLAMA_EXE_NAMES =
  process.platform === 'win32' ? (['ollama.exe', 'ollama'] as const) : (['ollama'] as const)

export type OllamaLauncherAttempt = {
  path: string
  exists: boolean
  source: string
}

export type OllamaLauncherDiscovery = {
  launcher: string | null
  candidates: string[]
  attempts: OllamaLauncherAttempt[]
}

let cachedDiscovery: OllamaLauncherDiscovery | null = null
let desktopLaunchAttempted = false

function moduleDirname(): string {
  if (typeof __filename !== 'undefined') return path.dirname(__filename)
  try {
    return path.dirname(fileURLToPath(import.meta.url))
  } catch {
    return process.cwd()
  }
}

function pathIsFile(candidate: string): boolean {
  try {
    accessSync(candidate, constants.F_OK)
    return true
  } catch {
    return false
  }
}

function whereOllamaOnPath(): string | null {
  if (process.platform === 'win32') {
    try {
      const out = execFileSync('where', ['ollama'], {
        encoding: 'utf8',
        timeout: 5_000,
        windowsHide: true,
      })
      for (const line of out.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (trimmed && pathIsFile(trimmed)) return trimmed
      }
    } catch {
      return null
    }
    return null
  }

  try {
    const out = execFileSync('which', ['ollama'], { encoding: 'utf8', timeout: 5_000 })
    const trimmed = out.trim()
    return trimmed && pathIsFile(trimmed) ? trimmed : null
  } catch {
    return null
  }
}

function windowsLocalAppDataExecutable(): string | null {
  const localAppData = process.env.LOCALAPPDATA?.trim()
  if (!localAppData) return null
  const candidate = path.join(localAppData, 'Programs', 'Ollama', OLLAMA_EXE_NAMES[0])
  return pathIsFile(candidate) ? candidate : null
}

function windowsProgramFilesExecutable(): string | null {
  if (process.platform !== 'win32') return null
  const candidate = path.join('C:\\Program Files', 'Ollama', OLLAMA_EXE_NAMES[0])
  return pathIsFile(candidate) ? candidate : null
}

function findRepoRootFrom(start: string, maxDepth = 12): string | null {
  let current = path.resolve(start)
  for (let depth = 0; depth <= maxDepth; depth++) {
    if (existsSync(path.join(current, 'package.json'))) return current
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return null
}

export function resolveRepositoryRoot(): string | null {
  for (const start of [process.cwd(), moduleDirname()]) {
    const root = findRepoRootFrom(start)
    if (root) return root
  }
  return null
}

/** Official Desktop launcher paths — preferred over repo copies. */
function collectOfficialLauncherPaths(): Array<{ path: string; source: string }> {
  const candidates: Array<{ path: string; source: string }> = []

  const localAppDataExe = windowsLocalAppDataExecutable()
  if (localAppDataExe) {
    candidates.push({ path: localAppDataExe, source: 'LOCALAPPDATA' })
  }

  const programFilesExe = windowsProgramFilesExecutable()
  if (programFilesExe) {
    candidates.push({ path: programFilesExe, source: 'ProgramFiles' })
  }

  const pathHit = whereOllamaOnPath()
  if (pathHit) {
    candidates.push({ path: pathHit, source: 'PATH' })
  }

  const envExecutable = process.env.OLLAMA_EXECUTABLE?.trim()
  if (envExecutable) {
    candidates.push({ path: envExecutable, source: 'OLLAMA_EXECUTABLE' })
  }

  const repoRoot = resolveRepositoryRoot()
  if (repoRoot) {
    for (const name of OLLAMA_EXE_NAMES) {
      candidates.push({ path: path.join(repoRoot, name), source: 'repoRoot' })
    }
  }

  const seen = new Set<string>()
  return candidates.filter((entry) => {
    if (seen.has(entry.path)) return false
    seen.add(entry.path)
    return true
  })
}

export function findOfficialOllamaLauncher(options?: { force?: boolean }): OllamaLauncherDiscovery {
  if (!options?.force && cachedDiscovery) return cachedDiscovery

  const attempts: OllamaLauncherAttempt[] = []
  const candidates: string[] = []
  let launcher: string | null = null

  for (const entry of collectOfficialLauncherPaths()) {
    const exists = pathIsFile(entry.path)
    attempts.push({ path: entry.path, exists, source: entry.source })
    if (!exists) continue
    candidates.push(entry.path)
    if (!launcher) launcher = entry.path
  }

  cachedDiscovery = { launcher, candidates, attempts }
  return cachedDiscovery
}

export function hasDesktopLaunchBeenAttempted(): boolean {
  return desktopLaunchAttempted
}

export function markDesktopLaunchAttempted(): void {
  desktopLaunchAttempted = true
}

export function resetDesktopLaunchAttempted(): void {
  desktopLaunchAttempted = false
  cachedDiscovery = null
}
