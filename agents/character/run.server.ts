import 'server-only'

import { generateSceneImage } from '@/lib/ai/generate-scene-image'
import { generateStructuredJson } from '@/agents/shared/llm-json.server'
import {
  buildCharacterReferencePrompt,
  buildCharacterUserPrompt,
  CHARACTER_SYSTEM_PROMPT,
} from '@/agents/character/prompt'
import { parseCharacterDocument } from '@/agents/character/schema'
import type {
  CharacterDocument,
  CharacterProfile,
  ProductionPlan,
  ScriptDocument,
  StoryboardDocument,
} from '@/types/v3/production'

export type CharacterAgentResult = {
  document: CharacterDocument
  raw: Record<string, unknown>
  durationMs: number
  referenceImages: Record<string, string | null>
}

export async function runCharacterAgent(params: {
  plan: ProductionPlan
  script: ScriptDocument
  storyboard: StoryboardDocument
  userId: string
  projectId: string
}): Promise<CharacterAgentResult> {
  const started = Date.now()
  const raw = await generateStructuredJson<Record<string, unknown>>({
    systemPrompt: CHARACTER_SYSTEM_PROMPT,
    userPrompt: buildCharacterUserPrompt(params.plan, params.script, params.storyboard),
    temperature: 0.4,
    timeoutMs: 120_000,
    agent: 'character',
  })
  const document = parseCharacterDocument(raw)

  const referenceImages: Record<string, string | null> = {}
  if (params.plan.characterConsistency && document.characters.length > 0) {
    for (const character of document.characters) {
      referenceImages[character.characterId] = await generateCharacterReferenceImage({
        character,
        userId: params.userId,
        projectId: params.projectId,
        aspectRatio: params.plan.aspectRatio,
      })
    }
  }

  return {
    document,
    raw,
    durationMs: Date.now() - started,
    referenceImages,
  }
}

async function generateCharacterReferenceImage(params: {
  character: CharacterProfile
  userId: string
  projectId: string
  aspectRatio: ProductionPlan['aspectRatio']
}): Promise<string | null> {
  const prompt = buildCharacterReferencePrompt(params.character)
  const filename = `${params.userId}/v3/${params.projectId}/characters/${params.character.characterId}_${params.character.seed}.png`
  const result = await generateSceneImage(prompt, {
    filename,
    userId: params.userId,
    aspectRatio: params.aspectRatio === '16:9' ? '16:9' : '9:16',
  })
  return result.url
}
