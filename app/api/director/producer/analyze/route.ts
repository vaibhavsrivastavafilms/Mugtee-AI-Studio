import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import {
  loadDirectorStudioSnapshot,
  verifyDirectorProject,
} from '@/lib/director/director-db.server'
import { formatDirectorCreatorMemoryForPrompt } from '@/lib/director/director-context-injection'
import { getOrCreateCreatorMemory } from '@/lib/director/memory/creator-memory.server'
import { rowToMemoryProfile } from '@/lib/memory/creator-memory-engine'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { STORY_FRAMEWORKS } from '@/lib/ai/prompts/director/story-frameworks'
import { runProducerAnalysis } from '@/lib/director/producer/producer-engine'
import { mergeProducerMemoryForPrompt } from '@/lib/director/producer/producer-memory'
import {
  loadCreatorProducerMemory,
  loadProducerApproved,
  upsertProducerReport,
} from '@/lib/director/producer/producer-db.server'
import type { ProducerAnalysisInput } from '@/lib/director/producer/types'
import { logError } from '@/lib/workspace/validation'
import { formatVirloMarketForPrompt } from '@/lib/virlo/virlo-prompt-injection'
import { loadVirloMarketIntelligence } from '@/lib/virlo/viral-patterns.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function loadCreatorDna(userId: string) {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('creator_profiles')
    .select('niche, platform, content_style, creator_dna')
    .eq('user_id', userId)
    .maybeSingle()
  const memory = data ? rowToMemoryProfile(data) : null
  return {
    niche: data?.niche ?? undefined,
    tone: data?.content_style ?? memory?.creatorDna?.voice,
    platform: data?.platform ?? undefined,
    emotionalGoal: memory?.creatorDna?.emotionalTrigger,
  }
}

function buildAnalysisInput(
  snapshot: NonNullable<Awaited<ReturnType<typeof loadDirectorStudioSnapshot>>>,
  creatorDna: Awaited<ReturnType<typeof loadCreatorDna>>,
  directorMemoryPrompt: string,
  producerMemoryPrompt: string
): ProducerAnalysisInput {
  const fw = snapshot.projectState.activeFramework
  const fwDef = fw ? STORY_FRAMEWORKS[fw.framework] : null

  return {
    idea: snapshot.storyDirections.topic,
    storyDirection: snapshot.storyDirections.activeStoryDirection
      ? {
          title: snapshot.storyDirections.activeStoryDirection.title,
          logline: snapshot.storyDirections.activeStoryDirection.logline,
          hook: snapshot.storyDirections.activeStoryDirection.hook,
          emotionalPromise: snapshot.storyDirections.activeStoryDirection.emotionalPromise,
          audience: snapshot.storyDirections.activeStoryDirection.audience,
        }
      : null,
    framework: fw
      ? {
          label: fwDef?.label ?? fw.frameworkName,
          coreEmotion: fw.coreEmotion,
          audienceDesire: fw.audienceDesire,
          narrativeTension: fw.narrativeTension,
          curiosityGap: fw.curiosityGap,
          transformation: fw.transformation,
        }
      : null,
    frameworkAnalysis: snapshot.projectState.frameworkAnalysis
      ? {
          act1: snapshot.projectState.frameworkAnalysis.act1,
          act2: snapshot.projectState.frameworkAnalysis.act2,
          conflict: snapshot.projectState.frameworkAnalysis.conflict,
          escalation: snapshot.projectState.frameworkAnalysis.escalation,
          breakthrough: snapshot.projectState.frameworkAnalysis.breakthrough,
          resolution: snapshot.projectState.frameworkAnalysis.resolution,
        }
      : null,
    directorTreatment: snapshot.directorTreatment
      ? {
          genre: snapshot.directorTreatment.genre,
          mood: snapshot.directorTreatment.mood,
          emotionalArc: snapshot.directorTreatment.emotionalArc,
          visualStyle: snapshot.directorTreatment.visualStyle,
          cameraLanguage: snapshot.directorTreatment.cameraLanguage,
          colorPalette: snapshot.directorTreatment.colorPalette,
        }
      : null,
    blueprint: snapshot.projectState.blueprint
      ? {
          title: snapshot.projectState.blueprint.title,
          hook: snapshot.projectState.blueprint.hook,
          summary: snapshot.projectState.blueprint.summary,
          script: snapshot.projectState.blueprint.script,
        }
      : null,
    creatorDna,
    directorMemoryPrompt,
    producerMemoryPrompt,
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const projectId = String(parsed.body!.projectId || '').trim()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    const userId = auth.user!.id
    const project = await verifyDirectorProject(projectId, userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const snapshot = await loadDirectorStudioSnapshot(projectId, userId)
    if (!snapshot) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const [creatorDna, creatorMemory, creatorProducerMemory] = await Promise.all([
      loadCreatorDna(userId),
      getOrCreateCreatorMemory(userId),
      loadCreatorProducerMemory(userId),
    ])
    const virloMarket = await loadVirloMarketIntelligence(creatorDna.platform ?? null)

    const directorMemoryPrompt = formatDirectorCreatorMemoryForPrompt(creatorMemory)
    const producerMemoryPrompt = mergeProducerMemoryForPrompt(
      null,
      creatorProducerMemory
    )
    const virloMarketPrompt = formatVirloMarketForPrompt(virloMarket)

    const input = {
      ...buildAnalysisInput(
        snapshot,
        creatorDna,
        directorMemoryPrompt,
        producerMemoryPrompt
      ),
      virloMarketPrompt,
    }

    const analysis = await runProducerAnalysis(input)
    const reportId = crypto.randomUUID()

    const { data: report, error } = await upsertProducerReport(projectId, userId, {
      ...analysis,
      id: reportId,
      projectId,
      userId,
      producerMemory: analysis.producerMemory,
    })

    if (error || !report) {
      return NextResponse.json({ error: error?.message || 'Failed to save report' }, { status: 500 })
    }

    const producerApproved = await loadProducerApproved(projectId, userId)

    return NextResponse.json({
      report,
      producerApproved,
    })
  } catch (err) {
    logError('director.producer.analyze', err)
    return NextResponse.json({ error: 'Producer analysis failed' }, { status: 500 })
  }
}
