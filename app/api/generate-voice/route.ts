import { NextRequest, NextResponse } from 'next/server'
import { isFreeTierOnly } from '@/lib/ai/free-tier'
import { synthesizeSpeechBuffer } from '@/lib/ai/synthesize-speech'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { trimNarrationForMaxDuration } from '@/lib/cinematic/scene-duration'
import { MAX_VIDEO_DURATION_SEC, logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'project-assets'

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const script = typeof raw?.script === 'string' ? raw.script : ''

    const waveform = Array.from({ length: 24 }, (_, i) => {
      const base = 0.25 + Math.sin(i * 0.55) * 0.2
      return Math.min(0.95, Math.max(0.12, base + (i % 5 === 0 ? 0.35 : 0)))
    })

    const { buffer, provider } = await synthesizeSpeechBuffer(script)
    const narration = trimNarrationForMaxDuration(
      script
        .replace(/Scene\s+\d+[^\n]*/gi, '')
        .replace(/Visual:[^\n]*/gi, '')
        .replace(/\[0:\d+[^\]]*\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    )

    if (!buffer || !narration || narration.length < 12) {
      return NextResponse.json(
        {
          error: isFreeTierOnly()
            ? 'Voice generation requires OPENAI_API_KEY (tts-1) in free tier, or runs without audio.'
            : 'Voice generation requires ELEVENLABS_API_KEY, OPENAI_API_KEY, or EMERGENT_LLM_KEY.',
          audioUrl: null,
          mock: true,
          waveform,
        },
        { status: 503 }
      )
    }

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const filename = `${user.id}/faceless/voice_${Date.now()}.mp3`
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(filename, buffer, { contentType: 'audio/mpeg', upsert: false })
      if (!upErr) {
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filename)
        return NextResponse.json({
          audioUrl: pub.publicUrl,
          voiceName: 'Cinematic Narrator',
          style: 'warm_documentary',
          durationSec: Math.min(
            MAX_VIDEO_DURATION_SEC,
            Math.max(15, Math.round(narration.length / 14))
          ),
          waveform,
          mock: false,
          provider,
        })
      }
    }

    const dataUri = `data:audio/mpeg;base64,${buffer.toString('base64')}`
    return NextResponse.json({
      audioUrl: dataUri,
      voiceName: 'Cinematic Narrator',
      style: 'warm_documentary',
      durationSec: Math.min(
        MAX_VIDEO_DURATION_SEC,
        Math.max(15, Math.round(narration.length / 14))
      ),
      waveform,
      mock: false,
      provider,
    })
  } catch (err) {
    logError('generate-voice', err)
    return NextResponse.json({ error: 'Voice generation paused' }, { status: 500 })
  }
}
