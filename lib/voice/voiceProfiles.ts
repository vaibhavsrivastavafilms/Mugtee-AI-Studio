import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { ContentBrief } from '@/lib/content-director/content-brief'
import type { ParsedCreatorIntent } from '@/lib/input-understanding/types'
import { getDefaultElevenLabsVoiceId } from '@/lib/ai/elevenlabs'

/** Curated cinematic narrator profiles for Mugtee Voice Director. */
export type VoiceProfileId =
  | 'documentary_narrator'
  | 'psychology_storyteller'
  | 'luxury_narrator'
  | 'motivation_speaker'
  | 'faceless_reel_voice'

export type VoiceProfile = {
  id: VoiceProfileId
  label: string
  description: string
  /** Default ElevenLabs voice when catalog unavailable */
  defaultVoiceId: string
  speakingStyle: string
  /** 0.7–1.2 narration speed multiplier */
  speed: number
  stability: number
  similarityBoost: number
  style: number
  /** ElevenLabs category hint for voice picker */
  category: 'documentary' | 'narrative' | 'warm' | 'deep' | 'calm'
}

export const VOICE_PROFILES: Record<VoiceProfileId, VoiceProfile> = {
  documentary_narrator: {
    id: 'documentary_narrator',
    label: 'Documentary Narrator',
    description: 'Deep, confident, measured — observational authority',
    defaultVoiceId: 'onwK4e9ZLuTAKqWW03F9',
    speakingStyle: 'Measured documentary cadence — weight on facts, unhurried consonants',
    speed: 0.92,
    stability: 0.62,
    similarityBoost: 0.78,
    style: 0.28,
    category: 'documentary',
  },
  psychology_storyteller: {
    id: 'psychology_storyteller',
    label: 'Psychology Storyteller',
    description: 'Calm, reflective — insight without lecturing',
    defaultVoiceId: 'EXAVITQu4vr4xnSDxMaL',
    speakingStyle: 'Soft reflective tone — pauses before revelations, intimate register',
    speed: 0.9,
    stability: 0.58,
    similarityBoost: 0.72,
    style: 0.22,
    category: 'calm',
  },
  luxury_narrator: {
    id: 'luxury_narrator',
    label: 'Luxury Narrator',
    description: 'Premium, elegant — restrained opulence',
    defaultVoiceId: 'pNInz6obpgDQGcFmaJgB',
    speakingStyle: 'Elegant slow delivery — vowels lengthened, never salesy',
    speed: 0.88,
    stability: 0.65,
    similarityBoost: 0.8,
    style: 0.32,
    category: 'deep',
  },
  motivation_speaker: {
    id: 'motivation_speaker',
    label: 'Motivation Speaker',
    description: 'Energetic, powerful — earned intensity',
    defaultVoiceId: getDefaultElevenLabsVoiceId(),
    speakingStyle: 'Powerful forward momentum — punch verbs, rise on peaks',
    speed: 1.05,
    stability: 0.48,
    similarityBoost: 0.7,
    style: 0.45,
    category: 'narrative',
  },
  faceless_reel_voice: {
    id: 'faceless_reel_voice',
    label: 'Faceless Reel Voice',
    description: 'Modern, fast-paced — scroll-stopping clarity',
    defaultVoiceId: getDefaultElevenLabsVoiceId(),
    speakingStyle: 'Crisp modern delivery — tight sentences, minimal dead air',
    speed: 1.08,
    stability: 0.52,
    similarityBoost: 0.68,
    style: 0.38,
    category: 'warm',
  },
}

const NICHE_PROFILE: Record<CinematicNiche, VoiceProfileId> = {
  documentary: 'documentary_narrator',
  psychology: 'psychology_storyteller',
  luxury: 'luxury_narrator',
  motivation: 'motivation_speaker',
  fitness: 'motivation_speaker',
  finance: 'luxury_narrator',
  spirituality: 'psychology_storyteller',
  storytelling: 'documentary_narrator',
  'faceless reels': 'faceless_reel_voice',
}

function toneToProfile(tone: string): VoiceProfileId | null {
  const t = tone.toLowerCase()
  if (/documentary|inform|report/.test(t)) return 'documentary_narrator'
  if (/psycholog|reflect|calm|soft/.test(t)) return 'psychology_storyteller'
  if (/luxur|premium|elegant|haute/.test(t)) return 'luxury_narrator'
  if (/motiv|energ|power|inspir/.test(t)) return 'motivation_speaker'
  if (/faceless|reel|fast|viral|scroll/.test(t)) return 'faceless_reel_voice'
  return null
}

/** Select cinematic voice profile from niche lock, content brief, or parsed intent. */
export function selectVoiceProfile(input: {
  niche?: CinematicNiche | string
  tone?: string
  contentBrief?: ContentBrief | null
  parsedIntent?: ParsedCreatorIntent | null
  audienceType?: string
}): VoiceProfile {
  const nicheKey = String(input.niche ?? '').trim().toLowerCase() as CinematicNiche
  const fromBrief = input.contentBrief?.tone ? toneToProfile(input.contentBrief.tone) : null
  const fromIntent = input.parsedIntent?.tone ? toneToProfile(input.parsedIntent.tone) : null
  const fromTone = input.tone ? toneToProfile(input.tone) : null
  const fromAudience = input.audienceType ? toneToProfile(input.audienceType) : null

  const id =
    fromBrief ??
    fromIntent ??
    fromTone ??
    fromAudience ??
    NICHE_PROFILE[nicheKey] ??
    'documentary_narrator'

  return VOICE_PROFILES[id]
}

export function voiceProfileById(id: string | null | undefined): VoiceProfile {
  if (id && id in VOICE_PROFILES) {
    return VOICE_PROFILES[id as VoiceProfileId]
  }
  return VOICE_PROFILES.documentary_narrator
}

export function voiceProfileLabel(id: string): string {
  return voiceProfileById(id).label
}
