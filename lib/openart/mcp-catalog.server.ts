import 'server-only'

import { createOpenArtMcpClient } from '@/lib/openart/mcp-client.server'
import {
  discoverOpenArtTools,
  normalizeOpenArtModelId,
  parseModelsFromMcpResult,
  type OpenArtDiscoveredTools,
} from '@/lib/openart/mcp-discovery.server'
import { OpenArtMcpError } from '@/lib/openart/openart-errors.server'
import { getOpenArtAccessTokenForUser } from '@/lib/openart/oauth.server'
import {
  buildDiscoveredVideoModel,
  orderVideoModelsWithPreference,
  scoreFreeVideoModelPriority,
  sortDiscoveredVideoModels,
  type DiscoveredVideoModel,
} from '@/lib/v7/providers/video-model-discovery.server'

const CATALOG_CACHE_MS = 5 * 60_000

export type OpenArtMcpCatalog = {
  fetchedAt: number
  tools: OpenArtDiscoveredTools
  models: string[]
  videoModels: string[]
  discoveredVideoModels: DiscoveredVideoModel[]
  imageModels: string[]
  selectedVideoModel: string | null
  selectedImageModel: string | null
  workspace: string | null
  credits: number | null
  ready: boolean
}

const catalogCache = new Map<string, { expiresAt: number; catalog: OpenArtMcpCatalog }>()

function cacheKeyForUser(userId: string): string {
  return userId.trim()
}

export function invalidateOpenArtMcpCatalogCache(userId?: string): void {
  if (userId?.trim()) {
    catalogCache.delete(cacheKeyForUser(userId))
    return
  }
  catalogCache.clear()
}

function resolveEnvVideoModelPreference(): string | undefined {
  const raw = process.env.OPENART_VIDEO_MODEL?.trim()
  return raw ? normalizeOpenArtModelId(raw) : undefined
}

function isOpenArtVideoModel(model: string): boolean {
  const normalized = normalizeOpenArtModelId(model)
  return /video|i2v|animate|motion|frame|image.?to.?video|frame.?to.?video/i.test(normalized)
}

function buildOpenArtDiscoveredVideoModels(videoModels: string[]): DiscoveredVideoModel[] {
  const unique = [...new Set(videoModels.filter((model) => model.trim()))]
  const filtered = unique.filter((model) => isOpenArtVideoModel(model))
  const models = (filtered.length ? filtered : unique).map((id) =>
    buildDiscoveredVideoModel(id, { available: true, free: true })
  )
  return sortDiscoveredVideoModels(models)
}

export function orderOpenArtVideoModels(
  videoModels: string[],
  envPreference?: string
): DiscoveredVideoModel[] {
  const discovered = buildOpenArtDiscoveredVideoModels(videoModels)
  return orderVideoModelsWithPreference(discovered, envPreference)
}

export function selectOpenArtVideoModel(
  videoModels: string[],
  envPreference?: string
): string | null {
  const ordered = orderOpenArtVideoModels(videoModels, envPreference)
  return ordered[0]?.id ?? null
}

export function selectOpenArtImageModel(imageModels: string[], models: string[]): string | null {
  const candidates = imageModels.length ? imageModels : models
  if (!candidates.length) return null
  return [...candidates].sort(
    (a, b) => scoreFreeVideoModelPriority(b) - scoreFreeVideoModelPriority(a)
  )[0] ?? null
}

export async function availableOpenArtVideoModels(userId: string): Promise<{
  models: DiscoveredVideoModel[]
  preferred?: DiscoveredVideoModel
}> {
  const catalog = await loadOpenArtMcpCatalog(userId)
  const models = catalog.discoveredVideoModels
  const preferredId = catalog.selectedVideoModel ?? resolveEnvVideoModelPreference()
  const preferred = models.find((model) => model.id === preferredId) ?? models[0]
  return { models, preferred }
}

async function probeOptionalTool(
  accessToken: string,
  toolName: string | undefined,
  args: Record<string, unknown> = {}
): Promise<Record<string, unknown> | null> {
  if (!toolName) return null
  try {
    const client = await createOpenArtMcpClient(accessToken)
    const result = await client.callTool(toolName, args)
    const text =
      result.content?.map((item) => (typeof item.text === 'string' ? item.text : '')).join('\n') ?? ''
    if (result.structuredContent && typeof result.structuredContent === 'object') {
      return result.structuredContent
    }
    if (text.trim()) {
      try {
        return JSON.parse(text) as Record<string, unknown>
      } catch {
        return { text }
      }
    }
    return null
  } catch {
    return null
  }
}

function extractWorkspace(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null
  const candidates = [
    payload.workspace,
    payload.workspace_name,
    payload.workspaceName,
    payload.name,
    payload.org,
    payload.organization,
  ]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  if (typeof payload.text === 'string' && payload.text.trim()) return payload.text.trim().slice(0, 120)
  return null
}

function extractCredits(payload: Record<string, unknown> | null): number | null {
  if (!payload) return null
  const candidates = [payload.credits, payload.balance, payload.remaining, payload.credit_balance]
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ''))
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

async function loadModelsFromTool(
  accessToken: string,
  toolName: string | undefined,
  kind: 'image' | 'video'
): Promise<string[]> {
  if (!toolName) return []
  try {
    const client = await createOpenArtMcpClient(accessToken)
    const result = await client.callTool(toolName, { kind, media_type: kind, type: kind })
    return parseModelsFromMcpResult(result, kind)
  } catch {
    return []
  }
}

export async function loadOpenArtMcpCatalog(userId: string): Promise<OpenArtMcpCatalog> {
  const key = cacheKeyForUser(userId)
  const cached = catalogCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.catalog
  }

  const accessToken = await getOpenArtAccessTokenForUser(userId)
  if (!accessToken) {
    throw new OpenArtMcpError(
      'OPENART_NOT_AUTHENTICATED',
      'OpenArt MCP is not connected. Visit /api/openart/auth to authenticate.'
    )
  }

  const client = await createOpenArtMcpClient(accessToken)
  const allTools = await client.listTools()
  const tools = discoverOpenArtTools(allTools)

  if (!tools.imageTool && !tools.imageToVideoTool && !tools.videoTool) {
    throw new OpenArtMcpError(
      'OPENART_TOOL_DISCOVERY_FAILED',
      `OpenArt MCP returned no image or video generation tools. Available tools: ${tools.allTools.map((row) => row.name).join(', ') || 'none'}`
    )
  }

  const [imageModels, videoModels, workspacePayload, creditsPayload] = await Promise.all([
    loadModelsFromTool(accessToken, tools.modelListTool?.name, 'image'),
    loadModelsFromTool(accessToken, tools.modelListTool?.name, 'video'),
    probeOptionalTool(accessToken, tools.workspaceTool?.name),
    probeOptionalTool(accessToken, tools.creditsTool?.name),
  ])

  const models = [...new Set([...imageModels, ...videoModels])]
  const discoveredVideoModels = orderOpenArtVideoModels(videoModels, resolveEnvVideoModelPreference())
  const selectedVideoModel = discoveredVideoModels[0]?.id ?? null
  const selectedImageModel = selectOpenArtImageModel(imageModels, models)
  const ready = Boolean(
    tools.imageTool ||
      ((tools.imageToVideoTool ?? tools.videoTool) &&
        (selectedVideoModel || discoveredVideoModels.length > 0 || tools.imageToVideoTool))
  )

  const catalog: OpenArtMcpCatalog = {
    fetchedAt: Date.now(),
    tools,
    models,
    videoModels,
    discoveredVideoModels,
    imageModels,
    selectedVideoModel,
    selectedImageModel,
    workspace: extractWorkspace(workspacePayload),
    credits: extractCredits(creditsPayload),
    ready,
  }

  catalogCache.set(key, { expiresAt: Date.now() + CATALOG_CACHE_MS, catalog })

  console.info('[openart-mcp] catalog refreshed', {
    userId,
    workspace: catalog.workspace,
    credits: catalog.credits,
    modelCount: catalog.models.length,
    videoModelCount: catalog.videoModels.length,
    selectedVideoModel: catalog.selectedVideoModel,
    selectedImageModel: catalog.selectedImageModel,
    imageTool: tools.imageTool?.name,
    imageToVideoTool: tools.imageToVideoTool?.name,
    ready: catalog.ready,
  })

  return catalog
}

export async function requireOpenArtAccessToken(userId: string): Promise<string> {
  const token = await getOpenArtAccessTokenForUser(userId)
  if (!token) {
    throw new OpenArtMcpError(
      'OPENART_NOT_AUTHENTICATED',
      'OPENART_TOKEN_NOT_FOUND — complete OAuth at /api/openart/auth',
      { details: { error: 'OPENART_TOKEN_NOT_FOUND', userId } }
    )
  }
  return token
}
