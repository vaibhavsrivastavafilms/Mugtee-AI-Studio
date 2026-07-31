/**
 * Run the full Cinematic Story Engine from one idea.
 * Synchronous intelligence package — feeds the production pipeline.
 */

import { understandStoryIdea } from '@/lib/cinematic-story-engine/understand'
import { generateStoryStructure } from '@/lib/cinematic-story-engine/story-structure'
import { generateScreenplay } from '@/lib/cinematic-story-engine/screenplay'
import { generateSceneProductionPrompts } from '@/lib/cinematic-story-engine/scene-prompts'
import type { CinematicStoryPackage } from '@/lib/cinematic-story-engine/types'
import { buildCharacterBible } from '@/lib/production-os/v4/character-bible'
import { buildEnvironmentBible } from '@/lib/production-os/v4/environment-bible'

export type RunCinematicStoryEngineInput = {
  idea: string
  durationSec?: number
  language?: string
  platform?: string
  audience?: string
  style?: string
}

const PACKAGE_KEY = 'mugtee:cinematic-story-package:v1'

/** Automatic workflow STEPS 1–6: idea → structure → screenplay → bibles → prompts. */
export function runCinematicStoryEngine(
  input: RunCinematicStoryEngineInput
): CinematicStoryPackage {
  const understanding = understandStoryIdea({
    idea: input.idea,
    durationSec: input.durationSec,
    language: input.language,
    platform: input.platform,
    audience: input.audience,
  })
  const structure = generateStoryStructure(understanding)
  const screenplay = generateScreenplay(understanding, structure)

  const lead = understanding.characters[0] ?? 'Protagonist'
  const characterBible = buildCharacterBible({
    characterDescription: [
      lead,
      `Central figure of: ${understanding.idea}`,
      `Genre ${understanding.genre}, emotion ${understanding.emotion}.`,
      'Consistent face, hair, outfit, and proportions in every scene.',
    ].join(' '),
    title: lead,
  })

  const environmentBible = buildEnvironmentBible({
    environmentHint: understanding.setting,
    style: input.style || understanding.genre,
  })

  const scenePrompts = generateSceneProductionPrompts({
    understanding,
    screenplay,
    characterBible,
    environmentBible,
    style: input.style,
  })

  return {
    version: 'cinematic-story-engine-v1',
    understanding,
    structure,
    screenplay,
    characterBible,
    environmentBible,
    scenePrompts,
    thinkingLine: '✨ Understanding your story…',
    createdAt: new Date().toISOString(),
  }
}

export function persistCinematicStoryPackage(pkg: CinematicStoryPackage): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(PACKAGE_KEY, JSON.stringify(pkg))
  } catch {
    /* quota */
  }
}

export function loadCinematicStoryPackage(): CinematicStoryPackage | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(PACKAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CinematicStoryPackage
  } catch {
    return null
  }
}

export function clearCinematicStoryPackage(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(PACKAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Apply engine package prompts onto GeneratedScene-like imagePrompt fields. */
export function applyScenePromptsToScenes<
  T extends { id: string; imagePrompt?: string; description?: string },
>(scenes: T[], pkg: CinematicStoryPackage | null): T[] {
  if (!pkg?.scenePrompts?.length) return scenes
  return scenes.map((scene, i) => {
    const prod = pkg.scenePrompts[i] ?? pkg.scenePrompts[pkg.scenePrompts.length - 1]
    if (!prod) return scene
    return {
      ...scene,
      imagePrompt: prod.prompt,
      description: scene.description || pkg.screenplay[i]?.narration || scene.description,
    }
  })
}
