export type IntegrationCategory =
  | 'social'
  | 'storage'
  | 'productivity'
  | 'creative'
  | 'ai'

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending'

export interface MugteeIntegration {
  id: string
  name: string
  provider: string
  category: IntegrationCategory
  connect(): Promise<void>
  execute(action: string, args: Record<string, unknown>): Promise<unknown>
  disconnect(): Promise<void>
}

export type IntegrationHealth = {
  provider: string
  status: IntegrationStatus
  latencyMs?: number
  lastError?: string
  checkedAt: string
}

export type IntegrationActionResult = {
  ok: boolean
  provider: string
  action: string
  stub: boolean
  data?: unknown
  error?: string
}
