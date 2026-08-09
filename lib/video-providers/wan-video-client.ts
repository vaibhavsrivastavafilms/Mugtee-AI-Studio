import 'server-only'

import { logError } from '@/lib/workspace/validation'
import {
  buildDiscoveredVideoModel,
  logVideoModelSelection,
  orderVideoModelsWithPreference,
  sortDiscoveredVideoModels,
  type DiscoveredVideoModel,
  type VideoModelSelectionResult,
} from '@/lib/v7/providers/video-model-discovery.server'

export type WanVideoTaskStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN' | string

export type WanVideoCreateResponse = {
  output?: {
    task_id?: string
    task_status?: WanVideoTaskStatus
  }
  request_id?: string
  code?: string
  message?: string
}

export type WanVideoTaskResponse = {
  output?: {
    task_id?: string
    task_status?: WanVideoTaskStatus
    video_url?: string
    code?: string
    message?: string
  }
  request_id?: string
  code?: string
  message?: string
}

export class WanVideoError extends Error {
  readonly code:
    | 'WAN_GENERATION_FAILED'
    | 'WAN_INVALID_RESPONSE'
    | 'WAN_AUTH_FAILED'
    | 'WAN_RATE_LIMITED'
    | 'WAN_TIMEOUT'
    | 'WAN_MODEL_NOT_ENABLED'
    | 'MODEL_NOT_AVAILABLE'
  readonly retryable: boolean
  readonly requestId?: string
  readonly httpStatus?: number
  readonly providerResponse?: unknown
  readonly model?: string
  readonly action?: string

  constructor(params: {
    code: WanVideoError['code']
    message: string
    retryable?: boolean
    requestId?: string
    httpStatus?: number
    providerResponse?: unknown
    model?: string
    action?: string
    cause?: unknown
  }) {
    super(params.message)
    this.name = 'WanVideoError'
    this.code = params.code
    this.retryable =
      params.retryable ??
      (params.code === 'WAN_GENERATION_FAILED' ||
        params.code === 'WAN_RATE_LIMITED' ||
        params.code === 'WAN_TIMEOUT')
    this.requestId = params.requestId
    this.httpStatus = params.httpStatus
    this.providerResponse = params.providerResponse
    this.model = params.model
    this.action = params.action
    if (params.cause) this.cause = params.cause
  }
}

export function isWanCapabilityError(err: unknown): err is WanVideoError {
  return (
    err instanceof WanVideoError &&
    (err.code === 'WAN_MODEL_NOT_ENABLED' || err.code === 'MODEL_NOT_AVAILABLE')
  )
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getWanVideoApiKey(): string | undefined {
  return (
    process.env.WAN_API_KEY?.trim() ||
    process.env.WAN_VIDEO_API_KEY?.trim() ||
    process.env.DASHSCOPE_API_KEY?.trim() ||
    undefined
  )
}

export function hasWanVideoApiKey(): boolean {
  return Boolean(getWanVideoApiKey())
}

export function wanVideoApiBase(): string {
  const override = process.env.WAN_VIDEO_BASE_URL?.trim()
  if (override) return override.replace(/\/$/, '')

  const region = process.env.WAN_VIDEO_REGION?.trim().toLowerCase()
  if (region === 'cn' || region === 'china') {
    return 'https://dashscope.aliyuncs.com/api/v1'
  }
  return 'https://dashscope-intl.aliyuncs.com/api/v1'
}

export function wanVideoModel(): string | undefined {
  return process.env.WAN_VIDEO_MODEL?.trim() || undefined
}

export const WAN_I2V_MODEL_FALLBACKS = [] as const

const CAPABILITY_CACHE_TTL_MS = 5 * 60 * 1000
const catalogCache: { expiresAt: number; models: DiscoveredVideoModel[] } = {
  expiresAt: 0,
  models: [],
}
const unpurchasedCache = new Map<string, number>()

export function isWanModelKnownUnpurchased(model: string): boolean {
  return (unpurchasedCache.get(model) ?? 0) > Date.now()
}

export function resolveWanModelCandidates(): string[] {
  const configured = wanVideoModel()
  const extra =
    process.env.WAN_VIDEO_MODEL_FALLBACKS?.split(',')
      .map((entry) => entry.trim())
      .filter(Boolean) ?? []
  return [...new Set([...(configured ? [configured] : []), ...extra])]
}

function isChatOrNonVideoModel(modelId: string, capabilities: string[]): boolean {
  const normalized = modelId.toLowerCase()
  if (/embed|embedding|rerank|asr|tts|speech|audio|whisper|chat|llm|text/i.test(normalized)) {
    return true
  }
  if (capabilities.includes('T2I') && !capabilities.includes('VG')) return true
  if (capabilities.includes('T2T') && !capabilities.includes('VG')) return true
  return false
}

function isImageToVideoModel(capabilities: string[], requestModalities: string[]): boolean {
  if (!capabilities.includes('VG')) return false
  return requestModalities.some((modality) => /image|frame|first.?frame/i.test(modality))
}

function isUnpurchasedResponse(data: WanVideoCreateResponse, status: number): boolean {
  if (status !== 403 && status !== 400 && status !== 404) return false
  const code = String(data.code ?? '').toLowerCase()
  const message = String(data.message ?? '').toLowerCase()
  return (
    code.includes('unpurchased') ||
    code.includes('modelnotenabled') ||
    code.includes('modelnotfound') ||
    code.includes('invalidmodel') ||
    message.includes('not eligible') ||
    message.includes('access to model denied') ||
    message.includes('model not enabled') ||
    message.includes('model not found') ||
    message.includes('not entitled') ||
    message.includes('invalid model') ||
    message.includes('model is not supported') ||
    message.includes('not support this model')
  )
}

function wanModelNotEnabledError(params: {
  model: string
  requestId?: string
  httpStatus?: number
  providerResponse?: unknown
}): WanVideoError {
  return new WanVideoError({
    code: 'WAN_MODEL_NOT_ENABLED',
    message: 'The connected DashScope account is not eligible for this model.',
    model: params.model,
    action: 'Enable or purchase the WAN model inside Alibaba Model Studio.',
    retryable: false,
    requestId: params.requestId,
    httpStatus: params.httpStatus,
    providerResponse: params.providerResponse,
  })
}

export async function fetchWanAvailableVideoModels(): Promise<DiscoveredVideoModel[]> {
  if (Date.now() < catalogCache.expiresAt) return catalogCache.models

  const key = getWanVideoApiKey()
  if (!key) return []

  const discovered = new Map<string, DiscoveredVideoModel>()
  const base = wanVideoApiBase()

  for (let page = 1; page <= 20; page++) {
    const url = `${base}/models?page_no=${page}&page_size=50`
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(30_000),
    })
    const data = (await res.json().catch(() => ({}))) as {
      output?: {
        models?: Array<{
          model?: string
          capabilities?: string[]
          inference_metadata?: { request_modality?: string[] }
        }>
      }
    }

    if (!res.ok) break

    const pageModels = data.output?.models ?? []
    for (const entry of pageModels) {
      const modelId = entry.model?.trim()
      if (!modelId) continue
      const capabilities = entry.capabilities ?? []
      const requestModalities = entry.inference_metadata?.request_modality ?? []
      if (isChatOrNonVideoModel(modelId, capabilities)) continue
      if (!isImageToVideoModel(capabilities, requestModalities)) continue
      discovered.set(
        modelId,
        buildDiscoveredVideoModel(modelId, { available: true, free: true })
      )
    }

    if (pageModels.length < 50) break
  }

  catalogCache.models = sortDiscoveredVideoModels([...discovered.values()])
  catalogCache.expiresAt = Date.now() + CAPABILITY_CACHE_TTL_MS
  return catalogCache.models
}

export async function fetchWanVideoCatalogModels(): Promise<Set<string>> {
  const models = await fetchWanAvailableVideoModels()
  return new Set(models.map((model) => model.id))
}

export async function availableWanVideoModels(): Promise<{
  models: DiscoveredVideoModel[]
  preferred?: DiscoveredVideoModel
}> {
  const preferredId = wanVideoModel()
  const discovered = await fetchWanAvailableVideoModels()
  const eligible = discovered.filter((model) => !isWanModelKnownUnpurchased(model.id))
  const preferred = preferredId
    ? eligible.find((model) => model.id === preferredId) ?? eligible[0]
    : eligible[0]
  return { models: eligible, preferred }
}

export async function resolveWanVideoModelOrder(params?: {
  preferredModel?: string
}): Promise<{
  models: DiscoveredVideoModel[]
  discoveredModels: string[]
  eligibleModels: string[]
}> {
  const preferred = params?.preferredModel?.trim() || wanVideoModel()
  const discovered = await fetchWanAvailableVideoModels()
  const discoveredModels = discovered.map((model) => model.id)
  const eligible = discovered.filter((model) => !isWanModelKnownUnpurchased(model.id))
  const eligibleModels = eligible.map((model) => model.id)

  if (discovered.length > 0) {
    return {
      models: orderVideoModelsWithPreference(eligible, preferred),
      discoveredModels,
      eligibleModels,
    }
  }

  const envHints = resolveWanModelCandidates().map((id) =>
    buildDiscoveredVideoModel(id, { available: true, free: true })
  )
  if (envHints.length > 0) {
    return {
      models: orderVideoModelsWithPreference(envHints, preferred),
      discoveredModels: envHints.map((model) => model.id),
      eligibleModels: envHints.map((model) => model.id),
    }
  }

  return {
    models: [],
    discoveredModels: [],
    eligibleModels: [],
  }
}

export async function checkWanModelCatalogAvailability(model: string): Promise<boolean> {
  const catalog = await fetchWanVideoCatalogModels()
  return catalog.has(model)
}

export async function resolveEligibleWanModel(params: {
  preferredModel?: string
}): Promise<{ model: string; catalogChecked: boolean }> {
  const preferred = params.preferredModel?.trim() || wanVideoModel()
  const order = await resolveWanVideoModelOrder({ preferredModel: preferred })
  const catalogChecked = order.discoveredModels.length > 0 && (await fetchWanAvailableVideoModels()).length > 0

  if (order.models.length === 0) {
    throw new WanVideoError({
      code: 'MODEL_NOT_AVAILABLE',
      message: 'WAN_MODEL_NOT_FOUND — no image-to-video models discovered from DashScope.',
      model: preferred,
      action: 'Enable an I2V model in Alibaba Model Studio.',
      retryable: false,
    })
  }

  return { model: order.models[0].id, catalogChecked }
}

function wanHeaders(apiKeyOverride?: string): HeadersInit {
  const key = apiKeyOverride?.trim() || getWanVideoApiKey()
  if (!key) {
    throw new WanVideoError({
      code: 'WAN_AUTH_FAILED',
      message: 'WAN_API_KEY is not configured',
      retryable: false,
    })
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
    'X-DashScope-Async': 'enable',
  }
}

function normalizeDuration(durationSec: number): number {
  const rounded = Math.max(3, Math.min(10, Math.round(durationSec)))
  if (rounded <= 5) return 5
  return 10
}

function resolveResolution(width: number, height: number, model?: string): string {
  const forced = process.env.WAN_VIDEO_RESOLUTION?.trim()
  if (forced) return forced

  if (model?.startsWith('wan2.7')) {
    if (width >= 1080 || height >= 1920) return '1080P'
    return '720P'
  }

  if (width === 1080 && height === 1920) return '1080*1920'
  if (height > width) return '720*1280'
  if (width >= 1920) return '1920*1080'
  return '720*1280'
}

function buildCreatePayload(input: {
  model: string
  prompt: string
  negativePrompt?: string
  imageUrl: string
  durationSec: number
  width: number
  height: number
  cameraMovement?: string
  narration?: string
  dialogue?: string
  continuityId?: string
}) {
  const model = input.model
  const duration = normalizeDuration(input.durationSec)
  const resolution = resolveResolution(input.width, input.height, model)

  const promptParts = [
    input.prompt,
    input.cameraMovement ? `Camera movement: ${input.cameraMovement}` : null,
    input.narration ? `Narration context: ${input.narration}` : null,
    input.dialogue ? `Dialogue context: ${input.dialogue}` : null,
    input.continuityId ? `Continuity ID: ${input.continuityId}` : null,
  ].filter(Boolean)

  const prompt = promptParts.join('\n').slice(0, 5000)

  if (model.startsWith('wan2.7')) {
    return {
      model,
      input: {
        prompt,
        negative_prompt: input.negativePrompt?.slice(0, 500) || undefined,
        media: [{ type: 'first_frame', url: input.imageUrl }],
      },
      parameters: {
        resolution,
        duration,
        prompt_extend: true,
        watermark: false,
      },
    }
  }

  return {
    model,
    input: {
      prompt,
      negative_prompt: input.negativePrompt?.slice(0, 500) || undefined,
      img_url: input.imageUrl,
    },
    parameters: {
      resolution,
      duration,
      prompt_extend: true,
      watermark: false,
    },
  }
}

export async function createWanVideoTask(
  input: {
  model: string
  prompt: string
  negativePrompt?: string
  imageUrl: string
  durationSec: number
  width: number
  height: number
  cameraMovement?: string
  narration?: string
  dialogue?: string
  continuityId?: string
  apiKey?: string
}
): Promise<{ taskId: string; requestId?: string; providerResponse: WanVideoCreateResponse; model: string }> {
  const url = `${wanVideoApiBase()}/services/aigc/video-generation/video-synthesis`
  const body = buildCreatePayload(input)

  const res = await fetch(url, {
    method: 'POST',
    headers: wanHeaders(input.apiKey),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  })

  const data = (await res.json().catch(() => ({}))) as WanVideoCreateResponse
  const requestId = data.request_id

  if (!res.ok) {
    if (isUnpurchasedResponse(data, res.status)) {
      unpurchasedCache.set(input.model, Date.now() + CAPABILITY_CACHE_TTL_MS)
      throw wanModelNotEnabledError({
        model: input.model,
        requestId,
        httpStatus: res.status,
        providerResponse: data,
      })
    }

    const message = data.message ?? data.code ?? `WAN create task failed (${res.status})`
    const code =
      res.status === 401
        ? 'WAN_AUTH_FAILED'
        : res.status === 429
          ? 'WAN_RATE_LIMITED'
          : 'WAN_GENERATION_FAILED'
    throw new WanVideoError({
      code,
      message,
      model: input.model,
      retryable: res.status === 429 || res.status >= 500,
      requestId,
      httpStatus: res.status,
      providerResponse: data,
    })
  }

  const taskId = data.output?.task_id?.trim()
  if (!taskId) {
    throw new WanVideoError({
      code: 'WAN_INVALID_RESPONSE',
      message: 'WAN API did not return task_id',
      model: input.model,
      retryable: false,
      requestId,
      providerResponse: data,
    })
  }

  return { taskId, requestId, providerResponse: data, model: input.model }
}

export async function retrieveWanVideoTask(
  taskId: string,
  apiKey?: string
): Promise<WanVideoTaskResponse> {
  const url = `${wanVideoApiBase()}/tasks/${encodeURIComponent(taskId)}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey?.trim() || getWanVideoApiKey()}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(60_000),
  })

  const data = (await res.json().catch(() => ({}))) as WanVideoTaskResponse
  if (!res.ok) {
    throw new WanVideoError({
      code: 'WAN_GENERATION_FAILED',
      message: data.message ?? data.code ?? `WAN task lookup failed (${res.status})`,
      retryable: res.status >= 500,
      requestId: data.request_id,
      httpStatus: res.status,
      providerResponse: data,
    })
  }
  return data
}

export async function waitForWanVideoOutput(
  taskId: string,
  options?: { maxAttempts?: number; onProgress?: (label: string) => void; apiKey?: string }
): Promise<{ videoUrl: string; requestId?: string; providerResponse: WanVideoTaskResponse }> {
  const maxAttempts = options?.maxAttempts ?? 120

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await delay(attempt === 0 ? 3000 : 5000)

    let task: WanVideoTaskResponse
    try {
      task = await retrieveWanVideoTask(taskId, options?.apiKey)
    } catch (err) {
      logError('wan.poll', err)
      options?.onProgress?.('WAN still processing…')
      continue
    }

    const status = String(task.output?.task_status ?? '').toUpperCase()
    const videoUrl = task.output?.video_url?.trim()

    if (status === 'SUCCEEDED' || status === 'SUCCESS' || status === 'COMPLETED') {
      if (!videoUrl) {
        throw new WanVideoError({
          code: 'WAN_INVALID_RESPONSE',
          message: 'WAN task succeeded but returned no video URL',
          retryable: false,
          requestId: task.request_id,
          providerResponse: task,
        })
      }
      return { videoUrl, requestId: task.request_id, providerResponse: task }
    }

    if (status === 'FAILED' || status === 'CANCELED' || status === 'UNKNOWN') {
      throw new WanVideoError({
        code: 'WAN_GENERATION_FAILED',
        message: task.output?.message ?? task.message ?? `WAN task ${status.toLowerCase()}`,
        retryable: false,
        requestId: task.request_id,
        providerResponse: task,
      })
    }

    options?.onProgress?.(
      status === 'RUNNING' || status === 'PROCESSING' ? 'WAN generating scene clip…' : 'Waiting for WAN…'
    )
  }

  throw new WanVideoError({
    code: 'WAN_TIMEOUT',
    message: 'WAN video generation timed out',
    retryable: true,
  })
}

export async function generateWanSceneVideo(input: {
  prompt: string
  negativePrompt?: string
  imageUrl: string
  durationSec: number
  width: number
  height: number
  cameraMovement?: string
  narration?: string
  dialogue?: string
  continuityId?: string
  productionId: string
  sceneNumber: number
  apiKey?: string
}): Promise<{
  videoUrl: string
  model: string
  requestId?: string
  taskId: string
  generationTimeMs: number
  providerResponse: unknown
  modelSelection: VideoModelSelectionResult
}> {
  const started = Date.now()
  const preferredModel = wanVideoModel()
  const order = await resolveWanVideoModelOrder({ preferredModel: preferredModel })
  const catalogChecked = (await fetchWanAvailableVideoModels()).length > 0
  const skipped: Array<{ model: string; reason: string }> = []

  console.info('[wan-video] capability-check', {
    productionId: input.productionId,
    sceneNumber: input.sceneNumber,
    provider: 'wan',
    preferredModel: preferredModel ?? null,
    catalogChecked,
    discoveredModels: order.discoveredModels,
    eligibleModels: order.eligibleModels,
  })

  let lastCapabilityError: WanVideoError | undefined
  let created:
    | { taskId: string; requestId?: string; providerResponse: WanVideoCreateResponse; model: string }
    | undefined
  let selectedModel = order.models[0]?.id
  if (!selectedModel) {
    throw new WanVideoError({
      code: 'MODEL_NOT_AVAILABLE',
      message: 'WAN_MODEL_NOT_FOUND — no eligible image-to-video models available.',
      action: 'Enable an I2V model in Alibaba Model Studio.',
      retryable: false,
    })
  }

  for (const candidate of order.models) {
    const model = candidate.id

    if (isWanModelKnownUnpurchased(model)) {
      skipped.push({ model, reason: 'cached_unpurchased' })
      console.info('[wan-video] capability-skip', {
        productionId: input.productionId,
        sceneNumber: input.sceneNumber,
        model,
        reason: 'cached_unpurchased',
      })
      lastCapabilityError = wanModelNotEnabledError({ model })
      continue
    }

    console.info('[wan-video] request', {
      productionId: input.productionId,
      sceneNumber: input.sceneNumber,
      provider: 'wan',
      model,
      imageUrl: input.imageUrl,
      promptPreview: input.prompt.slice(0, 160),
      durationSec: input.durationSec,
      width: input.width,
      height: input.height,
      cameraMovement: input.cameraMovement,
      continuityId: input.continuityId,
    })

    try {
      created = await createWanVideoTask({ ...input, model })
      selectedModel = model
      break
    } catch (err) {
      if (err instanceof WanVideoError && err.code === 'WAN_MODEL_NOT_ENABLED') {
        lastCapabilityError = err
        skipped.push({ model, reason: 'model_not_enabled' })
        console.warn('[wan-video] model-not-enabled', {
          productionId: input.productionId,
          sceneNumber: input.sceneNumber,
          model: err.model ?? model,
          reason: err.message,
        })
        continue
      }
      throw err
    }
  }

  if (!created) {
    if (lastCapabilityError) {
      throw new WanVideoError({
        code: 'MODEL_NOT_AVAILABLE',
        message: 'No discovered WAN image-to-video model succeeded for this account.',
        model: preferredModel,
        action: 'Enable an I2V model in Alibaba Model Studio or connect another video provider.',
        retryable: false,
        cause: lastCapabilityError,
      })
    }

    throw new WanVideoError({
      code: 'MODEL_NOT_AVAILABLE',
      message: 'No WAN image-to-video models were discovered from DashScope.',
      model: preferredModel,
      action: 'Enable an I2V model in Alibaba Model Studio or connect another video provider.',
      retryable: false,
    })
  }

  const modelSelection: VideoModelSelectionResult = {
    provider: 'wan',
    selectedModel,
    fallbackFrom: preferredModel && selectedModel !== preferredModel ? preferredModel : undefined,
    reason:
      preferredModel && selectedModel !== preferredModel
        ? 'Requested model unavailable; selected next discovered I2V model'
        : 'Selected highest-priority discovered I2V model',
    discoveredModels: order.discoveredModels,
    eligibleModels: order.eligibleModels,
    skipped,
  }
  logVideoModelSelection(modelSelection)

  const completed = await waitForWanVideoOutput(created.taskId, { apiKey: input.apiKey })
  const generationTimeMs = Date.now() - started

  console.info('[wan-video] response', {
    productionId: input.productionId,
    sceneNumber: input.sceneNumber,
    provider: 'wan',
    model: created.model,
    taskId: created.taskId,
    requestId: completed.requestId ?? created.requestId,
    downloadUrl: completed.videoUrl,
    generationTimeMs,
    modelSelection,
    providerResponse: completed.providerResponse,
  })

  return {
    videoUrl: completed.videoUrl,
    model: created.model,
    requestId: completed.requestId ?? created.requestId,
    taskId: created.taskId,
    generationTimeMs,
    modelSelection,
    providerResponse: {
      create: created.providerResponse,
      complete: completed.providerResponse,
      modelSelection,
    },
  }
}
