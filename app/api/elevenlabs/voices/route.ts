import { NextResponse } from 'next/server'
import {
  fetchElevenLabsVoices,
  getDefaultElevenLabsVoiceId,
  isElevenLabsConfigured,
  VOICE_CATEGORY_LABELS,
  type ElevenLabsVoiceCategory,
} from '@/lib/ai/elevenlabs'
import { allowElevenLabsVoice } from '@/lib/ai/free-tier'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const configured = isElevenLabsConfigured()
    const { voices, fromApi } = await fetchElevenLabsVoices()

    const byCategory = {} as Record<ElevenLabsVoiceCategory, typeof voices>
    for (const voice of voices) {
      const cat = voice.category
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push(voice)
    }

    return NextResponse.json({
      voices,
      byCategory,
      categoryLabels: VOICE_CATEGORY_LABELS,
      defaultVoiceId: getDefaultElevenLabsVoiceId(),
      elevenlabsAvailable: configured && fromApi,
      allowElevenLabs: allowElevenLabsVoice(),
      fromApi,
      message: configured
        ? fromApi
          ? undefined
          : 'Could not reach ElevenLabs — showing curated voice list.'
        : allowElevenLabsVoice()
          ? 'ElevenLabs key missing.'
          : 'Free tier uses OpenAI TTS. Set FREE_TIER_ONLY=false and ELEVENLABS_API_KEY for ElevenLabs.',
    })
  } catch (err) {
    logError('elevenlabs.voices', err)
    return NextResponse.json({ error: 'Could not load voices' }, { status: 500 })
  }
}
