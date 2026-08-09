import 'server-only'

import { spawn } from 'node:child_process'
import path from 'node:path'

import { fetchWithTimeout, sleep } from '@/lib/ai/providers/shared'
import {
  formatOllamaError,
  OLLAMA_DEFAULT_HOST,
  OLLAMA_PULL_MODELS,
  selectBestInstalledOllamaModel,
  selectPreferredPullModel,
  type OllamaDownloadProgress,
  type OllamaHealthSnapshot,
  type OllamaStructuredError,
} from '@/lib/ai/ollama'
import {
  findOfficialOllamaLauncher,
  hasDesktopLaunchBeenAttempted,
  markDesktopLaunchAttempted,
} from '@/lib/ai/ollama-executable'

const API_TIMEOUT_MS = 3_000
const SERVER_WAIT_TIMEOUT_MS = 60_000
const SERVER_POLL_MS = 500
const MODEL_WAIT_POLL_MS = 500

type OllamaClientState = {
  host: string
  launcher: string | null
  installedModels: string[]
  preferredModel: string | null
  selectedModel: string | null
  downloading: boolean
  ready: boolean
  download: OllamaDownloadProgress | null
  downloadError: string | null
}

let clientState: OllamaClientState | null = null
let serverBootstrapPromise: Promise<OllamaClientState> | null = null
let backgroundPullPromise: Promise<void> | null = null

function logTs(): string {
  return new Date().toISOString()
}

function logOllama(event: string, details?: Record<string, unknown>): void {
  console.info('[ollama]', logTs(), event, details ?? {})
}

function logOllamaError(event: string, details?: Record<string, unknown>): void {
  console.error('[ollama]', logTs(), event, details ?? {})
}

export function resolveOllamaHost(): string {
  return (process.env.OLLAMA_HOST?.trim() || OLLAMA_DEFAULT_HOST).replace(/\/$/, '')
}

function apiUrl(route: string, host = resolveOllamaHost()): string {
  const base = host.replace(/\/$/, '')
  const suffix = route.startsWith('/') ? route : `/${route}`
  return `${base}${suffix}`
}

function configuredModelRequest(): string | undefined {
  return process.env.OLLAMA_MODEL?.trim() || process.env.V7_OLLAMA_MODEL?.trim() || undefined
}

function notInstalledError(host: string, detail?: string): Error {
  const payload: OllamaStructuredError = {
    error: 'OLLAMA_NOT_INSTALLED',
    host,
    detail,
    installUrl: 'https://ollama.com/download',
  }
  return new Error(formatOllamaError(payload))
}

function snapshotFromState(state: OllamaClientState): OllamaHealthSnapshot {
  return {
    connected: true,
    server: true,
    installedModels: state.installedModels,
    selectedModel: state.selectedModel,
    preferredModel: state.preferredModel,
    ready: state.ready,
    downloading: state.downloading,
    downloadPercentage: state.download?.downloadPercentage,
    downloadSpeed: state.download?.downloadSpeed,
    remainingBytes: state.download?.remainingBytes,
    etaSeconds: state.download?.etaSeconds,
    executable: state.launcher,
    serverPid: null,
    message: state.downloadError ?? undefined,
  }
}

export async function isOllamaServerReachable(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(apiUrl('/api/tags'), { method: 'GET' }, API_TIMEOUT_MS)
    return res.ok
  } catch {
    return false
  }
}

export async function listInstalledOllamaModels(): Promise<string[]> {
  const res = await fetchWithTimeout(apiUrl('/api/tags'), { method: 'GET' }, API_TIMEOUT_MS)
  if (!res.ok) {
    throw new Error(`Failed to list Ollama models: HTTP ${res.status}`)
  }
  const json = (await res.json()) as { models?: Array<{ name?: string }> }
  return (json.models ?? [])
    .map((entry) => entry.name?.trim())
    .filter((name): name is string => Boolean(name))
}

async function waitForOllamaHttp(timeoutMs = SERVER_WAIT_TIMEOUT_MS): Promise<void> {
  const deadline = Date.now() + timeoutMs
  const host = resolveOllamaHost()

  while (Date.now() < deadline) {
    if (await isOllamaServerReachable()) {
      logOllama('HTTP connected', { host, endpoint: apiUrl('/api/tags') })
      return
    }
    await sleep(SERVER_POLL_MS)
  }

  throw notInstalledError(host, `Timed out waiting for ${apiUrl('/api/tags')}`)
}

function launchOllamaDesktopOnce(launcher: string): void {
  if (hasDesktopLaunchBeenAttempted()) return
  markDesktopLaunchAttempted()
  logOllama('Launching official Ollama (once)', { launcher, host: resolveOllamaHost() })
  const child = spawn(launcher, ['serve'], {
    cwd: path.dirname(launcher),
    stdio: 'ignore',
    windowsHide: true,
    detached: true,
    env: process.env,
  })
  child.unref()
}

async function ensureOllamaHttpConnected(): Promise<{ launcher: string | null }> {
  const host = resolveOllamaHost()

  if (await isOllamaServerReachable()) {
    logOllama('HTTP connected', { host })
    return { launcher: clientState?.launcher ?? null }
  }

  const discovery = findOfficialOllamaLauncher()
  logOllama('Executable candidates', {
    host,
    candidates: discovery.candidates,
    selected: discovery.launcher,
  })

  if (!discovery.launcher) {
    throw notInstalledError(host, 'No official Ollama installation found on this machine')
  }

  if (!hasDesktopLaunchBeenAttempted()) {
    launchOllamaDesktopOnce(discovery.launcher)
  }

  await waitForOllamaHttp()
  return { launcher: discovery.launcher }
}

function resolveModelSelection(installedModels: string[]): {
  preferredModel: string
  selectedModel: string | null
  ready: boolean
} {
  const requested = configuredModelRequest()
  const preferredModel = selectPreferredPullModel(requested)
  const selectedModel = selectBestInstalledOllamaModel(installedModels, { requested })

  if (selectedModel) {
    return { preferredModel, selectedModel, ready: true }
  }

  return { preferredModel, selectedModel: null, ready: false }
}

function updateClientState(partial: Partial<OllamaClientState>): OllamaClientState {
  const host = resolveOllamaHost()
  clientState = {
    host,
    launcher: partial.launcher ?? clientState?.launcher ?? null,
    installedModels: partial.installedModels ?? clientState?.installedModels ?? [],
    preferredModel: partial.preferredModel ?? clientState?.preferredModel ?? null,
    selectedModel:
      partial.selectedModel !== undefined ? partial.selectedModel : (clientState?.selectedModel ?? null),
    downloading: partial.downloading ?? clientState?.downloading ?? false,
    ready: partial.ready ?? clientState?.ready ?? false,
    download: partial.download !== undefined ? partial.download : (clientState?.download ?? null),
    downloadError:
      partial.downloadError !== undefined ? partial.downloadError : (clientState?.downloadError ?? null),
  }
  return clientState
}

async function refreshModelState(launcher: string | null): Promise<OllamaClientState> {
  const installedModels = await listInstalledOllamaModels()
  logOllama('Installed models', { installedModels })

  const { preferredModel, selectedModel, ready } = resolveModelSelection(installedModels)

  if (selectedModel) {
    logOllama('Selected model', { selectedModel, preferredModel })
  } else {
    logOllama('MODEL_MISSING', { preferredModel, installedModels })
  }

  return updateClientState({
    launcher,
    installedModels,
    preferredModel,
    selectedModel,
    ready,
    downloading: ready ? false : clientState?.downloading ?? false,
    download: ready ? null : clientState?.download ?? null,
  })
}

async function runBackgroundPull(model: string): Promise<void> {
  const startedAt = Date.now()
  let lastCompleted = 0
  let lastProgressAt = startedAt

  logOllama('Background download started', { model })

  updateClientState({
    downloading: true,
    ready: false,
    selectedModel: null,
    download: {
      model,
      downloading: true,
      downloadPercentage: 0,
      status: 'starting',
    },
    downloadError: null,
  })

  try {
    const res = await fetch(apiUrl('/api/pull'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: true }),
    })

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => '')
      throw new Error(body.slice(0, 300) || `HTTP ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        try {
          const json = JSON.parse(trimmed) as {
            status?: string
            total?: number
            completed?: number
          }
          const total = json.total ?? 0
          const completed = json.completed ?? 0
          const now = Date.now()
          const elapsedSec = Math.max((now - lastProgressAt) / 1000, 0.001)
          const delta = Math.max(completed - lastCompleted, 0)
          const downloadSpeed = delta > 0 ? Math.round(delta / elapsedSec) : clientState?.download?.downloadSpeed
          const remainingBytes = total > completed ? total - completed : 0
          const downloadPercentage = total > 0 ? Math.round((completed / total) * 100) : undefined
          const etaSeconds =
            downloadSpeed && downloadSpeed > 0 && remainingBytes > 0
              ? Math.round(remainingBytes / downloadSpeed)
              : undefined

          if (completed > lastCompleted) {
            lastCompleted = completed
            lastProgressAt = now
          }

          updateClientState({
            download: {
              model,
              downloading: true,
              downloadPercentage,
              downloadSpeed,
              remainingBytes: remainingBytes || undefined,
              etaSeconds,
              status: json.status,
            },
          })

          if (downloadPercentage != null) {
            logOllama('Download %', {
              model,
              downloadPercentage,
              downloadSpeed,
              remainingBytes: remainingBytes || undefined,
              etaSeconds,
              status: json.status,
            })
          }
        } catch {
          logOllama('Download %', { model, line: trimmed.slice(0, 120) })
        }
      }
    }

    const installedModels = await listInstalledOllamaModels()
    const selectedModel =
      selectBestInstalledOllamaModel(installedModels, { requested: model }) ??
      selectBestInstalledOllamaModel(installedModels)

    if (!selectedModel) {
      throw new Error(`Model ${model} did not appear in /api/tags after pull`)
    }

    updateClientState({
      installedModels,
      preferredModel: model,
      selectedModel,
      ready: true,
      downloading: false,
      download: null,
      downloadError: null,
    })

    logOllama('Background download complete', { model, selectedModel })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    updateClientState({
      downloading: false,
      ready: false,
      download: null,
      downloadError: message,
    })
    logOllamaError('Background download failed', { model, message })
    throw err
  }
}

function startBackgroundDownloadIfNeeded(state: OllamaClientState): void {
  if (state.ready || state.downloading || backgroundPullPromise) return

  const model = state.preferredModel ?? selectPreferredPullModel(configuredModelRequest())
  backgroundPullPromise = runBackgroundPull(model)
    .catch(() => {
      // error already logged and stored in clientState
    })
    .finally(() => {
      backgroundPullPromise = null
    })
}

/** Startup bootstrap — waits only for GET /api/tags, never for model download. */
export async function ensureOllamaReady(options?: { forceRefresh?: boolean }): Promise<OllamaClientState> {
  if (!options?.forceRefresh && clientState?.ready) return clientState
  if (serverBootstrapPromise) return serverBootstrapPromise

  serverBootstrapPromise = (async () => {
    logOllama('Bootstrap start', { mode: 'http-client', host: resolveOllamaHost() })
    const { launcher } = await ensureOllamaHttpConnected()
    const state = await refreshModelState(launcher)

    if (!state.ready) {
      startBackgroundDownloadIfNeeded(state)
    }

    return state
  })()

  try {
    return await serverBootstrapPromise
  } finally {
    serverBootstrapPromise = null
  }
}

/** Block until a chat model is available — used by generation, not startup. */
export async function waitForOllamaModelReady(timeoutMs = 30 * 60_000): Promise<string> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    let state = clientState
    if (!state || (!state.ready && !state.downloading)) {
      state = await ensureOllamaReady()
    }

    if (state.selectedModel && state.ready) {
      return state.selectedModel
    }

    if (!state.downloading && !state.ready && !backgroundPullPromise) {
      startBackgroundDownloadIfNeeded(state)
    }

    if (state.downloadError) {
      const failed: OllamaStructuredError = {
        error: 'OLLAMA_MODEL_DOWNLOAD_FAILED',
        attempted: state.preferredModel ?? OLLAMA_PULL_MODELS[0],
        detail: state.downloadError,
      }
      throw new Error(formatOllamaError(failed))
    }

    if (state.downloading) {
      await sleep(MODEL_WAIT_POLL_MS)
      if (clientState?.ready && clientState.selectedModel) {
        return clientState.selectedModel
      }
      continue
    }

    const installedModels = await listInstalledOllamaModels().catch(() => [])
    const selectedModel = selectBestInstalledOllamaModel(installedModels, {
      requested: configuredModelRequest(),
    })
    if (selectedModel) {
      updateClientState({
        installedModels,
        selectedModel,
        ready: true,
        downloading: false,
        download: null,
      })
      return selectedModel
    }

    await sleep(MODEL_WAIT_POLL_MS)
  }

  const payload: OllamaStructuredError = {
    error: 'OLLAMA_MODEL_DOWNLOAD_FAILED',
    attempted: clientState?.preferredModel ?? OLLAMA_PULL_MODELS[0],
    detail: 'Timed out waiting for model download',
  }
  throw new Error(formatOllamaError(payload))
}

export async function getOllamaHealthSnapshot(): Promise<OllamaHealthSnapshot> {
  try {
    if (!(await isOllamaServerReachable())) {
      await ensureOllamaReady()
    } else if (!clientState) {
      const launcher = findOfficialOllamaLauncher().launcher
      const state = await refreshModelState(launcher)
      if (!state.ready) {
        startBackgroundDownloadIfNeeded(state)
      }
    } else if (!clientState.ready && !clientState.downloading) {
      startBackgroundDownloadIfNeeded(clientState)
    }

    if (!clientState) {
      return {
        connected: false,
        server: false,
        installedModels: [],
        selectedModel: null,
        ready: false,
        downloading: false,
        executable: findOfficialOllamaLauncher().launcher,
        serverPid: null,
      }
    }

    return snapshotFromState(clientState)
  } catch (err) {
    const connected = await isOllamaServerReachable()
    return {
      connected,
      server: connected,
      installedModels: clientState?.installedModels ?? [],
      selectedModel: clientState?.selectedModel ?? null,
      preferredModel: clientState?.preferredModel ?? null,
      ready: clientState?.ready ?? false,
      downloading: clientState?.downloading ?? false,
      downloadPercentage: clientState?.download?.downloadPercentage,
      downloadSpeed: clientState?.download?.downloadSpeed,
      remainingBytes: clientState?.download?.remainingBytes,
      etaSeconds: clientState?.download?.etaSeconds,
      executable: findOfficialOllamaLauncher().launcher,
      serverPid: null,
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

export function invalidateOllamaReadyCache(): void {
  clientState = null
  backgroundPullPromise = null
}

export function getOllamaClientState(): OllamaClientState | null {
  return clientState
}
