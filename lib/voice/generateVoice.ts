import { createHash } from 'crypto'
import {
  synthesizeElevenLabsSpeech,
  getDefaultElevenLabsModelId,
} from '@/lib/ai/elevenlabs'
import { allowElevenLabsVoice, getElevenLabsApiKey } from '@/lib/ai/free-tier'
import { synthesizeSpeechBuffer, buildNarrationFromScript } from '@/lib/ai/synthesize-speech'
import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SceneBlueprint } from '@/lib/cinematic/scene-blueprint'
import { trimNarrationForMaxDuration } from '@/lib/cinematic/scene-duration'
import { MAX_VIDEO_DURATION_SEC } from '@/lib/workspace/validation'
import {
  applyVoicePausesToScript,
  buildVoiceDirectorPlan,
  type SceneVoiceDirection,
} from '@/lib/voice/voiceDirector'
import type { VoiceProfileId } from '@/lib/voice/voiceProfiles'
import type { ContentBrief } from '@/lib/content-director/content-brief'
import type { ParsedCreatorIntent } from '@/lib/input-understanding/types'
import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'project-assets'

export type VoiceMetadata = {
  cacheKey: string
  provider: 'elevenlabs' | 'openai_tts' | 'emergent_tts' | 'none'
  profileId: VoiceProfileId | string
  voiceId: string
  voiceName: string
  durationSec: number
  speakingStyle: string
  speed: number
  sceneDirections?: SceneVoiceDirection[]
  fallbackMessage?: string | null
  generatedAt: string
}

export type GenerateVoiceInput = {
  script: string
  userId?: string
  projectId?: string
  niche?: CinematicNiche | string
  tone?: string
  voiceProfileId?: VoiceProfileId | string
  elevenLabsVoiceId?: string
  voiceName?: string
  scenes?: GeneratedScene[]
  sceneBlueprints?: SceneBlueprint[]
  contentBrief?: ContentBrief | null
  parsedIntent?: ParsedCreatorIntent | null
  audienceType?: string
  skipCache?: boolean
}

export type GenerateVoiceResult = {
  buffer: Buffer | null
  audioUrl: string | null
  storagePath: string | null
  narration: string
  waveform: number[]
  voiceMetadata: VoiceMetadata | null
  provider: VoiceMetadata['provider']
  mock: boolean
  fallbackMessage?: string | null
  fromCache: boolean
}

function buildWaveform(): number[] {
  return Array.from({ length: 24 }, (_, i) => {
    const base = 0.25 + Math.sin(i * 0.55) * 0.2
    return Math.min(0.95, Math.max(0.12, base + (i % 5 === 0 ? 0.35 : 0)))
  })
}

export function voiceCacheKey(input: {
  script: string
  profileId: string
  niche: string
  voiceId: string
}): string {
  const payload = [
    input.script.trim().slice(0, 8000),
    input.profileId,
    input.niche,
    input.voiceId,
  ].join('|')
  return createHash('sha256').update(payload).digest('hex').slice(0, 32)
}

function estimateDurationSec(narration: string): number {
  return Math.min(
    MAX_VIDEO_DURATION_SEC,
    Math.max(15, Math.round(narration.length / 14))
  )
}

async function lookupCachedVoice(
  supabase: SupabaseClient,
  userId: string,
  cacheKey: string
): Promise<{ url: string; storagePath: string; metadata: Record<string, unknown> } | null> {
  const { data } = await supabase
    .from('project_assets')
    .select('url, storage_path, metadata')
    .eq('user_id', userId)
    .eq('kind', 'voiceover')
    .contains('metadata', { voice_cache_key: cacheKey })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.url?.trim()) return null
  return {
    url: data.url,
    storagePath: data.storage_path ?? '',
    metadata: (data.metadata as Record<string, unknown>) ?? {},
  }
}

async function uploadVoiceBuffer(
  supabase: SupabaseClient,
  userId: string,
  projectId: string | undefined,
  buffer: Buffer,
  metadata: Record<string, unknown>
): Promise<{ url: string; storagePath: string } | null> {
  const folder = projectId ? `${userId}/${projectId}` : `${userId}/faceless`
  const filename = `${folder}/voice_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.mp3`
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: 'audio/mpeg', upsert: false })
  if (upErr) return null
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filename)

  if (projectId) {
    await supabase.from('project_assets').insert({
      project_id: projectId,
      user_id: userId,
      kind: 'voiceover',
      url: pub.publicUrl,
      storage_path: filename,
      mime_type: 'audio/mpeg',
      metadata,
    })
  }

  return { url: pub.publicUrl, storagePath: filename }
}

async function synthesizeWithDirector(
  narration: string,
  voiceId: string,
  speed: number,
  profileStability: number,
  profileStyle: number
): Promise<{ buffer: Buffer | null; provider: VoiceMetadata['provider']; fallbackMessage?: string }> {
  if (allowElevenLabsVoice() && getElevenLabsApiKey()) {
    const result = await synthesizeElevenLabsSpeech(narration, {
      voiceId,
      modelId: getDefaultElevenLabsModelId(),
    })
    if (result.buffer) {
      return { buffer: result.buffer, provider: 'elevenlabs' }
    }
  }

  const fallback = await synthesizeSpeechBuffer(narration, {
    elevenLabsVoiceId: voiceId,
  })
  return {
    buffer: fallback.buffer,
    provider: fallback.provider,
    fallbackMessage: fallback.fallbackMessage,
  }
}

/** Primary Mugtee voice generation — ElevenLabs when configured, TTS fallback, hash cache. */
export async function generateVoice(
  input: GenerateVoiceInput,
  supabase?: SupabaseClient
): Promise<GenerateVoiceResult> {
  const waveform = buildWaveform()
  const rawScript = input.script.trim()
  const baseNarration = buildNarrationFromScript(rawScript)

  if (!baseNarration || baseNarration.length < 12) {
    return {
      buffer: null,
      audioUrl: null,
      storagePath: null,
      narration: baseNarration,
      waveform,
      voiceMetadata: null,
      provider: 'none',
      mock: true,
      fallbackMessage: 'Script too short for voice synthesis.',
      fromCache: false,
    }
  }

  const plan = buildVoiceDirectorPlan({
    scenes: input.scenes ?? [],
    sceneBlueprints: input.sceneBlueprints,
    niche: input.niche,
    tone: input.tone,
    voiceProfileId: input.voiceProfileId,
    elevenLabsVoiceId: input.elevenLabsVoiceId,
    contentBrief: input.contentBrief,
    parsedIntent: input.parsedIntent,
    audienceType: input.audienceType,
  })

  const narration = trimNarrationForMaxDuration(
    applyVoicePausesToScript(baseNarration, plan.sceneDirections)
  )

  const cacheKey = voiceCacheKey({
    script: narration,
    profileId: plan.profile.id,
    niche: String(input.niche ?? ''),
    voiceId: plan.voiceId,
  })

  const voiceName = input.voiceName?.trim() || plan.profile.label

  if (!input.skipCache && supabase && input.userId) {
    const cached = await lookupCachedVoice(supabase, input.userId, cacheKey)
    if (cached?.url) {
      const meta = cached.metadata
      return {
        buffer: null,
        audioUrl: cached.url,
        storagePath: cached.storagePath,
        narration,
        waveform,
        voiceMetadata: {
          cacheKey,
          provider: (meta.provider as VoiceMetadata['provider']) ?? 'elevenlabs',
          profileId: String(meta.profile_id ?? plan.profile.id),
          voiceId: String(meta.voice_id ?? plan.voiceId),
          voiceName: String(meta.voice_name ?? voiceName),
          durationSec: Number(meta.duration_sec) || estimateDurationSec(narration),
          speakingStyle: plan.speakingStyle,
          speed: plan.speed,
          sceneDirections: plan.sceneDirections,
          generatedAt: String(meta.generated_at ?? new Date().toISOString()),
        },
        provider: (meta.provider as VoiceMetadata['provider']) ?? 'elevenlabs',
        mock: false,
        fromCache: true,
      }
    }
  }

  const synth = await synthesizeWithDirector(
    narration,
    plan.voiceId,
    plan.speed,
    plan.profile.stability,
    plan.profile.style
  )

  if (!synth.buffer) {
    return {
      buffer: null,
      audioUrl: null,
      storagePath: null,
      narration,
      waveform,
      voiceMetadata: null,
      provider: 'none',
      mock: true,
      fallbackMessage:
        synth.fallbackMessage ??
        'No voice API configured. Set ELEVENLABS_API_KEY or OPENAI_API_KEY.',
      fromCache: false,
    }
  }

  const durationSec = estimateDurationSec(narration)
  const generatedAt = new Date().toISOString()
  const assetMetadata = {
    provider: synth.provider,
    voice_id: plan.voiceId,
    voice_name: voiceName,
    profile_id: plan.profile.id,
    voice_cache_key: cacheKey,
    duration_sec: durationSec,
    speaking_style: plan.speakingStyle,
    speed: plan.speed,
    scene_directions: plan.sceneDirections,
    generated_at: generatedAt,
  }

  const voiceMetadata: VoiceMetadata = {
    cacheKey,
    provider: synth.provider,
    profileId: plan.profile.id,
    voiceId: plan.voiceId,
    voiceName,
    durationSec,
    speakingStyle: plan.speakingStyle,
    speed: plan.speed,
    sceneDirections: plan.sceneDirections,
    fallbackMessage: synth.fallbackMessage ?? null,
    generatedAt,
  }

  if (supabase && input.userId) {
    const uploaded = await uploadVoiceBuffer(
      supabase,
      input.userId,
      input.projectId,
      synth.buffer,
      assetMetadata
    )
    if (uploaded) {
      return {
        buffer: synth.buffer,
        audioUrl: uploaded.url,
        storagePath: uploaded.storagePath,
        narration,
        waveform,
        voiceMetadata,
        provider: synth.provider,
        mock: false,
        fallbackMessage: synth.fallbackMessage,
        fromCache: false,
      }
    }
  }

  return {
    buffer: synth.buffer,
    audioUrl: `data:audio/mpeg;base64,${synth.buffer.toString('base64')}`,
    storagePath: null,
    narration,
    waveform,
    voiceMetadata,
    provider: synth.provider,
    mock: false,
    fallbackMessage: synth.fallbackMessage,
    fromCache: false,
  }
}
