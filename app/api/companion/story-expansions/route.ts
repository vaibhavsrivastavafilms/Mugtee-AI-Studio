import { NextRequest, NextResponse } from 'next/server'
import { normalizeCreativeBrief } from '@/lib/companion/creative-discovery'
import { suggestStoryExpansions } from '@/lib/companion/story-expansion'
import { parseJsonObject, requireCompanionUser } from '@/lib/companion/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const body = parsed.body!
  const expansions = suggestStoryExpansions({
    title: typeof body.title === 'string' ? body.title : undefined,
    hook: typeof body.hook === 'string' ? body.hook : undefined,
    script: typeof body.script === 'string' ? body.script : undefined,
    niche: typeof body.niche === 'string' ? body.niche : undefined,
    brief: normalizeCreativeBrief(body.brief),
  })

  return NextResponse.json({ ok: true, expansions })
}
