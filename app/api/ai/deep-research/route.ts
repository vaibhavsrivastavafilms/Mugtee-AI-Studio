import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { runDeepResearch, parseDeepResearchSections } from '@/lib/cinematic/deep-research-engine'
import { normalizeDeepResearchReport } from '@/lib/ai/prompts/youtube/deep-research-sop'
import { normalizeProjectLanguage } from '@/lib/cinematic/language-detection'
import { normalizeDirectorMode } from '@/lib/cinematic/director-modes'
import { coerceTopic, logError } from '@/lib/workspace/validation'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'
import { normalizeGenerationMode } from '@/lib/economics/generation-mode'
import { resolveProviderRouting, shouldRunLivePerplexityResearch } from '@/lib/economics/provider-routing.server'
import { loadCachedResearch, storeResearchCache } from '@/lib/economics/research-cache.server'
import { resolveUserPlanType } from '@/lib/economics/resolve-user-plan.server'
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

    const limitBlocked = await guardUsageLimit(user.id, 'generations')
    if (limitBlocked) return limitBlocked

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
    const directorMode = normalizeDirectorMode(raw.directorMode)
    const generationMode = normalizeGenerationMode(
      (raw as Record<string, unknown>).generationMode ??
        (raw as Record<string, unknown>).generation_mode
    )
    const projectId =
      typeof (raw as Record<string, unknown>).projectId === 'string'
        ? ((raw as Record<string, unknown>).projectId as string)
        : typeof (raw as Record<string, unknown>).project_id === 'string'
          ? ((raw as Record<string, unknown>).project_id as string)
          : null
    const topicChanged = (raw as Record<string, unknown>).topicChanged === true

    const planType = await resolveUserPlanType(user.id)
    const policy = resolveProviderRouting({ generationMode, planType })

    if (policy.research === 'disabled') {
      const report = normalizeDeepResearchReport({}, topic)
      const skipped: DeepResearchApiResponse = {
        topic,
        language,
        document: '',
        sections: null,
        mock: true,
        provider: 'mock',
        reason: 'draft_mode',
        report,
      }
      return NextResponse.json(skipped)
    }

    const cached = await loadCachedResearch({ userId: user.id, projectId, topic })
    if (cached?.research_text && !shouldRunLivePerplexityResearch(policy, topicChanged)) {
      const report =
        cached.report_json ?? normalizeDeepResearchReport({}, topic)
      const body: DeepResearchApiResponse = {
        topic,
        language,
        report,
        document: cached.research_text,
        sections: parseDeepResearchSections(report),
        mock: false,
        provider: 'cache',
        reason: 'research_cache_hit',
      }
      return NextResponse.json(body)
    }

    const researchPromise = runDeepResearch({ topic, language, directorMode })
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

    if (!result.mock && result.report) {
      void storeResearchCache({
        userId: user.id,
        projectId,
        topic,
        document: result.document,
        report: result.report,
      })
    }

    await trackUsageMetric(user.id, 'generations')

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
