// Phase 15 — Mugtee AI assistant chat endpoint.
// Reuses the Emergent Universal LLM gateway (same pattern as /api/ai/generate).
// Single-turn completion per request — conversation history is sent from the client
// (kept in localStorage). No vector DB, no memory infra, no agent framework.

import { NextResponse, type NextRequest } from 'next/server'
import { MUGTEE_SYSTEM_PROMPT } from '@/lib/mugtee/personality'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMERGENT_LLM_KEY = process.env.EMERGENT_LLM_KEY
const EMERGENT_URL = 'https://integrations.emergentagent.com/llm/chat/completions'
const MODEL = 'gpt-4o-mini'
const MAX_HISTORY_TURNS = 10   // hard cap to keep tokens predictable

interface ClientMessage { role: 'user' | 'assistant'; content: string }
interface MugteeRequest { messages?: ClientMessage[]; route?: string }

export async function POST(req: NextRequest) {
  if (!EMERGENT_LLM_KEY) {
    return NextResponse.json({ error: 'EMERGENT_LLM_KEY not configured' }, { status: 500 })
  }

  // Light auth gate — only signed-in users may use the assistant (prevents anon abuse).
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: MugteeRequest
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const history = Array.isArray(body.messages) ? body.messages : []
  if (history.length === 0) return NextResponse.json({ error: 'empty_messages' }, { status: 400 })

  // Validate, trim, cap
  const safe = history
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY_TURNS)
    .map(m => ({ role: m.role, content: String(m.content).slice(0, 4000) }))

  if (safe[safe.length - 1]?.role !== 'user') {
    return NextResponse.json({ error: 'last_message_must_be_user' }, { status: 400 })
  }

  // Light route context so Mugtee can give location-aware tips.
  const routeHint = body.route ? `\n\n[The user is currently viewing: ${String(body.route).slice(0, 100)}]` : ''

  const payload = {
    model: MODEL,
    messages: [
      { role: 'system', content: MUGTEE_SYSTEM_PROMPT + routeHint },
      ...safe,
    ],
    temperature: 0.7,
    max_tokens: 320,
  }

  try {
    const upstream = await fetch(EMERGENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${EMERGENT_LLM_KEY}` },
      body: JSON.stringify(payload),
    })
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      console.error('[mugtee] upstream', upstream.status, text.slice(0, 300))
      return NextResponse.json({ error: 'upstream_error', status: upstream.status }, { status: 502 })
    }
    const data: any = await upstream.json()
    const content: string = data?.choices?.[0]?.message?.content?.trim() || ''
    if (!content) return NextResponse.json({ error: 'empty_response' }, { status: 502 })
    return NextResponse.json({ content })
  } catch (e: any) {
    console.error('[mugtee]', e?.message || e)
    return NextResponse.json({ error: 'network_error' }, { status: 500 })
  }
}
