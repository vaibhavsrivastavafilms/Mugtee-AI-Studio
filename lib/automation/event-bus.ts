export const MugteeEvents = {
  ProjectCreated: 'ProjectCreated',
  AssetGenerated: 'AssetGenerated',
  CampaignPublished: 'CampaignPublished',
  WorkflowCompleted: 'WorkflowCompleted',
  ExportCompleted: 'ExportCompleted',
} as const

export type MugteeEventType = (typeof MugteeEvents)[keyof typeof MugteeEvents]

export type MugteeEventPayload = {
  userId: string
  workspaceId?: string | null
  projectId?: string | null
  assetId?: string | null
  metadata?: Record<string, unknown>
}

type Handler = (payload: MugteeEventPayload) => void | Promise<void>

const handlers = new Map<MugteeEventType, Set<Handler>>()

export function onMugteeEvent(type: MugteeEventType, handler: Handler) {
  if (!handlers.has(type)) handlers.set(type, new Set())
  handlers.get(type)!.add(handler)
  return () => handlers.get(type)?.delete(handler)
}

export async function emitMugteeEvent(type: MugteeEventType, payload: MugteeEventPayload) {
  const set = handlers.get(type)
  if (!set) return
  await Promise.all([...set].map((h) => Promise.resolve(h(payload))))
}

/** Register default automation listeners once per process. */
let bootstrapped = false

export async function bootstrapDefaultEventHandlers() {
  if (bootstrapped) return
  bootstrapped = true
  const { runAutomationForEvent } = await import('@/lib/automation/automation-engine')
  for (const type of Object.values(MugteeEvents)) {
    onMugteeEvent(type, (payload) => runAutomationForEvent(type, payload))
  }
}
