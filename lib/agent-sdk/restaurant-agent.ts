import { MugteeAgent } from '@/lib/agent-sdk/mugtee-agent'
import type { MugteeAgentContext, MugteeAgentResult } from '@/lib/agent-sdk/types'

export class RestaurantAgent extends MugteeAgent {
  readonly slug = 'restaurant-agent'
  readonly name = 'Restaurant Agent'

  async run(ctx: MugteeAgentContext): Promise<MugteeAgentResult> {
    this.assertPermission('projects', ctx)
    this.assertPermission('publishing', ctx)

    return {
      summary: 'Restaurant campaign stub — menu promo reel outline ready.',
      outputs: {
        hooks: [
          `Tonight at your table: ${ctx.goal.slice(0, 60)}`,
          'The dish everyone orders twice',
        ],
        suggestedPlatforms: ['instagram', 'tiktok'],
        menuHighlight: ctx.goal,
        stub: true,
      },
    }
  }
}
