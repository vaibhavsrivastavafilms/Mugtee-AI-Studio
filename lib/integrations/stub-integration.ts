import type { IntegrationCategory, MugteeIntegration } from '@/lib/integrations/types'

export function createStubIntegration(opts: {
  id: string
  name: string
  provider: string
  category: IntegrationCategory
}): MugteeIntegration {
  return {
    id: opts.id,
    name: opts.name,
    provider: opts.provider,
    category: opts.category,
    async connect() {
      return undefined
    },
    async execute(action: string, args: Record<string, unknown>) {
      return {
        ok: true,
        stub: true,
        provider: opts.provider,
        action,
        args,
        message: `${opts.name} stub — OAuth not configured`,
        at: new Date().toISOString(),
      }
    },
    async disconnect() {
      return undefined
    },
  }
}
