import { BUILTIN_MARKETPLACE_AGENTS, marketplaceToolsForSlug } from '@/lib/marketplace/agent-registry'
import { REGISTERED_TOOLS } from '@/lib/ai-agent/tool-registry'

/** Marketplace agent tools exposed to MugteeOS planner when installed. */
export function getMarketplaceToolNamesForUser(installedSlugs: string[]): string[] {
  const tools = new Set<string>()
  for (const slug of installedSlugs) {
    for (const t of marketplaceToolsForSlug(slug)) {
      if (t in REGISTERED_TOOLS) tools.add(t)
    }
  }
  return [...tools]
}

export function allMarketplaceCapableTools(): string[] {
  const tools = new Set<string>()
  for (const agent of BUILTIN_MARKETPLACE_AGENTS) {
    for (const t of agent.manifest.tools ?? []) {
      if (t in REGISTERED_TOOLS) tools.add(t)
    }
  }
  return [...tools]
}
