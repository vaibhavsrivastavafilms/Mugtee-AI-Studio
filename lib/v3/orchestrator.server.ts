import 'server-only'

import type { SupabaseServerClient } from '@/lib/supabase/server'
import { runPlannerAgent } from '@/agents/planner'
import { runResearchAgent } from '@/agents/research'
import { runScriptAgent } from '@/agents/script'
import { runStoryboardAgent } from '@/agents/storyboard'
import { runCharacterAgent } from '@/agents/character'
import { runLocationAgent } from '@/agents/location'
import { runStyleAgent } from '@/agents/style'
import { runPromptsAgent } from '@/agents/prompts'
import { executeV3ImageGeneration } from '@/lib/v3/image-generation.server'
import {
  applyCharacterIdsToScenes,
  applyLocationsToScenes,
  applyStoryboardToScenes,
  getV3Project,
  replaceV3Characters,
  replaceV3Locations,
  replaceV3ScenePrompts,
  replaceV3ScenesFromScript,
  updateV3Project,
  upsertV3Job,
} from '@/lib/v3/db.server'
import { executeV3VideoGeneration } from '@/lib/v3/video-generation.server'
import { executeV3VoiceGeneration } from '@/lib/v3/voice-generation.server'
import { executeV3CaptionsGeneration } from '@/lib/v3/captions-generation.server'
import { executeV3TimelineEditor } from '@/lib/v3/timeline-editor.server'
import { startV3ExportInBackground } from '@/lib/v3/export.server'
import { resolveMvpRoyaltyFreeMusicUrl } from '@/lib/v3/music.server'
import { captureException, trackPipelineEvent } from '@/lib/monitoring/observability.server'
import {
  V3_POST_IMAGE_STAGE,
  V3_POST_VIDEO_STAGE,
  V3_RUNNABLE_AGENTS,
} from '@/lib/v3/pipeline'
import type {
  ProductionPlan,
  ResearchBrief,
  ScriptDocument,
  StoryboardDocument,
  V3AgentId,
  V3JobRow,
} from '@/types/v3/production'

const DOWNSTREAM_AGENTS = [
  ...V3_RUNNABLE_AGENTS,
  'prompts',
  'image',
  'video',
  'voice',
  'music',
  'captions',
  'editor',
  'quality',
  'export',
] as const satisfies ReadonlyArray<V3AgentId>

function getJobOutput<T>(jobs: V3JobRow[], agent: V3AgentId, key: string): T | null {
  const job = jobs.find((j) => j.agent === agent)
  const value = job?.output?.[key]
  return value != null ? (value as T) : null
}

function fallbackResearch(plan: ProductionPlan): ResearchBrief {
  return {
    topics: [plan.style],
    culturalNotes: plan.location ? [plan.location] : [],
    visualReferences: [plan.style],
    storytellingReferences: plan.tone ? [plan.tone] : [plan.style],
    emotionalDirection: plan.music ? [plan.music] : ['engaging'],
    keyFacts: [plan.title],
  }
}

async function loadScriptFromScenes(
  supabase: SupabaseServerClient,
  projectId: string,
  userId: string
): Promise<ScriptDocument | null> {
  const snapshot = await getV3Project(supabase, projectId, userId)
  if (!snapshot) return null
  const scenes = snapshot.scenes
    .map((scene) => scene.script as ScriptDocument['scenes'][number])
    .filter((script) => script && typeof script === 'object' && 'narration' in script)
  return scenes.length > 0 ? { scenes } : null
}

async function loadStoryboardFromScenes(
  supabase: SupabaseServerClient,
  projectId: string,
  userId: string
): Promise<StoryboardDocument | null> {
  const snapshot = await getV3Project(supabase, projectId, userId)
  if (!snapshot) return null
  const scenes = snapshot.scenes
    .map((scene) => scene.storyboard as StoryboardDocument['scenes'][number])
    .filter((board) => board && typeof board === 'object' && Array.isArray(board.shots))
  return scenes.length > 0 ? { scenes } : null
}

/** Phase 1–2: Planner Agent + enqueue downstream jobs. */
export async function runV3ProductionPhase1(params: {
  supabase: SupabaseServerClient
  projectId: string
  userId: string
  prompt: string
}) {
  await updateV3Project(params.supabase, params.projectId, params.userId, {
    status: 'planning',
    current_stage: 'planning',
  })

  await upsertV3Job(params.supabase, {
    projectId: params.projectId,
    agent: 'planner',
    status: 'running',
    input: { prompt: params.prompt },
  })

  try {
    const { plan, raw, durationMs } = await runPlannerAgent(params.prompt, {
      projectId: params.projectId,
    })

    await upsertV3Job(params.supabase, {
      projectId: params.projectId,
      agent: 'planner',
      status: 'completed',
      input: { prompt: params.prompt },
      output: { plan, raw, durationMs },
    })

    await updateV3Project(params.supabase, params.projectId, params.userId, {
      title: plan.title,
      status: 'producing',
      production_plan: plan,
      current_stage: 'research',
    })

    for (const agent of DOWNSTREAM_AGENTS) {
      await upsertV3Job(params.supabase, {
        projectId: params.projectId,
        agent,
        status: 'queued',
        input: { productionPlan: plan },
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Planner failed'
    await upsertV3Job(params.supabase, {
      projectId: params.projectId,
      agent: 'planner',
      status: 'failed',
      input: { prompt: params.prompt },
      error: message,
    })
    await updateV3Project(params.supabase, params.projectId, params.userId, {
      status: 'failed',
      current_stage: 'planning',
    })
    throw err
  }

  const snapshot = await getV3Project(params.supabase, params.projectId, params.userId)
  if (!snapshot) throw new Error('Project not found after planning')
  return snapshot
}

/** Advance one queued agent at a time (Research → … → Style). */
export async function advanceV3Production(params: {
  supabase: SupabaseServerClient
  projectId: string
  userId: string
}) {
  const snapshot = await getV3Project(params.supabase, params.projectId, params.userId)
  if (!snapshot) throw new Error('Project not found')

  const plan = snapshot.project.production_plan
  if (!plan) throw new Error('Production plan missing — run planner first')

  const jobByAgent = new Map(snapshot.jobs.map((j) => [j.agent, j]))
  if (jobByAgent.get('planner')?.status !== 'completed') {
    return snapshot
  }

  for (const agent of V3_RUNNABLE_AGENTS) {
    const job = jobByAgent.get(agent)
    if (!job || job.status !== 'queued') continue

    await updateV3Project(params.supabase, params.projectId, params.userId, {
      current_stage: agent,
    })

    await upsertV3Job(params.supabase, {
      projectId: params.projectId,
      agent,
      status: 'running',
      input: job.input,
    })

    try {
      if (agent === 'research') {
        const { brief, raw, durationMs } = await runResearchAgent(plan)
        await upsertV3Job(params.supabase, {
          projectId: params.projectId,
          agent: 'research',
          status: 'completed',
          input: job.input,
          output: { brief, raw, durationMs },
        })
      }

      if (agent === 'script') {
        const brief = getJobOutput<ResearchBrief>(snapshot.jobs, 'research', 'brief') ?? fallbackResearch(plan)
        const { script, raw, durationMs } = await runScriptAgent(plan, brief)
        await replaceV3ScenesFromScript(params.supabase, params.projectId, script)
        await upsertV3Job(params.supabase, {
          projectId: params.projectId,
          agent: 'script',
          status: 'completed',
          input: { productionPlan: plan, research: brief },
          output: { script, raw, durationMs },
        })
      }

      if (agent === 'storyboard') {
        const script =
          getJobOutput<ScriptDocument>(snapshot.jobs, 'script', 'script') ??
          (await loadScriptFromScenes(params.supabase, params.projectId, params.userId))
        if (!script || script.scenes.length === 0) {
          throw new Error('Script missing — cannot storyboard')
        }

        const { storyboard, raw, durationMs } = await runStoryboardAgent(plan, script)
        await applyStoryboardToScenes(params.supabase, params.projectId, storyboard)
        await upsertV3Job(params.supabase, {
          projectId: params.projectId,
          agent: 'storyboard',
          status: 'completed',
          input: { productionPlan: plan, script },
          output: { storyboard, raw, durationMs },
        })
      }

      if (agent === 'character') {
        const script =
          getJobOutput<ScriptDocument>(snapshot.jobs, 'script', 'script') ??
          (await loadScriptFromScenes(params.supabase, params.projectId, params.userId))
        const storyboard =
          getJobOutput<StoryboardDocument>(snapshot.jobs, 'storyboard', 'storyboard') ??
          (await loadStoryboardFromScenes(params.supabase, params.projectId, params.userId))
        if (!script || !storyboard) throw new Error('Script/storyboard missing — cannot design characters')

        const { document, raw, durationMs, referenceImages } = await runCharacterAgent({
          plan,
          script,
          storyboard,
          userId: params.userId,
          projectId: params.projectId,
        })
        const characterRows = await replaceV3Characters(
          params.supabase,
          params.projectId,
          document,
          referenceImages
        )
        await applyCharacterIdsToScenes(
          params.supabase,
          params.projectId,
          document,
          characterRows
        )
        await upsertV3Job(params.supabase, {
          projectId: params.projectId,
          agent: 'character',
          status: 'completed',
          input: { productionPlan: plan, script, storyboard },
          output: { document, referenceImages, raw, durationMs },
        })
      }

      if (agent === 'location') {
        const script =
          getJobOutput<ScriptDocument>(snapshot.jobs, 'script', 'script') ??
          (await loadScriptFromScenes(params.supabase, params.projectId, params.userId))
        const storyboard =
          getJobOutput<StoryboardDocument>(snapshot.jobs, 'storyboard', 'storyboard') ??
          (await loadStoryboardFromScenes(params.supabase, params.projectId, params.userId))
        if (!script || !storyboard) throw new Error('Script/storyboard missing — cannot design locations')

        const { document, raw, durationMs } = await runLocationAgent(plan, script, storyboard)
        const locationRows = await replaceV3Locations(params.supabase, params.projectId, document)
        await applyLocationsToScenes(params.supabase, params.projectId, document, locationRows)
        await upsertV3Job(params.supabase, {
          projectId: params.projectId,
          agent: 'location',
          status: 'completed',
          input: { productionPlan: plan, script, storyboard },
          output: { document, raw, durationMs },
        })
      }

      if (agent === 'style') {
        const brief = getJobOutput<ResearchBrief>(snapshot.jobs, 'research', 'brief') ?? fallbackResearch(plan)
        const { style, raw, durationMs } = await runStyleAgent(plan, brief)
        await updateV3Project(params.supabase, params.projectId, params.userId, {
          cinematic_style: style,
          current_stage: 'prompts',
        })
        await upsertV3Job(params.supabase, {
          projectId: params.projectId,
          agent: 'style',
          status: 'completed',
          input: { productionPlan: plan, research: brief },
          output: { style, raw, durationMs },
        })
      }

      if (agent === 'prompts') {
        const style = snapshot.project.cinematic_style
        if (!style) throw new Error('Cinematic style missing — cannot engineer prompts')

        const brief = getJobOutput<ResearchBrief>(snapshot.jobs, 'research', 'brief') ?? fallbackResearch(plan)
        const { document, durationMs } = await runPromptsAgent({
          plan,
          style,
          research: brief,
          scenes: snapshot.scenes,
          characters: snapshot.characters,
          locations: snapshot.locations,
        })

        await replaceV3ScenePrompts(
          params.supabase,
          params.projectId,
          document.prompts.map((prompt) => ({
            sceneId: prompt.sceneId,
            imagePrompt: prompt.imagePrompt,
            videoPrompt: prompt.videoPrompt,
            negativePrompt: prompt.negativePrompt,
            metadata: prompt.metadata,
          }))
        )

        await updateV3Project(params.supabase, params.projectId, params.userId, {
          current_stage: 'image',
        })

        await upsertV3Job(params.supabase, {
          projectId: params.projectId,
          agent: 'prompts',
          status: 'completed',
          input: { productionPlan: plan, style, research: brief },
          output: {
            document,
            promptsGenerated: document.prompts.length,
            durationMs,
          },
        })
      }

      if (agent === 'image') {
        const style = snapshot.project.cinematic_style
        if (!style) throw new Error('Cinematic style missing — cannot generate images')

        const { imagesGenerated, durationMs } = await executeV3ImageGeneration({
          supabase: params.supabase,
          projectId: params.projectId,
          userId: params.userId,
        })

        await updateV3Project(params.supabase, params.projectId, params.userId, {
          current_stage: V3_POST_IMAGE_STAGE,
        })

        await upsertV3Job(params.supabase, {
          projectId: params.projectId,
          agent: 'image',
          status: 'completed',
          input: { productionPlan: plan, style },
          output: { imagesGenerated, durationMs },
        })
      }

      if (agent === 'video') {
        const style = snapshot.project.cinematic_style
        if (!style) throw new Error('Cinematic style missing — cannot generate videos')

        const { videosGenerated, durationMs } = await executeV3VideoGeneration({
          supabase: params.supabase,
          projectId: params.projectId,
          userId: params.userId,
        })

        await updateV3Project(params.supabase, params.projectId, params.userId, {
          current_stage: V3_POST_VIDEO_STAGE,
        })

        await upsertV3Job(params.supabase, {
          projectId: params.projectId,
          agent: 'video',
          status: 'completed',
          input: { productionPlan: plan, style },
          output: { videosGenerated, durationMs },
        })
      }

      if (agent === 'voice') {
        const { voiceUrl, durationMs, provider } = await executeV3VoiceGeneration({
          supabase: params.supabase,
          projectId: params.projectId,
          userId: params.userId,
        })

        await updateV3Project(params.supabase, params.projectId, params.userId, {
          current_stage: 'music',
        })

        await upsertV3Job(params.supabase, {
          projectId: params.projectId,
          agent: 'voice',
          status: 'completed',
          input: { productionPlan: plan },
          output: { voiceUrl, provider, durationMs },
        })
      }

      if (agent === 'music') {
        const musicUrl = resolveMvpRoyaltyFreeMusicUrl()
        await updateV3Project(params.supabase, params.projectId, params.userId, {
          music_url: musicUrl,
          current_stage: 'captions',
        })
        await upsertV3Job(params.supabase, {
          projectId: params.projectId,
          agent: 'music',
          status: 'completed',
          input: { productionPlan: plan },
          output: { musicUrl, configured: Boolean(musicUrl) },
        })
      }

      if (agent === 'captions') {
        const { captionCount, durationMs } = await executeV3CaptionsGeneration({
          supabase: params.supabase,
          projectId: params.projectId,
          userId: params.userId,
        })

        await updateV3Project(params.supabase, params.projectId, params.userId, {
          current_stage: 'editor',
        })

        await upsertV3Job(params.supabase, {
          projectId: params.projectId,
          agent: 'captions',
          status: 'completed',
          input: { productionPlan: plan },
          output: { captionCount, durationMs },
        })
      }

      if (agent === 'editor') {
        const { clipCount, totalDurationSec, durationMs } = await executeV3TimelineEditor({
          supabase: params.supabase,
          projectId: params.projectId,
          userId: params.userId,
        })

        await updateV3Project(params.supabase, params.projectId, params.userId, {
          current_stage: 'export',
        })

        await upsertV3Job(params.supabase, {
          projectId: params.projectId,
          agent: 'editor',
          status: 'completed',
          input: { productionPlan: plan },
          output: { clipCount, totalDurationSec, durationMs },
        })
      }

      if (agent === 'export') {
        const fresh = await getV3Project(params.supabase, params.projectId, params.userId)
        if (fresh?.project.reel_url) {
          await upsertV3Job(params.supabase, {
            projectId: params.projectId,
            agent: 'export',
            status: 'completed',
            output: { reelUrl: fresh.project.reel_url },
          })
          await updateV3Project(params.supabase, params.projectId, params.userId, {
            status: 'completed',
            export_status: 'completed',
            current_stage: 'export',
          })
        } else {
          await updateV3Project(params.supabase, params.projectId, params.userId, {
            export_status: 'queued',
            current_stage: 'export',
          })
          await upsertV3Job(params.supabase, {
            projectId: params.projectId,
            agent: 'export',
            status: 'running',
            input: { productionPlan: plan },
            output: { async: true },
          })
          startV3ExportInBackground({
            supabase: params.supabase,
            projectId: params.projectId,
            userId: params.userId,
          })
          return getV3Project(params.supabase, params.projectId, params.userId)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : `${agent} agent failed`
      captureException(err, {
        projectId: params.projectId,
        userId: params.userId,
        agent,
        stage: 'v3_pipeline',
      })
      trackPipelineEvent('v3_pipeline_stage_failed', {
        projectId: params.projectId,
        agent,
      })
      await upsertV3Job(params.supabase, {
        projectId: params.projectId,
        agent,
        status: 'failed',
        input: job.input,
        error: message,
      })
      await updateV3Project(params.supabase, params.projectId, params.userId, {
        status: 'failed',
        current_stage: agent,
      })
      throw err
    }

    return advanceV3Production(params)
  }

  return getV3Project(params.supabase, params.projectId, params.userId)
}
