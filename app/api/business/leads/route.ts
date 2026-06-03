import { NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import { listLeads } from '@/lib/business/business-memory'
import { captureLeadFromContent, nurtureLeads } from '@/lib/business/lead-engine'
import type { FunnelStage } from '@/lib/business/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const leads = await listLeads(auth.supabase, auth.user!.id)
  return NextResponse.json({ ok: true, leads })
}

export async function POST(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response
  const body = parsed.body!

  if (body.action === 'nurture') {
    const result = await nurtureLeads(auth.supabase, auth.user!.id)
    return NextResponse.json({ ok: true, ...result })
  }

  const funnelStage = (body.funnelStage as FunnelStage) ?? 'consideration'
  const lead = await captureLeadFromContent(auth.supabase, auth.user!.id, {
    projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
    contentAssetId: typeof body.contentAssetId === 'string' ? body.contentAssetId : undefined,
    funnelStage,
    contact: (body.contact as Record<string, unknown>) ?? {},
    engagementScore:
      typeof body.engagementScore === 'number' ? body.engagementScore : undefined,
  })

  return NextResponse.json({ ok: true, lead })
}
