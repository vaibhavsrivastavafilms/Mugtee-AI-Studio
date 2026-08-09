/**
 * Pure Pollinations video cost estimation — no network, no generation.
 * Pricing inputs come from live catalog parsing in catalog-live.server.ts.
 */

export type PollinationsResolutionLabel = '480p' | '720p' | '1080p' | 'unknown'

export type PollinationsVideoPricing = {
  currency: string
  perVideoSecond: number
  perRequest: number
  resolutionLabel: PollinationsResolutionLabel
  source: 'base' | 'variant' | 'fallback'
}

export type PollinationsVideoCatalogModel = {
  id: string
  title: string | null
  brand: string | null
  paidOnly: boolean
  questEligible: boolean
  supportsImageToVideo: boolean
  resolutions: PollinationsResolutionLabel[]
  videoCapabilities: string[]
  pricing: PollinationsVideoPricing
  /** Max seconds per API request when catalog omits limits (Pollinations video API accepts 2–15). */
  maxClipDurationSec: number
}

export type PollinationsVideoEstimateRequest = {
  durationSec: number
  width: number
  height: number
  imageToVideoOnly?: boolean
}

export type PollinationsVideoModelEstimate = {
  model: string
  title: string | null
  durationSec: number
  resolution: PollinationsResolutionLabel
  resolutionPx: string
  imageToVideo: boolean
  maxClipDurationSec: number
  clipsRequired: number
  clipDurationSec: number
  costPerClipPollen: number
  estimatedTotalPollen: number
  pricing: PollinationsVideoPricing
  questEligible: boolean
  paidOnly: boolean
}

export type PollinationsVideoEstimateResult = {
  requested: {
    durationSec: number
    width: number
    height: number
    imageToVideoOnly: boolean
    resolution: PollinationsResolutionLabel
  }
  catalogSource: string
  modelCount: number
  models: PollinationsVideoModelEstimate[]
  recommended: PollinationsVideoModelEstimate | null
  spendablePollen: number | null
  affordable: boolean | null
}

/** Pollinations video API duration cap used by Mugtee client (2–15 seconds). */
export const POLLINATIONS_VIDEO_MAX_CLIP_SECONDS = 15
export const POLLINATIONS_VIDEO_MIN_CLIP_SECONDS = 2

export function resolveResolutionLabel(width: number, height: number): PollinationsResolutionLabel {
  const short = Math.min(width, height)
  const long = Math.max(width, height)
  if (short >= 1080) return '1080p'
  if (short >= 720) return '720p'
  if (long <= 480 && short <= 480) return '480p'
  if (long <= 854) return '480p'
  return '480p'
}

/** Matches Mugtee Pollinations video dimension cap (see image-url.server.ts). */
export function capPollinationsVideoDimensions(
  width: number,
  height: number
): { width: number; height: number } {
  const maxLong = 1280
  const maxShort = 720
  const long = Math.max(width, height)
  const short = Math.min(width, height)
  if (long <= maxLong && short <= maxShort) {
    return { width: Math.round(width), height: Math.round(height) }
  }
  const scale = Math.min(maxLong / long, maxShort / short)
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

function readPricingFields(pricing: Record<string, unknown> | undefined): {
  perVideoSecond: number
  perRequest: number
  perImage: number
  currency: string
} {
  if (!pricing) {
    return { perVideoSecond: 0, perRequest: 0, perImage: 0, currency: 'pollen' }
  }
  const perVideoSecond = Number(pricing.completionVideoSeconds ?? NaN)
  const perImage = Number(pricing.completionImageTokens ?? NaN)
  const perRequest = Number(
    pricing.promptImageTokens ?? pricing.prompt ?? pricing.completion ?? 0
  )
  return {
    perVideoSecond: Number.isFinite(perVideoSecond) ? perVideoSecond : 0,
    perRequest: Number.isFinite(perRequest) ? perRequest : 0,
    perImage: Number.isFinite(perImage) ? perImage : 0,
    currency: typeof pricing.currency === 'string' ? pricing.currency : 'pollen',
  }
}

export function parsePollinationsVideoCatalogModel(
  raw: Record<string, unknown>,
  maxClipDurationSec = POLLINATIONS_VIDEO_MAX_CLIP_SECONDS
): PollinationsVideoCatalogModel | null {
  const id = typeof raw.name === 'string' ? raw.name : typeof raw.id === 'string' ? raw.id : ''
  if (!id.trim()) return null

  const category = typeof raw.category === 'string' ? raw.category.toLowerCase() : ''
  const outputs = Array.isArray(raw.output_modalities)
    ? raw.output_modalities.map((v) => String(v).toLowerCase())
    : []
  const isVideo = category === 'video' || outputs.includes('video')
  if (!isVideo) return null

  const inputs = Array.isArray(raw.input_modalities)
    ? raw.input_modalities.map((v) => String(v).toLowerCase())
    : []
  const videoCapabilities = Array.isArray(raw.video_capabilities)
    ? raw.video_capabilities.map((v) => String(v))
    : []
  const supportsImageToVideo =
    inputs.includes('image') &&
    (videoCapabilities.includes('start_frame') ||
      videoCapabilities.includes('end_frame') ||
      inputs.includes('text'))

  const resolutionsRaw = Array.isArray(raw.resolutions) ? raw.resolutions : []
  const resolutions = resolutionsRaw
    .map((v) => String(v).toLowerCase())
    .filter((v): v is PollinationsResolutionLabel =>
      v === '480p' || v === '720p' || v === '1080p'
    )

  const basePricing = readPricingFields(raw.pricing as Record<string, unknown> | undefined)

  return {
    id: id.trim(),
    title: typeof raw.title === 'string' ? raw.title : null,
    brand: typeof raw.brand === 'string' ? raw.brand : null,
    paidOnly: raw.paid_only === true,
    questEligible: raw.paid_only !== true,
    supportsImageToVideo,
    resolutions: resolutions.length > 0 ? resolutions : ['720p'],
    videoCapabilities,
    pricing: {
      currency: basePricing.currency,
      perVideoSecond: basePricing.perVideoSecond,
      perRequest: basePricing.perRequest,
      resolutionLabel: '720p',
      source: 'base',
    },
    maxClipDurationSec: maxClipDurationSec,
  }
}

export function selectPricingForResolution(
  model: PollinationsVideoCatalogModel,
  raw: Record<string, unknown>,
  resolution: PollinationsResolutionLabel
): PollinationsVideoPricing {
  const variants = Array.isArray(raw.pricing_variants)
    ? (raw.pricing_variants as Array<Record<string, unknown>>)
    : []

  const match = variants.find((variant) => {
    const name = String(variant.name ?? variant.label ?? '').toLowerCase()
    return name === resolution
  })

  if (match?.pricing && typeof match.pricing === 'object') {
    const fields = readPricingFields(match.pricing as Record<string, unknown>)
    return {
      currency: fields.currency,
      perVideoSecond: fields.perVideoSecond,
      perRequest: fields.perRequest,
      resolutionLabel: resolution,
      source: 'variant',
    }
  }

  const defaultLabel =
    typeof raw.pricing_default_label === 'string'
      ? raw.pricing_default_label.toLowerCase()
      : null
  if (defaultLabel) {
    const defaultMatch = variants.find((variant) => {
      const name = String(variant.name ?? variant.label ?? '').toLowerCase()
      return name === defaultLabel
    })
    if (defaultMatch?.pricing && typeof defaultMatch.pricing === 'object') {
      const fields = readPricingFields(defaultMatch.pricing as Record<string, unknown>)
      return {
        currency: fields.currency,
        perVideoSecond: fields.perVideoSecond,
        perRequest: fields.perRequest,
        resolutionLabel: defaultLabel as PollinationsResolutionLabel,
        source: 'variant',
      }
    }
  }

  return {
    ...model.pricing,
    resolutionLabel: resolution,
    source: model.pricing.perVideoSecond > 0 ? 'base' : 'fallback',
  }
}

export function computeClipPlan(params: {
  totalDurationSec: number
  maxClipDurationSec: number
}): { clipsRequired: number; clipDurationSec: number; clipDurations: number[] } {
  const total = Math.max(1, Math.round(params.totalDurationSec))
  const maxClip = Math.max(
    POLLINATIONS_VIDEO_MIN_CLIP_SECONDS,
    Math.min(POLLINATIONS_VIDEO_MAX_CLIP_SECONDS, Math.round(params.maxClipDurationSec))
  )

  const clipsRequired = Math.ceil(total / maxClip)
  const clipDurationSec = Math.ceil(total / clipsRequired)
  const clipDurations: number[] = []
  let remaining = total

  for (let i = 0; i < clipsRequired; i++) {
    const isLast = i === clipsRequired - 1
    const dur = isLast ? remaining : Math.min(maxClip, clipDurationSec)
    clipDurations.push(Math.max(POLLINATIONS_VIDEO_MIN_CLIP_SECONDS, dur))
    remaining -= dur
  }

  return { clipsRequired, clipDurationSec, clipDurations }
}

export function estimatePollenForClips(params: {
  pricing: PollinationsVideoPricing
  clipDurations: number[]
}): { costPerClipPollen: number; estimatedTotalPollen: number } {
  const clipCosts = params.clipDurations.map(
    (seconds) => params.pricing.perRequest + params.pricing.perVideoSecond * seconds
  )
  const estimatedTotalPollen = clipCosts.reduce((sum, value) => sum + value, 0)
  const costPerClipPollen =
    clipCosts.length > 0 ? estimatedTotalPollen / clipCosts.length : 0
  return { costPerClipPollen, estimatedTotalPollen }
}

export function estimateVideoModelCost(params: {
  model: PollinationsVideoCatalogModel
  raw: Record<string, unknown>
  request: PollinationsVideoEstimateRequest
}): PollinationsVideoModelEstimate | null {
  if (params.request.imageToVideoOnly && !params.model.supportsImageToVideo) {
    return null
  }

  const resolution = resolveResolutionLabel(params.request.width, params.request.height)
  if (
    params.model.resolutions.length > 0 &&
    !params.model.resolutions.includes(resolution) &&
    resolution !== 'unknown'
  ) {
    // Still estimate using closest pricing variant when model lists other resolutions.
  }

  const pricing = selectPricingForResolution(params.model, params.raw, resolution)
  const { clipsRequired, clipDurationSec, clipDurations } = computeClipPlan({
    totalDurationSec: params.request.durationSec,
    maxClipDurationSec: params.model.maxClipDurationSec,
  })
  const { costPerClipPollen, estimatedTotalPollen } = estimatePollenForClips({
    pricing,
    clipDurations,
  })

  return {
    model: params.model.id,
    title: params.model.title,
    durationSec: Math.round(params.request.durationSec),
    resolution,
    resolutionPx: `${params.request.width}x${params.request.height}`,
    imageToVideo: params.model.supportsImageToVideo,
    maxClipDurationSec: params.model.maxClipDurationSec,
    clipsRequired,
    clipDurationSec,
    costPerClipPollen,
    estimatedTotalPollen,
    pricing,
    questEligible: params.model.questEligible,
    paidOnly: params.model.paidOnly,
  }
}

export function buildPollinationsVideoEstimate(params: {
  catalog: Array<{ raw: Record<string, unknown>; model: PollinationsVideoCatalogModel }>
  request: PollinationsVideoEstimateRequest
  catalogSource: string
  spendablePollen?: number | null
}): PollinationsVideoEstimateResult {
  const resolution = resolveResolutionLabel(params.request.width, params.request.height)
  const models = params.catalog
    .map((entry) =>
      estimateVideoModelCost({
        model: entry.model,
        raw: entry.raw,
        request: params.request,
      })
    )
    .filter((entry): entry is PollinationsVideoModelEstimate => entry != null)
    .sort((a, b) => {
      if (a.estimatedTotalPollen !== b.estimatedTotalPollen) {
        return a.estimatedTotalPollen - b.estimatedTotalPollen
      }
      if (a.questEligible !== b.questEligible) return a.questEligible ? -1 : 1
      return a.model.localeCompare(b.model)
    })

  const recommended = models[0] ?? null
  const spendablePollen = params.spendablePollen ?? null
  const affordable =
    recommended && spendablePollen != null
      ? spendablePollen >= recommended.estimatedTotalPollen
      : null

  return {
    requested: {
      durationSec: Math.round(params.request.durationSec),
      width: params.request.width,
      height: params.request.height,
      imageToVideoOnly: Boolean(params.request.imageToVideoOnly),
      resolution,
    },
    catalogSource: params.catalogSource,
    modelCount: models.length,
    models,
    recommended,
    spendablePollen,
    affordable,
  }
}

export function formatPollinationsVideoEstimateReport(result: PollinationsVideoEstimateResult): string {
  const lines: string[] = []
  lines.push('--- Pollinations video cost estimate (live catalog, no generation) ---')
  lines.push(
    `Request: ${result.requested.durationSec}s @ ${result.requested.width}x${result.requested.height} (${result.requested.resolution})` +
      (result.requested.imageToVideoOnly ? ' [I2V only]' : '')
  )
  lines.push(`Catalog: ${result.catalogSource}`)
  lines.push(`Video models: ${result.modelCount}`)
  if (result.spendablePollen != null) {
    lines.push(`Spendable Pollen (account API): ${result.spendablePollen.toFixed(4)}`)
  }

  lines.push('')
  lines.push('Available video models:')
  for (const model of result.models) {
    lines.push(
      [
        `- ${model.model}`,
        `duration=${model.durationSec}s`,
        `resolution=${model.resolution} (${model.resolutionPx})`,
        `I2V=${model.imageToVideo ? 'yes' : 'no'}`,
        `maxClip=${model.maxClipDurationSec}s`,
        `clips=${model.clipsRequired}`,
        `cost/clip≈${model.costPerClipPollen.toFixed(4)}`,
        `total≈${model.estimatedTotalPollen.toFixed(4)} pollen`,
        `rate=${model.pricing.perVideoSecond}/s`,
        model.pricing.perRequest > 0 ? `+${model.pricing.perRequest}/req` : '',
      ]
        .filter(Boolean)
        .join(' | ')
    )
  }

  lines.push('')
  const rec = result.recommended
  if (!rec) {
    lines.push('Recommended model: (none matching filters)')
    return lines.join('\n')
  }

  lines.push('Summary (cheapest matching strategy):')
  lines.push(`Model: ${rec.model}`)
  lines.push(`Duration: ${rec.durationSec}s`)
  lines.push(`Resolution: ${rec.resolution} (${rec.resolutionPx})`)
  lines.push(`I2V: ${rec.imageToVideo ? 'yes' : 'no'}`)
  lines.push(`Clips required: ${rec.clipsRequired}`)
  lines.push(`Cost per clip: ${rec.costPerClipPollen.toFixed(4)} pollen`)
  lines.push(`Estimated total Pollen: ${rec.estimatedTotalPollen.toFixed(4)}`)
  lines.push(`Recommended model: ${rec.model}`)
  if (result.affordable != null) {
    lines.push(`Affordable now: ${result.affordable ? 'yes' : 'no'}`)
  }

  return lines.join('\n')
}

export type PollinationsImagePricing = {
  currency: string
  perImage: number
  perRequest: number
  resolutionLabel: PollinationsResolutionLabel
  source: 'base' | 'variant' | 'fallback'
}

export type PollinationsImageCatalogModel = {
  id: string
  title: string | null
  paidOnly: boolean
  questEligible: boolean
  resolutions: PollinationsResolutionLabel[]
  pricing: PollinationsImagePricing
}

export function parsePollinationsImageCatalogModel(
  raw: Record<string, unknown>
): PollinationsImageCatalogModel | null {
  const id = typeof raw.name === 'string' ? raw.name : typeof raw.id === 'string' ? raw.id : ''
  if (!id.trim()) return null

  const category = typeof raw.category === 'string' ? raw.category.toLowerCase() : ''
  const outputs = Array.isArray(raw.output_modalities)
    ? raw.output_modalities.map((v) => String(v).toLowerCase())
    : []
  const isImage = category === 'image' || (outputs.includes('image') && !outputs.includes('video'))
  if (!isImage) return null

  const resolutionsRaw = Array.isArray(raw.resolutions) ? raw.resolutions : []
  const resolutions = resolutionsRaw
    .map((v) => String(v).toLowerCase())
    .filter((v): v is PollinationsResolutionLabel =>
      v === '480p' || v === '720p' || v === '1080p'
    )

  const basePricing = readPricingFields(raw.pricing as Record<string, unknown> | undefined)
  const perImage =
    basePricing.perImage > 0
      ? basePricing.perImage
      : basePricing.perRequest > 0
        ? basePricing.perRequest
        : 0

  return {
    id: id.trim(),
    title: typeof raw.title === 'string' ? raw.title : null,
    paidOnly: raw.paid_only === true,
    questEligible: raw.paid_only !== true,
    resolutions: resolutions.length > 0 ? resolutions : ['720p'],
    pricing: {
      currency: basePricing.currency,
      perImage,
      perRequest: basePricing.perRequest,
      resolutionLabel: '720p',
      source: perImage > 0 ? 'base' : 'fallback',
    },
  }
}

export function selectImagePricingForResolution(
  model: PollinationsImageCatalogModel,
  raw: Record<string, unknown>,
  resolution: PollinationsResolutionLabel
): PollinationsImagePricing {
  const variants = Array.isArray(raw.pricing_variants)
    ? (raw.pricing_variants as Array<Record<string, unknown>>)
    : []

  const match = variants.find((variant) => {
    const name = String(variant.name ?? variant.label ?? '').toLowerCase()
    return name === resolution
  })

  if (match?.pricing && typeof match.pricing === 'object') {
    const fields = readPricingFields(match.pricing as Record<string, unknown>)
    const perImage =
      fields.perImage > 0 ? fields.perImage : fields.perRequest > 0 ? fields.perRequest : 0
    return {
      currency: fields.currency,
      perImage,
      perRequest: fields.perRequest,
      resolutionLabel: resolution,
      source: 'variant',
    }
  }

  return {
    ...model.pricing,
    resolutionLabel: resolution,
    source: model.pricing.perImage > 0 ? 'base' : 'fallback',
  }
}

export function estimatePollenForImageRequest(pricing: PollinationsImagePricing): number {
  return pricing.perImage + pricing.perRequest
}

export function selectCheapestPollinationsImageModel(params: {
  catalog: Array<{ raw: Record<string, unknown>; model: PollinationsImageCatalogModel }>
  width: number
  height: number
}): { model: PollinationsImageCatalogModel; raw: Record<string, unknown>; pricing: PollinationsImagePricing } | null {
  const resolution = resolveResolutionLabel(params.width, params.height)
  const ranked = params.catalog
    .map((entry) => {
      const pricing = selectImagePricingForResolution(entry.model, entry.raw, resolution)
      const cost = estimatePollenForImageRequest(pricing)
      return { ...entry, pricing, cost }
    })
    .filter((entry) => entry.cost > 0 || entry.pricing.source !== 'fallback')
    .sort((a, b) => {
      if (a.cost !== b.cost) return a.cost - b.cost
      if (a.model.questEligible !== b.model.questEligible) return a.model.questEligible ? -1 : 1
      return a.model.id.localeCompare(b.model.id)
    })

  const best = ranked[0]
  if (!best) return null
  return { model: best.model, raw: best.raw, pricing: best.pricing }
}

export function selectCheapestPollinationsVideoModelEntry(params: {
  catalog: Array<{ raw: Record<string, unknown>; model: PollinationsVideoCatalogModel }>
  width: number
  height: number
  imageToVideoOnly?: boolean
}): { model: PollinationsVideoCatalogModel; raw: Record<string, unknown> } | null {
  const request: PollinationsVideoEstimateRequest = {
    durationSec: 1,
    width: params.width,
    height: params.height,
    imageToVideoOnly: params.imageToVideoOnly ?? true,
  }
  const estimate = buildPollinationsVideoEstimate({
    catalog: params.catalog,
    request,
    catalogSource: 'selection',
  })
  const recommended = estimate.recommended
  if (!recommended) return null
  const entry = params.catalog.find((item) => item.model.id === recommended.model)
  if (!entry) return null
  return entry
}

export function estimateSceneVideoPollen(params: {
  model: PollinationsVideoCatalogModel
  raw: Record<string, unknown>
  durationSec: number
  width: number
  height: number
}): {
  clipsRequired: number
  clipDurations: number[]
  costPerClipPollen: number
  estimatedTotalPollen: number
  pricing: PollinationsVideoPricing
} {
  const resolution = resolveResolutionLabel(params.width, params.height)
  const pricing = selectPricingForResolution(params.model, params.raw, resolution)
  const { clipsRequired, clipDurations } = computeClipPlan({
    totalDurationSec: params.durationSec,
    maxClipDurationSec: params.model.maxClipDurationSec,
  })
  const { costPerClipPollen, estimatedTotalPollen } = estimatePollenForClips({
    pricing,
    clipDurations,
  })
  return { clipsRequired, clipDurations, costPerClipPollen, estimatedTotalPollen, pricing }
}
