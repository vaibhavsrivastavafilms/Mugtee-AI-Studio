import type { CreativeTeamAgentId } from '@/lib/creative-team/types'

/** Client-safe agent metadata — no run() implementations (avoids server-only imports in UI). */
export const CREATIVE_TEAM_AGENT_REGISTRY: Array<{
  id: CreativeTeamAgentId
  name: string
}> = [
  { id: 'story-strategist', name: 'Story Strategist' },
  { id: 'executive-producer', name: 'Executive Producer' },
  { id: 'screenwriter', name: 'Screenwriter' },
  { id: 'cinematographer', name: 'Cinematographer' },
  { id: 'voice-director', name: 'Voice Director' },
  { id: 'music-director', name: 'Music Director' },
]
