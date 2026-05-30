import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { runYoutubeDeepResearch } from '@/lib/cinematic/youtube-deep-research'
import { normalizeProjectLanguage } from '@/lib/cinematic/language-detection'
import { coerceTopic, logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 })
    }

    const topic = coerceTopic(raw.topic ?? raw.prompt ?? raw.title)
    if (topic.length < 3) {
      return NextResponse.json(
        { error: 'Topic must be at least 3 characters' },
        { status: 400 }
      )
    }

    const language = normalizeProjectLanguage(raw.language, topic)
    const result = await runYoutubeDeepResearch({ topic, language })

    return NextResponse.json({
      topic,
      language,
      document: result.document,
      sections: result.sections,
      mock: result.mock,
      provider: result.provider,
      reason: result.reason,
    })
  } catch (err) {
    logError('deep-research.route', err)
    return NextResponse.json({ error: 'Deep research failed — try again' }, { status: 500 })
  }
}
