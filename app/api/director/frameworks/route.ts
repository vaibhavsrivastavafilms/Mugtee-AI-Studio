import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import {
  STORY_FRAMEWORK_IDS,
  type StoryFrameworkId,
} from '@/lib/ai/prompts/director/story-frameworks'
import { generateFrameworkRecommendations } from '@/lib/director/framework-recommendation-engine'
import type { StoryFrameworkRecommendation } from '@/lib/director/framework-types'
import { buildFrameworkAnalysis } from '@/lib/director/blueprint-from-framework'
import {
  loadDirectorStudioSnapshot,
  upsertActiveStoryFramework,
  upsertDirectorProjectState,
  verifyDirectorProject,
} from '@/lib/director/director-db.server'
import { rowToMemoryProfile } from '@/lib/memory/creator-memory-engine'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { StoryDirectionOption } from '@/lib/director/types'
import { logError } from '@/lib/workspace/validation'
import { getOrCreateCreatorIntelligenceGraph } from '@/lib/intelligence/creator-graph.server'
import { loadVirloMarketIntelligence } from '@/lib/virlo/viral-patterns.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseRecommendation(raw: unknown): StoryFrameworkRecommendation | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const framework = String(r.framework || '') as StoryFrameworkId
  if (!STORY_FRAMEWORK_IDS.includes(framework)) return null
  return {
    framework,
    title: String(r.title || ''),
    coreEmotion: String(r.coreEmotion || ''),
    audienceDesire: String(r.audienceDesire || ''),
    narrativeTension: String(r.narrativeTension || ''),
    curiosityGap: String(r.curiosityGap || ''),
    transformation: String(r.transformation || ''),
    confidenceScore: Math.min(100, Math.max(0, Number(r.confidenceScore) || 0)),
  }
}

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

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const projectId = req.nextUrl.searchParams.get('projectId')?.trim()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    const snapshot = await loadDirectorStudioSnapshot(projectId, auth.user!.id)
    if (!snapshot) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({
      recommendations: snapshot.projectState.frameworkRecommendations,
      activeFramework: snapshot.projectState.activeFramework,
      frameworkAnalysis: snapshot.projectState.frameworkAnalysis,
      frameworkConfidence: snapshot.projectState.activeFramework?.confidenceScore ?? null,
    })
  } catch (err) {
    logError('director.frameworks.get', err)
    return NextResponse.json({ error: 'Failed to load frameworks' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const projectId = String(parsed.body!.projectId || '').trim()
    const idea = String(parsed.body!.idea || parsed.body!.topic || '').trim()

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }
    if (idea.length < 3) {
      return NextResponse.json({ error: 'idea required (3+ characters)' }, { status: 400 })
    }

    const userId = auth.user!.id
    const project = await verifyDirectorProject(projectId, userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const snapshot = await loadDirectorStudioSnapshot(projectId, userId)
    const storyDirection =
      (parsed.body!.storyDirection as StoryDirectionOption | undefined) ??
      snapshot?.storyDirections.activeStoryDirection ??
      null

    const creatorDna =
      (parsed.body!.creatorDNA as Record<string, string> | undefined) ??
      (await loadCreatorDna(userId))

    const [intelligenceGraph, virloMarket] = await Promise.all([
      getOrCreateCreatorIntelligenceGraph(userId),
      loadVirloMarketIntelligence(creatorDna.platform ?? null),
    ])

    const recommendations = await generateFrameworkRecommendations({
      idea,
      storyDirection,
      creatorDna: {
        niche: creatorDna.niche,
        tone: creatorDna.tone,
        platform: creatorDna.platform,
        emotionalGoal: creatorDna.emotionalGoal,
      },
      creatorGraph: intelligenceGraph.graphData,
      virloMarket,
    })

    const { error } = await upsertDirectorProjectState(projectId, userId, {
      frameworkRecommendations: recommendations,
      stageProgress: {
        ...(snapshot?.projectState.stageProgress ?? {}),
        'story-framework': 'in_progress',
      },
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ recommendations })
  } catch (err) {
    logError('director.frameworks.post', err)
    return NextResponse.json({ error: 'Framework recommendation failed' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const projectId = String(parsed.body!.projectId || '').trim()
    const selection = parseRecommendation(parsed.body!.activeFramework ?? parsed.body!.selection)

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }
    if (!selection) {
      return NextResponse.json({ error: 'activeFramework selection required' }, { status: 400 })
    }

    const userId = auth.user!.id
    const project = await verifyDirectorProject(projectId, userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const snapshot = await loadDirectorStudioSnapshot(projectId, userId)
    const { data: fwRow, error: fwError } = await upsertActiveStoryFramework(
      projectId,
      userId,
      selection
    )
    if (fwError || !fwRow) {
      return NextResponse.json({ error: fwError?.message || 'Failed to save framework' }, { status: 500 })
    }

    const frameworkAnalysis = buildFrameworkAnalysis(
      selection.framework,
      snapshot?.storyDirections.activeStoryDirection,
      snapshot?.storyDirections.topic || project.prompt || ''
    )

    const { error } = await upsertDirectorProjectState(projectId, userId, {
      activeFrameworkId: String(fwRow.id),
      frameworkAnalysis,
      stageProgress: {
        ...(snapshot?.projectState.stageProgress ?? {}),
        'story-framework': 'complete',
      },
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const activeFramework = {
      id: String(fwRow.id),
      framework: selection.framework,
      frameworkName: selection.framework,
      title: selection.title,
      coreEmotion: selection.coreEmotion,
      audienceDesire: selection.audienceDesire,
      narrativeTension: selection.narrativeTension,
      curiosityGap: selection.curiosityGap,
      transformation: selection.transformation,
      confidenceScore: selection.confidenceScore,
      selectedAt: new Date().toISOString(),
      viralityScore: null,
      retentionScore: null,
      shareabilityScore: null,
      saveabilityScore: null,
    }

    return NextResponse.json({
      activeFramework,
      frameworkAnalysis,
      frameworkConfidence: selection.confidenceScore,
    })
  } catch (err) {
    logError('director.frameworks.patch', err)
    return NextResponse.json({ error: 'Failed to save framework selection' }, { status: 500 })
  }
}
