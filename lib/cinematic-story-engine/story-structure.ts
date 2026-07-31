import type { StoryStructure, StoryUnderstanding } from '@/lib/cinematic-story-engine/types'

/** STEP 2 — Generate classic story structure automatically. */
export function generateStoryStructure(u: StoryUnderstanding): StoryStructure {
  const lead = u.characters[0] ?? 'the protagonist'
  const world = u.setting

  return {
    beginning: `In ${world}, we meet ${lead} — the spark of "${u.idea}" begins in stillness.`,
    conflict: u.conflict,
    journey: `${lead} steps into the unknown. Obstacles rise. ${u.emotion} deepens with every choice.`,
    climax: `Everything converges — faith, fear, and desire collide as ${lead} faces the decisive moment.`,
    resolution: u.ending,
  }
}
