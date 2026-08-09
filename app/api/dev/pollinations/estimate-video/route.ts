import { NextRequest, NextResponse } from 'next/server'

import {
  estimatePollinationsVideoCost,
  formatPollinationsVideoEstimateReport,
} from '@/lib/pollinations/video-estimate.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Dev-only live Pollinations video cost estimate — no generation requests. */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available outside development' }, { status: 404 })
  }

  const durationSec = Number(req.nextUrl.searchParams.get('duration') ?? '30')
  const width = Number(req.nextUrl.searchParams.get('width') ?? '720')
  const height = Number(req.nextUrl.searchParams.get('height') ?? '1080')
  const imageToVideoOnly =
    req.nextUrl.searchParams.get('i2v') === '1' ||
    req.nextUrl.searchParams.get('i2v') === 'true'

  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return NextResponse.json({ error: 'Invalid width/height' }, { status: 400 })
  }

  try {
    const estimate = await estimatePollinationsVideoCost({
      durationSec,
      width,
      height,
      imageToVideoOnly,
    })

    const format = req.nextUrl.searchParams.get('format')
    if (format === 'text') {
      return new NextResponse(formatPollinationsVideoEstimateReport(estimate), {
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
