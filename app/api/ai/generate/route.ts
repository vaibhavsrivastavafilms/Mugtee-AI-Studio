import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMERGENT_LLM_KEY = process.env.EMERGENT_LLM_KEY
const EMERGENT_URL = 'https://integrations.emergentagent.com/llm/chat/completions'
const MODEL = 'gpt-4o-mini'

// 10 internal modes. UI surfaces 5; the rest are reachable via API for future routing.
type Mode =
  | 'reel_script' | 'script'        // /script
  | 'viral_hook'  | 'hooks'         // /hooks
  | 'caption'                       // /caption (enhanced packaging)
  | 'shot_breakdown' | 'storyboard' // /storyboard
  | 'analyze'                       // /analyze
  | 'viralize'                      // /viralize  — rewrite an existing piece for max virality
  | 'series'                        // /series    — propose a 5-part series arc
  | 'topics'                        // /topics    — propose 10 future content topics
  | 'comments'                      // /comments  — pinned + comment-bait set
  | 'clone'                         // /clone     — reverse-engineer mechanics of a reference, do NOT copy
  | 'ideas'                         // viral idea seeds — 3-5 structured ideas (title + hook + angle), used by the Pipeline side panel

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
    reference?: string | null      // for /clone — text describing the reference creator/piece
    language?: 'auto' | 'english' | 'hinglish' | 'gujarati' | 'guj_hindi'
    tone?: 'cinematic_emotional' | 'funny_relatable' | 'storytelling' | 'luxury_premium' | string | null
  }
}

// =====================================================================
// TABLE TALES VIRAL PSYCHOLOGY ENGINE — foundational system prompt
// =====================================================================
const TT_SYSTEM = `You are the TABLE TALES VIRAL PSYCHOLOGY ENGINE — a cinematic short-form writer trained on Indian social psychology, Gujarati middle-class behaviour, and the emotional mechanics of viral creator content. You write for Table Tales — a restaurant-storytelling, food + emotion creator brand based in Ahmedabad.

# CORE IDENTITY
You are not a generic AI writer. You are a socially observant, emotionally sharp, culturally fluent ghostwriter who understands what makes Indian audiences stop scrolling, send a reel to a friend, and comment "this is literally me". You write from observation, not motivation.

# STORYTELLING ENGINE — apply automatically to every output
- HOOK within the first 2 seconds. Pattern interrupt, contrarian, sensory, curiosity, or "this is so true" recognition.
- EMOTIONAL ESCALATION every 3–5 seconds. Never let a beat plateau.
- SHORT conversational lines. The way a friend texts, not how a brand writes.
- FAST pacing. Cut filler ruthlessly.
- CURIOSITY LOOPS. Open a loop in the hook, close it in the payoff.
- SOCIALLY REALISTIC behaviour and dialogue. Real things real people actually say.
- EMOTIONAL REALISM over motivation. Capture how it actually feels, not how it should feel.
- The output must trigger one of three audience reactions: "this is literally me", "this is too real", or "I need to send this to someone".

# HARD AVOID LIST
- No cringe poetry, no shayari unless the brief explicitly asks.
- No motivational tone. No "chase your dreams", no "never give up".
- No corporate writing. No "we believe", no "our mission".
- No generic food content. No "the perfect bite", no "burst of flavours".
- No slow intros. No "in today's video", no "have you ever wondered".
- No textbook Gujarati or robot Hinglish. No forced slang.
- No directly copying creators — reverse-engineer mechanics, never plagiarise.

# PSYCHOLOGICAL LAYERS — pick the layers most relevant to the brief
- Indian social psychology (log kya kahenge, comparison culture, family expectation)
- Gujarati middle-class behaviour (Ahmedabad realism, joint-family micro-moments, business-family rhythms, weekday-thali rituals)
- Friendship dynamics (the friend who always pays, the one who's always late, the group's emotional anchor)
- Family emotion (mom's silent worry, dad's awkward affection, sibling roast as love)
- Loneliness (the empty-table loneliness, post-college friendship drift, the city-life weight)
- Nostalgia (childhood tiffin, school canteen, Sunday lunches, first-job tea breaks)
- Awkward social realism (overpaying out of guilt, splitting bills, ordering for someone, the silence before someone gets up to leave)
- Restaurant culture (the regular table, the waiter who knows the order, who pays first, the post-dinner "thodi der aur baith"?)
- Emotional observation (small moments most people feel but never name)

# LANGUAGE INTELLIGENCE
- Default to natural Hinglish (English + Hindi as Indians actually speak it).
- Switch to Gujarati or Gujarati-Hindi mix when the topic is family, nostalgia, Ahmedabad street food, or middle-class home life.
- Switch to English when the topic is dating apps, work culture, urban loneliness, or aspirational restaurant culture.
- Conversational, Ahmedabad-realistic, emotionally natural, socially believable.
- Never use textbook translations. Never use unnatural slang. Never use "behenchara" or "bhaichara" performatively.

# CULTURAL MICRO-DETAILS YOU CAN DRAW FROM
- CG Road, SG highway, Law Garden, Manek Chowk, Sindhi Market, Old City
- Fafda-jalebi Sundays, undhiyu winters, theplas in tiffin, kadhi-khichdi on a tired day
- Gujarati family WhatsApp groups, the cousin in the US, the chacha who never stops eating
- The thali restaurant where the waiter says "hajee hajee" — pressure-feeding hospitality
- The college canteen, the late-night chai tapri, the Chinese-bhel cart
- The aunty asking "shaadi kab?", the uncle asking "package kitna?"
- The friend group dinner where one person silently picks up the bill

# OUTPUT DISCIPLINE
- Compact. Cinematic. No fluff.
- No meta-commentary ("Here is your script:"). Just the output.
- No markdown code blocks unless explicitly returning JSON.
- Restaurant + food creator lens unless context says otherwise.
- Every line must earn its place. If it doesn't make the viewer feel something or move the story, delete it.`

// =====================================================================
// MODE → PROMPT ROUTER
// =====================================================================
function ctxBlock(ctx: AIRequest['context']) {
  const platform = ctx?.platform || 'instagram'
  const lang = ctx?.language && ctx.language !== 'auto' ? `Language preference: ${ctx.language}` : `Language: auto-pick (Hinglish / Gujarati / Guj-Hindi / English) based on topic`
  const toneMap: Record<string, string> = {
    cinematic_emotional: 'Tone: cinematic + emotional — quiet, observational, gut-punch endings',
    funny_relatable: 'Tone: funny + relatable — sharp roast humour, friend-group dynamics, "this is too real"',
    storytelling: 'Tone: storytelling — slow-burn beats, character moments, payoff that lingers',
    luxury_premium: 'Tone: luxury + premium — restrained, sensory, high-end restaurant culture, no shouting',
  }
  const tone = ctx?.tone && toneMap[ctx.tone] ? toneMap[ctx.tone] : (ctx?.tone ? `Tone: ${ctx.tone}` : null)
  return [
    ctx?.title && `Title: ${ctx.title}`,
    ctx?.description && `Brief: ${ctx.description}`,
    `Platform: ${platform}`,
    ctx?.status && `Stage: ${ctx.status}`,
    ctx?.tags?.length && `Tags: ${ctx.tags.join(', ')}`,
    tone,
    lang,
  ].filter(Boolean).join('\n')
}

function promptFor(rawMode: Mode, ctx: AIRequest['context']): { user: string; wantsJson: boolean } {
  // alias normalisation
  const mode: Mode =
    rawMode === 'script' ? 'reel_script' :
    rawMode === 'hooks' ? 'viral_hook' :
    rawMode === 'storyboard' ? 'shot_breakdown' :
    rawMode

  const block = ctxBlock(ctx)
  const platform = ctx?.platform || 'instagram'

  switch (mode) {
    case 'reel_script':
      return {
        wantsJson: false,
        user: `Write a Table Tales-style ${platform} script for 25–40 seconds.

STRUCTURE (don't label these out loud in the output, just feel them):
- HOOK (0:00–0:02) — pattern interrupt or "this is so true" line, max 8 words.
- ESCALATION (0:02–0:15) — 3 short beats, emotional escalation every 3–5 seconds, real-life dialogue or observation.
- TWIST or PAYOFF (0:15–0:30) — the emotional gut-punch or recognition moment.
- CLOSING LINE (0:30–0:40) — one quiet line that lingers. No CTA. The line IS the CTA.

FORMAT per line:
[VISUAL cue] | [VOICEOVER or ON-SCREEN TEXT in natural Hinglish/Gujarati/English depending on context]

Max ~110 words total. Conversational. Cinematic. Make the viewer feel seen.

CONTEXT:
${block}`,
      }

    case 'viral_hook':
      return {
        wantsJson: false,
        user: `Generate 7 Table Tales-style hooks (first 2 seconds, max 10 words each) for ${platform}.

Mix the 7 across these psychological angles:
1. "This is so true" recognition
2. Contrarian / pattern interrupt
3. Curiosity loop (open a question, don't answer)
4. Sensory or visual surprise
5. Awkward social realism
6. Nostalgia trigger
7. Emotional gut-punch

Use natural Hinglish or Gujarati-Hindi where it lands harder than English. No cringe poetry, no motivation, no "have you ever wondered". Output a clean numbered list, that's it.

CONTEXT:
${block}`,
      }

    case 'caption':
      return {
        wantsJson: false,
        user: `Write the FULL packaging set for this ${platform} post in Table Tales voice.

Output exactly these labelled sections, in this order, with no extra commentary:

CAPTION:
<2–4 short emotional lines. Hinglish or Gujarati-Hindi mix where it lands harder. Ends with a soft emotional question or a "tag the friend who…" line. No CTA shouting.>

THUMBNAIL TEXT:
<one bold 3–6 word overlay line, all caps optional>

PINNED COMMENT:
<one line the creator pins to seed the conversation — confessional, slightly vulnerable, designed to invite replies>

COMMENT BAIT:
<one provocative or relatable question to drop in comments to spark a debate or shared memory>

HASHTAGS (layered, single line each):
Layer 1 — BROAD VIRAL: <5–6 broad hashtags>
Layer 2 — EMOTIONAL NICHE: <5–6 specific emotion/community tags>
Layer 3 — TABLE TALES BRAND: #tabletales #tabletalesmoments #ahmedabaddiaries #gujjueats (add 2–3 more in this style)

SHARE TRIGGER: <one line on WHY someone will send this to a friend>
SAVE TRIGGER: <one line on WHY someone will save this for later>

CONTEXT:
${block}`,
      }

    case 'shot_breakdown':
      return {
        wantsJson: false,
        user: `Produce a cinematic shot-by-shot storyboard for this ${platform} piece.

Output 6–10 shots, one per line, exactly this format:
Shot N · [duration in sec] · [angle/movement] · [subject] · [emotion or audio cue]

Rules:
- Achievable on a phone or single mirrorless.
- Restaurant / food-creator aware: close-ups of hands, steam, faces mid-thought, the empty chair across the table.
- At least 2 shots must capture an emotional micro-moment (hesitation, a half-smile, looking away).
- Pace: shots get shorter as the story escalates.
- No drone shots, no Hollywood nonsense.

CONTEXT:
${block}`,
      }

    case 'viralize':
      return {
        wantsJson: false,
        user: `Take the existing piece below and REWRITE it for maximum Table Tales virality. Same core idea, sharper execution.

Apply the storytelling engine: hook in 2s, escalate every 3–5s, short conversational lines, emotional realism, curiosity loop, payoff that lingers.

Output exactly:

REWRITTEN HOOK (max 8 words):
<line>

REWRITTEN SCRIPT (110 words max, [VISUAL] | [VO/TEXT] per line):
<lines>

WHAT CHANGED & WHY (3 bullets, brutally honest):
• <change> — <psychological reason>
• <change> — <psychological reason>
• <change> — <psychological reason>

CONTEXT:
${block}

ORIGINAL PIECE TO VIRALIZE:
${ctx?.existing_script || ctx?.description || '(empty)'}`,
      }

    case 'series':
      return {
        wantsJson: false,
        user: `Propose a 5-part Table Tales series arc based on the context. Each part is a standalone reel but the 5 together build emotional momentum.

Output exactly 5 entries, format:
PART N — <title in Table Tales voice>
Hook: <max 10 words>
Emotional beat: <one line — what feeling this episode owns>
Why it works in the arc: <one line>

The arc should escalate emotionally from observation → recognition → vulnerability → release → quiet conclusion.

CONTEXT:
${block}`,
      }

    case 'topics':
      return {
        wantsJson: false,
        user: `Generate 10 fresh content topic ideas for Table Tales rooted in the context. Restaurant + emotional storytelling + Indian social psychology + Gujarati cultural micro-moments.

Format per line:
N. <topic title (max 12 words)> — <emotion or psychology this taps> — <suggested format: reel / carousel / series>

Mix safe-bet ideas (3) with ambitious emotional ones (4) and one-line-killer hooks (3). No generic food content. No motivational stuff.

CONTEXT:
${block}`,
      }

    case 'comments':
      return {
        wantsJson: false,
        user: `Generate the engagement-comment kit for this Table Tales ${platform} post.

Output exactly:

PINNED COMMENT (1):
<confessional, slightly vulnerable, invites replies>

COMMENT-BAIT QUESTIONS (3):
1. <question that sparks shared memory or mild debate>
2. <…>
3. <…>

REPLY TEMPLATES (3, for when followers comment):
1. <warm, specific, in voice — not "thanks!">
2. <…>
3. <…>

CONTROVERSY-SAFE TAKE (1):
<one mildly contrarian observation the creator can drop in comments to spark conversation without alienating anyone>

CONTEXT:
${block}`,
      }

    case 'clone':
      return {
        wantsJson: false,
        user: `Reverse-engineer the EMOTIONAL MECHANICS of the reference below. Do NOT copy lines, jokes, or hooks. Extract the underlying viral patterns and propose a Table Tales original that uses the same psychological levers but with our voice, our context, and our cultural specificity (Indian, Gujarati, Ahmedabad, restaurant storytelling).

Output exactly:

MECHANICS DETECTED (3–5 bullets):
• <pattern — one-line psychological explanation>

TABLE TALES ORIGINAL — HOOK:
<max 8 words>

TABLE TALES ORIGINAL — SCRIPT (90 words max, [VISUAL] | [VO/TEXT]):
<lines>

WHY THIS ISN'T A COPY:
<one paragraph explaining how the cultural + emotional context makes this its own thing>

CONTEXT:
${block}

REFERENCE PIECE TO REVERSE-ENGINEER:
${ctx?.reference || ctx?.existing_script || ctx?.description || '(empty — ask user for reference next time)'}`,
      }

    case 'ideas': {
      return {
        wantsJson: true,
        user: `Generate 5 fresh viral content ideas for Table Tales on ${platform}, rooted in the topic and tone below. Output STRICT JSON, no markdown:

{
  "ideas": [
    {
      "title": "<title under 10 words, scroll-stopping>",
      "hook": "<the first 2 seconds — max 12 words, in natural Hinglish/Gujarati/English based on context>",
      "angle": "<the emotional/psychological angle this taps — one short line>"
    },
    ... 4 more
  ]
}

Mix the 5 across recognition / contrarian / nostalgia / awkward realism / gut-punch angles. No generic food content. No motivation. Restaurant + Indian + Gujarati cultural awareness when relevant.

CONTEXT:
${block}`,
      }
    }

    case 'analyze': {
      const target = ctx?.existing_script || ctx?.description || ctx?.title || '(no script provided)'
      return {
        wantsJson: true,
        user: `Analyze this ${platform} piece through the Table Tales viral-psychology lens. Output STRICT JSON in this exact shape — no markdown, JSON only:

{
  "score": <0-100>,
  "hook_strength": "weak|ok|strong|elite",
  "hook_pattern": "<one of: pattern_interrupt | curiosity_loop | recognition | sensory | contrarian | nostalgia | gut_punch | weak>",
  "pacing": ["<observation>", "<observation>", "<observation>"],
  "emotional_structure": ["<beat-by-beat reading>", "<...>", "<...>"],
  "emotional_triggers": ["<trigger>", "<trigger>", "<trigger>"],
  "audience_psychology": "<who will resonate with this and why, one sentence>",
  "retention": ["<why people will / won't watch through>", "<...>", "<...>"],
  "fixes": ["<surgical fix>", "<surgical fix>", "<surgical fix>"],
  "verdict": "<one cinematic sentence, honest, no flattery>"
}

Max 3 items per array. Each item under 14 words. Be brutally honest. Reward emotional realism, punish generic food-content patterns.

CONTEXT:
${block}

PIECE TO ANALYZE:
${target}`,
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
        { role: 'system', content: TT_SYSTEM },
        { role: 'user', content: user },
      ],
      temperature: body.mode === 'analyze' ? 0.35 : 0.9,
      max_tokens: body.mode === 'analyze' ? 600 : 900,
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
