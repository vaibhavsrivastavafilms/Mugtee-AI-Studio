import type {
  CreatorMemoryProfile,
  CreatorPreferences,
  MemoryFrequencyMap,
  MemoryScores,
  MotionMemory,
  StoryMemory,
  VisualMemory,
  VoiceMemory,
} from '@/lib/director/memory/types'

function mapRichness(map: MemoryFrequencyMap, cap = 40): number {
  const keys = Object.keys(map)
  if (!keys.length) return 0
  const totalWeight = keys.reduce((sum, k) => sum + (map[k]?.weight ?? 0), 0)
  const diversity = Math.min(keys.length * 8, cap)
  const depth = Math.min(totalWeight * 2, cap)
  return Math.round((diversity + depth) / 2)
}

function categoryScore(richness: number, projectCount: number): number {
  const projectBoost = Math.min(projectCount * 12, 48)
  return Math.min(100, Math.round(richness * 0.55 + projectBoost))
}

function preferencesScore(prefs: CreatorPreferences): number {
  let score = Math.min(prefs.projectCount * 15, 45)
  if (prefs.preferredFramework) score += 15
  if (prefs.preferredGenre) score += 10
  if (prefs.preferredMood) score += 10
  if (prefs.avgSceneCount > 0) score += 10
  if (prefs.avgDurationSec > 0) score += 10
  return Math.min(100, score)
}

/** Compute 0–100 maturity scores per memory category. */
export function computeMemoryScores(memory: CreatorMemoryProfile): MemoryScores {
  const story = categoryScore(
    mapRichness(memory.storyMemory.frameworks) +
      mapRichness(memory.storyMemory.hookStyles, 25) +
      mapRichness(memory.storyMemory.emotionalArcs, 25),
    memory.storyMemory.projectCount
  )
  const visual = categoryScore(
    mapRichness(memory.visualMemory.shotTypes) +
      mapRichness(memory.visualMemory.lighting, 20) +
      mapRichness(memory.visualMemory.colorPalettes, 20),
    memory.visualMemory.projectCount
  )
  const voice = categoryScore(
    mapRichness(memory.voiceMemory.narratorTones) +
      mapRichness(memory.voiceMemory.pacing, 25),
    memory.voiceMemory.projectCount
  )
  const motion = categoryScore(
    mapRichness(memory.motionMemory.motionStyles) +
      mapRichness(memory.motionMemory.pacing, 25),
    memory.motionMemory.projectCount
  )
  const preferences = preferencesScore(memory.creatorPreferences)
  const overall = Math.round((story + visual + voice + motion + preferences) / 5)

  return { story, visual, voice, motion, preferences, overall }
}

/** Convert frequency map to sorted percentage list for UI. */
export function frequenciesToPercentages(
  map: MemoryFrequencyMap,
  limit = 8
): Array<{ label: string; percent: number; count: number }> {
  const entries = Object.entries(map)
  if (!entries.length) return []
  const total = entries.reduce((sum, [, v]) => sum + (v?.weight ?? v?.count ?? 0), 0) || 1
  return entries
    .map(([label, v]) => ({
      label,
      count: v?.count ?? 0,
      percent: Math.round(((v?.weight ?? v?.count ?? 0) / total) * 100),
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, limit)
}

export function scoreLabel(score: number): string {
  if (score >= 80) return 'Mastered'
  if (score >= 60) return 'Refined'
  if (score >= 35) return 'Developing'
  if (score > 0) return 'Emerging'
  return 'Uncharted'
}
