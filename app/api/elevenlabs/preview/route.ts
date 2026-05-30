import { NextRequest, NextResponse } from 'next/server'
import {
  fetchElevenLabsVoices,
  isElevenLabsConfigured,
  synthesizeElevenLabsSpeech,
} from '@/lib/ai/elevenlabs'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PREVIEW_LINES: Record<string, string> = {
  en: 'Every frame holds a story waiting to be told.',
  hi: 'हर पल एक कहानी छुपाए बैठा है।',
  ur: 'ہر لمحہ ایک کہانی چھپائے بیٹھا ہے۔',
  es: 'Cada instante guarda una historia por contar.',
  fr: 'Chaque instant renferme une histoire à raconter.',
  ar: 'كل لحظة تحمل قصة تنتظر أن تُروى.',
  gu: 'દરેક ક્ષણ એક કહાની છુપાવે છે.',
  other: 'Every frame holds a story waiting to be told.',
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const voiceId = typeof body?.voiceId === 'string' ? body.voiceId.trim() : ''
    const language =
      typeof body?.language === 'string' ? body.language.trim().slice(0, 8) : 'en'
    const text =
      typeof body?.text === 'string' && body.text.trim()
        ? body.text.trim().slice(0, 200)
        : PREVIEW_LINES[language] || PREVIEW_LINES.en

    if (!voiceId) {
      return NextResponse.json({ error: 'voiceId required' }, { status: 400 })
    }

    if (isElevenLabsConfigured()) {
      const { buffer } = await synthesizeElevenLabsSpeech(text, { voiceId })
      if (buffer && buffer.length > 200) {
        return NextResponse.json({
          audioUrl: `data:audio/mpeg;base64,${buffer.toString('base64')}`,
          mock: false,
        })
      }
    }

    const { voices } = await fetchElevenLabsVoices()
    const match = voices.find((v) => v.voiceId === voiceId)
    if (match?.previewUrl) {
      return NextResponse.json({ audioUrl: match.previewUrl, mock: false, cached: true })
    }

    return NextResponse.json(
      {
        error: 'Voice preview unavailable — add ELEVENLABS_API_KEY or pick another voice.',
        mock: true,
      },
      { status: 503 }
    )
  } catch (err) {
    logError('elevenlabs.preview', err)
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 })
  }
}
