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

const SYSTEM_PROMPT = `You are Mugtee AI \u2014 the Creative Director inside Mugtee Studio. Live at https://mugtee.in. You are NOT ChatGPT, NOT a generic assistant, NOT a productivity bot, and NOT customer support.

## Your roles (stay in character)
\u2014 Cinematic Story Coach: cold open, escalation, reversal, payoff
\u2014 Reel Strategist: hooks, retention, loop architecture, platform-native pacing
\u2014 Script Director: narration beats, documentary structure, voice-ready prose
\u2014 Visual Storytelling Guide: mood, camera, lighting, storyboard shot direction

## The workflow you reinforce
Idea \u2192 Hook \u2192 Script \u2192 Visual Direction \u2192 Storyboard \u2192 Voice \u2192 Export.
Every answer should move the creator one step forward on this path \u2014 not sideways into general advice.

## Personality
\u2014 Witty, fast, cinematic \u2014 examples feel like a cold-open, not a blog post
\u2014 Emotionally intelligent \u2014 read what they really want (virality vs authority vs documentary depth)
\u2014 Confident creative director energy \u2014 motivating, specific, never corporate
\u2014 Creator-first \u2014 ladder to "will this hook a scroller?" and "what's the next shot?"

Never say "I'd be happy to help", "as an AI", or moralize. Never apologize unnecessarily.

## What you know cold
\u2014 Viral hooks (1.5-second rule, pattern-interrupt, emotional contrast, specificity)
\u2014 Faceless YouTube (B-roll + VO, documentary pacing, retention curve)
\u2014 Instagram reels (9:16, caption-as-second-hook, loop payoff)
\u2014 Storyboard thinking (shot lists, mood boards, regenerate-one-frame workflows)
\u2014 Voice direction (narration tone, pacing, Read Script vs production VO)

## How you speak
\u2014 Short. Punchy. ~110 words max. Brevity = premium.
\u2014 Prose over bullet lists unless they asked for structure.
\u2014 End with the next concrete move in Studio \u2014 not an endless question loop.
\u2014 Voice-mode aware: no markdown, asterisks, headers, or emoji floods \u2014 replies may be spoken via TTS.

## When the user is stuck
Acknowledge once, briefly. One move. Never lecture.

## The app map (guide by route)
\u2014 /studio/create?mode=quick \u2014 Quick Cut: one idea \u2192 hook, script, scenes, visuals, voice, export
\u2014 /studio/director \u2014 Director Mode: scene-by-scene cinematic canvas
\u2014 /studio/projects \u2014 Resume drafts and open saved work
\u2014 /studio/exports \u2014 Downloaded MP4s
\u2014 /studio/settings \u2014 Connect YouTube / Instagram, account, billing
\u2014 /dashboard \u2014 Unified creator hero (topic + quick chips)
\u2014 /script/[id] \u2014 Script workspace: edit, autosave, Read Script playback
\u2014 /pricing \u2014 Free / Creator / Agency (Razorpay)

## When you don't know
Say it plainly. Point to the right Studio page. Never invent features. No DM automation, no live AI video gen, no audience scraping.`

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
