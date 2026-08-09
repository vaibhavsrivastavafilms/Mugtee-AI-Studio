import 'server-only'

import type { OpenArtMcpTool } from '@/lib/openart/mcp-client.server'

export type OpenArtDiscoveredTools = {
  imageTool?: OpenArtMcpTool
  imageEditTool?: OpenArtMcpTool
  videoTool?: OpenArtMcpTool
  imageToVideoTool?: OpenArtMcpTool
  modelListTool?: OpenArtMcpTool
  workspaceTool?: OpenArtMcpTool
  creditsTool?: OpenArtMcpTool
  allTools: OpenArtMcpTool[]
}

export function normalizeOpenArtModelId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ')
}

export function compactOpenArtModelId(value: string): string {
  return normalizeOpenArtModelId(value).replace(/\s+/g, '')
}

function normalize(value: string): string {
  return normalizeOpenArtModelId(value)
}

function scoreTool(tool: OpenArtMcpTool, includes: string[], excludes: string[] = []): number {
  const haystack = normalize(`${tool.name} ${tool.description ?? ''}`)
  let score = 0
  for (const token of includes) {
    if (haystack.includes(token)) score += 2
  }
  for (const token of excludes) {
    if (haystack.includes(token)) score -= 3
  }
  return score
}

export function discoverOpenArtTools(tools: OpenArtMcpTool[]): OpenArtDiscoveredTools {
  const sorted = [...tools].sort((a, b) => a.name.localeCompare(b.name))

  const modelListTool =
    sorted.find((tool) => scoreTool(tool, ['list', 'model'], ['project']) >= 4) ??
    sorted.find((tool) => normalize(tool.name).includes('model'))

  const imageTool =
    sorted
      .map((tool) => ({ tool, score: scoreTool(tool, ['image', 'generate', 'text'], ['video', 'list', 'upload', 'project', 'credit']) }))
      .sort((a, b) => b.score - a.score)
      .find((row) => row.score >= 4)?.tool ??
    sorted.find((tool) => /generate.*image|image.*generate|text.*image/i.test(tool.name))

  const imageEditTool =
    sorted
      .map((tool) => ({
        tool,
        score: scoreTool(tool, ['edit', 'image'], ['video', 'list', 'project', 'credit']),
      }))
      .sort((a, b) => b.score - a.score)
      .find((row) => row.score >= 4)?.tool

  const workspaceTool =
    sorted
      .map((tool) => ({ tool, score: scoreTool(tool, ['workspace', 'account', 'profile'], ['project']) }))
      .sort((a, b) => b.score - a.score)
      .find((row) => row.score >= 4)?.tool ??
    sorted.find((tool) => /workspace|account/i.test(tool.name))

  const creditsTool =
    sorted
      .map((tool) => ({ tool, score: scoreTool(tool, ['credit', 'balance', 'quota'], ['project']) }))
      .sort((a, b) => b.score - a.score)
      .find((row) => row.score >= 4)?.tool ??
    sorted.find((tool) => /credit|balance|quota/i.test(tool.name))

  const imageToVideoTool =
    sorted
      .map((tool) => ({
        tool,
        score: scoreTool(tool, ['video', 'image'], ['list', 'project', 'credit']) +
          (normalize(`${tool.name} ${tool.description ?? ''}`).includes('image to video') ? 3 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .find((row) => row.score >= 5)?.tool

  const videoTool =
    imageToVideoTool ??
    sorted
      .map((tool) => ({ tool, score: scoreTool(tool, ['video', 'generate'], ['list', 'project', 'credit', 'image to']) }))
      .sort((a, b) => b.score - a.score)
      .find((row) => row.score >= 4)?.tool

  return {
    imageTool,
    imageEditTool,
    videoTool,
    imageToVideoTool,
    modelListTool,
    workspaceTool,
    creditsTool,
    allTools: sorted,
  }
}

function collectModelStrings(value: unknown, bucket: Set<string>, kind: 'image' | 'video') {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length >= 2 && trimmed.length <= 120 && !/^https?:\/\//i.test(trimmed)) {
      bucket.add(trimmed)
    }
    return
  }
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((entry) => collectModelStrings(entry, bucket, kind))
    return
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (/model|name|id|slug/i.test(key)) collectModelStrings(nested, bucket, kind)
    else if (typeof nested === 'object') collectModelStrings(nested, bucket, kind)
  }
}

export function parseModelsFromMcpResult(
  result: {
    content?: Array<Record<string, unknown>>
    structuredContent?: Record<string, unknown>
  },
  kind: 'image' | 'video'
): string[] {
  const models = new Set<string>()
  const text = result.content?.map((item) => (typeof item.text === 'string' ? item.text : '')).join('\n') ?? ''

  if (text.trim()) {
    try {
      collectModelStrings(JSON.parse(text), models, kind)
    } catch {
      for (const line of text.split('\n')) {
        const trimmed = line.replace(/^[-*•\d.)\s]+/, '').trim()
        if (!trimmed || trimmed.length > 120) continue
        if (/model|name|id/i.test(trimmed) && trimmed.includes(':')) {
          const value = trimmed.split(':').slice(1).join(':').trim()
          if (value) models.add(value)
          continue
        }
        if (/^[a-z0-9][a-z0-9._-]{1,80}$/i.test(trimmed)) models.add(trimmed)
      }
    }
  }

  collectModelStrings(result.structuredContent, models, kind)

  const filtered = [...models].filter((model) => {
    const normalized = normalizeOpenArtModelId(model)
    if (kind === 'video') {
      return /video|i2v|animate|motion|frame|wan|seedance|runway|ltx|mochi|cog/i.test(normalized)
    }
    return /image|flux|sdxl|dalle|gpt|photo|portrait/i.test(normalized) || normalized.length >= 3
  })

  return filtered.length ? filtered : [...models]
}

export function extractGenerationIdFromMcpResult(result: {
  content?: Array<Record<string, unknown>>
  structuredContent?: Record<string, unknown>
}): string | null {
  const candidates: string[] = []

  const walk = (value: unknown) => {
    if (typeof value === 'string') {
      if (/^[a-zA-Z0-9_-]{8,}$/.test(value.trim())) candidates.push(value.trim())
      return
    }
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (/generation|task|job|request|id/i.test(key) && typeof nested === 'string') {
        candidates.push(nested.trim())
      }
      walk(nested)
    }
  }

  walk(result.structuredContent)
  for (const item of result.content ?? []) {
    walk(item)
    if (typeof item.text === 'string') walk(item.text)
  }

  return candidates.find((value) => value.length >= 8) ?? null
}

export function extractUrlsFromMcpResult(result: {
  content?: Array<Record<string, unknown>>
  structuredContent?: Record<string, unknown>
}): string[] {
  const urls = new Set<string>()

  const add = (value: unknown) => {
    if (typeof value !== 'string') return
    const trimmed = value.trim()
    if (/^https?:\/\//i.test(trimmed)) urls.add(trimmed)
  }

  const walk = (value: unknown) => {
    if (typeof value === 'string') {
      add(value)
      const matches = value.match(/https?:\/\/[^\s"'<>]+/gi)
      matches?.forEach((match) => add(match))
      return
    }
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (/url|uri|link|download|output|asset|video|image/i.test(key)) add(nested)
      walk(nested)
    }
  }

  for (const item of result.content ?? []) {
    walk(item)
    if (typeof item.text === 'string') walk(item.text)
    if (item.resource && typeof item.resource === 'object') {
      const resource = item.resource as Record<string, unknown>
      add(resource.uri)
      add(resource.url)
    }
  }

  walk(result.structuredContent)
  return [...urls]
}

export function pickMediaUrl(urls: string[], kind: 'image' | 'video'): string | null {
  const videoExt = /\.(mp4|webm|mov|m4v)(\?|$)/i
  const imageExt = /\.(png|jpe?g|webp|gif)(\?|$)/i

  const scored = urls.map((url) => {
    let score = 0
    if (kind === 'video') {
      if (videoExt.test(url)) score += 5
      if (/video|clip|render|output/i.test(url)) score += 2
      if (imageExt.test(url)) score -= 3
    } else {
      if (imageExt.test(url)) score += 5
      if (/image|still|frame|thumbnail/i.test(url)) score += 2
      if (videoExt.test(url)) score -= 3
    }
    return { url, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.find((row) => row.score > 0)?.url ?? urls[0] ?? null
}

export function buildOpenArtImageToolArgs(params: {
  prompt: string
  aspectRatio: string
  width: number
  height: number
  referenceImageUrls?: string[]
  negativePrompt?: string
  model?: string
}): Record<string, unknown> {
  const args: Record<string, unknown> = {
    prompt: params.prompt,
    aspect_ratio: params.aspectRatio,
    width: params.width,
    height: params.height,
  }
  if (params.negativePrompt?.trim()) args.negative_prompt = params.negativePrompt
  if (params.model?.trim()) args.model = params.model
  const reference = params.referenceImageUrls?.find((url) => url?.trim())
  if (reference) {
    args.reference_image_url = reference
    args.image_url = reference
    args.reference_images = params.referenceImageUrls
  }
  return args
}

export function buildOpenArtVideoToolArgs(params: {
  prompt: string
  imageUrl: string
  durationSec: number
  aspectRatio: string
  width: number
  height: number
  cameraMovement?: string
  model?: string
  narration?: string
  dialogue?: string
  continuityId?: string
  promptArchive?: Record<string, unknown>
  negativePrompt?: string
}): Record<string, unknown> {
  const archive = params.promptArchive ?? {}
  const sceneDescription =
    (typeof archive.sceneDescription === 'string' && archive.sceneDescription) ||
    (typeof archive.action === 'string' && archive.action) ||
    params.prompt

  const args: Record<string, unknown> = {
    prompt: params.prompt,
    scene_description: sceneDescription,
    image_url: params.imageUrl,
    start_frame_url: params.imageUrl,
    reference_image_url: params.imageUrl,
    duration: params.durationSec,
    duration_sec: params.durationSec,
    aspect_ratio: params.aspectRatio,
    width: params.width,
    height: params.height,
  }

  if (params.cameraMovement?.trim()) {
    args.camera_movement = params.cameraMovement
    args.motion_notes = params.cameraMovement
  }
  if (params.narration?.trim()) args.narration = params.narration
  if (params.dialogue?.trim()) args.dialogue = params.dialogue
  if (params.continuityId?.trim()) args.continuity_id = params.continuityId
  if (params.negativePrompt?.trim()) args.negative_prompt = params.negativePrompt
  if (params.model?.trim()) args.model = params.model

  const emotion = archive.emotion ?? archive.mood
  if (typeof emotion === 'string' && emotion.trim()) args.emotion = emotion.trim()

  const lighting = archive.lighting ?? archive.lightingStyle
  if (typeof lighting === 'string' && lighting.trim()) args.lighting = lighting.trim()

  const characterBible = archive.characterBible ?? archive.character_bible
  if (characterBible) args.character_bible = characterBible

  const environmentBible = archive.environmentBible ?? archive.worldBible ?? archive.environment_bible
  if (environmentBible) args.environment_bible = environmentBible

  return args
}
