import { BUILTIN_MARKETPLACE_AGENTS } from '@/lib/marketplace/agent-registry'

/** Stub docs generator for third-party Mugtee agents. */
export function generateAgentSdkDocs(): string {
  const agents = BUILTIN_MARKETPLACE_AGENTS.map(
    (a) => `- **${a.name}** (\`${a.slug}\`): ${a.description}`
  ).join('\n')

  return `# Mugtee Agent SDK

Extend MugteeOS with permission-gated agents.

## Base class

\`\`\`ts
import { MugteeAgent } from '@/lib/agent-sdk/mugtee-agent'

export class MyAgent extends MugteeAgent {
  readonly slug = 'my-agent'
  readonly name = 'My Agent'
  async run(ctx) {
    this.assertPermission('projects', ctx)
    return { summary: 'Done', outputs: {} }
  }
}
\`\`\`

## Permissions

projects · assets · publishing · memory · integrations

## Built-in marketplace agents

${agents}

OAuth and paid installs use \`pricing_model\` + \`revenue_share_percent\` (payment processor stub).
`
}
