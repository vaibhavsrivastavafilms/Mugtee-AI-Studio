import type { CreativeTeamAgent } from '@/lib/creative-team/types'
import { runExecutiveProducer } from '@/lib/creative-team/agents/executive-producer/run'

export const executiveProducerAgent: CreativeTeamAgent = {
  id: 'executive-producer',
  name: 'Executive Producer',
  run: runExecutiveProducer,
}
