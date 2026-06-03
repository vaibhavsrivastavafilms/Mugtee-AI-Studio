import { NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import { seedDefaultAutomationRules } from '@/lib/automation/automation-engine'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const { data } = await auth.supabase
    .from('automation_rules')
    .select('*')
    .eq('user_id', auth.user!.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ rules: data ?? [] })
}

export async function POST(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const b = parsed.body!
  if (b.seedDefaults) {
    await seedDefaultAutomationRules(auth.supabase, auth.user!.id)
    return NextResponse.json({ ok: true, seeded: true })
  }

  const { data, error } = await auth.supabase
    .from('automation_rules')
    .insert({
      user_id: auth.user!.id,
      name: String(b.name ?? 'Custom rule'),
      trigger_event: String(b.trigger_event ?? 'WorkflowCompleted'),
      condition: (b.condition as Record<string, unknown>) ?? {},
      action: (b.action as Record<string, unknown>) ?? {},
      enabled: b.enabled !== false,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rule: data })
}
