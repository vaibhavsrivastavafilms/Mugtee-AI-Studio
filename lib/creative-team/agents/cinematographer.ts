import type { CreativeTeamAgent } from '@/lib/creative-team/types'
import { runCinematographer } from '@/lib/creative-team/agents/cinematographer/run'

export const cinematographerAgent: CreativeTeamAgent = {
  id: 'cinematographer',
  name: 'Cinematographer',
  run: runCinematographer,
}
