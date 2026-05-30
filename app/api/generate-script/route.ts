import { NextRequest, NextResponse } from 'next/server'
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
import { parseVisualStyle } from '@/lib/cinematic/workflow-state'
import {
  coerceDuration,
  coercePlatform,
  coerceTopic,
  coerceTone,
  logError,
} from '@/lib/workspace/validation'
import type { CreatorMemoryBiasHints } from '@/lib/creator/creator-memory'
import type { GenerateScriptApiResearchResponse } from '@/types/deep-research'
import { logStepComplete, logStepFailed } from '@/lib/cinematic/generation-logger'
import { SOFT_ERROR_COPY } from '@/lib/creator/soft-error-copy'

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

export async function POST(req: NextRequest) {
  try {
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

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json(
        { error: 'Body must be a JSON object' },
        { status: 400 }
      )
    }

    const topic = coerceTopic(raw.topic ?? raw.prompt ?? raw.idea)
    if (topic.length < 6) {
      return NextResponse.json(
        { error: 'Topic must be at least 6 characters' },
        { status: 400 }
      )
    }

    const platform = coercePlatform(raw.platform)
    const tone = coerceTone(raw.tone ?? raw.style)
    const duration = coerceDuration(raw.duration)
    const sessionSeed =
      typeof raw.sessionSeed === 'string' || typeof raw.sessionSeed === 'number'
        ? raw.sessionSeed
        : user.id
    const language = normalizeProjectLanguage(raw.language)
    const niche = inferNicheFromBrief({
      topic,
      tone,
      style: typeof raw.style === 'string' ? raw.style : tone,
      niche: typeof raw.niche === 'string' ? raw.niche : undefined,
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

    const input = {
      topic,
      platform,
      tone,
      duration,
      niche,
      sessionSeed,
      language,
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
      hookSeed,
      titleSeed,
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
        ...research,
      })
    } catch (err) {
      logError('generate-script.openai', err, { topic: topic.slice(0, 40) })
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
      const message =
        err instanceof Error ? err.message : 'Script generation failed'
      logStepFailed('script', user.id, message)
      return NextResponse.json(
        {
          error: SOFT_ERROR_COPY.storyPaused,
          reason: 'provider_failed',
          detail: message,
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
