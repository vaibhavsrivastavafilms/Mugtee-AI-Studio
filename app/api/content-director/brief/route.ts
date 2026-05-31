import { NextRequest, NextResponse } from 'next/server'
import { normalizeCreativeBrief } from '@/lib/companion/creative-discovery'
import { generateContentBrief } from '@/lib/content-director/generate-content-brief'
import { coerceTopic, logError } from '@/lib/workspace/validation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const blocked = await guardUsageLimit(user.id, 'generations')
      if (blocked) return blocked
    }

    const topic = coerceTopic(raw?.topic ?? raw?.prompt ?? raw?.idea)
    if (topic.length < 3) {
      return NextResponse.json({ error: 'Topic must be at least 3 characters' }, { status: 400 })
    }

    const creativeBrief = normalizeCreativeBrief(raw?.creativeBrief ?? raw?.creative_brief)
    const useAi = raw?.rulesOnly !== true

    const result = await generateContentBrief(
      {
        topic,
        platform: typeof raw?.platform === 'string' ? raw.platform : undefined,
        tone: typeof raw?.tone === 'string' ? raw.tone : typeof raw?.style === 'string' ? raw.style : undefined,
        niche: typeof raw?.niche === 'string' ? raw.niche : undefined,
        duration: typeof raw?.duration === 'number' ? raw.duration : undefined,
        language: typeof raw?.language === 'string' ? raw.language : undefined,
        directorMode: typeof raw?.directorMode === 'string' ? raw.directorMode : undefined,
        creativeBrief: Object.values(creativeBrief).some(Boolean) ? creativeBrief : undefined,
      },
      { useAi }
    )

    if (process.env.NODE_ENV === 'development') {
      console.log('[content-director/brief]', {
        source: result.source,
        durationMs: result.durationMs,
        topic: topic.slice(0, 48),
      })
    }

    if (user) await trackUsageMetric(user.id, 'generations')

    return NextResponse.json({
      brief: result.brief,
      source: result.source,
      durationMs: result.durationMs,
    })
  } catch (err) {
    logError('content-director/brief', err)
    return NextResponse.json({ error: 'Content brief generation paused' }, { status: 500 })
  }
}
