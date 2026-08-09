import 'server-only'

import { authenticateOpenArtForUser, probeOpenArtImageProviderHealth } from '@/lib/openart/authenticate.server'
import { generateOpenArtImageViaMcp } from '@/lib/openart/mcp-generate.server'
import { isOpenArtMcpError } from '@/lib/openart/openart-errors.server'
import {
  classifyV7ImageUnknownError,
  V7ImageProviderRequestError,
} from '@/lib/v7/providers/image-errors.server'
import { persistV7SceneImage } from '@/lib/v7/providers/image-provider-base.server'
import type {
  V7ImageGenerationInput,
  V7ImageGenerationResult,
  V7ImageProvider,
  V7ImageProviderHealth,
} from '@/lib/v7/providers/image-provider.types'

function validateInput(input: V7ImageGenerationInput): { ok: true } | { ok: false; reason: string } {
  if (!input.prompt?.trim()) return { ok: false, reason: 'prompt is required' }
  if (!input.storagePath?.trim()) return { ok: false, reason: 'storagePath is required' }
  if (!input.userId?.trim()) return { ok: false, reason: 'userId is required' }
  return { ok: true }
}

function authFailureMessage(auth: Awaited<ReturnType<typeof authenticateOpenArtForUser>>): string {
  return `${auth.error ?? 'OPENART_NOT_AUTHENTICATED'}: ${auth.reason ?? 'OpenArt authentication failed'}`
}

async function generate(input: V7ImageGenerationInput): Promise<V7ImageGenerationResult> {
  const validation = validateInput(input)
  if (!validation.ok) {
    throw new V7ImageProviderRequestError('PROVIDER_INVALID_RESPONSE', 'openart-mcp', {
      message: validation.reason,
    })
  }

  const auth = await authenticateOpenArtForUser(input.userId, { discover: true })
  if (!auth.ready) {
    throw new V7ImageProviderRequestError('PROVIDER_AUTH_FAILED', 'openart-mcp', {
      message: authFailureMessage(auth),
    })
  }
  if (!auth.imageTool) {
    throw new V7ImageProviderRequestError('PROVIDER_UNAVAILABLE', 'openart-mcp', {
      message: 'OPENART_TOOL_DISCOVERY_FAILED: no image generation tool discovered',
    })
  }

  const started = Date.now()
  try {
    const result = await generateOpenArtImageViaMcp({
      userId: input.userId,
      productionId: input.productionId,
      sceneNumber: input.sceneNumber,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      aspectRatio: input.aspectRatio,
      width: input.width,
      height: input.height,
      referenceImageUrls: input.referenceImageUrls,
    })

    const imageUrl = await persistV7SceneImage({
      remoteUrl: result.url,
      userId: input.userId,
      storagePath: input.storagePath,
      providerId: 'openart-mcp',
    })

    return {
      success: true,
      provider: 'openart-mcp',
      model: result.model,
      imageUrl,
      thumbnailUrl: imageUrl,
      seed: input.seed,
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
        uploadUrl: imageUrl,
        promptArchive: input.promptArchive ?? {},
        consistencyModes: input.consistencyModes ?? [],
        providerResponse: result.providerResponse,
        openArtAuth: {
          workspace: auth.workspace,
          imageTool: auth.imageTool,
        },
      },
    }
  } catch (err) {
    if (err instanceof V7ImageProviderRequestError) throw err
    if (isOpenArtMcpError(err)) {
      if (err.code === 'OPENART_NOT_AUTHENTICATED') {
        throw new V7ImageProviderRequestError('PROVIDER_AUTH_FAILED', 'openart-mcp', {
          message: err.details?.error
            ? `${String(err.details.error)}: ${err.message}`
            : err.message,
          cause: err,
        })
      }
      throw new V7ImageProviderRequestError('PROVIDER_UNAVAILABLE', 'openart-mcp', {
        message: `${err.code}: ${err.message}`,
        cause: err,
      })
    }
    const message = err instanceof Error ? err.message : String(err)
    if (/not connected|not authenticated|401|403|unauthorized|TOKEN_NOT_FOUND/i.test(message)) {
      throw new V7ImageProviderRequestError('PROVIDER_AUTH_FAILED', 'openart-mcp', { message, cause: err })
    }
    throw classifyV7ImageUnknownError('openart-mcp', err)
  }
}

export const openArtMcpImageProvider: V7ImageProvider = {
  id: 'openart-mcp',
  displayName: 'OpenArt MCP',
  modelId: 'discovered',
  supports(input) {
    return Boolean(input.userId?.trim())
  },
  validateInput,
  health: async () => {
    return {
      healthy: false,
      message: 'OpenArt MCP requires userId — authenticate during scene generation.',
    } satisfies V7ImageProviderHealth
  },
  estimateCost: () => 0,
  estimateTime: () => 120_000,
  generate,
  normalizeOutput: (result) => result,
  retry: async (input, previous) => {
    const result = await generate(input)
    return { ...result, retries: previous.retries + 1 }
  },
  cancel: () => undefined,
  cleanup: () => undefined,
}

export async function probeOpenArtImageProviderHealthForUser(
  userId: string
): Promise<V7ImageProviderHealth> {
  const probe = await probeOpenArtImageProviderHealth(userId)
  return {
    healthy: probe.healthy,
    message: probe.message,
  }
}
