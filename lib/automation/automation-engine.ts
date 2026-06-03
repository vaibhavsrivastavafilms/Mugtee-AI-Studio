import type { SupabaseClient } from '@supabase/supabase-js'
import { MugteeEvents, type MugteeEventPayload, type MugteeEventType } from '@/lib/automation/event-bus'
import { generateCaptions } from '@/lib/ai/generation'

export type AutomationRule = {
  id: string
  name: string
  trigger_event: string
  condition: Record<string, unknown>
  action: Record<string, unknown>
  enabled: boolean
}

const BUILTIN_RULES: Omit<AutomationRule, 'id'>[] = [
  {
    name: 'Campaign complete → captions',
    trigger_event: MugteeEvents.WorkflowCompleted,
    condition: { hasScript: true },
    action: { type: 'generate_captions' },
    enabled: true,
  },
  {
    name: 'Video upload → thumbnail stub',
    trigger_event: MugteeEvents.AssetGenerated,
    condition: { assetType: 'video' },
    action: { type: 'thumbnail_stub' },
    enabled: true,
  },
  {
    name: 'Reel published → analytics stub',
    trigger_event: MugteeEvents.CampaignPublished,
    condition: {},
    action: { type: 'analytics_stub' },
    enabled: true,
  },
]

export async function seedDefaultAutomationRules(
  supabase: SupabaseClient,
  userId: string
) {
  for (const rule of BUILTIN_RULES) {
    const { data: existing } = await supabase
      .from('automation_rules')
      .select('id')
      .eq('user_id', userId)
      .eq('name', rule.name)
      .maybeSingle()

    if (existing) continue

    await supabase.from('automation_rules').insert({
      user_id: userId,
      name: rule.name,
      trigger_event: rule.trigger_event,
      condition: rule.condition,
      action: rule.action,
      enabled: rule.enabled,
    })
  }
}

export async function runAutomationForEvent(
  type: MugteeEventType,
  payload: MugteeEventPayload
) {
  const script = String(payload.metadata?.script ?? payload.metadata?.excerpt ?? '')
  if (type === MugteeEvents.WorkflowCompleted && script) {
    try {
      const captions = await generateCaptions(script, 2)
      payload.metadata = { ...payload.metadata, autoCaptions: captions }
    } catch {
      /* non-fatal stub */
    }
  }

  if (type === MugteeEvents.AssetGenerated && payload.metadata?.assetType === 'video') {
    payload.metadata = {
      ...payload.metadata,
      thumbnailStub: { status: 'queued', message: 'Auto-thumbnail generation stub' },
    }
  }

  if (type === MugteeEvents.CampaignPublished) {
    payload.metadata = {
      ...payload.metadata,
      analyticsStub: { views: 0, likes: 0, syncedAt: new Date().toISOString() },
    }
  }

  if (type === MugteeEvents.ExportCompleted) {
    payload.metadata = {
      ...payload.metadata,
      exportFollowUp: 'Asset indexed for workspace memory',
    }
  }
}
