import type { CreatorWorldId } from '@/lib/multiverse/types'

export type CreatorWorld = {
  id: CreatorWorldId
  label: string
  tagline: string
  accent: string
  starterMissions: string[]
  rewards: string[]
}

export const CREATOR_WORLDS: CreatorWorld[] = [
  {
    id: 'documentary',
    label: 'Documentary',
    tagline: 'Truth-driven stories that educate and inspire.',
    accent: 'from-amber-500/20 to-orange-900/10',
    starterMissions: ['Research a real story', 'Craft a narrative hook', 'Export your first doc-style reel'],
    rewards: ['Archive badge', 'Research agent unlock', 'Story vault highlight'],
  },
  {
    id: 'cinema',
    label: 'Cinema',
    tagline: 'Cinematic visuals, dramatic pacing, film-grade reels.',
    accent: 'from-violet-500/20 to-indigo-900/10',
    starterMissions: ['Storyboard a scene arc', 'Generate cinematic visuals', 'Direct motion on key beats'],
    rewards: ['Director badge', 'Visual agent unlock', 'Legendary project slot'],
  },
  {
    id: 'business',
    label: 'Business',
    tagline: 'Authority content that converts viewers into clients.',
    accent: 'from-emerald-500/20 to-teal-900/10',
    starterMissions: ['Define your offer hook', 'Script a value reel', 'Publish with CTA'],
    rewards: ['Growth agent unlock', 'Publishing streak bonus', 'HQ upgrade boost'],
  },
  {
    id: 'history',
    label: 'History',
    tagline: 'Epic narratives from the past, told for today.',
    accent: 'from-stone-500/20 to-amber-900/10',
    starterMissions: ['Pick an era to explore', 'Write a timeline hook', 'Visualize a pivotal moment'],
    rewards: ['Research agent unlock', 'Story vault timeline', 'Archive badge'],
  },
  {
    id: 'luxury',
    label: 'Luxury',
    tagline: 'Premium aesthetics, aspirational storytelling.',
    accent: 'from-yellow-500/20 to-zinc-900/10',
    starterMissions: ['Define brand mood', 'Craft an elegant hook', 'Export a polished reel'],
    rewards: ['Visual agent unlock', 'HQ loft tier', 'Hall of fame entry'],
  },
  {
    id: 'education',
    label: 'Education',
    tagline: 'Teach clearly, retain deeply, grow your audience.',
    accent: 'from-sky-500/20 to-blue-900/10',
    starterMissions: ['Break down one concept', 'Script a lesson arc', 'Add voice narration'],
    rewards: ['Script agent unlock', 'Learning XP bonus', 'Consistency streak boost'],
  },
  {
    id: 'motivation',
    label: 'Motivation',
    tagline: 'High-energy content that moves people to act.',
    accent: 'from-rose-500/20 to-red-900/10',
    starterMissions: ['Find your core message', 'Write a punchy hook', 'Ship a motivational reel'],
    rewards: ['Voice agent unlock', 'Engagement bonus', 'Sidekick hype mode'],
  },
]

export function getCreatorWorld(id: CreatorWorldId | null | undefined): CreatorWorld | null {
  if (!id) return null
  return CREATOR_WORLDS.find((w) => w.id === id) ?? null
}

export function worldMissionsForLevel(worldId: CreatorWorldId, level: number): string[] {
  const world = getCreatorWorld(worldId)
  if (!world) return []
  if (level >= 10) return [...world.starterMissions, ...world.rewards]
  if (level >= 5) return world.rewards
  return world.starterMissions
}
