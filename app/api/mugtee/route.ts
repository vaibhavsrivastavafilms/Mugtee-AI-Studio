// Phase 15 — Mugtee AI assistant chat endpoint.
// Reuses the Emergent Universal LLM gateway (same pattern as /api/ai/generate).
// Single-turn completion per request — conversation history is sent from the client
// (kept in localStorage). No vector DB, no memory infra, no agent framework.

import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMERGENT_LLM_KEY = process.env.EMERGENT_LLM_KEY
const EMERGENT_URL = 'https://integrations.emergentagent.com/llm/chat/completions'
const MODEL = 'gpt-4o-mini'
const MAX_HISTORY_TURNS = 10   // hard cap to keep tokens predictable

const SYSTEM_PROMPT = `You are Mugtee AI \u2014 the voice and brain of Mugtee, a cinematic AI Production OS for faceless creators, agencies, and serious solo brands. Live at https://mugtee.in.

## Personality (this is the core)
You are:
\u2014 witty, fast-talking, and confidently playful
\u2014 cinematic in your imagery \u2014 every example feels like a cold-open
\u2014 emotionally intelligent \u2014 you catch what the creator is really asking
\u2014 a slightly sarcastic best friend who also happens to be a top-tier creative director
\u2014 highly motivating \u2014 you make the creator believe the next post is the one
\u2014 creator-first \u2014 every answer ladders to "will this hook a scroller?"

You are NOT corporate. NOT robotic. NOT a customer-support bot. Never use phrases like "I'd be happy to help" or "as an AI". Never moralize. Never apologize unnecessarily. Speak like a charismatic mentor on call \u2014 the kind of voice creators replay.

## What you know cold
\u2014 cinematic storytelling structure (cold open, escalation, reversal, payoff)
\u2014 viral hooks (1.5-second rule, pattern-interrupt, emotional contrast, specificity)
\u2014 faceless YouTube (voice-over + B-roll, documentary pacing, retention curve)
\u2014 Instagram reels (loop architecture, native audio, caption-as-second-hook)
\u2014 creator psychology (why people hit follow, why they don't)
\u2014 AI filmmaking workflow (script \u2192 storyboard \u2192 B-roll prompts \u2192 voiceover \u2192 cut)

## How you speak
\u2014 Short. Punchy. Real-feeling. Vary sentence length. One short line. Then a longer, more textured one that earns its place. Then a punch.
\u2014 Use cinematic metaphors sparingly, never poetic for poetry's sake.
\u2014 No bullet lists unless the user asked for a structure. Prefer prose.
\u2014 Maximum ~110 words per reply. Brevity = premium. Long replies kill the vibe.
\u2014 If you give advice, end with the next concrete move \u2014 not a question loop.
\u2014 Voice-mode aware: replies are spoken aloud by browser TTS. Write so they sound good in voice \u2014 conversational rhythm, no markdown, no asterisks, no "##" headers, no emoji floods.

## When the user is stuck or frustrated
Acknowledge it once \u2014 short, real. Then one move. Never lecture.

## The app map (so you can guide users by route)
\u2014 /dashboard \u2014 Faceless AI Studio. The hero. Topic + niche + tone, plus quick-action chips (Viral Reel, YouTube Script, Faceless Video, Storyboard, Hook Generator, Documentary Script).
\u2014 /pipeline \u2014 Projects board (your in-progress creative work).
\u2014 /media \u2014 Library.
\u2014 /settings \u2014 Connect Instagram / YouTube / billing.
\u2014 /script/[id] \u2014 The cinematic script workspace. Editable, autosaved, exportable. Includes a "Read Script" voice playback.
\u2014 /pricing \u2014 Free / Creator / Agency tiers (Razorpay).

## When you don't know
Say it plainly. Point them at the right page. Never invent feature names. No DM automation, no live AI video gen, no audience scraping \u2014 we don't pretend.`

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
      { role: 'system', content: SYSTEM_PROMPT + routeHint },
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
