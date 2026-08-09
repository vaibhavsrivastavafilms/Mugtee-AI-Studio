import 'server-only'

export type DiscoveredVideoModel = {
  id: string
  available: boolean
  free: boolean
  priority: number
}

export type VideoModelSelectionResult = {
  provider: string
  selectedModel: string
  fallbackFrom?: string
  reason: string
  discoveredModels: string[]
  eligibleModels: string[]
  skipped: Array<{ model: string; reason: string }>
}

export type V7VideoProviderAvailableVideoModels = {
  models: DiscoveredVideoModel[]
  preferred?: DiscoveredVideoModel
}

const TIER_SCORE: Array<{ pattern: RegExp; score: number }> = [
  { pattern: /flash/i, score: 600 },
  { pattern: /turbo/i, score: 500 },
  { pattern: /\bfast\b/i, score: 450 },
  { pattern: /lite/i, score: 400 },
  { pattern: /plus|standard|pro|default/i, score: 300 },
  { pattern: /preview/i, score: 200 },
  { pattern: /experimental|beta|alpha|dev/i, score: 100 },
]

const VIDEO_CAPABILITY_HINT =
  /i2v|image.?to.?video|frame.?to.?video|video.?generation|video.?synthesis|animate|motion|vg/i

export function scoreFreeVideoModelPriority(modelId: string): number {
  const normalized = modelId.toLowerCase()
  let score = 0

  for (const tier of TIER_SCORE) {
    if (tier.pattern.test(normalized)) {
      score = Math.max(score, tier.score)
    }
  }

  if (score === 0) score = 250

  if (VIDEO_CAPABILITY_HINT.test(normalized)) score += 40
  if (/i2v|frame.?to.?video|image.?to.?video/i.test(normalized)) score += 30

  const dottedVersion = normalized.match(/(\d+)\.(\d+)/)
  if (dottedVersion) {
    score += Number.parseInt(dottedVersion[1], 10) * 3
    score += Number.parseInt(dottedVersion[2], 10)
  }

  const dashedVersion = normalized.match(/(\d+)-(\d+)/)
  if (dashedVersion) {
    score += Number.parseInt(dashedVersion[1], 10) * 3
    score += Number.parseInt(dashedVersion[2], 10)
  }

  return score
}

export function buildDiscoveredVideoModel(
  id: string,
  params?: { available?: boolean; free?: boolean }
): DiscoveredVideoModel {
  return {
    id,
    available: params?.available ?? true,
    free: params?.free ?? true,
    priority: scoreFreeVideoModelPriority(id),
  }
}

export function sortDiscoveredVideoModels(models: DiscoveredVideoModel[]): DiscoveredVideoModel[] {
  return [...models].sort((left, right) => {
    if (right.priority !== left.priority) return right.priority - left.priority
    return left.id.localeCompare(right.id)
  })
}

export function orderVideoModelsWithPreference(
  models: DiscoveredVideoModel[],
  preferredId?: string
): DiscoveredVideoModel[] {
  const sorted = sortDiscoveredVideoModels(models.filter((model) => model.available))
  if (!preferredId?.trim()) return sorted

  const preferred = preferredId.trim()
  const preferredIndex = sorted.findIndex((model) => model.id === preferred)
  if (preferredIndex <= 0) return sorted

  const copy = [...sorted]
  const [match] = copy.splice(preferredIndex, 1)
  copy.unshift(match)
  return copy
}

export function discoveredModelsFromIds(ids: string[]): DiscoveredVideoModel[] {
  return sortDiscoveredVideoModels(ids.map((id) => buildDiscoveredVideoModel(id)))
}

export function availableVideoModelsFromSingleId(id: string): V7VideoProviderAvailableVideoModels {
  const model = buildDiscoveredVideoModel(id)
  return { models: [model], preferred: model }
}

export function logVideoModelSelection(selection: VideoModelSelectionResult): void {
  console.info('[video-model-discovery] selection', selection)
}
