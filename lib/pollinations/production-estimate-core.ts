/**
 * Mugtee production Pollinations cost estimate — read-only, no generation.
 */

import { aspectRatioToDimensions } from '@/agents/image/schema'
import type { PollinationsLiveFullCatalog } from '@/lib/pollinations/catalog-live.server'
import {
  capPollinationsVideoDimensions,
  estimatePollenForImageRequest,
  estimateSceneVideoPollen,
  resolveResolutionLabel,
  selectCheapestPollinationsImageModel,
  selectCheapestPollinationsVideoModelEntry,
  type PollinationsImagePricing,
  type PollinationsVideoPricing,
} from '@/lib/pollinations/video-estimate-core'
import { buildV7ScenePackages } from '@/lib/v7/scene-package.server'
import type { V7ProductionSnapshot } from '@/types/v7/production'

export const PRODUCTION_ESTIMATE_SAFETY_BUFFER = 0.2

export type MugteeProductionMediaFacts = {
  productionId: string
  title: string
  status: string
  currentStage: string | null
  sceneCount: number
  scenes: Array<{
    sceneNumber: number
    durationSec: number
    hasImage: boolean
    hasVideo: boolean
    imageProvider: string | null
    videoProvider: string | null
  }>
  totalSceneDurationSec: number
  briefDurationSec: number | null
  imageRequestCount: number
  imageWidth: number
  imageHeight: number
  videoWidth: number
  videoHeight: number
  aspectRatio: string
  narrationDurationSec: number
  musicDurationSec: number
  voiceUsesPollinations: boolean
  musicUsesPollinations: boolean
}

export type MugteeSceneVideoCostEstimate = {
  sceneNumber: number
  durationSec: number
  clipsRequired: number
  clipDurations: number[]
  estimatedPollen: number
  costPerClipPollen: number
}

export type MugteeProductionPollinationsEstimate = {
  facts: MugteeProductionMediaFacts
  catalogSource: string
  recommendedVideoModel: string | null
  recommendedImageModel: string | null
  sceneVideos: MugteeSceneVideoCostEstimate[]
  videoTotalPollen: number
  videoRequestCount: number
  imageRequestCount: number
  imageCostPerRequestPollen: number
  imageTotalPollen: number
  imagePricing: PollinationsImagePricing | null
  videoPricing: PollinationsVideoPricing | null
  voiceUsesPollinations: boolean
  voiceCostPollen: number
  musicUsesPollinations: boolean
  musicCostPollen: number
  totals: {
    video: number
    images: number
    voice: number
    music: number
    production: number
    safetyBufferPollen: number
    recommendedBalancePollen: number
  }
}

export function extractMugteeProductionMediaFacts(
  snapshot: V7ProductionSnapshot
): MugteeProductionMediaFacts {
  const brief = snapshot.production.creative_brief
  const aspectRatio = brief?.aspectRatio ?? '9:16'
  const imageDims = aspectRatioToDimensions(aspectRatio)
  const cappedVideo = capPollinationsVideoDimensions(imageDims.width, imageDims.height)
  const packages = buildV7ScenePackages(snapshot)

  const scenes = packages.map((pkg) => ({
    sceneNumber: pkg.sceneNumber,
    durationSec: pkg.durationSec,
    hasImage: Boolean(pkg.imageUrl),
    hasVideo: Boolean(pkg.videoUrl),
    imageProvider: pkg.imageProvider,
    videoProvider: pkg.videoProvider,
  }))

  const totalSceneDurationSec = scenes.reduce((sum, scene) => sum + scene.durationSec, 0)
  const briefDurationSec = brief?.duration ?? null
  const musicDurationSec = briefDurationSec ?? totalSceneDurationSec

  return {
    productionId: snapshot.production.id,
    title: snapshot.production.title,
    status: snapshot.production.status,
    currentStage: snapshot.production.current_stage,
    sceneCount: scenes.length,
    scenes,
    totalSceneDurationSec,
    briefDurationSec,
    imageRequestCount: scenes.length,
    imageWidth: imageDims.width,
    imageHeight: imageDims.height,
    videoWidth: cappedVideo.width,
    videoHeight: cappedVideo.height,
    aspectRatio,
    narrationDurationSec: totalSceneDurationSec,
    musicDurationSec,
    voiceUsesPollinations: false,
    musicUsesPollinations: false,
  }
}

export function buildMugteeProductionPollinationsEstimate(params: {
  facts: MugteeProductionMediaFacts
  catalog: PollinationsLiveFullCatalog
}): MugteeProductionPollinationsEstimate {
  const videoModelEntry = selectCheapestPollinationsVideoModelEntry({
    catalog: params.catalog.videoEntries,
    width: params.facts.videoWidth,
    height: params.facts.videoHeight,
    imageToVideoOnly: true,
  })

  const imageModelEntry = selectCheapestPollinationsImageModel({
    catalog: params.catalog.imageEntries,
    width: params.facts.imageWidth,
    height: params.facts.imageHeight,
  })

  const sceneVideos: MugteeSceneVideoCostEstimate[] = []
  let videoTotalPollen = 0
  let videoRequestCount = 0
  let videoPricing: PollinationsVideoPricing | null = null

  if (videoModelEntry) {
    for (const scene of params.facts.scenes) {
      const estimate = estimateSceneVideoPollen({
        model: videoModelEntry.model,
        raw: videoModelEntry.raw,
        durationSec: scene.durationSec,
        width: params.facts.videoWidth,
        height: params.facts.videoHeight,
      })
      videoPricing = estimate.pricing
      videoRequestCount += estimate.clipsRequired
      videoTotalPollen += estimate.estimatedTotalPollen
      sceneVideos.push({
        sceneNumber: scene.sceneNumber,
        durationSec: scene.durationSec,
        clipsRequired: estimate.clipsRequired,
        clipDurations: estimate.clipDurations,
        estimatedPollen: estimate.estimatedTotalPollen,
        costPerClipPollen: estimate.costPerClipPollen,
      })
    }
  }

  const imagePricing = imageModelEntry?.pricing ?? null
  const imageCostPerRequestPollen = imagePricing ? estimatePollenForImageRequest(imagePricing) : 0
  const imageTotalPollen = imageCostPerRequestPollen * params.facts.imageRequestCount

  const voiceCostPollen = 0
  const musicCostPollen = 0
  const productionTotal = videoTotalPollen + imageTotalPollen + voiceCostPollen + musicCostPollen
  const safetyBufferPollen = productionTotal * PRODUCTION_ESTIMATE_SAFETY_BUFFER

  return {
    facts: params.facts,
    catalogSource: `${params.catalog.source} @ ${params.catalog.fetchedAt}`,
    recommendedVideoModel: videoModelEntry?.model.id ?? null,
    recommendedImageModel: imageModelEntry?.model.id ?? null,
    sceneVideos,
    videoTotalPollen,
    videoRequestCount,
    imageRequestCount: params.facts.imageRequestCount,
    imageCostPerRequestPollen,
    imageTotalPollen,
    imagePricing,
    videoPricing,
    voiceUsesPollinations: false,
    voiceCostPollen,
    musicUsesPollinations: false,
    musicCostPollen,
    totals: {
      video: videoTotalPollen,
      images: imageTotalPollen,
      voice: voiceCostPollen,
      music: musicCostPollen,
      production: productionTotal,
      safetyBufferPollen,
      recommendedBalancePollen: productionTotal + safetyBufferPollen,
    },
  }
}

function fmtPollen(value: number): string {
  if (value > 0 && value < 0.0001) return value.toFixed(8)
  if (value > 0 && value < 0.01) return value.toFixed(6)
  return value.toFixed(4)
}

export function formatMugteeProductionPollinationsEstimateReport(
  estimate: MugteeProductionPollinationsEstimate
): string {
  const lines: string[] = []
  const { facts, totals } = estimate

  lines.push('### PRODUCTION COST')
  lines.push('')
  lines.push(`Production: ${facts.title} (${facts.productionId})`)
  lines.push(`Status: ${facts.status}${facts.currentStage ? ` @ ${facts.currentStage}` : ''}`)
  lines.push(`Scenes: ${facts.sceneCount}`)
  lines.push(`Scene durations (s): ${facts.scenes.map((s) => s.durationSec).join(', ')}`)
  lines.push(`Total scene duration: ${facts.totalSceneDurationSec}s`)
  lines.push(`Brief duration: ${facts.briefDurationSec ?? 'n/a'}s`)
  lines.push(`Aspect ratio: ${facts.aspectRatio}`)
  lines.push(
    `Image resolution: ${facts.imageWidth}x${facts.imageHeight} (${resolveResolutionLabel(facts.imageWidth, facts.imageHeight)})`
  )
  lines.push(
    `Video resolution: ${facts.videoWidth}x${facts.videoHeight} (${resolveResolutionLabel(facts.videoWidth, facts.videoHeight)})`
  )
  lines.push(`Narration duration (est.): ${facts.narrationDurationSec}s`)
  lines.push(`Music duration (est.): ${facts.musicDurationSec}s`)
  lines.push(`Catalog: ${estimate.catalogSource}`)
  lines.push(`Recommended video model: ${estimate.recommendedVideoModel ?? 'n/a'}`)
  lines.push(`Recommended image model: ${estimate.recommendedImageModel ?? 'n/a'}`)
  lines.push(`Pollinations video API requests (clips): ${estimate.videoRequestCount}`)
  lines.push('')

  lines.push('### VIDEO')
  lines.push('')
  if (estimate.sceneVideos.length === 0) {
    lines.push('(no video models matched I2V filters)')
  } else {
    for (const scene of estimate.sceneVideos) {
      const clipNote =
        scene.clipsRequired > 1
          ? ` (${scene.clipsRequired} clips: ${scene.clipDurations.join('+')}s)`
          : ''
      lines.push(
        `Scene ${scene.sceneNumber}: ${fmtPollen(scene.estimatedPollen)} Pollen${clipNote}`
      )
    }
  }
  lines.push('')
  lines.push(`Video total: ${fmtPollen(totals.video)} Pollen`)
  lines.push('')

  lines.push('### IMAGES')
  lines.push('')
  lines.push(`Actual image requests: ${estimate.imageRequestCount}`)
  lines.push(`Estimated cost: ${fmtPollen(totals.images)} Pollen`)
  if (estimate.imagePricing) {
    lines.push(
      `Rate: ${fmtPollen(estimate.imageCostPerRequestPollen)} pollen/request @ ${estimate.imagePricing.resolutionLabel}`
    )
  }
  lines.push('')

  lines.push('### VOICE')
  lines.push('')
  lines.push(`Pollinations used: ${estimate.voiceUsesPollinations ? 'YES' : 'NO'}`)
  lines.push(`Estimated cost: ${fmtPollen(totals.voice)} Pollen`)
  lines.push(`Narration duration: ${facts.narrationDurationSec}s (TTS cascade — not Pollinations)`)
  lines.push('')

  lines.push('### MUSIC')
  lines.push('')
  lines.push(`Pollinations used: ${estimate.musicUsesPollinations ? 'YES' : 'NO'}`)
  lines.push(`Estimated cost: ${fmtPollen(totals.music)} Pollen`)
  lines.push(`Music duration: ${facts.musicDurationSec}s (MusicGen / royalty-free — not Pollinations)`)
  lines.push('')

  lines.push('### TOTAL')
  lines.push('')
  lines.push(`Video: ${fmtPollen(totals.video)}`)
  lines.push(`Images: ${fmtPollen(totals.images)}`)
  lines.push(`Voice: ${fmtPollen(totals.voice)}`)
  lines.push(`Music: ${fmtPollen(totals.music)}`)
  lines.push('')
  lines.push('------------------')
  lines.push('')
  lines.push(`TOTAL PRODUCTION:`)
  lines.push(`${fmtPollen(totals.production)} Pollen`)
  lines.push('')
  lines.push(`20% safety buffer:`)
  lines.push(`${fmtPollen(totals.safetyBufferPollen)} Pollen`)
  lines.push('')
  lines.push(`RECOMMENDED BALANCE:`)
  lines.push(`${fmtPollen(totals.recommendedBalancePollen)} Pollen`)

  return lines.join('\n')
}
