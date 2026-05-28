import { v4 as uuidv4 } from 'uuid'
import type { CinematicNiche } from '@/lib/cinematic/niches'
import { NICHE_PROFILES } from '@/lib/cinematic/niches'
import { scenePacingRole, type RegenSceneInput } from '@/lib/cinematic/regen-context'
import {
  composeVisualPrompt,
  defaultVisualDirection,
  NICHE_VISUAL,
  type SceneVisualDirection,
} from '@/lib/cinematic/visual-direction'
import type { StoryboardImage } from '@/stores/cinematic-project'
import { buildStoryboardContinuityBlock } from '@/lib/cinematic/execution/cinematic-storyboard-engine'
import { cinematicWorldLighting } from '@/lib/cinematic/execution/cinematic-lighting-engine'
import {
  generateOpenAISceneImage,
  hasImageGenerationKey,
  persistRemoteImage,
  uploadImageBuffer,
} from '@/lib/ai/generate-scene-image'

export const STORYBOARD_VARIANTS = [
  {
    label: 'Primary frame',
    framing:
      'Primary storyboard frame — establish the scene beat with clear cinematic composition.',
  },
  {
    label: 'Alt composition',
    framing:
      'Alternate storyboard angle — secondary framing, same emotional tone and palette.',
  },
  {
    label: 'Emotional close',
    framing:
      'Intimate storyboard detail — close emotional read, texture, or symbolic insert.',
  },
] as const

const EMERGENT_LLM_KEY = process.env.EMERGENT_LLM_KEY
const EMERGENT_URL = 'https://integrations.emergentagent.com/llm/chat/completions'
const IMAGE_MODEL = 'gemini/gemini-2.5-flash-image'

const BANNED_PROMPT_FRAGMENTS = [
  /masterpiece/i,
  /8k ultra/i,
  /trending on artstation/i,
  /hyper.?realistic/i,
  /unreal engine/i,
  /midjourney/i,
  /octane render/i,
]

export type StoryboardGenerationInput = {
  scene: RegenSceneInput
  sceneIndex: number
  totalScenes: number
  niche: CinematicNiche
  style: string
  projectPrompt: string
  hook?: string
  /** Prior scenes for visual continuity (optional). */
  allScenes?: RegenSceneInput[]
}

export function buildNicheStyleLock(niche: CinematicNiche, style: string): string {
  const profile = NICHE_PROFILES[niche]
  const visual = NICHE_VISUAL[niche]
  return [
    `${profile.label} cinematic identity`,
    visual.language,
    visual.palette,
    `${style} pacing`,
    'Vertical 9:16 storyboard frame, film-director storyboard quality',
    'No text overlays, no watermarks, no collage',
  ].join('. ')
}

export function sceneVisualFromInput(
  scene: RegenSceneInput,
  niche: CinematicNiche,
  sceneIndex: number,
  totalScenes: number
): SceneVisualDirection {
  const role = scenePacingRole(sceneIndex, totalScenes || 1)
  const hasFields =
    scene.visualPrompt ||
    scene.cameraAngle ||
    scene.lightingMood ||
    scene.colorPalette

  if (hasFields) {
    return {
      visualPrompt:
        scene.visualPrompt ||
        composeVisualPrompt({
          cameraAngle: scene.cameraAngle || NICHE_VISUAL[niche].camera,
          lightingMood: scene.lightingMood || NICHE_VISUAL[niche].lighting,
          environment: scene.environment || NICHE_VISUAL[niche].environment,
          colorPalette: scene.colorPalette || NICHE_VISUAL[niche].palette,
          movementStyle: scene.movementStyle || NICHE_VISUAL[niche].movement,
        }),
      cameraAngle: scene.cameraAngle || NICHE_VISUAL[niche].camera,
      lightingMood: scene.lightingMood || NICHE_VISUAL[niche].lighting,
      environment: scene.environment || NICHE_VISUAL[niche].environment,
      colorPalette: scene.colorPalette || NICHE_VISUAL[niche].palette,
      movementStyle: scene.movementStyle || NICHE_VISUAL[niche].movement,
    }
  }

  return defaultVisualDirection(niche, role, scene.title)
}

export function buildStoryboardPrompt(
  input: StoryboardGenerationInput,
  variantIndex: number
): string {
  const variant = STORYBOARD_VARIANTS[variantIndex] ?? STORYBOARD_VARIANTS[0]
  const visual = sceneVisualFromInput(
    input.scene,
    input.niche,
    input.sceneIndex,
    input.totalScenes
  )
  const role = scenePacingRole(input.sceneIndex, input.totalScenes || 1)
  const narration =
    input.scene.narration || input.scene.description || input.scene.title || ''

  const lines = [
    'Cinematic director storyboard frame for a vertical creator reel.',
    `Scene ${input.sceneIndex} — ${role}.`,
    variant.framing,
    `Visual beat: ${input.scene.imagePrompt || visual.visualPrompt}`,
    `Camera: ${visual.cameraAngle}.`,
    `Lighting: ${visual.lightingMood}.`,
    `Environment: ${visual.environment}.`,
    `Palette: ${visual.colorPalette}.`,
    `Movement energy: ${visual.movementStyle}.`,
  ]

  if (narration) lines.push(`Emotional subtext: ${narration.slice(0, 180)}.`)
  if (input.hook) lines.push(`Story hook context: ${input.hook.slice(0, 120)}.`)

  if (input.allScenes?.length) {
    const continuityScenes = input.allScenes.map((s, i) => ({
      id: s.id || `scene-${i + 1}`,
      title: s.title || `Scene ${i + 1}`,
      description: s.narration || s.description || '',
      duration: s.duration || 4,
      visualPrompt: s.visualPrompt || '',
      imagePrompt: s.imagePrompt || '',
      cameraAngle: s.cameraAngle || '',
      lightingMood: s.lightingMood || '',
      environment: s.environment || '',
      colorPalette: s.colorPalette || '',
      movementStyle: s.movementStyle || '',
    }))
    lines.push(
      buildStoryboardContinuityBlock(
        continuityScenes,
        input.sceneIndex,
        input.niche
      )
    )
  }

  lines.push(
    `Lighting direction: ${cinematicWorldLighting(input.niche, role)}.`,
    'Storyboard illustration style — emotionally directed, premium, restrained.',
    'Single frame composition. No generic AI art keywords.'
  )

  const prompt = lines.join('\n')
  return sanitizeStoryboardPrompt(prompt)
}

function sanitizeStoryboardPrompt(prompt: string): string {
  let next = prompt
  for (const pattern of BANNED_PROMPT_FRAGMENTS) {
    next = next.replace(pattern, '')
  }
  return next.replace(/\s+/g, ' ').trim()
}

export function buildPlaceholderStoryboard(
  sceneIndex: number,
  variantLabel: string,
  visual: SceneVisualDirection
): StoryboardImage {
  const id = uuidv4()
  const palette = visual.colorPalette.toLowerCase()
  const warm = /gold|amber|warm|ivory/i.test(palette)
  const cool = /slate|blue|teal|navy/i.test(palette)
  const c1 = warm ? '#2B1A08' : cool ? '#0A1218' : '#141010'
  const c2 = warm ? '#120D08' : cool ? '#0B1620' : '#0A0A0A'
  const accent = warm ? '#C8A24E' : cool ? '#6B8CAE' : '#8A7A62'

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="55%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="#050505"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="38%" r="55%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="720" height="1280" fill="url(#bg)"/>
  <rect width="720" height="1280" fill="url(#glow)"/>
  <rect x="48" y="1100" width="624" height="1" fill="${accent}" opacity="0.35"/>
  <text x="60" y="1145" fill="${accent}" opacity="0.85" font-family="Georgia, serif" font-size="22" letter-spacing="6">SCENE ${sceneIndex}</text>
  <text x="60" y="1185" fill="#F4E7C1" opacity="0.55" font-family="Georgia, serif" font-size="16" font-style="italic">${escapeXml(variantLabel.slice(0, 28))}</text>
</svg>`

  return {
    id,
    url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    variantLabel,
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function extractB64(json: Record<string, unknown>): string | null {
  const data = json?.data
  if (Array.isArray(data) && (data[0] as { b64_json?: string })?.b64_json) {
    return String((data[0] as { b64_json: string }).b64_json)
  }

  const msg = (json?.choices as Array<{ message?: Record<string, unknown> }>)?.[0]
    ?.message
  if (msg) {
    const content = msg.content
    if (Array.isArray(content)) {
      for (const c of content) {
        const row = c as {
          type?: string
          image_url?: { url?: string }
          b64_json?: string
        }
        if (c?.type === 'image_url' && typeof row.image_url?.url === 'string') {
          const m = /^data:image\/[a-z+]+;base64,(.+)$/i.exec(row.image_url.url)
          if (m) return m[1]
        }
        if (typeof row.b64_json === 'string') return row.b64_json
      }
    }
    if (typeof content === 'string') {
      const m = /data:image\/[a-z+]+;base64,([A-Za-z0-9+/=]+)/.exec(content)
      if (m) return m[1]
    }

    const images = msg.images
    if (Array.isArray(images)) {
      for (const img of images) {
        const row = img as { image_url?: { url?: string }; b64_json?: string }
        const url = row?.image_url?.url
        if (typeof url === 'string') {
          const m = /^data:image\/[a-z+]+;base64,(.+)$/i.exec(url)
          if (m) return m[1]
        }
        if (typeof row?.b64_json === 'string') return row.b64_json
      }
    }
  }

  const parts =
    (json?.candidates as Array<{ content?: { parts?: Array<Record<string, unknown>> } }>)?.[0]
      ?.content?.parts || []
  for (const p of parts) {
    const inline = p?.inline_data as { data?: string } | undefined
    if (inline?.data) return String(inline.data)
    const inlineData = p?.inlineData as { data?: string } | undefined
    if (inlineData?.data) return String(inlineData.data)
  }
  return null
}

async function generateStoryboardImageUrl(params: {
  prompt: string
  styleLock: string
  sceneIndex: number
  variantIndex: number
  userId: string
  projectId: string
  visual: SceneVisualDirection
  variantLabel: string
}): Promise<{ url: string; mock: boolean }> {
  const placeholder = () =>
    buildPlaceholderStoryboard(params.sceneIndex, params.variantLabel, params.visual).url

  if (!hasImageGenerationKey()) {
    return { url: placeholder(), mock: true }
  }

  const cinematicBits = [
    `Style lock: ${params.styleLock}`,
    `Camera: ${params.visual.cameraAngle}`,
    `Lighting: ${params.visual.lightingMood}`,
    `Palette: ${params.visual.colorPalette}`,
    'Vertical 9:16 cinematic storyboard frame. Single composed shot.',
  ].join('\n')

  const cinematic = `${params.prompt}\n\n${cinematicBits}`

  // OpenAI DALL-E 3 — preferred when OPENAI_API_KEY is set
  if (process.env.OPENAI_API_KEY?.trim()) {
    try {
      const remoteUrl = await generateOpenAISceneImage(cinematic)
      if (remoteUrl) {
        const filename = `${params.userId}/cinematic/${params.projectId}/sb_${params.sceneIndex}_${params.variantIndex}_${Date.now()}.png`
        const url = await persistRemoteImage({
          remoteUrl,
          userId: params.userId,
          filename,
        })
        return { url, mock: false }
      }
    } catch {
      /* fall through to Emergent or placeholder */
    }
  }

  // Emergent Gemini image model — when EMERGENT_LLM_KEY is set
  if (!EMERGENT_LLM_KEY) {
    return { url: placeholder(), mock: true }
  }

  try {
    const ggRes = await fetch(EMERGENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${EMERGENT_LLM_KEY}`,
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        modalities: ['image', 'text'],
        messages: [{ role: 'user', content: cinematic }],
      }),
    })

    if (!ggRes.ok) {
      return { url: placeholder(), mock: true }
    }

    const ggJson = (await ggRes.json().catch(() => ({}))) as Record<string, unknown>
    const b64 = extractB64(ggJson)
    if (!b64) {
      return { url: placeholder(), mock: true }
    }

    const buffer = Buffer.from(b64, 'base64')
    const filename = `${params.userId}/cinematic/${params.projectId}/sb_${params.sceneIndex}_${params.variantIndex}_${Date.now()}.png`
    const uploaded = await uploadImageBuffer({ buffer, filename })
    if (uploaded) {
      return { url: uploaded, mock: false }
    }

    return { url: `data:image/png;base64,${b64}`, mock: true }
  } catch {
    return { url: placeholder(), mock: true }
  }
}

export async function generateSceneStoryboardImages(params: {
  input: StoryboardGenerationInput
  userId: string
  projectId: string
}): Promise<{ images: StoryboardImage[]; mock: boolean }> {
  const styleLock = buildNicheStyleLock(params.input.niche, params.input.style)
  const visual = sceneVisualFromInput(
    params.input.scene,
    params.input.niche,
    params.input.sceneIndex,
    params.input.totalScenes
  )

  let anyMock = !hasImageGenerationKey()
  const images: StoryboardImage[] = []

  for (let i = 0; i < STORYBOARD_VARIANTS.length; i++) {
    const variant = STORYBOARD_VARIANTS[i]
    const prompt = buildStoryboardPrompt(params.input, i)
    const result = await generateStoryboardImageUrl({
      prompt,
      styleLock,
      sceneIndex: params.input.sceneIndex,
      variantIndex: i,
      userId: params.userId,
      projectId: params.projectId,
      visual,
      variantLabel: variant.label,
    })
    if (result.mock) anyMock = true
    images.push({
      id: uuidv4(),
      url: result.url,
      variantLabel: variant.label,
    })
  }

  return { images, mock: anyMock }
}

