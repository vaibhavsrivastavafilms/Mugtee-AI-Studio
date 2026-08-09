import 'server-only'

import { generateOpenArtVideoViaMcp } from '@/lib/openart/mcp-generate.server'
import {
  classifyOpenArtMcpFailure,
  isOpenArtMcpError,
  OpenArtMcpError,
} from '@/lib/openart/openart-errors.server'
import { authenticateOpenArtForUser } from '@/lib/openart/authenticate.server'
import { V7UploadFailedError } from '@/lib/v7/input-validation.server'
import {
  V7VideoProviderRequestError,
} from '@/lib/v7/providers/video-errors.server'
import { persistV7SceneVideo } from '@/lib/v7/providers/video-provider-base.server'
import { availableVideoModelsFromSingleId } from '@/lib/v7/providers/video-model-discovery.server'
import type {
  V7VideoGenerationInput,
  V7VideoGenerationResult,
  V7VideoProvider,
} from '@/lib/v7/providers/video-provider.types'

function validateInput(input: V7VideoGenerationInput): { ok: true } | { ok: false; reason: string } {
  if (!input.prompt?.trim()) return { ok: false, reason: 'prompt is required' }
  if (!input.imageUrl?.trim()) return { ok: false, reason: 'imageUrl is required' }
  if (!input.storagePath?.trim()) return { ok: false, reason: 'storagePath is required' }
  if (!input.userId?.trim()) return { ok: false, reason: 'userId is required' }
  if (!input.continuityId?.trim()) return { ok: false, reason: 'continuityId is required' }
  if (!input.cameraMovement?.trim()) return { ok: false, reason: 'cameraMovement is required' }
  if (!Number.isFinite(input.durationSec) || input.durationSec <= 0) {
    return { ok: false, reason: 'durationSec is required' }
  }
  return { ok: true }
}

function mapOpenArtErrorToV7(err: OpenArtMcpError): V7VideoProviderRequestError {
  switch (err.code) {
    case 'OPENART_NOT_AUTHENTICATED':
      return new V7VideoProviderRequestError('PROVIDER_AUTH_FAILED', 'openart-mcp', {
        message: err.message,
        cause: err,
      })
    case 'OPENART_MODEL_UNAVAILABLE':
      return new V7VideoProviderRequestError('PROVIDER_UNAVAILABLE', 'openart-mcp', {
        message: err.message,
        cause: err,
      })
    case 'OPENART_UPLOAD_FAILED':
      return new V7VideoProviderRequestError('PROVIDER_INVALID_RESPONSE', 'openart-mcp', {
        message: err.message,
        cause: err,
      })
    default:
      return new V7VideoProviderRequestError('PROVIDER_UNAVAILABLE', 'openart-mcp', {
        message: err.message,
        cause: err,
      })
  }
}

async function generate(input: V7VideoGenerationInput): Promise<V7VideoGenerationResult> {
  const validation = validateInput(input)
  if (!validation.ok) {
    throw new V7VideoProviderRequestError('PROVIDER_INVALID_RESPONSE', 'openart-mcp', {
      message: validation.reason,
    })
  }

  const started = Date.now()
  try {
    const result = await generateOpenArtVideoViaMcp({
      userId: input.userId,
      productionId: input.productionId,
      sceneNumber: input.sceneNumber,
      sceneId: input.sceneId,
      prompt: input.prompt,
      imageUrl: input.imageUrl,
      durationSec: input.durationSec,
      aspectRatio: input.aspectRatio,
      width: input.width,
      height: input.height,
      cameraMovement: input.cameraMovement,
      narration: input.narration,
      dialogue: input.dialogue,
      continuityId: input.continuityId,
      negativePrompt: input.negativePrompt,
      promptArchive: input.promptArchive,
    })

    let persisted: { videoUrl: string; durationSec: number; codec?: string }
    try {
      persisted = await persistV7SceneVideo({
        sourceUrl: result.url,
        userId: input.userId,
        storagePath: input.storagePath,
        providerId: 'openart-mcp',
        expectedDurationSec: input.durationSec,
      })
    } catch (uploadErr) {
      if (uploadErr instanceof V7UploadFailedError) {
        throw new OpenArtMcpError('OPENART_UPLOAD_FAILED', uploadErr.message, { cause: uploadErr })
      }
      if (uploadErr instanceof V7VideoProviderRequestError) {
        throw new OpenArtMcpError(
          'OPENART_UPLOAD_FAILED',
          uploadErr.message,
          { validation: uploadErr.code, cause: uploadErr }
        )
      }
      throw uploadErr
    }

    console.info('[openart-mcp] upload complete', {
      productionId: input.productionId,
      sceneNumber: input.sceneNumber,
      sceneId: input.sceneId,
      provider: 'openart-mcp',
      workspace: result.workspace,
      model: result.model,
      generationId: result.generationId,
      uploadUrl: persisted.videoUrl,
      durationSec: persisted.durationSec,
      generationTimeMs: Date.now() - started,
    })

    return {
      success: true,
      provider: 'openart-mcp',
      model: result.model,
      videoUrl: persisted.videoUrl,
      thumbnailUrl: input.imageUrl,
      durationSec: persisted.durationSec,
      width: input.width,
      height: input.height,
      generationTimeMs: Date.now() - started,
      retries: 0,
      storagePath: input.storagePath,
      metadata: {
        provider: 'openart-mcp',
        model: result.model,
        toolName: result.toolName,
        generationId: result.generationId,
        workspace: result.workspace,
        downloadUrl: result.url,
        uploadUrl: persisted.videoUrl,
        codec: persisted.codec,
        promptArchive: input.promptArchive ?? {},
        continuityId: input.continuityId,
        consistencyModes: input.consistencyModes ?? [],
        providerResponse: result.providerResponse,
        modelSelection: result.modelSelection ?? null,
        openArtErrorCode: null,
      },
    }
  } catch (err) {
    if (err instanceof V7VideoProviderRequestError) throw err
    if (isOpenArtMcpError(err)) throw mapOpenArtErrorToV7(err)
    const classified = classifyOpenArtMcpFailure(err)
    throw mapOpenArtErrorToV7(classified)
  }
}

export const openArtMcpVideoProvider: V7VideoProvider = {
  id: 'openart-mcp',
  displayName: 'OpenArt MCP',
  modelId: 'discovered',
  supports(input) {
    return Boolean(input.userId?.trim() && input.imageUrl?.trim())
  },
  validateInput,
  health: async () => ({
    healthy: true,
    message: 'OpenArt MCP validates OAuth connection during capability audit.',
  }),
  availableVideoModels: async () => availableVideoModelsFromSingleId('discovered'),
  availableModels: async () => ({
    models: ['discovered'],
    preferred: process.env.OPENART_VIDEO_MODEL?.trim() || undefined,
  }),
  accountCapabilities: async (context) => {
    const userId = context?.userId?.trim()
    if (!userId) {
      return {
        authenticated: false,
        entitled: false,
        reason: 'NOT_AUTHENTICATED',
        message: 'OPENART_NOT_AUTHENTICATED: userId required',
      }
    }

    const auth = await authenticateOpenArtForUser(userId, { discover: true })
    if (!auth.ready) {
      return {
        authenticated: auth.authenticated,
        entitled: false,
        reason: 'NOT_AUTHENTICATED',
        message: auth.reason ?? auth.error ?? 'OpenArt MCP is not connected. Visit /api/openart/auth to authenticate.',
      }
    }

    const hasVideoTool = Boolean(auth.videoTool)
    if (!hasVideoTool) {
      return {
        authenticated: true,
        entitled: false,
        reason: 'MODEL_NOT_AVAILABLE',
        message: 'OpenArt MCP is connected but no image-to-video tool was discovered.',
        entitledModels: [],
      }
    }

    const entitledModels =
      auth.videoModels.length > 0 ? auth.videoModels : auth.imageModels.length ? auth.imageModels : ['discovered']

    return {
      authenticated: true,
      entitled: true,
      entitledModels,
      message: auth.videoTool ? `Selected OpenArt video tool: ${auth.videoTool}` : undefined,
    }
  },
  estimateCost: () => 0,
  estimateTime: () => 240_000,
  generate,
  normalizeOutput: (result) => result,
  retry: async (input, previous) => {
    const result = await generate(input)
    return { ...result, retries: previous.retries + 1 }
  },
  cancel: () => undefined,
  cleanup: () => undefined,
}
