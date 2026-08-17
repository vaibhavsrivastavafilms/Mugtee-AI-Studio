import 'server-only'

import { getOpenRouterTextProviderHealth } from '@/lib/ai/providers/openrouter/health'
import { hasOpenRouterApiKey } from '@/lib/ai/providers/openrouter/client'
import { getAvailableProviders } from '@/lib/ai/providers/task-routing'
import { probePollinationsHealth } from '@/lib/pollinations/models.server'
import { clearPollinationsSpendableBalanceCache } from '@/lib/pollinations/entitlement.server'
import { invalidatePollinationsModelCache } from '@/lib/pollinations/models.server'
import { invalidateVideoProviderCapabilityCache } from '@/lib/v7/providers/video-capability.server'
import { pollinationsVideoProvider } from '@/lib/v7/providers/providers/pollinations-video.server'
import { evaluateV7VideoProviderCapability } from '@/lib/v7/providers/video-capability.server'
import type { V7VideoGenerationInput, V7VideoProviderCapabilityReport } from '@/lib/v7/providers/video-provider.types'

export type ProviderReadiness = 'READY' | 'NOT_READY'

export type ProviderHealthSnapshot = {
  provider: string
  connected: boolean
  authenticated: boolean
  ready: boolean
  healthy: boolean
  selectedModel: string | null
  reason: string | null
  action: string | null
}

export type ProviderPreflightResult = {
  text: ProviderReadiness
  image: ProviderReadiness
  video: ProviderReadiness
  ready: boolean
  textProvider: 'pollinations' | 'openrouter'
  imageProvider: 'pollinations'
  videoProvider: 'pollinations'
  providers: {
    text: ProviderHealthSnapshot
    image: ProviderHealthSnapshot
    video: ProviderHealthSnapshot
  }
  error: string | null
}

type ProviderSession = {
  expiresAt: number
  preflight: ProviderPreflightResult
  pollinationsEvaluation: V7VideoProviderCapabilityReport | null
  pollinationsImageModel: string | null
  pollinationsVideoModel: string | null
}

const SESSION_TTL_MS = 5 * 60 * 1000
const sessions = new Map<string, ProviderSession>()

function buildProbeInput(userId: string): V7VideoGenerationInput {
  return {
    prompt: 'Provider manager capability probe.',
    negativePrompt: '',
    imageUrl: 'https://example.com/storyboard.png',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    durationSec: 5,
    seed: 1,
    sceneId: 'provider-probe-scene',
    sceneNumber: 1,
    productionId: 'provider-probe-production',
    userId,
    storagePath: `${userId}/v7/provider-probe/scenes/probe/video_a1.mp4`,
    continuityId: 'provider-probe:scene-1',
    cameraMovement: 'slow push',
    narration: 'probe',
    dialogue: '',
    promptArchive: { action: 'probe', sceneNumber: 1 },
    consistencyModes: [],
  }
}

function snapshotFromText(health: Awaited<ReturnType<typeof getOpenRouterTextProviderHealth>>): ProviderHealthSnapshot {
  const ready = health.connected && health.ready
  return {
    provider: 'openrouter',
    connected: health.connected,
    authenticated: health.connected,
    ready,
    healthy: ready,
    selectedModel: health.workingModel || null,
    reason: ready ? null : health.connected ? 'OpenRouter catalog unavailable' : 'OPENROUTER_AUTH_FAILED',
    action: ready ? null : 'Set OPENROUTER_API_KEY in environment variables.',
  }
}

function snapshotFromPollinations(params: {
  imageModel: string | null
  videoModel: string | null
  ready: boolean
  authenticated: boolean
  reason: string | null
}): ProviderHealthSnapshot {
  return {
    provider: 'pollinations',
    connected: params.authenticated,
    authenticated: params.authenticated,
    ready: params.ready,
    healthy: params.ready,
    selectedModel: params.videoModel ?? params.imageModel,
    reason: params.ready ? null : params.reason,
    action: params.ready
      ? null
      : params.authenticated
        ? 'Check Pollinations model catalog and pollen balance.'
        : 'Add POLLINATIONS_API_KEY (sk_…) from https://enter.pollinations.ai/keys',
  }
}

async function probeTextProvider(): Promise<ProviderHealthSnapshot> {
  const { probePollinationsTextReady } = await import('@/lib/pollinations/text.server')
  const pollinations = await probePollinationsTextReady()
  if (pollinations.ready) {
    return {
      provider: 'pollinations',
      connected: true,
      authenticated: true,
      ready: true,
      healthy: true,
      selectedModel: pollinations.model,
      reason: null,
      action: null,
    }
  }

  const health = await getOpenRouterTextProviderHealth()
  const available = getAvailableProviders().filter((id) => id !== 'pollinations')
  const fallbackProviders = available.filter((id) => id !== 'openrouter')

  let selectedModel = health.workingModel || null
  if (!selectedModel && health.ready) {
    try {
      const { selectBestFreeOpenRouterModel } = await import('@/lib/ai/providers/openrouter/router')
      selectedModel = await selectBestFreeOpenRouterModel()
    } catch {
      // health snapshot falls back to null model
    }
  }

  if (health.ready) {
    const snapshot = snapshotFromText(health)
    return { ...snapshot, selectedModel }
  }

  if (fallbackProviders.length > 0) {
    const fallback = fallbackProviders[0]
    return {
      provider: fallback,
      connected: true,
      authenticated: true,
      ready: true,
      healthy: true,
      selectedModel: null,
      reason: null,
      action: null,
    }
  }

  const snapshot = snapshotFromText(health)
  return { ...snapshot, selectedModel }
}

async function probePollinationsMedia(
  userId: string,
  options?: { forceRefresh?: boolean }
): Promise<{
  image: ProviderHealthSnapshot
  video: ProviderHealthSnapshot
  evaluation: V7VideoProviderCapabilityReport | null
  imageModel: string | null
  videoModel: string | null
}> {
  const catalog = await probePollinationsHealth({ forceRefresh: options?.forceRefresh })
  const evaluation = await evaluateV7VideoProviderCapability(
    pollinationsVideoProvider,
    buildProbeInput(userId),
    1
  )

  const ready =
    catalog.authenticated &&
    catalog.entitled &&
    catalog.imageReady &&
    catalog.videoReady &&
    evaluation.available
  const reason = ready
    ? null
    : catalog.code === 'POLLINATIONS_CREDITS_REQUIRED' ||
        catalog.code === 'POLLINATIONS_CREDITS_EXHAUSTED'
      ? (catalog.reason ?? 'POLLINATIONS_CREDITS_EXHAUSTED')
      : !catalog.videoReady
        ? catalog.reason ?? 'Pollinations video requires sufficient Pollen balance'
        : catalog.reason ?? evaluation.message ?? evaluation.reason ?? 'Pollinations unavailable'

  const imageSnapshot = snapshotFromPollinations({
    imageModel: catalog.imageModel,
    videoModel: catalog.videoModel,
    ready: catalog.imageReady,
    authenticated: catalog.authenticated,
    reason: catalog.imageReady ? null : reason,
  })

  const videoSnapshot = snapshotFromPollinations({
    imageModel: catalog.imageModel,
    videoModel: catalog.videoModel,
    ready: catalog.videoReady && evaluation.available && catalog.entitled,
    authenticated: catalog.authenticated,
    reason: catalog.videoReady && evaluation.available && catalog.entitled ? null : reason,
  })

  return {
    image: { ...imageSnapshot, selectedModel: catalog.imageModel },
    video: { ...videoSnapshot, selectedModel: catalog.videoModel },
    evaluation,
    imageModel: catalog.imageModel,
    videoModel: catalog.videoModel,
  }
}

export class ProviderManager {
  static refreshPollinationsState(userId?: string): void {
    clearPollinationsSpendableBalanceCache()
    invalidatePollinationsModelCache()
    invalidateVideoProviderCapabilityCache('pollinations', userId)
    if (userId?.trim()) {
      sessions.delete(userId.trim())
      return
    }
    sessions.clear()
  }

  static invalidate(userId?: string): void {
    ProviderManager.refreshPollinationsState(userId)
  }

  static async preflight(params: {
    userId: string
    productionId?: string
    forceRefresh?: boolean
  }): Promise<ProviderPreflightResult> {
    const userId = params.userId.trim()
    if (params.forceRefresh) {
      ProviderManager.refreshPollinationsState(userId)
    }
    const cached = sessions.get(userId)
    if (!params.forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.preflight
    }

    console.info('[provider-manager] preflight start', {
      userId,
      productionId: params.productionId ?? null,
    })

    const [text, media] = await Promise.all([
      probeTextProvider(),
      probePollinationsMedia(userId, { forceRefresh: params.forceRefresh }),
    ])

    const textReady: ProviderReadiness = text.ready ? 'READY' : 'NOT_READY'
    const imageReady: ProviderReadiness = media.image.ready ? 'READY' : 'NOT_READY'
    const videoReady: ProviderReadiness = media.video.ready ? 'READY' : 'NOT_READY'

    const result: ProviderPreflightResult = {
      text: textReady,
      image: imageReady,
      video: videoReady,
      ready: textReady === 'READY',
      textProvider: text.provider === 'pollinations' ? 'pollinations' : 'openrouter',
      imageProvider: 'pollinations',
      videoProvider: 'pollinations',
      providers: {
        text,
        image: media.image,
        video: media.video,
      },
      error:
        textReady !== 'READY'
          ? 'TEXT_PROVIDER_NOT_READY'
          : null,
    }

    sessions.set(userId, {
      expiresAt: Date.now() + SESSION_TTL_MS,
      preflight: result,
      pollinationsEvaluation: media.evaluation,
      pollinationsImageModel: media.imageModel,
      pollinationsVideoModel: media.videoModel,
    })

    console.info('[provider-manager] preflight complete', {
      userId,
      productionId: params.productionId ?? null,
      text: result.text,
      image: result.image,
      video: result.video,
      openRouterModel: text.selectedModel,
      pollinationsImageModel: media.imageModel,
      pollinationsVideoModel: media.videoModel,
    })

    return result
  }

  static async assertImageReady(params: {
    userId: string
    productionId?: string
    forceRefresh?: boolean
  }): Promise<ProviderPreflightResult> {
    if (params.forceRefresh) {
      ProviderManager.refreshPollinationsState(params.userId)
    }
    const report = await ProviderManager.preflight(params)
    if (report.image !== 'READY') {
      const { V7ImageProviderNotReadyError } = await import('@/lib/v7/providers/image-errors')
      throw new V7ImageProviderNotReadyError({
        reason: report.providers.image.reason ?? undefined,
        action: report.providers.image.action ?? undefined,
      })
    }
    return report
  }

  static async assertVideoReady(params: {
    userId: string
    productionId?: string
    forceRefresh?: boolean
  }): Promise<ProviderPreflightResult> {
    const report = await ProviderManager.preflight(params)
    if (report.video !== 'READY') {
      const { V7VideoProviderNotReadyError } = await import('@/lib/v7/providers/video-errors.server')
      throw new V7VideoProviderNotReadyError(report.providers.video)
    }
    return report
  }

  static async assertTextReady(params: { userId: string; productionId?: string }): Promise<ProviderPreflightResult> {
    const report = await ProviderManager.preflight(params)
    if (report.text !== 'READY') {
      const { TextProviderError } = await import('@/lib/ai/errors')
      const reason = report.providers.text.reason
      const provider = report.textProvider
      if (getAvailableProviders().length === 0) {
        throw new TextProviderError('TEXT_PROVIDER_NOT_CONFIGURED', provider, {
          message: 'No text provider API keys configured for this deployment',
        })
      }
      if (provider === 'openrouter' && !hasOpenRouterApiKey() && reason === 'OPENROUTER_AUTH_FAILED') {
        throw new TextProviderError('OPENROUTER_AUTH_FAILED', provider, {
          message: 'OpenRouter authentication is not configured for this deployment',
        })
      }
      throw new TextProviderError('TEXT_PROVIDER_NOT_READY', provider, {
        message: reason ?? 'Text provider not ready',
      })
    }
    return report
  }

  static getPollinationsEvaluation(userId: string): V7VideoProviderCapabilityReport | null {
    return sessions.get(userId.trim())?.pollinationsEvaluation ?? null
  }

  static getPollinationsSelectedModel(userId: string): string | null {
    return sessions.get(userId.trim())?.pollinationsVideoModel ?? null
  }

  static getPollinationsImageModel(userId: string): string | null {
    return sessions.get(userId.trim())?.pollinationsImageModel ?? null
  }
}
