import { allowElevenLabsVoice } from '@/lib/ai/free-tier'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import { logError } from '@/lib/workspace/validation'

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1'

export type ElevenLabsVoiceCategory =
  | 'documentary'
  | 'narrative'
  | 'warm'
  | 'deep'
  | 'calm'
  | 'other'

export type ElevenLabsVoiceOption = {
  voiceId: string
  name: string
  category: ElevenLabsVoiceCategory
  previewUrl: string | null
  accent?: string
  language?: string
  description?: string
  labels: Record<string, string>
}

const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'
const DEFAULT_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5'

const LANGUAGE_ALIASES: Record<ProjectLanguage, string[]> = {
  en: ['en', 'english', 'american', 'british', 'australian'],
  hi: ['hi', 'hindi', 'hinglish', 'indian'],
  ur: ['ur', 'urdu'],
  es: ['es', 'spanish', 'latino'],
  fr: ['fr', 'french'],
  de: ['de', 'german', 'deutsch'],
  pt: ['pt', 'portuguese', 'brazilian'],
  it: ['it', 'italian'],
  gu: ['gu', 'gujarati', 'indian'],
  ar: ['ar', 'arabic'],
  ja: ['ja', 'japanese'],
  ko: ['ko', 'korean'],
  zh: ['zh', 'chinese', 'mandarin'],
  other: [],
}

const FALLBACK_VOICES: ElevenLabsVoiceOption[] = [
  {
    voiceId: DEFAULT_VOICE_ID,
    name: 'Rachel',
    category: 'documentary',
    previewUrl: null,
    description: 'Calm cinematic narrator',
    labels: { use_case: 'narration' },
  },
  {
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    category: 'warm',
    previewUrl: null,
    description: 'Warm, expressive storyteller',
    labels: { use_case: 'narration' },
  },
  {
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    category: 'deep',
    previewUrl: null,
    description: 'Deep trailer tone',
    labels: { use_case: 'narration' },
  },
  {
    voiceId: 'onwK4e9ZLuTAKqWW03F9',
    name: 'Daniel',
    category: 'calm',
    previewUrl: null,
    description: 'Calm documentary presence',
    labels: { use_case: 'narration' },
  },
]

export function getDefaultElevenLabsVoiceId(): string {
  return DEFAULT_VOICE_ID
}

export function getDefaultElevenLabsModelId(): string {
  return DEFAULT_MODEL_ID
}

export function isElevenLabsConfigured(): boolean {
  return allowElevenLabsVoice() && Boolean(process.env.ELEVENLABS_API_KEY?.trim())
}

function elevenApiKey(): string | null {
  return process.env.ELEVENLABS_API_KEY?.trim() || null
}

function labelBlob(labels: Record<string, string> | undefined, description?: string): string {
  const parts = Object.values(labels ?? {}).concat(description ?? '')
  return parts.join(' ').toLowerCase()
}

export function categorizeElevenLabsVoice(
  labels: Record<string, string> | undefined,
  description?: string
): ElevenLabsVoiceCategory {
  const blob = labelBlob(labels, description)
  if (/documentary|informative|news|educational/.test(blob)) return 'documentary'
  if (/trailer|deep|authoritative|movie/.test(blob)) return 'deep'
  if (/calm|soft|gentle|meditation|soothing/.test(blob)) return 'calm'
  if (/warm|friendly|conversational|casual/.test(blob)) return 'warm'
  if (/narrat|story|audiobook|characters/.test(blob)) return 'narrative'
  return 'other'
}

export function voiceMatchesLanguage(
  voice: Pick<ElevenLabsVoiceOption, 'labels' | 'accent' | 'language'>,
  projectLanguage: ProjectLanguage
): boolean {
  if (projectLanguage === 'other' || projectLanguage === 'en') return true
  const aliases = LANGUAGE_ALIASES[projectLanguage]
  const hay = [
    voice.language,
    voice.accent,
    ...Object.values(voice.labels),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  if (!hay.trim()) return true
  return aliases.some((a) => hay.includes(a))
}

function mapApiVoice(raw: Record<string, unknown>): ElevenLabsVoiceOption | null {
  const voiceId = String(raw.voice_id || '').trim()
  const name = String(raw.name || '').trim()
  if (!voiceId || !name) return null
  const labels = (raw.labels && typeof raw.labels === 'object'
    ? raw.labels
    : {}) as Record<string, string>
  const description =
    typeof raw.description === 'string' ? raw.description : labels.description
  return {
    voiceId,
    name,
    category: categorizeElevenLabsVoice(labels, description),
    previewUrl: typeof raw.preview_url === 'string' ? raw.preview_url : null,
    accent: labels.accent,
    language: labels.language,
    description,
    labels,
  }
}

export async function fetchElevenLabsVoices(): Promise<{
  voices: ElevenLabsVoiceOption[]
  fromApi: boolean
}> {
  const key = elevenApiKey()
  if (!isElevenLabsConfigured() || !key) {
    return { voices: FALLBACK_VOICES, fromApi: false }
  }

  try {
    const res = await fetch(`${ELEVEN_BASE}/voices`, {
      headers: { 'xi-api-key': key },
      cache: 'no-store',
    })
    if (!res.ok) {
      logError('elevenlabs.fetchVoices', new Error(`status ${res.status}`))
      return { voices: FALLBACK_VOICES, fromApi: false }
    }
    const json = (await res.json()) as { voices?: Record<string, unknown>[] }
    const mapped = (json.voices ?? [])
      .map((v) => mapApiVoice(v))
      .filter((v): v is ElevenLabsVoiceOption => Boolean(v))
    if (mapped.length === 0) return { voices: FALLBACK_VOICES, fromApi: false }
    return { voices: mapped, fromApi: true }
  } catch (err) {
    logError('elevenlabs.fetchVoices', err)
    return { voices: FALLBACK_VOICES, fromApi: false }
  }
}

export function filterVoicesForProject(
  voices: ElevenLabsVoiceOption[],
  projectLanguage: ProjectLanguage,
  preferredCategory?: ElevenLabsVoiceCategory
): ElevenLabsVoiceOption[] {
  const langFiltered = voices.filter((v) => voiceMatchesLanguage(v, projectLanguage))
  const pool = langFiltered.length > 0 ? langFiltered : voices
  if (!preferredCategory || preferredCategory === 'other') return pool
  const byCat = pool.filter((v) => v.category === preferredCategory)
  return byCat.length > 0 ? byCat : pool
}

export function pickRecommendedVoice(
  voices: ElevenLabsVoiceOption[],
  projectLanguage: ProjectLanguage,
  styleCategory: ElevenLabsVoiceCategory
): ElevenLabsVoiceOption {
  const filtered = filterVoicesForProject(voices, projectLanguage, styleCategory)
  return (
    filtered[0] ??
    voices.find((v) => v.voiceId === DEFAULT_VOICE_ID) ??
    voices[0] ??
    FALLBACK_VOICES[0]
  )
}

export type ElevenLabsSynthesisOptions = {
  voiceId?: string
  modelId?: string
}

export async function synthesizeElevenLabsSpeech(
  text: string,
  options?: ElevenLabsSynthesisOptions
): Promise<Buffer | null> {
  const key = elevenApiKey()
  if (!isElevenLabsConfigured() || !key || !text.trim()) return null

  const voiceId = options?.voiceId?.trim() || DEFAULT_VOICE_ID
  const modelId = options?.modelId?.trim() || DEFAULT_MODEL_ID

  try {
    const res = await fetch(`${ELEVEN_BASE}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: text.slice(0, 4000),
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch (err) {
    logError('elevenlabs.synthesize', err)
    return null
  }
}

export const VOICE_CATEGORY_LABELS: Record<ElevenLabsVoiceCategory, string> = {
  documentary: 'Documentary',
  narrative: 'Narrative',
  warm: 'Warm',
  deep: 'Deep',
  calm: 'Calm',
  other: 'More voices',
}

/** Map Mugtee voice style ids to ElevenLabs picker categories. */
export function voiceStyleToElevenCategory(styleId: string): ElevenLabsVoiceCategory {
  const s = styleId.trim().toLowerCase()
  if (s === 'deep_trailer') return 'deep'
  if (s === 'calm_storyteller') return 'calm'
  if (s === 'emotional_cinematic') return 'narrative'
  if (s === 'warm_documentary') return 'documentary'
  return 'documentary'
}
