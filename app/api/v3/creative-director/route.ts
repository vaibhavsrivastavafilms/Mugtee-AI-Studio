import { NextResponse } from 'next/server'
import { isV3PipelineEnabled } from '@/lib/pipeline/v3-feature-flag'
import {
  generateCreativeDirectorBrief,
  type GenerateCreativeDirectorInput,
} from '@/lib/content-director/creative-director-brief'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** V3 Creative Director — full brief JSON with uniqueness constraints. */
export async function POST(req: Request) {
  if (!isV3PipelineEnabled()) {
    return NextResponse.json({ error: 'V3 pipeline disabled' }, { status: 404 })
  }

  try {
    const body = (await req.json()) as GenerateCreativeDirectorInput
    if (!body.topic?.trim() && !body.sessionSeed?.trim()) {
      return NextResponse.json({ error: 'topic required' }, { status: 400 })
    }

    const result = await generateCreativeDirectorBrief(body, { useAi: true })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Creative director failed' },
      { status: 500 }
    )
  }
}
