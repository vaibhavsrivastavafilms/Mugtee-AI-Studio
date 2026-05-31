import { NextRequest, NextResponse } from 'next/server'
import { analyzeEmotionalStory } from '@/lib/companion/emotional-analysis'
import { buildViewerJourney } from '@/lib/companion/viewer-journey'
import { parseJsonObject, requireCompanionUser } from '@/lib/companion/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseScenes(raw: unknown) {
  if (!Array.isArray(raw)) return undefined
  return raw
    .filter((s) => s && typeof s === 'object')
    .map((s) => {
      const o = s as Record<string, unknown>
      return {
        title: typeof o.title === 'string' ? o.title : undefined,
        description: typeof o.description === 'string' ? o.description : undefined,
        duration: typeof o.duration === 'number' ? o.duration : undefined,
      }
    })
}

export async function POST(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const body = parsed.body!
  const input = {
    hook: typeof body.hook === 'string' ? body.hook : undefined,
    script: typeof body.script === 'string' ? body.script : undefined,
    scenes: parseScenes(body.scenes),
    duration: typeof body.duration === 'number' ? body.duration : undefined,
  }

  const analysis = analyzeEmotionalStory(input)
  const includeJourney = body.includeJourney === true

  return NextResponse.json({
    ok: true,
    analysis,
    ...(includeJourney ? { journey: buildViewerJourney(input) } : {}),
  })
}
