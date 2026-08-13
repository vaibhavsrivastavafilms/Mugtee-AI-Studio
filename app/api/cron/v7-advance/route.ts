import { NextResponse } from 'next/server'

import { createSupabaseServiceClient } from '@/lib/supabase/service'
import {
  advanceActiveV7ProductionsOnce,
  verifyV7CronAuth,
} from '@/lib/v7/background-driver.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Vercel Cron — advances one queued stage per active V7 production. */
export async function GET(req: Request) {
  if (!verifyV7CronAuth(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseServiceClient()
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: 'Background worker unavailable' },
      { status: 503 }
    )
  }

  try {
    const result = await advanceActiveV7ProductionsOnce({ supabase })
    console.info('[v7-cron] advance tick', result)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cron advance failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
