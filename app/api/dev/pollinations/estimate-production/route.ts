import { NextRequest, NextResponse } from 'next/server'

import {
  estimatePollinationsProductionCost,
  formatMugteeProductionPollinationsEstimateReport,
} from '@/lib/pollinations/production-estimate.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Dev-only read-only Mugtee production Pollinations cost estimate. */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available outside development' }, { status: 404 })
  }

  const productionId = req.nextUrl.searchParams.get('productionId')?.trim()
  if (!productionId) {
    return NextResponse.json({ error: 'Missing productionId query parameter' }, { status: 400 })
  }

  const userId = req.nextUrl.searchParams.get('userId')?.trim() || undefined

  try {
    const estimate = await estimatePollinationsProductionCost({ productionId, userId })
    const format = req.nextUrl.searchParams.get('format')
    if (format === 'text') {
      return new NextResponse(formatMugteeProductionPollinationsEstimateReport(estimate), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }
    return NextResponse.json(estimate)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Estimate failed' },
      { status: 502 }
    )
  }
}
