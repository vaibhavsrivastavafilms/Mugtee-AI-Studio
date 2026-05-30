import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { runDeepResearch } from '@/lib/cinematic/deep-research-engine'
import { normalizeDeepResearchReport } from '@/lib/ai/prompts/youtube/deep-research-sop'
import { normalizeProjectLanguage } from '@/lib/cinematic/language-detection'
import { coerceTopic, logError } from '@/lib/workspace/validation'
import type {
  DeepResearchApiRequestBody,
  DeepResearchApiResponse,
} from '@/types/deep-research'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** Perplexity / LLM research — keep under typical gateway limits; client skips on timeout. */
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => null)) as DeepResearchApiRequestBody | null

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

    const language = normalizeProjectLanguage(raw.language)
    const researchPromise = runDeepResearch({ topic, language })
    const timeoutMs = 50_000
    const result = await Promise.race([
      researchPromise,
      new Promise<Awaited<ReturnType<typeof runDeepResearch>>>((_, reject) =>
        setTimeout(() => reject(new Error('DEEP_RESEARCH_TIMEOUT')), timeoutMs)
      ),
    ]).catch((err) => {
      if (err instanceof Error && err.message === 'DEEP_RESEARCH_TIMEOUT') {
        return null
      }
      throw err
    })

    if (!result) {
      const report = normalizeDeepResearchReport({}, topic)
      const skipped: DeepResearchApiResponse = {
        topic,
        language,
        document: '',
        sections: null,
        mock: true,
        provider: 'mock',
        reason: 'timeout',
        report,
      }
      return NextResponse.json(skipped)
    }

    const body: DeepResearchApiResponse = {
      topic,
      language,
      report: result.report,
      document: result.document,
      sections: result.sections,
      mock: result.mock,
      provider: result.provider,
      reason: result.reason,
    }

    return NextResponse.json(body)
  } catch (err) {
    logError('deep-research.route', err)
    return NextResponse.json({ error: 'Deep research failed — try again' }, { status: 500 })
  }
}

