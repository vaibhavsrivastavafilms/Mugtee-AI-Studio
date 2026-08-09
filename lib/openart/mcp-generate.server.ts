import 'server-only'

import { createOpenArtMcpClient } from '@/lib/openart/mcp-client.server'
import {
  invalidateOpenArtMcpCatalogCache,
  loadOpenArtMcpCatalog,
  orderOpenArtVideoModels,
  requireOpenArtAccessToken,
} from '@/lib/openart/mcp-catalog.server'
import {
  buildOpenArtImageToolArgs,
  buildOpenArtVideoToolArgs,
  extractGenerationIdFromMcpResult,
  extractUrlsFromMcpResult,
  pickMediaUrl,
} from '@/lib/openart/mcp-discovery.server'
import {
  classifyOpenArtMcpFailure,
  isOpenArtMcpError,
  OpenArtMcpError,
} from '@/lib/openart/openart-errors.server'
import {
  logVideoModelSelection,
  type VideoModelSelectionResult,
} from '@/lib/v7/providers/video-model-discovery.server'

type OpenArtGenerationContext = {
  userId: string
  productionId: string
  sceneNumber: number
  sceneId?: string
  kind: 'image' | 'video'
}

export type OpenArtMcpGenerationResult = {
  url: string
  model: string
  toolName: string
  generationId: string | null
  workspace: string | null
  providerResponse: unknown
  modelSelection?: VideoModelSelectionResult
}

function logOpenArtRequest(params: OpenArtGenerationContext & {
  toolName: string
  model?: string | null
  workspace?: string | null
  request: Record<string, unknown>
}) {
  console.info('[openart-mcp] request', {
    productionId: params.productionId,
    sceneNumber: params.sceneNumber,
    sceneId: params.sceneId,
    provider: 'openart-mcp',
    workspace: params.workspace ?? null,
    kind: params.kind,
    toolName: params.toolName,
    model: params.model ?? null,
    promptPreview:
      typeof params.request.prompt === 'string' ? params.request.prompt.slice(0, 160) : undefined,
    request: params.request,
  })
}

function logOpenArtResponse(params: OpenArtGenerationContext & {
  toolName: string
  model: string
  generationId: string | null
  generationTimeMs: number
  workspace?: string | null
  urls: string[]
  providerResponse: unknown
}) {
  console.info('[openart-mcp] response', {
    productionId: params.productionId,
    sceneNumber: params.sceneNumber,
    sceneId: params.sceneId,
    provider: 'openart-mcp',
    workspace: params.workspace ?? null,
    kind: params.kind,
    toolName: params.toolName,
    model: params.model,
    generationId: params.generationId,
    generationTimeMs: params.generationTimeMs,
    downloadUrls: params.urls,
    providerResponse: params.providerResponse,
  })
}

function isOpenArtModelUnavailableError(err: unknown): boolean {
  if (isOpenArtMcpError(err)) {
    return err.code === 'OPENART_MODEL_UNAVAILABLE'
  }
  const message = err instanceof Error ? err.message : String(err)
  return /model unavailable|model not enabled|not entitled|invalid model|unsupported model|not support.*model/i.test(
    message
  )
}

async function callOpenArtVideoTool(params: {
  accessToken: string
  toolName: string
  args: Record<string, unknown>
}): Promise<{
  result: Awaited<ReturnType<Awaited<ReturnType<typeof createOpenArtMcpClient>>['callTool']>>
  urls: string[]
  generationId: string | null
}> {
  const client = await createOpenArtMcpClient(params.accessToken)
  const result = await client.callTool(params.toolName, params.args)
  return {
    result,
    urls: extractUrlsFromMcpResult(result),
    generationId: extractGenerationIdFromMcpResult(result),
  }
}

function logOpenArtFailure(params: OpenArtGenerationContext & {
  toolName?: string
  model?: string | null
  workspace?: string | null
  error: unknown
}) {
  const classified = classifyOpenArtMcpFailure(params.error)
  console.error('[openart-mcp] failure', {
    productionId: params.productionId,
    sceneNumber: params.sceneNumber,
    sceneId: params.sceneId,
    provider: 'openart-mcp',
    workspace: params.workspace ?? null,
    kind: params.kind,
    toolName: params.toolName ?? null,
    model: params.model ?? null,
    error: classified.code,
    message: classified.message,
    stack: params.error instanceof Error ? params.error.stack : undefined,
  })
  return classified
}

export async function generateOpenArtImageViaMcp(params: {
  userId: string
  productionId: string
  sceneNumber: number
  sceneId?: string
  prompt: string
  negativePrompt?: string
  aspectRatio: string
  width: number
  height: number
  referenceImageUrls?: string[]
}): Promise<OpenArtMcpGenerationResult> {
  const context: OpenArtGenerationContext = {
    userId: params.userId,
    productionId: params.productionId,
    sceneNumber: params.sceneNumber,
    sceneId: params.sceneId,
    kind: 'image',
  }

  try {
    await requireOpenArtAccessToken(params.userId)
    const catalog = await loadOpenArtMcpCatalog(params.userId)
    const tool = catalog.tools.imageTool
    if (!tool) {
      throw new OpenArtMcpError(
        'OPENART_MODEL_UNAVAILABLE',
        `OpenArt MCP has no image generation tool. Available tools: ${catalog.tools.allTools.map((row) => row.name).join(', ')}`
      )
    }

    const model = catalog.selectedImageModel
    const args = buildOpenArtImageToolArgs({
      prompt: params.prompt,
      negativePrompt: params.negativePrompt,
      aspectRatio: params.aspectRatio,
      width: params.width,
      height: params.height,
      referenceImageUrls: params.referenceImageUrls,
      model: model ?? undefined,
    })

    logOpenArtRequest({
      ...context,
      toolName: tool.name,
      model,
      workspace: catalog.workspace,
      request: args,
    })

    const started = Date.now()
    const accessToken = await requireOpenArtAccessToken(params.userId)
    const client = await createOpenArtMcpClient(accessToken)
    const result = await client.callTool(tool.name, args)
    const urls = extractUrlsFromMcpResult(result)
    const url = pickMediaUrl(urls, 'image')
    const generationId = extractGenerationIdFromMcpResult(result)

    logOpenArtResponse({
      ...context,
      toolName: tool.name,
      model: model ?? tool.name,
      generationId,
      generationTimeMs: Date.now() - started,
      workspace: catalog.workspace,
      urls,
      providerResponse: result,
    })

    if (!url) {
      throw new OpenArtMcpError(
        'OPENART_GENERATION_FAILED',
        `OpenArt MCP image tool ${tool.name} returned no downloadable image URL`
      )
    }

    return {
      url,
      model: model ?? tool.name,
      toolName: tool.name,
      generationId,
      workspace: catalog.workspace,
      providerResponse: result,
    }
  } catch (err) {
    throw logOpenArtFailure({ ...context, error: err })
  }
}

export async function generateOpenArtVideoViaMcp(params: {
  userId: string
  productionId: string
  sceneNumber: number
  sceneId?: string
  prompt: string
  imageUrl: string
  durationSec: number
  aspectRatio: string
  width: number
  height: number
  cameraMovement?: string
  narration?: string
  dialogue?: string
  continuityId?: string
  negativePrompt?: string
  promptArchive?: Record<string, unknown>
}): Promise<OpenArtMcpGenerationResult> {
  const context: OpenArtGenerationContext = {
    userId: params.userId,
    productionId: params.productionId,
    sceneNumber: params.sceneNumber,
    sceneId: params.sceneId,
    kind: 'video',
  }

  try {
    await requireOpenArtAccessToken(params.userId)
    const catalog = await loadOpenArtMcpCatalog(params.userId)
    const tool = catalog.tools.imageToVideoTool ?? catalog.tools.videoTool
    if (!tool) {
      throw new OpenArtMcpError(
        'OPENART_MODEL_UNAVAILABLE',
        `OpenArt MCP has no image-to-video tool. Available tools: ${catalog.tools.allTools.map((row) => row.name).join(', ')}`
      )
    }

    const envPreference = process.env.OPENART_VIDEO_MODEL?.trim() || catalog.selectedVideoModel || undefined
    const orderedModels = orderOpenArtVideoModels(catalog.videoModels, envPreference)
    const modelCandidates =
      orderedModels.length > 0
        ? orderedModels.map((model) => model.id)
        : catalog.selectedVideoModel
          ? [catalog.selectedVideoModel]
          : [undefined]

    const preferredModel = envPreference ?? catalog.selectedVideoModel ?? modelCandidates[0] ?? 'discovered'
    const skipped: Array<{ model: string; reason: string }> = []
    const accessToken = await requireOpenArtAccessToken(params.userId)
    const started = Date.now()
    let lastError: unknown

    for (const candidate of modelCandidates) {
      const model = candidate
      const args = buildOpenArtVideoToolArgs({
        prompt: params.prompt,
        imageUrl: params.imageUrl,
        durationSec: params.durationSec,
        aspectRatio: params.aspectRatio,
        width: params.width,
        height: params.height,
        cameraMovement: params.cameraMovement,
        narration: params.narration,
        dialogue: params.dialogue,
        continuityId: params.continuityId,
        negativePrompt: params.negativePrompt,
        promptArchive: params.promptArchive,
        model: model ?? undefined,
      })

      logOpenArtRequest({
        ...context,
        toolName: tool.name,
        model: model ?? null,
        workspace: catalog.workspace,
        request: args,
      })

      try {
        const { result, urls, generationId } = await callOpenArtVideoTool({
          accessToken,
          toolName: tool.name,
          args,
        })
        const url = pickMediaUrl(urls, 'video')

        if (!url) {
          const err = new OpenArtMcpError(
            'OPENART_GENERATION_FAILED',
            `OpenArt MCP video tool ${tool.name} returned no downloadable video URL`
          )
          if (model) {
            skipped.push({ model, reason: 'empty_response' })
            lastError = err
            continue
          }
          throw err
        }

        const selectedModel = model ?? tool.name
        const modelSelection: VideoModelSelectionResult = {
          provider: 'openart-mcp',
          selectedModel,
          fallbackFrom:
            preferredModel && selectedModel !== preferredModel ? String(preferredModel) : undefined,
          reason:
            preferredModel && selectedModel !== preferredModel
              ? 'Original model unavailable; selected next discovered free model'
              : model
                ? 'Selected highest-priority discovered OpenArt video model'
                : 'Used OpenArt tool default model',
          discoveredModels: catalog.videoModels,
          eligibleModels: orderedModels.map((entry) => entry.id),
          skipped,
        }
        logVideoModelSelection(modelSelection)

        logOpenArtResponse({
          ...context,
          toolName: tool.name,
          model: selectedModel,
          generationId,
          generationTimeMs: Date.now() - started,
          workspace: catalog.workspace,
          urls,
          providerResponse: result,
        })

        return {
          url,
          model: selectedModel,
          toolName: tool.name,
          generationId,
          workspace: catalog.workspace,
          providerResponse: { result, modelSelection },
          modelSelection,
        }
      } catch (err) {
        if (model && isOpenArtModelUnavailableError(err)) {
          skipped.push({ model, reason: 'model_not_enabled' })
          lastError = err
          console.warn('[openart-mcp] model-not-enabled', {
            productionId: params.productionId,
            sceneNumber: params.sceneNumber,
            model,
            reason: err instanceof Error ? err.message : String(err),
          })
          continue
        }
        throw err
      }
    }

    if (lastError) {
      if (isOpenArtMcpError(lastError)) throw lastError
      throw logOpenArtFailure({ ...context, toolName: tool.name, error: lastError })
    }

    throw new OpenArtMcpError(
      'OPENART_MODEL_UNAVAILABLE',
      'No discovered OpenArt video model succeeded for this account.'
    )
  } catch (err) {
    if (isOpenArtMcpError(err)) throw err
    throw logOpenArtFailure({ ...context, error: err })
  }
}

export async function probeOpenArtMcpHealth(userId?: string): Promise<{
  healthy: boolean
  ready?: boolean
  message?: string
}> {
  try {
    if (!userId?.trim()) {
      const token = process.env.OPENART_MCP_ACCESS_TOKEN?.trim()
      if (!token) {
        return { healthy: false, ready: false, message: 'OPENART_TOKEN_NOT_FOUND' }
      }
      const client = await createOpenArtMcpClient(token)
      const tools = await client.listTools()
      if (!tools.length) return { healthy: false, ready: false, message: 'OpenArt MCP returned no tools' }
      return { healthy: true, ready: true }
    }

    const { authenticateOpenArtForUser } = await import('@/lib/openart/authenticate.server')
    const auth = await authenticateOpenArtForUser(userId, { discover: true })
    if (!auth.ready) {
      return {
        healthy: false,
        ready: false,
        message: auth.reason ?? auth.error ?? 'OpenArt MCP not authenticated',
      }
    }

    const hasMediaTool = Boolean(auth.imageTool || auth.videoTool)
    if (!hasMediaTool) {
      return { healthy: false, ready: false, message: 'OpenArt MCP returned no image or video tools' }
    }

    return {
      healthy: true,
      ready: true,
      message: auth.workspace ? `workspace=${auth.workspace}` : undefined,
    }
  } catch (err) {
    return {
      healthy: false,
      ready: false,
      message: err instanceof Error ? err.message : 'OpenArt MCP health probe failed',
    }
  }
}

export { invalidateOpenArtMcpCatalogCache }
