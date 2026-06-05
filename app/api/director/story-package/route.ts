import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import {
  buildStoryDirectorPrompt,
  parseStoryDirectorOutput,
  type StoryDirectorPackage,
} from '@/lib/ai/director/story-director-engine'
import {
  STORY_FRAMEWORK_IDS,
  type StoryFrameworkId,
} from '@/lib/ai/prompts/director/story-frameworks'
import { generateScriptViaRouter, hasAnyTextProviderKey } from '@/lib/ai/providers/generation-bridge'
import {
  loadDirectorStudioSnapshot,
  upsertDirectorProjectState,
  verifyDirectorProject,
} from '@/lib/director/director-db.server'
import { rowToMemoryProfile } from '@/lib/memory/creator-memory-engine'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logError } from '@/lib/workspace/validation'
import { resolveDirectorCreatorMemory } from '@/lib/director/memory/project-analysis-engine'
import { resolveDirectorIntelligenceGraph } from '@/lib/intelligence/creator-graph.server'
import { loadVirloMarketIntelligence } from '@/lib/virlo/viral-patterns.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function parseFrameworkId(raw: unknown): StoryFrameworkId | null {
  if (typeof raw !== 'string') return null
  return STORY_FRAMEWORK_IDS.includes(raw as StoryFrameworkId) ? (raw as StoryFrameworkId) : null
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    if (!hasAnyTextProviderKey()) {
      return NextResponse.json(
        { error: 'No AI provider configured for story generation' },
        { status: 503 }
      )
    }

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const projectId = String(parsed.body!.projectId || '').trim()
    const userIdea = String(
      parsed.body!.userIdea || parsed.body!.topic || parsed.body!.prompt || ''
    ).trim()
    const frameworkOverride = parseFrameworkId(parsed.body!.framework)

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }
    if (userIdea.length < 3) {
      return NextResponse.json({ error: 'userIdea required (3+ characters)' }, { status: 400 })
    }

    const userId = auth.user!.id
    const project = await verifyDirectorProject(projectId, userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const snapshot = await loadDirectorStudioSnapshot(projectId, userId)
    const supabase = createSupabaseServerClient()
    const { data: memoryRow } = await supabase
      .from('creator_profiles')
      .select(
        'creator_memory, creator_dna, relationship_level, relationship_score, memory_graph, learning_events, niche, platform, content_style, updated_at'
      )
      .eq('user_id', userId)
      .maybeSingle()
    const memoryProfile = memoryRow ? rowToMemoryProfile(memoryRow) : null
    const directorCreatorMemory = await resolveDirectorCreatorMemory(userId)
    const intelligenceGraph = await resolveDirectorIntelligenceGraph(userId)
    const virloMarket = await loadVirloMarketIntelligence(
      typeof parsed.body!.platform === 'string' ? parsed.body!.platform : null
    )

    const directorContext = snapshot
      ? {
          activeStoryDirection: snapshot.storyDirections.activeStoryDirection,
          activeFramework: snapshot.projectState.activeFramework,
          frameworkAnalysis: snapshot.projectState.frameworkAnalysis,
          directorTreatment: snapshot.directorTreatment,
          characterBible: snapshot.characterBible,
          blueprint: snapshot.projectState.blueprint,
          storyDirectorPackage: snapshot.projectState.storyDirectorPackage,
        }
      : null

    const promptBundle = buildStoryDirectorPrompt({
      userIdea,
      topic: snapshot?.storyDirections.topic || project.prompt || userIdea,
      frameworkId: frameworkOverride,
      durationSec:
        typeof parsed.body!.durationSec === 'number'
          ? parsed.body!.durationSec
          : typeof parsed.body!.duration === 'number'
            ? parsed.body!.duration
            : 60,
      platform: typeof parsed.body!.platform === 'string' ? parsed.body!.platform : undefined,
      niche: typeof parsed.body!.niche === 'string' ? parsed.body!.niche : undefined,
      tone: typeof parsed.body!.tone === 'string' ? parsed.body!.tone : undefined,
      memoryProfile,
      directorContext,
    })

    const routerResult = await generateScriptViaRouter({
      systemPrompt: promptBundle.systemPrompt,
      userPrompt: promptBundle.userPrompt,
      topic: userIdea,
      temperature: 0.82,
      contextInput: {
        topic: userIdea,
        niche: promptBundle.creatorDna.NICHE,
        tone: promptBundle.creatorDna.TONE,
        memoryProfile,
        directorStudioContext: directorContext,
        directorCreatorMemory,
        directorIntelligence: intelligenceGraph
          ? {
              graphData: intelligenceGraph.graphData,
              insights: intelligenceGraph.insights,
              virloMarket,
            }
          : undefined,
      },
    })

    const storyPackage: StoryDirectorPackage = parseStoryDirectorOutput(
      JSON.stringify(routerResult.parsed),
      {
        frameworkId: promptBundle.frameworkId,
        creatorDna: promptBundle.creatorDna,
      }
    )

    const { error } = await upsertDirectorProjectState(projectId, userId, {
      storyDirectorPackage: storyPackage,
      stageProgress: {
        ...(snapshot?.projectState.stageProgress ?? {}),
        'story-package': 'complete',
      },
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      package: storyPackage,
      provider: routerResult.provider,
      frameworkId: promptBundle.frameworkId,
    })
  } catch (err) {
    logError('director.story-package', err)
    return NextResponse.json({ error: 'Story Director generation failed' }, { status: 500 })
  }
}
