import { createSupabaseServerClient } from '@/lib/supabase/server'
import type {
  CreatorMemoryProfile,
  CreatorPreferences,
  DirectorProjectAnalysis,
  MemoryFrequencyMap,
  MotionMemory,
  StoryMemory,
  VisualMemory,
  VoiceMemory,
} from '@/lib/director/memory/types'
import {
  EMPTY_CREATOR_PREFERENCES,
  EMPTY_MOTION_MEMORY,
  EMPTY_STORY_MEMORY,
  EMPTY_VISUAL_MEMORY,
  EMPTY_VOICE_MEMORY,
} from '@/lib/director/memory/types'

type CreatorMemoryRow = {
  id: string
  user_id: string
  story_memory: unknown
  visual_memory: unknown
  voice_memory: unknown
  motion_memory: unknown
  creator_preferences: unknown
  created_at: string
  updated_at: string
}

function parseFrequencyMap(raw: unknown): MemoryFrequencyMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: MemoryFrequencyMap = {}
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object' || Array.isArray(val)) continue
    const entry = val as { count?: number; weight?: number }
    out[key] = {
      count: Number(entry.count ?? 0),
      weight: Number(entry.weight ?? entry.count ?? 0),
    }
  }
  return out
}

function parseStoryMemory(raw: unknown): StoryMemory {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY_STORY_MEMORY }
  const r = raw as Partial<StoryMemory>
  return {
    frameworks: parseFrequencyMap(r.frameworks),
    hookStyles: parseFrequencyMap(r.hookStyles),
    emotionalArcs: parseFrequencyMap(r.emotionalArcs),
    projectCount: Number(r.projectCount ?? 0),
    lastProjectId: r.lastProjectId ?? null,
  }
}

function parseVisualMemory(raw: unknown): VisualMemory {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY_VISUAL_MEMORY }
  const r = raw as Partial<VisualMemory>
  return {
    shotTypes: parseFrequencyMap(r.shotTypes),
    lighting: parseFrequencyMap(r.lighting),
    colorPalettes: parseFrequencyMap(r.colorPalettes),
    composition: parseFrequencyMap(r.composition),
    cameraMovements: parseFrequencyMap(r.cameraMovements),
    projectCount: Number(r.projectCount ?? 0),
  }
}

function parseVoiceMemory(raw: unknown): VoiceMemory {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY_VOICE_MEMORY }
  const r = raw as Partial<VoiceMemory>
  return {
    narratorTones: parseFrequencyMap(r.narratorTones),
    pacing: parseFrequencyMap(r.pacing),
    intensity: parseFrequencyMap(r.intensity),
    narrationTypes: parseFrequencyMap(r.narrationTypes),
    projectCount: Number(r.projectCount ?? 0),
  }
}

function parseMotionMemory(raw: unknown): MotionMemory {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY_MOTION_MEMORY }
  const r = raw as Partial<MotionMemory>
  return {
    motionStyles: parseFrequencyMap(r.motionStyles),
    zoomUsage: parseFrequencyMap(r.zoomUsage),
    panUsage: parseFrequencyMap(r.panUsage),
    driftUsage: parseFrequencyMap(r.driftUsage),
    pacing: parseFrequencyMap(r.pacing),
    projectCount: Number(r.projectCount ?? 0),
  }
}

function parseCreatorPreferences(raw: unknown): CreatorPreferences {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY_CREATOR_PREFERENCES }
  const r = raw as Partial<CreatorPreferences>
  return {
    avgSceneCount: Number(r.avgSceneCount ?? 0),
    avgDurationSec: Number(r.avgDurationSec ?? 0),
    preferredFramework: r.preferredFramework ?? null,
    preferredGenre: r.preferredGenre ?? null,
    preferredMood: r.preferredMood ?? null,
    projectCount: Number(r.projectCount ?? 0),
  }
}

function rowToProfile(row: CreatorMemoryRow): CreatorMemoryProfile {
  return {
    id: row.id,
    userId: row.user_id,
    storyMemory: parseStoryMemory(row.story_memory),
    visualMemory: parseVisualMemory(row.visual_memory),
    voiceMemory: parseVoiceMemory(row.voice_memory),
    motionMemory: parseMotionMemory(row.motion_memory),
    creatorPreferences: parseCreatorPreferences(row.creator_preferences),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mergeFrequencyMaps(
  existing: MemoryFrequencyMap,
  incoming: MemoryFrequencyMap
): MemoryFrequencyMap {
  const merged = { ...existing }
  for (const [key, entry] of Object.entries(incoming)) {
    const prev = merged[key]
    const count = (prev?.count ?? 0) + (entry.count ?? 1)
    const weight = (prev?.weight ?? 0) + (entry.weight ?? entry.count ?? 1)
    merged[key] = { count, weight }
  }
  return merged
}

function rollingAverage(prev: number, next: number, prevCount: number): number {
  if (prevCount <= 0) return next
  return (prev * prevCount + next) / (prevCount + 1)
}

function topKey(map: MemoryFrequencyMap): string | null {
  const sorted = Object.entries(map).sort(
    (a, b) => (b[1]?.weight ?? 0) - (a[1]?.weight ?? 0)
  )
  return sorted[0]?.[0] ?? null
}

function mergeStoryMemory(prev: StoryMemory, patch: Partial<StoryMemory>): StoryMemory {
  return {
    frameworks: mergeFrequencyMaps(prev.frameworks, patch.frameworks ?? {}),
    hookStyles: mergeFrequencyMaps(prev.hookStyles, patch.hookStyles ?? {}),
    emotionalArcs: mergeFrequencyMaps(prev.emotionalArcs, patch.emotionalArcs ?? {}),
    projectCount: prev.projectCount + 1,
    lastProjectId: patch.lastProjectId ?? prev.lastProjectId,
  }
}

function mergeVisualMemory(prev: VisualMemory, patch: Partial<VisualMemory>): VisualMemory {
  return {
    shotTypes: mergeFrequencyMaps(prev.shotTypes, patch.shotTypes ?? {}),
    lighting: mergeFrequencyMaps(prev.lighting, patch.lighting ?? {}),
    colorPalettes: mergeFrequencyMaps(prev.colorPalettes, patch.colorPalettes ?? {}),
    composition: mergeFrequencyMaps(prev.composition, patch.composition ?? {}),
    cameraMovements: mergeFrequencyMaps(prev.cameraMovements, patch.cameraMovements ?? {}),
    projectCount: prev.projectCount + 1,
  }
}

function mergeVoiceMemory(prev: VoiceMemory, patch: Partial<VoiceMemory>): VoiceMemory {
  return {
    narratorTones: mergeFrequencyMaps(prev.narratorTones, patch.narratorTones ?? {}),
    pacing: mergeFrequencyMaps(prev.pacing, patch.pacing ?? {}),
    intensity: mergeFrequencyMaps(prev.intensity, patch.intensity ?? {}),
    narrationTypes: mergeFrequencyMaps(prev.narrationTypes, patch.narrationTypes ?? {}),
    projectCount: prev.projectCount + 1,
  }
}

function mergeMotionMemory(prev: MotionMemory, patch: Partial<MotionMemory>): MotionMemory {
  return {
    motionStyles: mergeFrequencyMaps(prev.motionStyles, patch.motionStyles ?? {}),
    zoomUsage: mergeFrequencyMaps(prev.zoomUsage, patch.zoomUsage ?? {}),
    panUsage: mergeFrequencyMaps(prev.panUsage, patch.panUsage ?? {}),
    driftUsage: mergeFrequencyMaps(prev.driftUsage, patch.driftUsage ?? {}),
    pacing: mergeFrequencyMaps(prev.pacing, patch.pacing ?? {}),
    projectCount: prev.projectCount + 1,
  }
}

function mergeCreatorPreferences(
  prev: CreatorPreferences,
  patch: Partial<CreatorPreferences>,
  story: StoryMemory,
  treatmentGenre: string | null,
  treatmentMood: string | null
): CreatorPreferences {
  const prevCount = prev.projectCount
  const nextSceneCount = patch.avgSceneCount ?? prev.avgSceneCount
  const nextDuration = patch.avgDurationSec ?? prev.avgDurationSec
  return {
    avgSceneCount: rollingAverage(prev.avgSceneCount, nextSceneCount, prevCount),
    avgDurationSec: rollingAverage(prev.avgDurationSec, nextDuration, prevCount),
    preferredFramework: topKey(story.frameworks) ?? prev.preferredFramework,
    preferredGenre: treatmentGenre || prev.preferredGenre,
    preferredMood: treatmentMood || prev.preferredMood,
    projectCount: prevCount + 1,
  }
}

export async function getOrCreateCreatorMemory(userId: string): Promise<CreatorMemoryProfile> {
  const supabase = createSupabaseServerClient()
  const { data: existing } = await supabase
    .from('creator_memories')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) return rowToProfile(existing as CreatorMemoryRow)

  const { data: created, error } = await supabase
    .from('creator_memories')
    .insert({ user_id: userId })
    .select('*')
    .single()

  if (error || !created) {
    throw new Error(error?.message ?? 'Failed to create creator memory')
  }
  return rowToProfile(created as CreatorMemoryRow)
}

export async function updateCreatorMemoryFromAnalysis(
  userId: string,
  analysis: DirectorProjectAnalysis,
  opts?: { genre?: string | null; mood?: string | null }
): Promise<CreatorMemoryProfile> {
  const current = await getOrCreateCreatorMemory(userId)

  const storyMemory = mergeStoryMemory(current.storyMemory, {
    ...analysis.storyMemory,
    lastProjectId: analysis.projectId,
  })
  const visualMemory = mergeVisualMemory(current.visualMemory, analysis.visualMemory)
  const voiceMemory = mergeVoiceMemory(current.voiceMemory, analysis.voiceMemory)
  const motionMemory = mergeMotionMemory(current.motionMemory, analysis.motionMemory)
  const creatorPreferences = mergeCreatorPreferences(
    current.creatorPreferences,
    analysis.creatorPreferences,
    storyMemory,
    opts?.genre ?? null,
    opts?.mood ?? null
  )

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('creator_memories')
    .update({
      story_memory: storyMemory,
      visual_memory: visualMemory,
      voice_memory: voiceMemory,
      motion_memory: motionMemory,
      creator_preferences: creatorPreferences,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update creator memory')
  }
  return rowToProfile(data as CreatorMemoryRow)
}
