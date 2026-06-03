import { NextResponse } from 'next/server'
import { requireCompanionUser } from '@/lib/companion/api-helpers'
import { listIntegrations } from '@/lib/integrations/integration-registry'
import { listConnectedIntegrations } from '@/lib/integrations/integration-engine'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const catalog = listIntegrations().map((i) => ({
    provider: i.provider,
    name: i.name,
    category: i.category,
  }))
  const connected = await listConnectedIntegrations(auth.supabase, auth.user!.id)

  return NextResponse.json({ catalog, connected })
}
