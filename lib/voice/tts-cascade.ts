/**
 * Voice cascade: Edge TTS → Piper → Kokoro → paid (ElevenLabs/OpenAI/Emergent) → Google → silent.
 * Failures never throw — callers continue the pipeline.
 */

import { synthesizeSpeechBuffer, type SpeechSynthesisResult } from '@/lib/ai/synthesize-speech'
import { synthesizeKokoroTts, synthesizePiperTts } from '@/lib/voice/local-tts.server'
import { logError } from '@/lib/workspace/validation'

export type TtsCascadeProvider =
  | 'kokoro'
  | 'piper'
  | 'elevenlabs'
  | 'openai_tts'
  | 'emergent_tts'
  | 'google_tts'
  | 'edge_tts'
  | 'silent'
  | 'none'

export type TtsCascadeResult = {
  buffer: Buffer | null
  provider: TtsCascadeProvider
  voiceName?: string
  fallbackMessage?: string
  /** True when user should see a single soft warning. */
  warnOnce: boolean
}

/** Minimal valid silent MP3 (~0.1s) — Remotion can still assemble without narration. */
function silentMp3Stub(): Buffer {
  // Tiny MPEG frame header + padding — enough to upload as audio/mpeg
  return Buffer.from([
    0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00,
  ])
}

async function synthesizeGoogleTts(text: string): Promise<Buffer | null> {
  const key = process.env.GOOGLE_TTS_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim()
  if (!key || !text.trim()) return null
  try {
    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: text.slice(0, 4000) },
          voice: { languageCode: 'en-US', name: 'en-US-Neural2-D' },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 },
        }),
      }
    )
    if (!res.ok) return null
    const json = (await res.json()) as { audioContent?: string }
    if (!json.audioContent) return null
    return Buffer.from(json.audioContent, 'base64')
  } catch (err) {
    logError('tts-cascade.google', err)
    return null
  }
}

/**
 * Edge TTS via Microsoft Edge read-aloud (free, no API key).
 * May fail in restricted networks — silent fallback continues.
 */
async function synthesizeEdgeTts(text: string): Promise<Buffer | null> {
  if (!text.trim()) return null
  try {
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts')
    const tts = new MsEdgeTTS()
    await tts.setMetadata('en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
    const { audioStream } = await tts.toStream(text.slice(0, 4000))
    const chunks: Buffer[] = []
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk))
    }
    const buffer = Buffer.concat(chunks)
    return buffer.length > 256 ? buffer : null
  } catch (err) {
    logError('tts-cascade.edge', err)
    return null
  }
}

export async function synthesizeWithCascade(
  text: string,
  options?: { elevenLabsVoiceId?: string; voiceName?: string; allowSilentStub?: boolean }
): Promise<TtsCascadeResult> {
  const narration = text.trim()
  if (narration.length >= 1) {
    const edge = await synthesizeEdgeTts(narration)
    if (edge) {
      return {
        buffer: edge,
        provider: 'edge_tts',
        voiceName: options?.voiceName || 'Edge Narrator',
        warnOnce: false,
      }
    }

    const piper = await synthesizePiperTts(narration)
    if (piper) {
      return {
        buffer: piper,
        provider: 'piper',
        voiceName: options?.voiceName || 'Piper',
        warnOnce: false,
      }
    }

    const kokoro = await synthesizeKokoroTts(narration)
    if (kokoro) {
      return {
        buffer: kokoro,
        provider: 'kokoro',
        voiceName: options?.voiceName || process.env.KOKORO_VOICE?.trim() || 'Kokoro',
        warnOnce: false,
      }
    }
  }

  const primary: SpeechSynthesisResult = await synthesizeSpeechBuffer(text, {
    elevenLabsVoiceId: options?.elevenLabsVoiceId,
    voiceName: options?.voiceName,
  })

  if (primary.buffer) {
    return {
      buffer: primary.buffer,
      provider: primary.provider,
      voiceName: primary.voiceName,
      fallbackMessage: primary.fallbackMessage,
      warnOnce: Boolean(primary.fallbackMessage),
    }
  }

  const google = await synthesizeGoogleTts(text)
  if (google) {
    return {
      buffer: google,
      provider: 'google_tts',
      voiceName: options?.voiceName || 'Google Narrator',
      fallbackMessage: 'Using Google voice fallback.',
      warnOnce: true,
    }
  }

  // Last resort: optional silent stub (only when caller opts in).
  // Default: null buffer — pipeline continues without narration URL.
  if (options?.allowSilentStub === true) {
    return {
      buffer: silentMp3Stub(),
      provider: 'silent',
      voiceName: 'Silent',
      fallbackMessage: 'Voice unavailable — continuing without narration.',
      warnOnce: true,
    }
  }

  return {
    buffer: null,
    provider: 'none',
    fallbackMessage: 'Voice unavailable — continuing without narration.',
    warnOnce: true,
  }
}
