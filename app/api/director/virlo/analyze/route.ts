import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { analyzePattern } from '@/lib/virlo/analyze-pattern'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const content = String(parsed.body!.content || parsed.body!.text || '').trim()
    const urlSnippet = String(parsed.body!.urlSnippet || parsed.body!.url || '').trim()
    const platform = parsed.body!.platform ? String(parsed.body!.platform) : undefined
    const topic = parsed.body!.topic ? String(parsed.body!.topic) : undefined

    if (!content && !urlSnippet) {
      return NextResponse.json({ error: 'content or urlSnippet required' }, { status: 400 })
    }

    const analysis = await analyzePattern({
      content: content || urlSnippet,
      urlSnippet: urlSnippet || undefined,
      platform,
      topic,
    })

    return NextResponse.json({ analysis })
  } catch (err) {
    logError('director.virlo.analyze', err)
    return NextResponse.json({ error: 'Virlo analysis failed' }, { status: 500 })
  }
}
