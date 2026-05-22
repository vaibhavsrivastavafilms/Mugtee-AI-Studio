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
import {
  OUTPUT_FIELDS, EMPTY_OUTPUT, LIMITS,
  coerceTopic, coercePlatform, coerceTone, coerceDuration,
  normalizeOutput, logError,
} from '@/lib/workspace/validation'

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

const FIELDS = OUTPUT_FIELDS

function mockOutput(b: Body) {
  const topic = (b.topic || 'your idea').slice(0, 140)
  const dur = Math.min(Math.max(b.duration || 60, 15), 120)
  const beat = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  const scene = (n: number, t: number, visual: string, vo: string, camera: string, emotion: string) =>
    `Scene ${n}  ·  [${beat(t)}]\nVisual:    ${visual}\nVoiceover: "${vo}"\nCamera:    ${camera}\nEmotion:   ${emotion}`
  return {
    hook: `Some ${topic.split(' ').slice(0, 2).join(' ') || 'moments'} remember us better than we remember ourselves.`,
    script: [
      scene(1, 0,
        'A single warm light flickers across an empty room. Dust drifts.',
        `It started with one quiet thought about ${topic}.`,
        'Slow push-in, 50mm, shallow depth of field.',
        'Hushed · intimate · curious'),
      scene(2, Math.round(dur * 0.25),
        'Hands hesitate over an object that matters more than it looks.',
        'And then — everything we believed quietly shifted.',
        'Tight handheld detail, soft natural light from window-left.',
        'Tension · longing'),
      scene(3, Math.round(dur * 0.55),
        'A wider frame reveals what was hiding in plain sight.',
        `Because the truth about ${topic} isn't what they sell you. It's what you feel.`,
        'Slow dolly-out, 35mm, golden-hour rim light.',
        'Revelation · stillness'),
      scene(4, Math.max(dur - 6, Math.round(dur * 0.85)),
        'A held look. No words. The camera doesn\'t blink either.',
        'Maybe that\'s the part we forgot to say out loud.',
        'Locked-off close-up, cinematic 2.39:1 bars rising in.',
        'Resolution · ache'),
      scene(5, dur,
        'Fade to black. A single gold line draws under one word.',
        'Save this — for the version of you that needs it.',
        'Cut to black, then one frame of brand mark.',
        'Lingering · memorable'),
    ].join('\n\n'),
    storyboard: [
      `1. Cold open\n   Shot:       Extreme close-up\n   Framing:    Centered, eyes-line\n   Movement:   Static, 1.2s hold\n   Lighting:   Single practical, candle-warm 2700K\n   Transition: Hard cut to wide on first word`,
      `2. Establish\n   Shot:       Wide environmental\n   Framing:    Subject lower-third\n   Movement:   Slow push-in, 6\u201310 ft\n   Lighting:   Window-left, fill bounced\n   Transition: Match-cut on hand reaching frame`,
      `3. Detail beat\n   Shot:       Macro detail\n   Framing:    Object centered\n   Movement:   Handheld breath\n   Lighting:   Hard shadow, single key\n   Transition: J-cut \u2014 VO bridges into next visual`,
      `4. Emotional turn\n   Shot:       Medium close-up\n   Framing:    Rule-of-thirds, looking screen-right\n   Movement:   Slow dolly-out\n   Lighting:   Golden hour, lens flare allowed\n   Transition: Slow dissolve to black-and-white frame`,
      `5. Resolution\n   Shot:       Hero wide\n   Framing:    Symmetrical, horizon-locked\n   Movement:   Locked-off, slight breath\n   Lighting:   Rim-light + low ambient\n   Transition: Smash to title card`,
      `6. End card\n   Shot:       Black frame\n   Framing:    Single line of gold serif text\n   Movement:   Type-on, 0.6s\n   Lighting:   N/A\n   Transition: Hold 1.5s, cut`,
    ].join('\n\n'),
    captions:
      `Some things about ${topic} stay with you long after the scroll.\n\n` +
      `Save this for the moment you need to remember why you started.\n\n` +
      `\u2014\n` +
      `What did this make you feel? \u2935\ufe0f\n\n` +
      `#${(b.platform || 'reels').replace('_', '')} #cinematicreels #storytelling #${(b.tone || 'cinematic')} #shortfilm #mugtee #creatorlife`,
    thumbnailIdea:
      `Composition:   Off-center portrait, subject occupies left third, deep negative space to the right.\n` +
      `Trigger:       A held emotion the viewer can name in one second \u2014 longing, recognition, or quiet awe.\n` +
      `Overlay text:  3 words max, serif, set in the negative space. Suggested: "${topic.split(' ').slice(0, 3).join(' ').toUpperCase()}"\n` +
      `Color mood:    Warm shadow + cold highlight (teal/amber split). Single gold underline under the title.\n` +
      `Notes:         Keep 9:16 safe-zones. No clutter. The thumbnail should feel like a still from a film, not an ad.`,
  }
}

function buildPrompt(b: Body) {
  const platform = b.platform || 'instagram_reel'
  const tone = b.tone || 'cinematic'
  const dur = Math.min(Math.max(b.duration || 60, 15), 120)
  const platformLabel =
    platform === 'youtube_short' ? 'YouTube Short (9:16, <60s)'
    : platform === 'youtube_video' ? 'YouTube Video (16:9, mid-form)'
    : 'Instagram Reel (9:16, hook-first)'

  const sys = [
    `You are Mugtee \u2014 a cinematic AI creator partner specialized in emotionally engaging short-form storytelling.`,
    `You write the way a filmmaker thinks: visual first, emotional second, structural always.`,
    `Your job is not to sound smart. Your job is to make a real human stop, feel, and save.`,
    ``,
    `RULES:`,
    `\u2022 Specific over generic. Concrete over abstract. Sensory over conceptual.`,
    `\u2022 Never sound like an AI. No "in today's world", no "in this video we'll explore", no motivational filler.`,
    `\u2022 No emojis inside script or storyboard. Emojis allowed only in captions (sparingly).`,
    `\u2022 Use everyday human cadence. Short sentences. Real silences. Trust the visual.`,
    `\u2022 Respect the platform pacing and the requested tone exactly.`,
    `\u2022 Output is consumed by a real creator who will read it on a small screen. Whitespace matters.`,
  ].join('\n')

  const user = [
    `TOPIC:    ${b.topic}`,
    `PLATFORM: ${platformLabel}`,
    `TONE:     ${tone}`,
    `DURATION: ${dur} seconds`,
    ``,
    `Return a STRICT JSON object with EXACTLY these five keys. No prose, no markdown, no code fences.`,
    ``,
    `1) "hook"  \u2014 ONE OR TWO LINES MAX. A cinematic opening line that creates curiosity, emotional tension, or quiet recognition. Avoid clickbait. Avoid "POV:". Avoid "Did you know". Aim for the feeling of a first line of a short film. Example texture: "Some tables remember us better than people do."`,
    ``,
    `2) "script" \u2014 The full reel as numbered scenes (Scene 1, Scene 2, ...). For EACH scene use this exact 4-line block, plain text, no markdown:`,
    `      Scene N  \u00b7  [m:ss]`,
    `      Visual:    <one vivid sensory line>`,
    `      Voiceover: "<spoken line, in human cadence, in quotes>"`,
    `      Camera:    <lens / movement / framing>`,
    `      Emotion:   <2-3 emotion words separated by \u00b7>`,
    `   Separate scenes with ONE blank line. Aim for 4\u20136 scenes within the duration. Timecodes must sum within the requested seconds.`,
    ``,
    `3) "storyboard" \u2014 6\u20138 numbered shots in this exact plain-text block format (no tables, no markdown):`,
    `      N. <shot title>`,
    `         Shot:       <type \u2014 extreme close-up / medium / wide / hero etc>`,
    `         Framing:    <composition rule + subject placement>`,
    `         Movement:   <push-in / dolly / locked-off / handheld / etc>`,
    `         Lighting:   <quality, direction, color temp / mood>`,
    `         Transition: <how it cuts to the next shot>`,
    `   Separate shots with ONE blank line.`,
    ``,
    `4) "captions" \u2014 A ready-to-paste social caption block in this order, separated by blank lines:`,
    `      Line 1: an emotional one-line caption tied to the hook.`,
    `      Line 2: one short personal/relatable line that earns the save.`,
    `      Line 3: a single short CTA (e.g. "Save this." / "Tell me who needs this." / "Watch till the last second.")`,
    `      Line 4: exactly 5\u20138 lowercase hashtags on ONE line, space-separated, niche-relevant.`,
    `   At most ONE tasteful emoji in the entire caption.`,
    ``,
    `5) "thumbnailIdea" \u2014 A cinematic high-CTR thumbnail concept in this exact labeled block:`,
    `      Composition:  <where the subject sits, negative space, focal point>`,
    `      Trigger:      <the single emotion a viewer should feel in one glance>`,
    `      Overlay text: <max 3 words, the exact words to use, plus font feel>`,
    `      Color mood:   <2-tone palette + lighting direction>`,
    `      Notes:        <one line on safe-zones / what to avoid>`,
    ``,
    `Return ONLY the JSON object.`,
  ].join('\n')

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

    // Defensive body parse — empty body / malformed JSON / huge payload all land here.
    const raw = (await req.json().catch(() => null)) as any
    if (raw !== null && (typeof raw !== 'object' || Array.isArray(raw))) {
      return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 })
    }
    const body: Body = {
      topic:    coerceTopic(raw?.topic),
      platform: coercePlatform(raw?.platform),
      tone:     coerceTone(raw?.tone),
      duration: coerceDuration(raw?.duration),
    }
    if (!body.topic || body.topic.length < 6) {
      return NextResponse.json({ error: 'Please share a richer idea (min 6 characters).' }, { status: 400 })
    }
    if (body.topic.length >= LIMITS.topic) {
      // Topic was truncated to the cap. Allow generation but flag it.
      logError('generate-script.topic-truncated', null, { len: body.topic.length, user: user.id })
    }

    const fallback = mockOutput(body)

    const key = process.env.EMERGENT_LLM_KEY
    if (!key) {
      // Graceful demo mode — keeps the workspace usable when the key is missing.
      return NextResponse.json({ output: normalizeOutput(fallback, fallback), mock: true, reason: 'no_key' })
    }

    const { sys, user: userPrompt } = buildPrompt(body)
    let upstream: Response
    try {
      upstream = await fetch(EMERGENT_URL, {
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
    } catch (netErr: any) {
      // Network / DNS / abort — soft-fail to mock.
      logError('generate-script.network', netErr)
      return NextResponse.json({ output: normalizeOutput(fallback, fallback), mock: true, reason: 'network_error' })
    }

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '')
      logError('generate-script.upstream', null, { status: upstream.status, body: errText.slice(0, 300) })
      // Soft-fail to mock so creators are never blocked.
      return NextResponse.json({ output: normalizeOutput(fallback, fallback), mock: true, reason: 'llm_error', llm_status: upstream.status })
    }

    const data = await upstream.json().catch(() => null) as any
    const llmRaw = data?.choices?.[0]?.message?.content || ''
    const parsed = safeParseJson(llmRaw)

    if (!parsed || typeof parsed !== 'object') {
      logError('generate-script.parse-failed', null, { sample: String(llmRaw).slice(0, 240) })
      return NextResponse.json({ output: normalizeOutput(fallback, fallback), mock: true, reason: 'parse_failed' })
    }

    // Always return a normalized, complete 5-field WorkspaceOutput.
    return NextResponse.json({ output: normalizeOutput(parsed, fallback) })
  } catch (e: any) {
    logError('generate-script.exception', e)
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
