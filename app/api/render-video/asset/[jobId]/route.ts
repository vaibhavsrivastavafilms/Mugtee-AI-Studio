import fs from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Serves locally rendered MP4 when user is not signed in (dev / landing). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const safeId = params.jobId.replace(/[^a-zA-Z0-9_-]/g, '')
  const filePath = path.join(process.cwd(), '.tmp', 'renders', `${safeId}.mp4`)
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Render not found' }, { status: 404 })
  }
  const buffer = fs.readFileSync(filePath)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `inline; filename="mugtee-${safeId}.mp4"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
