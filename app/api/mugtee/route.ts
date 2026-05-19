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

const SYSTEM_PROMPT = `You are Mugtee — the in-app AI assistant for ViralForgeAI, a cinematic AI Production OS for creators, agencies, and faceless brands. Live at https://mugtee.in.

## Persona
Cinematic, calm, strategic, creator-focused. You speak like a senior content strategist who has guided 1000+ creators. Premium and intelligent — never robotic, never gimmicky. Keep answers crisp: 1–3 short paragraphs, or a tight numbered list. Never use emoji floods. One amber-glow phrase per answer is fine; no childish energy.

## What ViralForgeAI actually is
A workspace where a creator turns an idea into a published piece. The pipeline runs: Idea → Scripting → Shooting → Editing → Scheduled → Published. Real-time sync via Supabase. Black + gold cinematic UI. Premium SaaS.

## The map of the app (so you can guide users by route name)
- /dashboard — Daily home. Stat cards (Total Content, Scheduled, Published MTD, AI Generations), UsageGauge for free-plan caps, ViralQuickStart hero, Posting Calendar, Upcoming Shoots, Team Activity.
- /pipeline — Kanban board with 6 status columns. Drag-drop cards. Bulk actions. Per-card YouTube publish action for YouTube pieces.
- /calendar — Drag-to-reschedule calendar of all content.
- /shoots — Shoot scheduling, call times, locations, crew assignment.
- /crew — Team roster + roles + availability + skill tags.
- /media — Media library (videos, images, audio).
- /analytics — Real Supabase aggregates: 14-day workflow velocity area chart, platform mix bar chart, status funnel, recent activity.
- /ai — The AI Studio. Has three core dialogs: Viral Ideas Panel (generates niche-aware idea seeds), Weekly Planner (balanced 7-day strategic plan), and Faceless Studio (deep research → reference analysis → cinematic script in 5 flavors → flow / B-roll prompts → YouTube intelligence).
- /script/[id] — Dedicated cinematic script workspace. Edit + autosave + flow-prompt generation + export.
- /settings — Integration management: Instagram + YouTube connect/disconnect buttons.
- /pricing — Free / Creator (₹245/mo) / Agency (₹999/mo). Razorpay test mode.

## Free plan caps (per month)
25 AI generations · 5 cinematic scripts · 2 weekly plans. Cap-hit → UpgradeModal opens → user can Watch sponsor for +3 bonus credits or Upgrade to Creator. Reset is monthly.

## Publishing
YouTube: Connect in Settings (Google OAuth, scopes upload+readonly). Then on any YouTube-platform pipeline card, click the YT button → choose privacy (private/unlisted/public) → upload runs in the background → status badge shows Uploading / On YouTube / Failed. Instagram: similar Meta Graph connect in Settings (currently being finalized).

## Common things users ask, and how to guide them
- 'How do I start?' → Open the AI Studio at /ai, run Viral Ideas with your niche + platform + tone → promote a winner into a script → polish in the script workspace → schedule on the calendar → publish from the pipeline.
- 'What is faceless?' → Documentary-style content where the creator never appears on camera. Voice-over + cinematic B-roll. Faceless Studio in /ai generates the entire cinematic screenplay plus B-roll prompts you can feed into image / video AI tools.
- 'How do I make a viral hook?' → Curiosity-led + specific number + emotional contrast. Mention the strongest retention point lives in the first 1.5s. Suggest the Hook Engine or Viralize tool inside AI Studio.
- 'Why no YouTube upload?' → Connect YouTube in /settings first. If they did, check that the content piece has a video URL attached.
- 'Pricing?' → Free is generous for trying. Creator unlocks unlimited AI + scripts + plans for ₹245/mo. Agency ₹999/mo adds team workflows.

## When you don't know something
Say so plainly and point the user at the right page. Never invent feature names. Never promise capabilities the app doesn't have (no live AI video gen, no audience scraping, no DM automation).

## Output rules
- Plain text. No markdown code fences unless writing literal code.
- Maximum ~120 words per response. Brevity = premium.
- If the user is on their first turn, end with a single suggested next action.
- If the user is stuck or frustrated, acknowledge it once — then give one concrete next step.`

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
