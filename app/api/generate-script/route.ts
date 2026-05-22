// Mugtee Workspace — unified one-shot prompt-to-reel generator.
//
// POST /api/generate-script
//   body:  { topic, platform, tone, duration }
//   returns: { output: { hook, script, storyboard, captions, thumbnailIdea }, mock?: boolean }
//
// One Emergent LLM call returning a strict JSON object — cheaper & faster than
// fanning out into 5 separate generations. Falls back to a deterministic mock
// when EMERGENT_LLM_KEY is missing so the workspace is always demoable.

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMERGENT_URL = 'https://integrations.emergentagent.com/llm/chat/completions'
const MODEL = 'gpt-4o-mini'

type Body = {
  topic?: string
  platform?: 'instagram_reel' | 'youtube_short' | 'youtube_video' | string
  tone?: 'cinematic' | 'emotional' | 'funny' | 'motivational' | string
  duration?: number
}

const FIELDS = ['hook', 'script', 'storyboard', 'captions', 'thumbnailIdea'] as const

function mockOutput(b: Body) {
  const topic = (b.topic || 'your idea').slice(0, 120)
  const dur = b.duration || 60
  return {
    hook: `Stop scrolling. What if everything you knew about "${topic}" was wrong?`,
    script: `[0:00] Open on a tight close-up. We hear a single sentence: "${topic}."\n[0:03] Cut wide. Voiceover lays out the contrarian truth.\n[0:15] First proof beat — visual evidence.\n[0:30] Second beat — emotional turn.\n[0:${Math.min(dur, 90) - 5}] Resolve with a clear, memorable line.\n[0:${Math.min(dur, 90)}] Cut to black. CTA on screen.`,
    storyboard: `1. Cold open — silhouette, single light source.\n2. Wide environmental shot establishing scale.\n3. Tight detail — hands, object, expression.\n4. Movement shot — push-in or whip-pan.\n5. Resolution frame — hero composition, gold-hour light.\n6. End card — Mugtee watermark, CTA.`,
    captions: `"${topic}" — the part nobody told you. \u2728\n\nSave this for the moment you need it most.\n\n#reels #${(b.platform || 'shorts').replace('_', '')} #${(b.tone || 'cinematic')} #mugtee`,
    thumbnailIdea: `High-contrast portrait. Subject lit from one side, the other half in deep shadow. Bold serif text overlay (3-4 words) referencing "${topic}". Gold accent line under the title. 9:16 safe-zones respected.`,
  }
}

function buildPrompt(b: Body) {
  const platform = b.platform || 'instagram_reel'
  const tone = b.tone || 'cinematic'
  const dur = b.duration || 60
  const sys = `You are Mugtee — a cinematic AI director for short-form viral content. You write for creators who want a polished, hook-first reel that performs. Be specific, visual, and concise. Never be generic.`
  const user = `Topic: ${b.topic}\nPlatform: ${platform}\nTone: ${tone}\nDuration: ${dur} seconds\n\nReturn a STRICT JSON object with EXACTLY these keys:\n- "hook":           one scroll-stopping opening line (max 22 words).\n- "script":         the full reel script with timecodes like [0:00], beat by beat, narration only.\n- "storyboard":     6-8 numbered cinematic shots, one per line, describing camera + framing + lighting.\n- "captions":       a ready-to-paste social caption with 4-6 relevant hashtags at the end.\n- "thumbnailIdea":  one paragraph describing a high-CTR thumbnail concept (composition, contrast, text overlay).\n\nReturn ONLY the JSON object — no prose, no markdown.`
  return { sys, user }
}

function safeParseJson(raw: string): any | null {
  try { return JSON.parse(raw) } catch {}
  // Tolerate accidental markdown fences
  const m = raw.match(/\{[\s\S]*\}/)
  if (m) { try { return JSON.parse(m[0]) } catch {} }
  return null
}

export async function POST(req: NextRequest) {
  try {
    // Auth gate — only signed-in users may consume LLM credits.
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as Body
    const topic = (body.topic || '').trim()
    if (topic.length < 6) {
      return NextResponse.json({ error: 'Please share a richer idea (min 6 characters).' }, { status: 400 })
    }

    const key = process.env.EMERGENT_LLM_KEY
    if (!key) {
      // Graceful demo mode — keeps the workspace usable when the key is missing.
      return NextResponse.json({ output: mockOutput(body), mock: true })
    }

    const { sys, user: userPrompt } = buildPrompt(body)
    const upstream = await fetch(EMERGENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user',   content: userPrompt },
        ],
        temperature: 0.85,
        response_format: { type: 'json_object' },
      }),
    })

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '')
      console.error('Emergent LLM error', upstream.status, errText.slice(0, 300))
      // Soft-fail to mock so creators are never blocked.
      return NextResponse.json({ output: mockOutput(body), mock: true, llm_status: upstream.status })
    }

    const data = await upstream.json()
    const raw = data?.choices?.[0]?.message?.content || ''
    const parsed = safeParseJson(raw)

    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json({ output: mockOutput(body), mock: true, parse_failed: true })
    }

    // Coerce every field to a string with a mock fallback for missing/empty values.
    const fallback = mockOutput(body)
    const output: Record<string, string> = {}
    for (const k of FIELDS) {
      const v = parsed[k]
      output[k] = typeof v === 'string' && v.trim() ? v.trim() : (fallback as any)[k]
    }

    return NextResponse.json({ output })
  } catch (e: any) {
    console.error('generate-script error', e)
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
