import type { AgentPermissionKey } from '@/lib/marketplace/agent-permissions'

export type MarketplaceAgentManifest = {
  tools?: string[]
  description?: string
}

export type MarketplaceAgentDef = {
  slug: string
  name: string
  description: string
  category: string
  pricingModel: 'free' | 'paid' | 'subscription'
  priceCents: number
  revenueSharePercent: number
  manifest: MarketplaceAgentManifest
}

export const BUILTIN_MARKETPLACE_AGENTS: MarketplaceAgentDef[] = [
  {
    slug: 'restaurant-agent',
    name: 'Restaurant Agent',
    description: 'Menus, promos, and local reel campaigns.',
    category: 'hospitality',
    pricingModel: 'free',
    priceCents: 0,
    revenueSharePercent: 0,
    manifest: { tools: ['generateScript', 'generateCaption', 'installMarketplaceAgent'] },
  },
  {
    slug: 'brand-strategist',
    name: 'Brand Strategist',
    description: 'Campaign angles from creator memory.',
    category: 'strategy',
    pricingModel: 'free',
    priceCents: 0,
    revenueSharePercent: 10,
    manifest: { tools: ['searchMemory', 'generateCalendar'] },
  },
  {
    slug: 'publish-coordinator',
    name: 'Publish Coordinator',
    description: 'Schedule posts and manage integrations.',
    category: 'publishing',
    pricingModel: 'subscription',
    priceCents: 999,
    revenueSharePercent: 15,
    manifest: { tools: ['schedulePublish', 'connectIntegration'] },
  },
]

export function getBuiltinAgent(slug: string): MarketplaceAgentDef | undefined {
  return BUILTIN_MARKETPLACE_AGENTS.find((a) => a.slug === slug)
}

export function marketplaceToolsForSlug(slug: string): string[] {
  const agent = getBuiltinAgent(slug)
  return agent?.manifest.tools ?? []
}

export function permissionKeysForTool(tool: string): AgentPermissionKey[] {
  if (tool === 'searchMemory') return ['memory']
  if (tool === 'schedulePublish' || tool === 'generateCalendar') return ['publishing']
  if (tool === 'connectIntegration') return ['integrations']
  if (tool.startsWith('generate')) return ['projects', 'assets']
  return ['projects']
}
