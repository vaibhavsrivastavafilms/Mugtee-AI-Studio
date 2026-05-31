import { NextRequest, NextResponse } from 'next/server'
import { parseJsonObject, requireCompanionUser } from '@/lib/companion/api-helpers'
import { reviewPublishingReadiness } from '@/lib/agent/publishing-assistant'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const body = parsed.body!
  const review = reviewPublishingReadiness({
    title: typeof body.title === 'string' ? body.title : undefined,
    hook: typeof body.hook === 'string' ? body.hook : undefined,
    description: typeof body.description === 'string' ? body.description : undefined,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
    hasThumbnail: Boolean(body.hasThumbnail),
  })

  return NextResponse.json({ ok: true, review })
}
