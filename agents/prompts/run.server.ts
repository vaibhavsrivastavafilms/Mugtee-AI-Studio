import 'server-only'

import {
  buildSceneCharacterRequirements,
  composeAllScenePrompts,
  resolveSceneContexts,
  type PromptEngineInput,
} from '@/agents/prompts/compose.server'
import { validateScenePromptDocument } from '@/agents/prompts/validate.server'
import type {
  CinematicStyle,
  ProductionPlan,
  ResearchBrief,
  ScenePromptDocument,
  V3CharacterRow,
  V3LocationRow,
  V3SceneRow,
} from '@/types/v3/production'

export type PromptAgentParams = {
  plan: ProductionPlan
  style: CinematicStyle
  research: ResearchBrief
  scenes: V3SceneRow[]
  characters: V3CharacterRow[]
  locations: V3LocationRow[]
}

export type PromptAgentResult = {
  document: ScenePromptDocument
  durationMs: number
}

export async function runPromptsAgent(params: PromptAgentParams): Promise<PromptAgentResult> {
  const started = Date.now()

  if (!params.style) {
    throw new Error('Cinematic style missing — run Style Agent first')
  }
  if (params.scenes.length === 0) {
    throw new Error('No scenes found — run Script and Storyboard agents first')
  }
  if (params.locations.length === 0) {
    throw new Error('No locations found — run Location Agent first')
  }

  const contexts = resolveSceneContexts({
    scenes: params.scenes,
    characters: params.characters,
    locations: params.locations,
  })

  const engineInput: PromptEngineInput = {
    plan: params.plan,
    style: params.style,
    research: params.research,
    scenes: contexts,
  }

  const prompts = composeAllScenePrompts(engineInput)
  const requirements = buildSceneCharacterRequirements(contexts)
  validateScenePromptDocument(prompts, requirements)

  return {
    document: { prompts },
    durationMs: Date.now() - started,
  }
}
