import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  buildMockCinematicOutput,
  validateCinematicOutput,
} from '@/lib/cinematic/generation'
import { inferNicheFromBrief } from '@/lib/cinematic/niches'
import { coerceReferenceScript } from '@/lib/ai/prompts/cinematic/script-writing-sop'
import { runScriptGeneration } from '@/lib/cinematic/quick-cut/run-script-generation'
import { hasScriptGenerationKey } from '@/lib/ai/script-generation-keys'
import { buildVirloContext, virloMetadataFromContext } from '@/lib/virlo-engine'
import { normalizeProjectLanguage } from '@/lib/cinematic/language-detection'
import { detectCreatorLanguage } from '@/lib/i18n/detect-creator-language'
import { normalizeDirectorMode } from '@/lib/cinematic/director-modes'
import { normalizeCreatorBlueprintId } from '@/lib/cinematic/creator-blueprints'
import { parseVisualStyle } from '@/lib/cinematic/workflow-state'
import {
  coerceDuration,
  coercePlatform,
  coerceTopic,
  coerceTone,
  logError,
} from '@/lib/workspace/validation'
import type { CreatorMemoryBiasHints, CreatorMemoryProfile } from '@/lib/creator/creator-memory'
import { normalizeCreatorMemoryProfile } from '@/lib/creator/creator-memory'
import type { GenerateScriptApiResearchResponse } from '@/types/deep-research'
import { logGenerationError, logStepComplete, logStepFailed } from '@/lib/cinematic/generation-logger'
import { SOFT_ERROR_COPY } from '@/lib/creator/soft-error-copy'
import {
  FeatureUsageFeatures,
  parseFeatureUsageProjectId,
  trackFeatureUsage,
} from '@/lib/analytics/feature-usage'
import { trackServerError } from '@/lib/analytics/track-server-event'
import { Mp4ExportEvents } from '@/lib/analytics/mp4-export-events'
import { trackMp4ExportServer } from '@/lib/analytics/mp4-export-track.server'
import { normalizeCreativeBrief } from '@/lib/companion/creative-discovery'
import { normalizeCreatorMemory } from '@/lib/companion/creator-memory'
import { rowToMemoryProfile } from '@/lib/memory/creator-memory-engine'
import type { MemoryProfile } from '@/lib/memory/types'
import { normalizeContentBrief } from '@/lib/content-director/content-brief'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'
import {
  logParsedIntent,
  resolveGenerationTopic,
  resolveParsedIntentAsync,
  resolveParsedIntentSync,
  serializeParsedIntent,
} from '@/lib/input-understanding'
import { getLastProviderForTask, AIProviderError } from '@/lib/ai/providers'
import { isScriptGenerationMockEnabled } from '@/lib/ai/mock/mock-script-mode.server'
import { buildMockScriptWithLog } from '@/lib/ai/mock/mock-script-fallback.server'
import {
  parseDirectorStudioContextFromBody,
  resolveDirectorStudioContextFromProject,
} from '@/lib/director/resolve-director-context.server'
import { resolveDirectorCreatorMemory } from '@/lib/director/memory/project-analysis-engine'
import { resolveDirectorIntelligenceGraph } from '@/lib/intelligence/creator-graph.server'
import { loadVirloMarketIntelligence } from '@/lib/virlo/viral-patterns.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** Script SOP regen can run long on Pro (up to 300s); research is split to /api/ai/deep-research. */
export const maxDuration = 300

function parseCreatorMemoryBias(raw: unknown): CreatorMemoryBiasHints | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const o = raw as Record<string, unknown>
  const str = (key: string) => {
    const v = o[key]
    return typeof v === 'string' && v.trim() ? v.trim().slice(0, 120) : undefined
  }
  const recentTones = Array.isArray(o.recentTones)
    ? o.recentTones.filter((v): v is string => typeof v === 'string').slice(0, 5)
    : undefined
  const hints: CreatorMemoryBiasHints = {
    niche: str('niche'),
    visualStyle: str('visualStyle'),
    pacing: str('pacing'),
    hookStyle: str('hookStyle'),
    platform: str('platform'),
    recentTones: recentTones?.length ? recentTones : undefined,
  }
  return Object.values(hints).some(Boolean) ? hints : undefined
}

function parseCreatorProfile(raw: unknown): CreatorMemoryProfile | undefined {
  const profile = normalizeCreatorMemoryProfile(raw)
  return Object.values(profile).some(Boolean) ? profile : undefined
}

export async function POST(req: NextRequest) {
  try {
    console.log('[SCRIPT_DEBUG] request received')
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null

    if (raw?.landing === true || raw?.mock === true) {
      const topic = coerceTopic(raw.topic ?? raw.prompt ?? raw.idea)
      const tone = coerceTone(raw.tone ?? raw.style)
      const duration = coerceDuration(raw.duration)
      const sessionSeed =
        typeof raw.sessionSeed === 'string' || typeof raw.sessionSeed === 'number'
          ? raw.sessionSeed
          : topic
      const niche = inferNicheFromBrief({
        topic: topic || 'Cinematic story',
        tone,
        style: typeof raw.style === 'string' ? raw.style : tone,
        niche: typeof raw.niche === 'string' ? raw.niche : undefined,
      })
      const virloContext = buildVirloContext(topic || 'Cinematic story', {
        tone,
        duration,
        niche,
        sessionSeed,
      })
      const output = buildMockCinematicOutput({
        topic: topic || 'Cinematic story',
        tone,
        duration,
        niche,
        virloContext,
      })
      if (typeof raw.title === 'string' && raw.title.trim()) {
        output.title = raw.title.trim()
      }
      if (typeof raw.hook === 'string' && raw.hook.trim()) {
        output.hook = raw.hook.trim()
      }
      return NextResponse.json({
        output,
        mock: true,
        niche,
        landing: true,
        virlo: virloMetadataFromContext(virloContext),
      })
    }

    const auth = await requireAuth()
    if (auth.response) return auth.response
    const user = auth.user
    const supabase = createSupabaseServerClient()

    const limitBlocked = await guardUsageLimit(user.id, 'generations')
    if (limitBlocked) return limitBlocked

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json(
        { error: 'Body must be a JSON object' },
        { status: 400 }
      )
    }

    const rawInput = coerceTopic(raw.topic ?? raw.prompt ?? raw.idea)
    if (rawInput.length < 6) {
      return NextResponse.json(
        { error: 'Topic must be at least 6 characters' },
        { status: 400 }
      )
    }

    const parsedIntent =
      raw?.parsedIntent != null || raw?.parsed_intent != null
        ? resolveParsedIntentSync(raw, rawInput)
        : await resolveParsedIntentAsync(raw, rawInput)
    logParsedIntent(parsedIntent)
    const topic = resolveGenerationTopic(parsedIntent, rawInput)

    const platform = coercePlatform(raw.platform)
    const tone = coerceTone(raw.tone ?? raw.style)
    const duration = coerceDuration(raw.duration)
    const sessionSeed =
      typeof raw.sessionSeed === 'string' || typeof raw.sessionSeed === 'number'
        ? raw.sessionSeed
        : user.id
    let language = normalizeProjectLanguage(raw.language)
    let languageMixed = raw.languageMixed === true
    if ((!raw.language || language === 'en') && topic.length >= 6) {
      const detected = detectCreatorLanguage(topic)
      if (detected.languageCode !== 'en' || detected.isMixed) {
        language = detected.projectLanguage
        languageMixed = detected.isMixed
      }
    }
    const niche = inferNicheFromBrief({
      topic,
      tone,
      style: typeof raw.style === 'string' ? raw.style : tone,
      niche: parsedIntent.niche ?? (typeof raw.niche === 'string' ? raw.niche : undefined),
    })

    const transcript =
      typeof raw.transcript === 'string'
        ? raw.transcript.slice(0, 12_000)
        : typeof raw.originalTranscript === 'string'
          ? raw.originalTranscript.slice(0, 12_000)
          : undefined
    const voiceNote =
      typeof raw.voiceNote === 'string' ? raw.voiceNote.slice(0, 500) : undefined
    const referenceScript = coerceReferenceScript(
      raw.referenceScript ?? raw.reference_script
    )
    const regenFresh = raw.regenFresh === true
    const previousScript =
      typeof raw.previousScript === 'string'
        ? raw.previousScript.slice(0, 12_000)
        : undefined
    const previousHook =
      typeof raw.previousHook === 'string' ? raw.previousHook.slice(0, 220) : undefined
    const visualStyle = parseVisualStyle(raw.visualStyle)
    const skipResearch = raw.skipResearch === true
    const skipStoryboard = raw.skipStoryboard === true
    const researchDocument =
      typeof raw.researchDocument === 'string'
        ? raw.researchDocument.slice(0, 12_000)
        : undefined

    const creatorMemoryBias = parseCreatorMemoryBias(raw.creatorMemoryBias)

    let creatorProfile =
      parseCreatorProfile(raw.creatorProfile ?? raw.creator_profile) ?? undefined
    if (!creatorProfile) {
      const { data: tableRow } = await supabase
        .from('creator_profiles')
        .select('creator_name, platform, niche, creator_goal, content_style, experience_level')
        .eq('user_id', user.id)
        .maybeSingle()
      if (tableRow) {
        creatorProfile = parseCreatorProfile({
          creatorName: tableRow.creator_name,
          primaryPlatform: tableRow.platform,
          niche: tableRow.niche,
          creatorGoal: tableRow.creator_goal,
          contentStyle: tableRow.content_style,
          experience: tableRow.experience_level,
        })
      }
    }
    if (!creatorProfile) {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('creator_profile')
        .eq('id', user.id)
        .maybeSingle()
      creatorProfile = parseCreatorProfile(profileRow?.creator_profile)
    }

    const hookSeed =
      typeof raw.hookSeed === 'string'
        ? raw.hookSeed.slice(0, 220)
        : typeof raw.hook === 'string'
          ? raw.hook.slice(0, 220)
          : undefined
    const titleSeed =
      typeof raw.titleSeed === 'string'
        ? raw.titleSeed.slice(0, 120)
        : typeof raw.title === 'string'
          ? raw.title.slice(0, 120)
          : undefined
    const directorMode = normalizeDirectorMode(raw.directorMode)
    const blueprintId = normalizeCreatorBlueprintId(raw.blueprintId)

    const recentTopics = Array.isArray(raw.recentTopics)
      ? raw.recentTopics
          .filter((v): v is string => typeof v === 'string')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 12)
      : undefined
    const creatorHistoryStyle =
      typeof raw.creatorHistoryStyle === 'string' && raw.creatorHistoryStyle.trim()
        ? raw.creatorHistoryStyle.trim().slice(0, 80)
        : undefined
    const contentAngleId =
      typeof raw.contentAngleId === 'string' && raw.contentAngleId.trim()
        ? raw.contentAngleId.trim()
        : undefined
    const hookFrameworkId =
      typeof raw.hookFrameworkId === 'string' && raw.hookFrameworkId.trim()
        ? raw.hookFrameworkId.trim()
        : undefined
    const recentContentAngles = Array.isArray(raw.recentContentAngles)
      ? raw.recentContentAngles
          .filter((v): v is string => typeof v === 'string')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 5)
      : undefined
    const recentNarrativeFrameworks = Array.isArray(raw.recentNarrativeFrameworks)
      ? raw.recentNarrativeFrameworks
          .filter((v): v is string => typeof v === 'string')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 8)
      : undefined

    const creativeBrief = normalizeCreativeBrief(raw.creativeBrief ?? raw.creative_brief)
    const contentBrief = normalizeContentBrief(raw.contentBrief ?? raw.content_brief)
    const companionMemory = normalizeCreatorMemory(
      raw.companionMemory ?? raw.companion_memory ?? raw.creatorMemory
    )

    let memoryProfile: MemoryProfile | undefined
    if (raw.memoryProfile && typeof raw.memoryProfile === 'object') {
      memoryProfile = raw.memoryProfile as MemoryProfile
    } else {
      const { data: memRow } = await supabase
        .from('creator_profiles')
        .select(
          'creator_memory, creator_dna, relationship_level, relationship_score, memory_graph, learning_events, niche, platform, content_style, updated_at'
        )
        .eq('user_id', user.id)
        .maybeSingle()
      const loaded = rowToMemoryProfile(memRow)
      if (
        loaded.relationshipScore > 0 ||
        Object.values(loaded.creatorDna).some(Boolean) ||
        (loaded.learningEvents?.length ?? 0) > 0
      ) {
        memoryProfile = loaded
      }
    }

    const projectIdForDirector = parseFeatureUsageProjectId(raw)
    const directorStudioContext =
      parseDirectorStudioContextFromBody(raw.directorStudioContext) ??
      (await resolveDirectorStudioContextFromProject(projectIdForDirector, user.id))

    const directorCreatorMemory = directorStudioContext
      ? await resolveDirectorCreatorMemory(user.id)
      : undefined

    const intelligenceGraph = directorStudioContext
      ? await resolveDirectorIntelligenceGraph(user.id)
      : null
    const virloMarket = directorStudioContext
      ? await loadVirloMarketIntelligence(platform ?? null)
      : null

    const input = {
      topic,
      rawInput,
      parsedIntent,
      directorStudioContext: directorStudioContext ?? undefined,
      directorCreatorMemory,
      directorIntelligence: intelligenceGraph
        ? {
            graphData: intelligenceGraph.graphData,
            insights: intelligenceGraph.insights,
            virloMarket,
          }
        : undefined,
      platform,
      tone,
      duration,
      niche,
      sessionSeed,
      language,
      languageMixed: languageMixed || undefined,
      transcript,
      voiceNote,
      referenceScript,
      skipResearch: skipResearch || undefined,
      skipStoryboard: skipStoryboard || undefined,
      researchDocument,
      regenFresh: regenFresh || undefined,
      previousScript: regenFresh ? previousScript : undefined,
      previousHook: regenFresh ? previousHook : undefined,
      visualStyle,
      creatorMemoryBias,
      creatorProfile,
      hookSeed,
      titleSeed,
      directorMode,
      blueprintId,
      recentTopics: recentTopics?.length ? recentTopics : undefined,
      creatorHistoryStyle,
      contentAngleId,
      hookFrameworkId,
      recentContentAngles,
      recentNarrativeFrameworks,
      creativeBrief: Object.values(creativeBrief).some(Boolean) ? creativeBrief : undefined,
      companionMemory: Object.values(companionMemory).some(Boolean) ? companionMemory : undefined,
      memoryProfile: memoryProfile ?? undefined,
      contentBrief: contentBrief ?? undefined,
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[generate-script] REQUEST START', { topic: topic.slice(0, 48) })
    }

    try {
      const result = await runScriptGeneration(input)
      if (process.env.NODE_ENV === 'development') {
        console.log('[generate-script] REQUEST SUCCESS', {
          mock: result.mock,
          sopRegenAttempts: result.sopRegenAttempts,
        })
      }
      let validation = validateCinematicOutput(result.output, niche, topic)
      if (!validation.valid && result.output.script?.trim()) {
        logStepFailed('script', user.id, validation.issues.join('; '))
        validation = { valid: true, issues: [] }
      }
      const research: GenerateScriptApiResearchResponse = {
        researchDocument: result.researchDocument,
        researchReport: result.researchReport,
        researchMock: result.researchMock,
      }

      logStepComplete('script', user.id)

      console.log('[SCRIPT_DEBUG] before save')
      await trackUsageMetric(user.id, 'generations')
      void trackFeatureUsage(
        user.id,
        FeatureUsageFeatures.SCRIPT_GENERATION,
        parseFeatureUsageProjectId(raw)
      )

      void trackMp4ExportServer({
        event: Mp4ExportEvents.STORY_GENERATED,
        userId: user.id,
        page: '/api/generate-script',
        metadata: {
          projectId: parseFeatureUsageProjectId(raw),
          hook: Boolean(result.output?.hook?.trim()),
          script: Boolean(result.output?.script?.trim()),
          scenes: (result.sceneCount ?? 0) > 0,
          scene_count: result.sceneCount ?? 0,
        },
      })

      console.log('[SCRIPT_DEBUG] before response')
      return NextResponse.json({
        output: result.output,
        mock: result.mock,
        niche,
        validation,
        sopCompliance: result.sopCompliance,
        sopRegenAttempts: result.sopRegenAttempts,
        virlo: result.virlo,
        language: result.language,
        visualStyle: result.visualStyle,
        viralScript: result.viralScript,
        viralStructure: result.viralStructure,
        referenceScriptUsed: Boolean(referenceScript),
        storyboardScenes: result.storyboardScenes,
        storyboardPrompts: result.storyboardPrompts,
        sceneCount: result.sceneCount,
        visualTimeline: result.visualTimeline,
        narrativeFrameworkId: result.narrativeFrameworkId,
        ...(getLastProviderForTask('script')
          ? { aiProvider: getLastProviderForTask('script') }
          : {}),
        ...research,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Script generation failed'
      const stack = err instanceof Error ? err.stack : undefined
      logError('generate-script.openai', err, { topic: topic.slice(0, 40) })

      const failures = err instanceof AIProviderError ? err.providerFailures : undefined
      const allCooldown =
        failures != null &&
        failures.length > 0 &&
        failures.every((f) => f.skipped && f.errorCode === 'cooldown_skip')

      if (isScriptGenerationMockEnabled()) {
        const virloContext = buildVirloContext(topic, {
          platform,
          tone,
          duration,
          niche,
          sessionSeed,
        })
        const output = buildMockScriptWithLog({
          topic,
          tone,
          duration,
          niche,
          virloContext,
          sessionSeed,
          reason: allCooldown
            ? 'providers_in_cooldown'
            : !hasScriptGenerationKey()
              ? 'missing_api_key'
              : 'all_providers_failed',
          providerFailures: failures,
        })
        const validation = validateCinematicOutput(output, niche, topic)
        return NextResponse.json({
          output,
          mock: true,
          reason: 'provider_mock_fallback',
          niche,
          validation,
          virlo: virloMetadataFromContext(virloContext),
          ...(failures ? { providerFailures: failures } : {}),
        })
      }

      if (!hasScriptGenerationKey()) {
        const virloContext = buildVirloContext(topic, {
          platform,
          tone,
          duration,
          niche,
          sessionSeed,
        })
        const output = buildMockCinematicOutput({ topic, tone, duration, niche, virloContext })
        return NextResponse.json({
          output,
          mock: true,
          reason: 'missing_api_key',
          niche,
          virlo: virloMetadataFromContext(virloContext),
        })
      }

      if (err instanceof AIProviderError) {
        logStepFailed('script', user.id, message)
        logGenerationError(user.id, 'script', message, {
          reason: 'provider_failed',
          providers: err.providerFailures,
        })
        void trackServerError('openai', message, {
          step: 'script',
          topic: topic.slice(0, 40),
          providers: err.providerFailures.map((p) => p.provider).join(','),
        }, user.id)
        console.error('[GENERATE_SCRIPT_ERROR]', { message, stack, providers: err.providerFailures })
        return NextResponse.json(
          {
            error: 'AI providers temporarily unavailable.',
            reason: 'provider_failed',
            providers: err.providerFailures.map((p) => ({
              provider: p.provider,
              status: p.status,
              reason: p.reason,
              errorCode: p.errorCode,
              retryable: p.retryable,
            })),
            retryAfterSeconds: err.retryAfterSeconds ?? 0,
          },
          { status: 502 }
        )
      }

      logStepFailed('script', user.id, message)
      logGenerationError(user.id, 'script', message, { reason: 'provider_failed' })
      void trackServerError(
        message.toLowerCase().includes('timeout') ? 'timeout' : 'openai',
        message,
        { step: 'script', topic: topic.slice(0, 40) },
        user.id
      )
      console.error('[GENERATE_SCRIPT_ERROR]', { message, stack })
      return NextResponse.json(
        {
          error: 'Script generation failed',
          reason: 'provider_failed',
        },
        { status: 502 }
      )
    }
  } catch (err) {
    logError('generate-script.exception', err)
    return NextResponse.json(
      { error: SOFT_ERROR_COPY.storyPaused },
      { status: 500 }
    )
  }
}
