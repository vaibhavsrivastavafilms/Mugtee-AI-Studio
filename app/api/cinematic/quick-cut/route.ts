import { NextRequest, NextResponse } from 'next/server'
import { orchestrateQuickCut } from '@/lib/cinematic/quick-cut/orchestrate-quick-cut'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { coerceDuration, coerceTopic, coerceTone, logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const body = parsed.body!
    const prompt = coerceTopic(body.prompt ?? body.topic ?? body.idea)
    if (prompt.length < 6) {
      return NextResponse.json(
        { error: 'Share a little more — at least a few words.' },
        { status: 400 }
      )
    }

    const style = coerceTone(body.style ?? body.tone)
    const duration = coerceDuration(body.duration)
    const imageNote =
      typeof body.imageNote === 'string' ? body.imageNote.slice(0, 500) : undefined
    const voiceNote =
      typeof body.voiceNote === 'string' ? body.voiceNote.slice(0, 500) : undefined

    const result = await orchestrateQuickCut(
      { prompt, style, duration, imageNote, voiceNote },
      auth.user!.id
    )

    return NextResponse.json({
      ...result,
      ok: true,
    })
  } catch (err) {
    logError('cinematic.quick-cut', err)
    return NextResponse.json(
      { error: 'Your world paused — try again in a moment.' },
      { status: 500 }
    )
  }
}
