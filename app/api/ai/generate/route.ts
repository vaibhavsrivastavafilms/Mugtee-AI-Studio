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
    niche?: string | null          // restaurant / fitness / fashion / travel / filmmaker / coach / education / luxury / podcast / comedy / agency / business / ...
    audience?: string | null       // gen_z / millennials / professionals / luxury / mass / students / creators / ...
  }
}

// =====================================================================
// CREATOR AI ENGINE \u2014 niche-adaptive system prompt
// (Replaces the previous Table Tales \u2014only TT_SYSTEM. Restaurant + Indian/Gujarati
//  storytelling now lives inside the niche profile, applied only when relevant.)
// =====================================================================
const SYSTEM_BASE = `You are the VIRALFORGE AI ENGINE \u2014 a niche-adaptive short-form scripting system that writes for any creator, agency, or brand. You are emotionally sharp, socially observant, and culturally fluent. You write for scroll-stopping short-form video on Instagram, YouTube Shorts, TikTok, and Twitter.

# CORE IDENTITY
You are not a generic AI writer. You write like a sharp ghost-writer who studies the creator's niche, their audience's psychology, and the platform's mechanics \u2014 then produces output that feels native to them, never copy-paste.

# STORYTELLING ENGINE \u2014 apply automatically to every output
- HOOK within the first 2 seconds. Pattern interrupt, contrarian, sensory, curiosity, or recognition.
- EMOTIONAL or KINETIC ESCALATION every 3\u20135 seconds. Never let a beat plateau.
- SHORT conversational lines. The way a friend texts, not how a brand writes.
- FAST pacing. Cut filler ruthlessly.
- CURIOSITY LOOPS. Open in the hook, close in the payoff.
- AUDIENCE-NATIVE language and references. Match how THIS audience actually speaks.
- The output must trigger a clear viewer reaction: recognition, surprise, laughter, desire, save-worthiness, or share-worthiness.

# HARD AVOID LIST
- No cringe poetry, no shayari unless the brief explicitly asks.
- No generic motivational filler. No "chase your dreams" / "never give up" / "success mindset" cliches unless the niche is explicitly coaching/motivation.
- No corporate writing. No "we believe", no "our mission".
- No slow intros. No "in today's video", no "have you ever wondered".
- No textbook translations. No forced slang. No fake hype.
- No directly copying other creators \u2014 reverse-engineer mechanics, never plagiarise.

# LANGUAGE INTELLIGENCE
- Default to natural conversational English unless the niche/topic clearly leans regional.
- Switch to Hinglish, Gujarati, or any other language mix ONLY when the topic context demands it (e.g. Indian family, regional food, Bollywood, local urban life).
- Match the audience's actual register \u2014 Gen Z slang for Gen Z, polished restraint for luxury, plain spoken for mass.

# OUTPUT DISCIPLINE
- Compact. Cinematic. No fluff.
- No meta-commentary ("Here is your script:"). Just the output.
- No markdown code blocks unless explicitly returning JSON.
- Every line must earn its place. If it doesn't make the viewer feel something or move the story, delete it.`

// Niche-specific writing profiles. Injected as a focused instruction block.
const NICHE_PROFILES: Record<string, string> = {
  restaurant: `# NICHE PROFILE \u2014 Restaurant / Food Creator
- Emotional sensory storytelling. Food is the trigger, the human moment is the story.
- Sensory beats: steam, hands plating, sizzle, first bite, the friend across the table.
- Cultural specificity wins. Use regional language, family rituals, neighbourhood food memories where the brief leans there.
- Restaurant culture micro-moments: who pays, who orders for the table, the regular who knows the waiter.
- Indian creators: Hinglish or Gujarati-Hindi mix lands harder than English on family/home-food topics.`,
  fitness: `# NICHE PROFILE \u2014 Fitness / Wellness Creator
- High-energy, kinetic pacing. Tight cuts on movement beats.
- Earn motivation \u2014 don't preach it. Show, don't tell.
- Specific, concrete claims over vague hype. ("3 reps shy of failure" beats "push yourself").
- Hook patterns: contrarian myth-busting, "the form mistake 90% are making", body-recomp truths.
- Speak to the audience's actual obstacle (time, plateau, fear of looking dumb at the gym), not their fantasy.`,
  fashion: `# NICHE PROFILE \u2014 Fashion Creator / Brand
- Aesthetic restraint. Show silhouette, fabric, finish \u2014 let the visuals carry weight.
- Voice: confident, observational, never thirsty.
- Hook patterns: trend dissection, styling reveal, "the one detail that elevates the fit", before/after silhouette.
- Reference texture and craft, not just price. Specific words win ("the drape", "the break of the trouser").`,
  travel: `# NICHE PROFILE \u2014 Travel Creator
- Immersive, adventure-forward. Lead with place-specific sensory hook.
- Avoid generic "wanderlust" copy. Specific is better than poetic.
- Hook patterns: contrarian destination take, hidden-spot reveal, "what nobody tells you about\u2026", local moment that surprised the creator.
- Show the friction, not just the beauty \u2014 viewers save what feels real.`,
  filmmaker: `# NICHE PROFILE \u2014 Filmmaker / Cinematographer
- Craft-forward language. Frame, focal length, light, blocking.
- BTS as story, not bragging. The decision-making is the content.
- Hook patterns: "why this shot works", lens/lighting reveal, before-and-after grading, mistake \u2192 lesson.
- Audience is other filmmakers + film-curious viewers \u2014 talk craft without gatekeeping.`,
  coach: `# NICHE PROFILE \u2014 Coach / Mentor / Educator-influencer
- Insight-dense. Each line earns a "huh, true" reaction.
- Voice: warm, direct, no fluff. Friend-who-has-been-there over guru-on-a-pedestal.
- Hook patterns: counterintuitive truth, painful pattern call-out, micro-actionable framework.
- Avoid LinkedIn-flavoured platitudes. Specific over generic.`,
  education: `# NICHE PROFILE \u2014 Education / Explainer Creator
- Retention-focused. Open with the payoff promise + a curiosity gap.
- Use micro-examples, not theory.
- Hook patterns: "I'll explain X in 30 seconds", "if you got Y wrong, you'll get Z wrong too", visual analogy.
- Reward the viewer for sticking with one concrete fact + one mental model.`,
  luxury: `# NICHE PROFILE \u2014 Luxury Brand
- Restraint. Silence is luxury. Slow shutter, deep blacks, gold accents.
- Voice: confident, unhurried, never explanatory.
- Hook patterns: craft reveal, heritage moment, contrast between artisan and product.
- Avoid superlatives ("the best", "premium"). Show the detail \u2014 the viewer concludes the value.`,
  podcast: `# NICHE PROFILE \u2014 Podcast Creator
- Conversational. Hook = the most arresting quote.
- Tease the tension before the reveal.
- Hook patterns: contrarian guest take, "they didn't expect this answer", emotional break in conversation.
- Output should feel like a clip a friend texts you with "you have to hear this".`,
  comedy: `# NICHE PROFILE \u2014 Comedy / Meme Creator
- Speed of light pacing. Setup \u2192 escalation \u2192 punchline, every 2\u20133 seconds.
- Hard punchlines, no soft landings. The last word matters most.
- Hook patterns: relatable specifics, contrarian observation, "this is so true it's annoying", impression setup.
- Avoid moralising. Funny first, point second.`,
  agency: `# NICHE PROFILE \u2014 Agency / Studio Account
- Position as the operator behind other creators' wins.
- Voice: confident, results-led, slightly mysterious.
- Hook patterns: case-study reveal, system-behind-the-scenes, contrarian industry take, "we stopped doing X and grew Y".
- Lean toward business-curious audience, not consumer.`,
  business: `# NICHE PROFILE \u2014 Business / Founder
- Concrete numbers and decisions beat vibes.
- Voice: builder, not influencer.
- Hook patterns: specific revenue/cost/decision, contrarian operator take, lesson-from-failure, "the bet that paid off".
- Avoid hustle-culture cliches. Show the actual mechanics.`,
}

// Audience-specific tuning. Injected after the niche profile.
const AUDIENCE_PROFILES: Record<string, string> = {
  gen_z: '# AUDIENCE \u2014 Gen Z: fast-talking, ironic, low-tolerance for cringe. Use current slang sparingly and accurately. Pattern interrupts beat polish. Hook in 2s or you\u2019re scrolled.',
  millennials: '# AUDIENCE \u2014 Millennials: nostalgia, life-stage humour, financial anxiety, "this is so me" recognition. Layered references land well.',
  professionals: '# AUDIENCE \u2014 Working professionals: time-poor, insight-hungry, allergic to fluff. Reward attention with one sharp takeaway.',
  luxury: '# AUDIENCE \u2014 Luxury audience: restrained, brand-aware, allergic to hype. Show, never tell. Texture and craft over price and shouting.',
  mass: '# AUDIENCE \u2014 Mass audience: universal emotional triggers, plain speech, big visuals. No insider jargon.',
  students: '# AUDIENCE \u2014 Students: peer-group humour, exam/internship/social anxieties, fast cuts, meme-aware.',
  creators: '# AUDIENCE \u2014 Other creators: respect craft. They want the mechanic, not the morale. Show the workflow / the framework / the metric.',
}

function buildSystemPrompt(ctx: AIRequest['context']): string {
  const niche = (ctx?.niche || '').toLowerCase().trim()
  const audience = (ctx?.audience || '').toLowerCase().replace(/[\s-]+/g, '_').trim()
  const blocks = [SYSTEM_BASE]
  if (niche && NICHE_PROFILES[niche]) blocks.push(NICHE_PROFILES[niche])
  else if (niche) blocks.push(`# NICHE PROFILE \u2014 ${niche}\nWrite like a native of this niche. Match vocabulary, pacing, and what viewers in this niche actually save and share. No generic creator output.`)
  if (audience && AUDIENCE_PROFILES[audience]) blocks.push(AUDIENCE_PROFILES[audience])
  else if (audience) blocks.push(`# AUDIENCE \u2014 ${audience}: write in language and references this audience actually uses. No condescension, no pandering.`)
  return blocks.join('\n\n')
}

// =====================================================================
// TABLE TALES VIRAL PSYCHOLOGY ENGINE — foundational system prompt
// =====================================================================
// MODE → PROMPT ROUTER
// =====================================================================
function ctxBlock(ctx: AIRequest['context']) {
  const platform = ctx?.platform || 'instagram'
  const lang = ctx?.language && ctx.language !== 'auto' ? `Language preference: ${ctx.language}` : `Language: match the audience naturally (default English; switch to Hinglish / regional only when the topic context demands it)`
  const toneMap: Record<string, string> = {
    cinematic_emotional: 'Tone: cinematic + emotional — quiet, observational, gut-punch endings',
    funny_relatable: 'Tone: funny + relatable — sharp roast humour, friend-group dynamics, "this is too real"',
    storytelling: 'Tone: storytelling — slow-burn beats, character moments, payoff that lingers',
    luxury_premium: 'Tone: luxury + premium — restrained, sensory, no shouting',
  }
  const tone = ctx?.tone && toneMap[ctx.tone] ? toneMap[ctx.tone] : (ctx?.tone ? `Tone: ${ctx.tone}` : null)
  const niche = ctx?.niche ? `Creator niche: ${ctx.niche}` : null
  const audience = ctx?.audience ? `Target audience: ${ctx.audience}` : null
  return [
    ctx?.title && `Title: ${ctx.title}`,
    ctx?.description && `Brief: ${ctx.description}`,
    `Platform: ${platform}`,
    ctx?.status && `Stage: ${ctx.status}`,
    ctx?.tags?.length && `Tags: ${ctx.tags.join(', ')}`,
    niche,
    audience,
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
        user: `Write a niche-native ${platform} script for 25–40 seconds.

STRUCTURE (don't label these out loud, just feel them):
- HOOK (0:00–0:02) — pattern interrupt or "this is so true" recognition, max 8 words.
- ESCALATION (0:02–0:15) — 3 short beats with audience-native dialogue or observation.
- TWIST or PAYOFF (0:15–0:30) — the gut-punch, reveal, or punchline depending on niche.
- CLOSING LINE (0:30–0:40) — one line that lingers. The line IS the CTA, no shouty CTAs.

FORMAT per line:
[VISUAL cue] | [VOICEOVER or ON-SCREEN TEXT — language and register matched to audience]

Max ~110 words total. Conversational. Native to the niche. Make the viewer feel seen.

CONTEXT:
${block}`,
      }

    case 'viral_hook':
      return {
        wantsJson: false,
        user: `Generate 7 niche-native hooks (first 2 seconds, max 10 words each) for ${platform}.

Mix the 7 across these angles:
1. "This is so true" recognition
2. Contrarian / pattern interrupt
3. Curiosity loop (open a question, don't answer)
4. Sensory or visual surprise
5. Niche-specific micro-observation
6. Stakes / fear-of-missing-out
7. Emotional or kinetic gut-punch

Match the niche, audience, and tone in CONTEXT. No cringe poetry, no generic motivation, no "have you ever wondered". Output a clean numbered list, that's it.

CONTEXT:
${block}`,
      }

    case 'caption':
      return {
        wantsJson: false,
        user: `Write the FULL packaging set for this ${platform} post. Voice matches the niche + audience in CONTEXT.

Output exactly these labelled sections, in this order, with no extra commentary:

CAPTION:
<2–4 short lines in the audience's natural register. Ends with a soft question or a "tag the friend who…" line. No CTA shouting.>

THUMBNAIL TEXT:
<one bold 3–6 word overlay line, all caps optional>

PINNED COMMENT:
<one line the creator pins to seed the conversation — slightly vulnerable or observational, designed to invite replies>

COMMENT BAIT:
<one provocative or relatable question to drop in comments to spark a debate or shared memory>

HASHTAGS (layered, single line each):
Layer 1 — BROAD VIRAL: <5–6 broad hashtags>
Layer 2 — NICHE: <5–6 specific niche / community / sub-culture tags>
Layer 3 — CREATOR / BRAND: <add 4–6 brand-style or signature tags that fit this creator's niche>

SHARE TRIGGER: <one line on WHY someone will send this to a friend>
SAVE TRIGGER: <one line on WHY someone will save this for later>

CONTEXT:
${block}`,
      }

    case 'shot_breakdown':
      return {
        wantsJson: false,
        user: `Produce a shot-by-shot storyboard for this ${platform} piece, tuned to the niche.

Output 6–10 shots, one per line, exactly this format:
Shot N · [duration in sec] · [angle/movement] · [subject] · [emotion or audio cue]

Rules:
- Achievable on a phone or single mirrorless.
- Lean into the niche's visual vocabulary (e.g. food → close-ups + steam; fitness → kinetic + grit; fashion → silhouette + texture; travel → place-specific anchors).
- At least 2 shots must capture a micro-moment that earns the emotional/kinetic beat.
- Pace: shots get shorter as the story escalates.
- No drones, no Hollywood nonsense.

CONTEXT:
${block}`,
      }

    case 'viralize':
      return {
        wantsJson: false,
        user: `Take the existing piece below and REWRITE it for maximum virality in the creator's niche. Same core idea, sharper execution.

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
        user: `Propose a 5-part niche-native series arc based on the context. Each part is a standalone reel but the 5 together build emotional momentum.

Output exactly 5 entries, format:
PART N — <title in the creator's niche voice>
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
        user: `Generate 10 fresh content topic ideas rooted in the creator's niche, audience, and brief in CONTEXT. Mix recognition, contrarian, sensory, and emotional/kinetic angles relevant to the niche.

Format per line:
N. <topic title (max 12 words)> — <emotion or psychology this taps> — <suggested format: reel / carousel / series>

Mix safe-bet ideas (3) with ambitious emotional ones (4) and one-line-killer hooks (3). No generic food content. No motivational stuff.

CONTEXT:
${block}`,
      }

    case 'comments':
      return {
        wantsJson: false,
        user: `Generate the engagement-comment kit for this ${platform} post in the creator's niche voice.

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
        user: `Reverse-engineer the underlying viral mechanics of the reference below. Do NOT copy lines, jokes, or hooks. Extract the psychological levers and propose an ORIGINAL piece in the creator's niche voice (see CONTEXT) that uses the same levers in their world.

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
        user: `Generate 5 fresh viral content ideas for the creator on ${platform}, rooted in the topic, niche, audience, and tone below. Output STRICT JSON, no markdown:

{
  "ideas": [
    {
      "title": "<title under 10 words, scroll-stopping>",
      "hook": "<the first 2 seconds — max 12 words, in language and register that fit the niche + audience>",
      "angle": "<the emotional/psychological angle this taps — one short line>"
    },
    ... 4 more
  ]
}

Mix the 5 across recognition / contrarian / sensory / micro-observation / gut-punch angles 2014 chosen to match the niche in CONTEXT. No generic creator-template lines. No vague motivation.

CONTEXT:
${block}`,
      }
    }

    case 'analyze': {
      const target = ctx?.existing_script || ctx?.description || ctx?.title || '(no script provided)'
      return {
        wantsJson: true,
        user: `Analyze this ${platform} piece through the niche-adaptive viral-psychology lens. Output STRICT JSON in this exact shape — no markdown, JSON only:

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

Max 3 items per array. Each item under 14 words. Be brutally honest. Reward niche-native specificity, punish generic creator-template patterns.

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
        { role: 'system', content: buildSystemPrompt(body.context) },
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
