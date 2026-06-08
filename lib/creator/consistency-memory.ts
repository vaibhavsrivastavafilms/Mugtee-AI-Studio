import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SceneBlueprint } from '@/lib/cinematic/scene-blueprint'
import { buildVisualConsistencyPack } from '@/lib/cinematic/scene-blueprint'
import type { StoryBible } from '@/lib/cinematic/story-bible'
import type { VisualStyle } from '@/lib/cinematic/workflow-state'
import type { OutputAlignmentControls } from '@/lib/cinematic/scene-blueprint'
import { getCreatorOsProfile } from '@/lib/creator/creator-os-profile'

const MEMORY_KEY = 'mugtee:consistency-memory:v1'

export type ConsistencyMemory = {
  characterThread: string | null
  styleThread: string | null
  locationThread: string | null
  locations: string[]
  updatedAt: string | null
}

const EMPTY: ConsistencyMemory = {
  characterThread: null,
  styleThread: null,
  locationThread: null,
  locations: [],
  updatedAt: null,
}

function readMemory(): ConsistencyMemory {
  if (typeof window === 'undefined') return { ...EMPTY }
  try {
    const raw = localStorage.getItem(MEMORY_KEY)
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<ConsistencyMemory>) } : { ...EMPTY }
  } catch {
    return { ...EMPTY }
  }
}

function writeMemory(memory: ConsistencyMemory) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory))
  } catch {
    /* quota */
  }
}

/** Aggregate character, style, and location threads from project + Creator OS profile. */
export function buildConsistencyMemory(input: {
  characterDescription?: string | null
  storyBible?: StoryBible | null
  visualStyle?: VisualStyle | null
  style?: string | null
  sceneBlueprints?: SceneBlueprint[]
  scenes?: GeneratedScene[]
  outputAlignmentControls?: OutputAlignmentControls | null
}): ConsistencyMemory {
  const os = getCreatorOsProfile()
  const pack = buildVisualConsistencyPack(input.sceneBlueprints ?? [], {
    characterDescription: input.characterDescription ?? undefined,
    visualStyle: input.visualStyle ?? undefined,
    storyBible: input.storyBible ?? undefined,
    controls: input.outputAlignmentControls ?? undefined,
  })

  const locations = [
    ...new Set(
      (input.sceneBlueprints ?? [])
        .map((b) => b.location?.trim())
        .filter((l): l is string => Boolean(l))
    ),
  ]

  const locationThread =
    locations.length > 0
      ? locations.slice(0, 4).join(' → ')
      : input.storyBible?.environment?.trim() || null

  return {
    characterThread:
      input.characterDescription?.trim() ||
      pack.characterReference?.trim() ||
      null,
    styleThread:
      pack.visualStyleReference?.trim() ||
      input.visualStyle?.label?.trim() ||
      input.style?.trim() ||
      os.visualStyle?.trim() ||
      null,
    locationThread,
    locations,
    updatedAt: new Date().toISOString(),
  }
}

export function getConsistencyMemory(): ConsistencyMemory {
  return readMemory()
}

export function persistConsistencyMemory(memory: ConsistencyMemory): void {
  writeMemory(memory)
}

export function updateConsistencyMemoryFromProject(input: {
  characterDescription?: string | null
  storyBible?: StoryBible | null
  visualStyle?: VisualStyle | null
  style?: string | null
  sceneBlueprints?: SceneBlueprint[]
  scenes?: GeneratedScene[]
  outputAlignmentControls?: OutputAlignmentControls | null
}): ConsistencyMemory {
  const prior = readMemory()
  const next = buildConsistencyMemory(input)
  const merged: ConsistencyMemory = {
    characterThread: next.characterThread ?? prior.characterThread,
    styleThread: next.styleThread ?? prior.styleThread,
    locationThread: next.locationThread ?? prior.locationThread,
    locations: next.locations.length > 0 ? next.locations : prior.locations,
    updatedAt: next.updatedAt,
  }
  writeMemory(merged)
  return merged
}

/** Prompt suffix injected before image generation for cross-scene consistency. */
export function buildConsistencyInjectionBlock(memory: ConsistencyMemory): string {
  const lines: string[] = []
  if (memory.characterThread) {
    lines.push(`Character lock: ${memory.characterThread}`)
  }
  if (memory.styleThread) {
    lines.push(`Visual style lock: ${memory.styleThread}`)
  }
  if (memory.locationThread) {
    lines.push(`Location thread: ${memory.locationThread}`)
  }
  return lines.join('. ')
}
