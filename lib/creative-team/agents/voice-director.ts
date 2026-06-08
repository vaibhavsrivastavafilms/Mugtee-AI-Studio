import type { CreativeTeamAgent } from '@/lib/creative-team/types'
import { runVoiceDirector } from '@/lib/creative-team/agents/voice-director/run'

export const voiceDirectorAgent: CreativeTeamAgent = {
  id: 'voice-director',
  name: 'Voice Director',
  run: runVoiceDirector,
}
