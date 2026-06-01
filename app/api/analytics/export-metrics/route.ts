import { NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { getExportMetrics } from '@/lib/export/export-metrics.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Lightweight export success/failure metrics for production monitoring. */
export async function GET() {
  const auth = await requireCinematicUser()
  if (auth.response) return auth.response

  const metrics = getExportMetrics()
  return NextResponse.json(metrics)
}
