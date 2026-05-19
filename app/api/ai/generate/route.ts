import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMERGENT_LLM_KEY = process.env.EMERGENT_LLM_KEY
const EMERGENT_URL = 'https://integrations.emergentagent.com/llm/chat/completions'
const MODEL = 'gpt-4o-mini'

type Mode = 'reel_script' | 'viral_hook' | 'caption' | 'shot_breakdown' | 'analyze'

interface AIRequest {
  mode: Mode
  context?: {
    title?: string | null
    description?: string | null
    platform?: string | null
    status?: string | null
    scheduled_at?: string | null
    tags?: string[] | null
    existing_script?: string | null
  }
}

const SYSTEM = `You are the Table Tales VIRAL SCRIPT ENGINE — a cinematic short-form content writer specializing in restaurant storytelling, emotional hooks, creator content, and viral shortform structure. Output is compact, cinematic, and immediately usable. Never include meta-commentary, never wrap output in markdown code blocks unless explicitly returning JSON. Restaurant + food creator tone unless context says otherwise.`

function promptFor(mode: Mode, ctx: AIRequest['context']): { user: string; wantsJson: boolean } {
  const platform = ctx?.platform || 'instagram'
  const ctxBlock = [
    ctx?.title && `Title: ${ctx.title}`,
    ctx?.description && `Brief: ${ctx.description}`,
    `Platform: ${platform}`,
    ctx?.status && `Stage: ${ctx.status}`,
    ctx?.tags?.length && `Tags: ${ctx.tags.join(', ')}`,
  ].filter(Boolean).join('\n')

  switch (mode) {
    case 'reel_script':
      return {
        wantsJson: false,
        user: `Write a cinematic 30–45 second short-form video script for ${platform} based on the context below.\n\nSTRUCTURE:\n1. HOOK (0:00–0:03) — pattern interrupt, sensory or curiosity\n2. PROMISE (0:03–0:08) — what they'll learn / feel / see\n3. STORY BEATS (0:08–0:35) — 3–5 tight beats with on-screen text cues in [brackets]\n4. PAYOFF + CTA (0:35–0:45) — emotional close, soft CTA\n\nFormat each line as: [VISUAL] | [VOICEOVER / ON-SCREEN TEXT]\nKeep total under 120 words. Cinematic. Emotional. Restaurant storytelling vibe.\n\nCONTEXT:\n${ctxBlock}`,
      }
    case 'viral_hook':
      return {
        wantsJson: false,
        user: `Generate 5 viral hooks (first 3 seconds) for ${platform}. Each under 12 words. Mix curiosity, pattern interrupt, contrarian, sensory, and emotional. Output as numbered list, nothing else.\n\nCONTEXT:\n${ctxBlock}`,
      }
    case 'caption':
      return {
        wantsJson: false,
        user: `Write a ${platform} caption + hashtag set for the post below.\n\nCAPTION: 2–4 short lines, cinematic, restaurant-storytelling tone, ends with a soft question or CTA.\nHASHTAGS: 10–15 relevant, mix broad + niche, on a single line.\n\nFormat exactly:\n<caption text>\n\n<hashtags single line>\n\nCONTEXT:\n${ctxBlock}`,
      }
    case 'shot_breakdown':
      return {
        wantsJson: false,
        user: `Produce a shot-by-shot breakdown for filming this short-form piece on ${platform}.\n\nFor each shot output one line:\nShot N · [duration] · [angle/movement] · [subject] · [audio note]\n\nKeep total to 6–10 shots. Cinematic, food/restaurant aware, low-budget achievable.\n\nCONTEXT:\n${ctxBlock}`,
      }
    case 'analyze': {
      const target = ctx?.existing_script || ctx?.description || ctx?.title || '(no script provided)'
      return {
        wantsJson: true,
        user: `Analyze the virality of the following short-form ${platform} piece. Respond in compact JSON with this exact shape: {"score":<0-100>,"hook_strength":"weak|ok|strong|elite","emotional_triggers":["..."],"retention":["..."],"pacing":["..."],"verdict":"<one cinematic sentence>"}. Max 3 items per array, each under 12 words. No markdown, JSON only.\n\nCONTEXT:\n${ctxBlock}\n\nSCRIPT/CAPTION TO ANALYZE:\n${target}`,
      }
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!EMERGENT_LLM_KEY) {
      return NextResponse.json({ error: 'EMERGENT_LLM_KEY not configured' }, { status: 500 })
    }
    const body = (await req.json()) as AIRequest
    if (!body?.mode) {
      return NextResponse.json({ error: 'mode is required' }, { status: 400 })
    }
    const { user, wantsJson } = promptFor(body.mode, body.context || {})

    const payload: any = {
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: user },
      ],
      temperature: body.mode === 'analyze' ? 0.3 : 0.85,
      max_tokens: body.mode === 'analyze' ? 400 : 700,
    }
    if (wantsJson) payload.response_format = { type: 'json_object' }

    const upstream = await fetch(EMERGENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${EMERGENT_LLM_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    if (!upstream.ok) {
      const errText = await upstream.text()
      console.error('Emergent LLM error:', upstream.status, errText)
      return NextResponse.json({ error: `LLM error ${upstream.status}`, details: errText.slice(0, 500) }, { status: 502 })
    }

    const data = await upstream.json()
    const raw = data?.choices?.[0]?.message?.content || ''

    if (wantsJson) {
      try {
        const parsed = JSON.parse(raw)
        return NextResponse.json({ mode: body.mode, output: parsed, raw })
      } catch {
        return NextResponse.json({ mode: body.mode, output: { verdict: raw }, raw })
      }
    }
    return NextResponse.json({ mode: body.mode, output: raw, raw })
  } catch (e: any) {
    console.error('ai/generate error', e)
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
