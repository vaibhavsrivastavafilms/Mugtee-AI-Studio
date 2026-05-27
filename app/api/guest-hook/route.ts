import { NextRequest, NextResponse } from 'next/server'
import {
  generateHookVariations,
  selectCinematicHook,
} from '@/lib/cinematic/execution/cinematic-hook-engine'
import { inferNicheFromBrief } from '@/lib/cinematic/niches'
import { coerceTopic } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMERGENT_LLM_KEY = process.env.EMERGENT_LLM_KEY
const CHAT_URL = 'https://integrations.emergentagent.com/llm/chat/completions'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const topic = coerceTopic(body?.topic ?? body?.description ?? body?.prompt)
    if (topic.length < 6) {
      return NextResponse.json(
        { error: 'Describe your story idea in a few words.' },
        { status: 400 }
      )
    }

    const niche = inferNicheFromBrief({ topic, tone: 'cinematic_emotional' })
    const fallback = generateHookVariations(topic, niche)

    if (!EMERGENT_LLM_KEY) {
      return NextResponse.json({ hooks: fallback, mock: true })
    }

    const res = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${EMERGENT_LLM_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.85,
        messages: [
          {
            role: 'system',
            content:
              'Write exactly 3 cinematic opening hooks for a vertical emotional film. Each hook is one sentence — emotionally magnetic, visually directed, narratively irresistible. No viral bait, no algorithm language, no "content creator" tone. Return only the 3 hooks, one per line, no numbering.',
          },
          {
            role: 'user',
            content: `Story idea: "${topic}"\nNiche: ${niche}`,
          },
        ],
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ hooks: fallback, mock: true })
    }

    const json = (await res.json().catch(() => ({}))) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = String(json?.choices?.[0]?.message?.content || '')
    const lines = raw
      .split(/\n+/)
      .map((l) => l.replace(/^\s*(\d+[\.)]|[-•*])\s*/, '').trim())
      .filter((l) => l.length >= 14 && l.length <= 200)

    const hooks =
      lines.length >= 2
        ? lines.slice(0, 3).map((h) => selectCinematicHook([h], niche, h))
        : fallback

    return NextResponse.json({ hooks, mock: false })
  } catch {
    return NextResponse.json({ error: 'Could not generate hooks' }, { status: 500 })
  }
}
