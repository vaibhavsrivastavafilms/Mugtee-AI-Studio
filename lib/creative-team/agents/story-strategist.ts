import type { CreativeTeamAgent } from '@/lib/creative-team/types'
import { runStoryStrategist } from '@/lib/creative-team/agents/story-strategist/run'

export const storyStrategistAgent: CreativeTeamAgent = {
  id: 'story-strategist',
  name: 'Story Strategist',
  run: runStoryStrategist,
}
