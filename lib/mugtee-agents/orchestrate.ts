/**
 * Mugtee Story-to-Film Automation Engine — orchestration.
 * Agents 1–7 run here. Agents 8–13 hand off to Production OS.
 */

import type { CinematicStoryPackage } from '@/lib/cinematic-story-engine/types'
import { companionLineForAgent } from '@/lib/mugtee-agents/companion-copy'
import { runIdeaAnalyzer } from '@/lib/mugtee-agents/agents/idea-analyzer'
import { runStoryEngine } from '@/lib/mugtee-agents/agents/story-architect'
import { runScreenplayEngine } from '@/lib/mugtee-agents/agents/screenplay-engine'
import { runCharacterDirector } from '@/lib/mugtee-agents/agents/character-director'
import { runEnvironmentDirector } from '@/lib/mugtee-agents/agents/environment-director'
import { runStoryboardEngine } from '@/lib/mugtee-agents/agents/storyboard-director'
import {
  flattenPromptBatches,
  runPromptEngine,
} from '@/lib/mugtee-agents/agents/prompt-engine'
import { buildProductionHandoff } from '@/lib/mugtee-agents/agents/production-handoff'
import type {
  MugteeAgentPackage,
  RunMugteeAgentsInput,
} from '@/lib/mugtee-agents/types'

const PACKAGE_KEY = 'mugtee:agent-package:v1'

export type AgentProgressEvent = {
  agent:
    | 'idea_analyzer'
    | 'story_engine'
    | 'screenplay_engine'
    | 'character_director'
    | 'environment_director'
    | 'storyboard_engine'
    | 'prompt_engine'
  line: string
  status: 'running' | 'completed'
}

/** Run Agents 1–7 automatically. Never asks the creator for prompts. */
export function runMugteeAgentSystem(
  input: RunMugteeAgentsInput,
  onProgress?: (event: AgentProgressEvent) => void
): MugteeAgentPackage {
  const emit = (
    agent: AgentProgressEvent['agent'],
    status: AgentProgressEvent['status']
  ) => {
    onProgress?.({
      agent,
      line: companionLineForAgent(agent),
      status,
    })
  }

  emit('idea_analyzer', 'running')
  const creativeBrief = runIdeaAnalyzer(input)
  emit('idea_analyzer', 'completed')

  emit('story_engine', 'running')
  const story = runStoryEngine(creativeBrief)
  emit('story_engine', 'completed')

  emit('screenplay_engine', 'running')
  const screenplay = runScreenplayEngine(creativeBrief, story)
  emit('screenplay_engine', 'completed')

  emit('character_director', 'running')
  const characters = runCharacterDirector(creativeBrief, screenplay)
  emit('character_director', 'completed')

  emit('environment_director', 'running')
  const environment = runEnvironmentDirector(creativeBrief)
  emit('environment_director', 'completed')

  emit('storyboard_engine', 'running')
  const storyboard = runStoryboardEngine(screenplay, characters, environment)
  emit('storyboard_engine', 'completed')

  emit('prompt_engine', 'running')
  const promptBatches = runPromptEngine(storyboard, characters, environment)
  emit('prompt_engine', 'completed')

  const advancedMode = Boolean(input.advancedMode)

  return {
    version: 'mugtee-story-to-film-v1',
    creativeBrief,
    story,
    screenplay,
    characters,
    environment,
    storyboard,
    promptBatches,
    handoff: buildProductionHandoff(screenplay.length),
    companionLine: companionLineForAgent('idea_analyzer'),
    advancedMode,
    createdAt: new Date().toISOString(),
  }
}

/** Bridge to existing storyboard prompt injection path. */
export function toCinematicStoryPackage(
  pkg: MugteeAgentPackage
): CinematicStoryPackage {
  const lead = pkg.characters[0]
  const flat = flattenPromptBatches(pkg.promptBatches)

  return {
    version: 'cinematic-story-engine-v1',
    understanding: {
      idea: pkg.creativeBrief.idea,
      genre: pkg.creativeBrief.genre,
      emotion: pkg.creativeBrief.emotion,
      audience: pkg.creativeBrief.audience,
      language: pkg.creativeBrief.language,
      platform: pkg.creativeBrief.platform,
      lengthSec: pkg.creativeBrief.durationSec,
      characters: pkg.creativeBrief.mainCharacters,
      setting: pkg.creativeBrief.setting,
      conflict: pkg.creativeBrief.conflict,
      ending: pkg.creativeBrief.ending,
    },
    structure: {
      beginning: pkg.story.beginning,
      conflict: pkg.creativeBrief.conflict,
      journey: pkg.story.middle,
      climax: pkg.story.climax,
      resolution: pkg.story.ending,
    },
    screenplay: pkg.screenplay.map((s) => ({
      sceneNumber: s.sceneNumber,
      durationSec: s.durationSec,
      location: s.location,
      characters: s.characters,
      dialogue: s.dialogue,
      narration: s.action,
      cameraDirection: s.cameraDirection,
      lighting: s.lighting,
      emotion: s.emotion,
      transition: s.transition,
      beat:
        s.sceneNumber / Math.max(1, pkg.screenplay.length) < 0.2
          ? 'beginning'
          : s.sceneNumber / Math.max(1, pkg.screenplay.length) < 0.4
            ? 'conflict'
            : s.sceneNumber / Math.max(1, pkg.screenplay.length) < 0.75
              ? 'journey'
              : s.sceneNumber / Math.max(1, pkg.screenplay.length) < 0.9
                ? 'climax'
                : 'resolution',
    })),
    characterBible: lead ?? {
      id: 'char-primary',
      name: 'Protagonist',
      face: 'Consistent lead face',
      hair: 'Locked hairstyle',
      outfit: 'Locked wardrobe',
      expressions: ['happy', 'angry', 'shocked'],
      voiceStyle: 'Warm narration',
      colourPalette: ['locked'],
      negativePrompt: 'face drift',
      referenceImages: [],
      identityLock: 'CHARACTER LOCK',
    },
    environmentBible: pkg.environment,
    scenePrompts: flat.map((p) => ({
      sceneNumber: p.sceneNumber,
      prompt: p.prompt,
      negativePrompt: p.negativePrompt,
      animationInstructions: p.animationInstructions,
      camera:
        pkg.storyboard.find((s) => s.sceneNumber === p.sceneNumber)?.camera ?? '',
      lens:
        pkg.storyboard.find((s) => s.sceneNumber === p.sceneNumber)?.lens ??
        '50mm',
      composition:
        pkg.storyboard.find((s) => s.sceneNumber === p.sceneNumber)
          ?.composition ?? 'rule of thirds',
      lighting:
        pkg.storyboard.find((s) => s.sceneNumber === p.sceneNumber)?.lighting ??
        '',
      movement:
        pkg.storyboard.find((s) => s.sceneNumber === p.sceneNumber)?.movement ??
        '',
      emotion:
        pkg.storyboard.find((s) => s.sceneNumber === p.sceneNumber)?.emotion ??
        '',
      style: 'pixar_stylised_3d',
    })),
    thinkingLine: companionLineForAgent('idea_analyzer'),
    createdAt: pkg.createdAt,
  }
}

export function persistMugteeAgentPackage(pkg: MugteeAgentPackage): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(PACKAGE_KEY, JSON.stringify(pkg))
  } catch {
    /* quota */
  }
}

export function loadMugteeAgentPackage(): MugteeAgentPackage | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(PACKAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as MugteeAgentPackage
  } catch {
    return null
  }
}

export function clearMugteeAgentPackage(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(PACKAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Public prompts only when Advanced Mode is enabled. */
export function getAdvancedPrompts(pkg: MugteeAgentPackage | null) {
  if (!pkg?.advancedMode) return null
  return pkg.promptBatches
}
