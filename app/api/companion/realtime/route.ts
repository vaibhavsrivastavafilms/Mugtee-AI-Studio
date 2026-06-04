import { NextRequest, NextResponse } from 'next/server'
import {
  parseJsonObject,
  requireCompanionUser,
} from '@/lib/companion/api-helpers'
import { buildCompanionBrainPrompt } from '@/lib/companion/memory-context'
import { normalizeCreatorMemory } from '@/lib/companion/creator-memory'
import { rowToMemoryProfile } from '@/lib/memory/creator-memory-engine'
import {
  resolveCreatorLanguage,
  type CreatorLanguageCode,
} from '@/lib/i18n/detect-creator-language'
import type { RealtimeBrainResponse } from '@/services/realtime/types'
import { isCompanionExperimentalVoiceEnabled } from '@/lib/companion/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMERGENT_LLM_KEY = process.env.EMERGENT_LLM_KEY
const EMERGENT_URL = 'https://integrations.emergentagent.com/llm/chat/completions'
const MODEL = 'gpt-4o-mini'

type RealtimeBody = {
  message?: string
  sessionId?: string
  language?: { languageCode?: CreatorLanguageCode; isMixed?: boolean }
  memoryContext?: string
  systemPrompt?: string
}

function stubReply(message: string): RealtimeBrainResponse {
  return {
    reply: `Got it — "${message.slice(0, 80)}". Open Quick Cut to run the full pipeline: hook → script → storyboard → export.`,
    avatarState: 'speaking',
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const body = parsed.body as RealtimeBody
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) {
    return NextResponse.json({ error: 'message required' }, { status: 400 })
  }

  const detected = resolveCreatorLanguage(message, body.language ?? null)

  const { data: row } = await auth.supabase
    .from('creator_profiles')
    .select(
      'creator_memory, creator_dna, relationship_level, relationship_score, memory_graph, learning_events, niche, platform, content_style'
    )
    .eq('user_id', auth.user!.id)
    .maybeSingle()

  const profile = row ? rowToMemoryProfile(row) : null
  const companionMemory = normalizeCreatorMemory(row?.creator_memory)

  const systemPrompt =
    body.systemPrompt ??
    buildCompanionBrainPrompt({
      userMessage: message,
      memoryProfile: profile,
      companionMemory,
      language: detected,
      opportunityHint: typeof body.memoryContext === 'string' ? body.memoryContext : null,
    })

  if (!EMERGENT_LLM_KEY) {
    return NextResponse.json({
      ...stubReply(message),
      language: detected,
      stub: true,
    } satisfies RealtimeBrainResponse & { stub?: boolean })
  }

  const payload = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message.slice(0, 4000) },
    ],
    temperature: 0.7,
    max_tokens: 320,
  }

  try {
    const upstream = await fetch(EMERGENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${EMERGENT_LLM_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { ...stubReply(message), language: detected, stub: true },
        { status: 200 }
      )
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const reply = data?.choices?.[0]?.message?.content?.trim() || stubReply(message).reply

    const avatarState: RealtimeBrainResponse['avatarState'] =
      /warn|caution|careful|heads up/i.test(reply) ? 'warning' : 'happy'

    return NextResponse.json({
      reply,
      avatarState,
      language: detected,
    } satisfies RealtimeBrainResponse)
  } catch {
    return NextResponse.json({
      ...stubReply(message),
      language: detected,
      stub: true,
    })
  }
}

/** GET — pipeline health / feature flags for client bootstrap */
export async function GET() {
  return NextResponse.json({
    ok: true,
    version: 'v1-stub',
    features: {
      pushToTalk: true,
      handsFree: isCompanionExperimentalVoiceEnabled(),
      tts: false,
      lipSync: false,
      visemes: false,
      glbAvatar: true,
    },
  })
}
