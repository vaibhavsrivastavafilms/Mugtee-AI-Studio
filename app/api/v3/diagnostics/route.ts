import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getV3TextProviderDiagnostics } from '@/lib/v3/production-diagnostics.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const diagnostics = getV3TextProviderDiagnostics()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const serviceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())

    return NextResponse.json({
      ok: true,
      userId: user.id,
      supabase: {
        urlConfigured: Boolean(supabaseUrl),
        serviceRoleConfigured: serviceRole,
      },
      ...diagnostics,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Diagnostics failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
