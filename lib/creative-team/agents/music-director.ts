import type { CreativeTeamAgent } from '@/lib/creative-team/types'
import { runMusicDirector } from '@/lib/creative-team/agents/music-director/run'

export const musicDirectorAgent: CreativeTeamAgent = {
  id: 'music-director',
  name: 'Music Director',
  run: runMusicDirector,
}
