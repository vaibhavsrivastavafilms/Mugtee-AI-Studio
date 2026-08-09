/** Shared Ollama model priority and matching — safe for import anywhere. */

export const OLLAMA_DEFAULT_HOST = 'http://127.0.0.1:11434'

/** Preferred chat models when auto-selecting from installed tags. */
export const OLLAMA_PREFERRED_MODELS = [
  'llama3.2:3b',
  'llama3.2',
  'llama3',
  'mistral',
  'phi4',
  'qwen2.5',
  'qwen2.5:7b',
  'gemma3',
] as const

/** Pull order when no suitable model is installed locally. */
export const OLLAMA_PULL_MODELS = [
  'llama3.2:3b',
  'llama3.2',
  'llama3',
  'phi4',
  'qwen2.5',
  'mistral',
] as const

export type OllamaStructuredError =
  | {
      error: 'OLLAMA_MODEL_NOT_INSTALLED'
      requested: string
      installed: string[]
      selected?: string
    }
  | {
      error: 'OLLAMA_MODEL_DOWNLOAD_FAILED'
      attempted: string
      detail?: string
    }
  | {
      error: 'OLLAMA_EXECUTABLE_NOT_FOUND'
      path: string
    }
  | {
      error: 'OLLAMA_NOT_INSTALLED'
      host: string
      detail?: string
      installUrl?: string
    }
  | {
      error: 'OLLAMA_SERVER_START_FAILED'
      attemptedExecutable?: string
      detail?: string
    }

export type OllamaDownloadProgress = {
  model: string
  downloading: boolean
  downloadPercentage?: number
  downloadSpeed?: number
  remainingBytes?: number
  etaSeconds?: number
  status?: string
}

export type OllamaHealthSnapshot = {
  connected: boolean
  server: boolean
  installedModels: string[]
  selectedModel: string | null
  preferredModel?: string | null
  ready: boolean
  downloading: boolean
  downloadPercentage?: number
  downloadSpeed?: number
  remainingBytes?: number
  etaSeconds?: number
  executable: string | null
  serverPid: number | null
  message?: string
}

export function formatOllamaError(payload: OllamaStructuredError): string {
  return JSON.stringify(payload)
}

export function selectPreferredPullModel(requested?: string): string {
  if (requested?.trim()) return requested.trim()
  return OLLAMA_PULL_MODELS[0]
}

export function parseOllamaModelNotFound(body: string): string | null {
  const trimmed = body.trim()
  const quoted = trimmed.match(/model ['"]([^'"]+)['"] not found/i)
  if (quoted?.[1]) return quoted[1]
  try {
    const json = JSON.parse(trimmed) as { error?: string }
    const fromJson = json.error?.match(/model ['"]([^'"]+)['"] not found/i)
    if (fromJson?.[1]) return fromJson[1]
  } catch {
    // ignore
  }
  return null
}

export function isEmbeddingModel(name: string): boolean {
  const lower = name.toLowerCase()
  return lower.includes('embed') || lower.includes('nomic-embed') || lower.includes('mxbai-embed')
}

/** Match Ollama tag names (e.g. llama3.2:latest) to a preferred slug. */
export function matchesOllamaModel(installedName: string, candidate: string): boolean {
  if (installedName === candidate) return true
  if (installedName.startsWith(`${candidate}:`)) return true
  if (installedName.startsWith(`${candidate}-`)) return true

  const installedBase = installedName.split(':')[0]
  const candidateBase = candidate.split(':')[0]
  if (installedBase !== candidateBase) return false

  if (!candidate.includes(':')) return true
  return installedName.startsWith(candidate)
}

export function selectBestInstalledOllamaModel(
  installed: string[],
  options?: { requested?: string; preferred?: readonly string[] }
): string | null {
  const preferred = options?.preferred ?? OLLAMA_PREFERRED_MODELS
  const requested = options?.requested?.trim()

  if (requested) {
    const requestedHit = installed.find((name) => matchesOllamaModel(name, requested))
    if (requestedHit) return requestedHit
  }

  for (const candidate of preferred) {
    const hit = installed.find((name) => matchesOllamaModel(name, candidate))
    if (hit) return hit
  }

  const chatModels = installed.filter((name) => !isEmbeddingModel(name))
  return chatModels[0] ?? installed[0] ?? null
}
