import 'server-only'

import { runPromptsAgent } from '@/agents/prompts'
import {
  getV3Project,
  replaceV3ScenePrompts,
  updateV3Project,
  upsertV3Job,
} from '@/lib/v3/db.server'
import { V3_POST_PROMPTS_STAGE } from '@/lib/v3/pipeline'
import type { SupabaseServerClient } from '@/lib/supabase/server'
import type { ProductionPlan, ResearchBrief } from '@/types/v3/production'

export type RunPromptEngineParams = {
  supabase: SupabaseServerClient
  projectId: string
  userId: string
}

export type RunPromptEngineResult = {
  success: true
  promptsGenerated: number
}

function getJobOutput<T>(
  jobs: { agent: string; output: Record<string, unknown> | null }[],
  agent: string,
  key: string
): T | null {
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

/** Generate, validate, and persist scene prompts for a project. */
export async function runV3PromptEngine(
  params: RunPromptEngineParams
): Promise<RunPromptEngineResult> {
  const snapshot = await getV3Project(params.supabase, params.projectId, params.userId)
  if (!snapshot) throw new Error('Project not found')

  const plan = snapshot.project.production_plan
  const style = snapshot.project.cinematic_style
  if (!plan) throw new Error('Production plan missing')
  if (!style) throw new Error('Cinematic style missing — run Style Agent first')

  const research =
    getJobOutput<ResearchBrief>(snapshot.jobs, 'research', 'brief') ?? fallbackResearch(plan)

  await updateV3Project(params.supabase, params.projectId, params.userId, {
    current_stage: 'prompts',
  })

  await upsertV3Job(params.supabase, {
    projectId: params.projectId,
    agent: 'prompts',
    status: 'running',
    input: { productionPlan: plan },
  })

  try {
    const { document, durationMs } = await runPromptsAgent({
      plan,
      style,
      research,
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

    await upsertV3Job(params.supabase, {
      projectId: params.projectId,
      agent: 'prompts',
      status: 'completed',
      input: { productionPlan: plan, style, research },
      output: {
        document,
        promptsGenerated: document.prompts.length,
        durationMs,
      },
    })

    await updateV3Project(params.supabase, params.projectId, params.userId, {
      current_stage: V3_POST_PROMPTS_STAGE,
    })

    return {
      success: true,
      promptsGenerated: document.prompts.length,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Prompt engineering failed'
    await upsertV3Job(params.supabase, {
      projectId: params.projectId,
      agent: 'prompts',
      status: 'failed',
      input: { productionPlan: plan },
      error: message,
    })
    await updateV3Project(params.supabase, params.projectId, params.userId, {
      status: 'failed',
      current_stage: 'prompts',
    })
    throw err
  }
}
