import type { CreativeTeamAgent } from '@/lib/creative-team/types'
import { runScreenwriter } from '@/lib/creative-team/agents/screenwriter/run'

export const screenwriterAgent: CreativeTeamAgent = {
  id: 'screenwriter',
  name: 'Screenwriter',
  run: runScreenwriter,
}
