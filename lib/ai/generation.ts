// Phase 7A — Viral Content Generation (Lightweight, gpt-4o-mini via Emergent)
// Minimal service: script generator + hook generator + caption generator.
// No orchestration, no memory, no providers. Direct LLM calls.

const API_KEY = process.env.EMERGENT_LLM_KEY || process.env.OPENAI_API_KEY
const API_BASE = process.env.EMERGENT_API_BASE || 'https://api.openai.com/v1'

type GenerationRequest = {
  prompt: string
  model?: string
  max_tokens?: number
  temperature?: number
}

type GenerationResponse = {
  choices: Array<{ message: { content: string } }>
}

async function callLLM(request: GenerationRequest): Promise<string> {
  if (!API_KEY) throw new Error('LLM API key not configured (EMERGENT_LLM_KEY or OPENAI_API_KEY)')

  const body = {
    model: request.model || 'gpt-4o-mini',
    messages: [{ role: 'user', content: request.prompt }],
    max_tokens: request.max_tokens || 800,
    temperature: request.temperature ?? 0.8,
  }

  try {
    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`LLM API error: ${res.status} — ${err?.error?.message || 'Unknown error'}`)
    }

    const data = (await res.json()) as GenerationResponse
    return data.choices[0]?.message?.content || ''
  } catch (e: any) {
    throw new Error(`Generation failed: ${e?.message || 'Network error'}`)
  }
}

// =====================================================================
// VIRAL REEL SCRIPT — Emotionally sharp, hook-first, creator-ready
// =====================================================================
export async function generateViralScript(topic: string): Promise<string> {
  const prompt = `You are a cinematic scriptwriter for short-form viral reels (Instagram Reels, YouTube Shorts).

TOPIC: "${topic.trim()}"

Write a 60-90 second reel script that:
1. Opens with an emotionally sharp HOOK (first 3 seconds) that stops the scroll
2. Maintains emotional momentum through pacing beats
3. Ends with a payoff or retention moment
4. Uses cinematic language (visual + audio beats)
5. Is creator-first (one person, intimate, honest)

Format:
[HOOK — 0-3s]
(2-3 sentences that stop the scroll)

[PACING — 3-30s]
(Key story beats, emotional turns, visual directions)

[PAYOFF — 30-60s]
(Climax, resolution, or call to action)

Output ONLY the script. No explanations, no metadata.`

  return await callLLM({
    prompt,
    max_tokens: 600,
    temperature: 0.85,
  })
}

// =====================================================================
// HOOK GENERATOR — Viral opening lines (5 variants)
// =====================================================================
export async function generateHooks(topic: string, count: number = 5): Promise<string[]> {
  const prompt = `You are a hook genius for short-form video. Generate ${count} viral opening lines for this topic:

TOPIC: "${topic.trim()}"

Requirements:
- Each hook is 1-2 sentences max
- Emotionally arresting (curiosity, urgency, relatability, or surprise)
- Creator-first perspective
- Optimized for Instagram Reels / YouTube Shorts
- No hashtags, no emojis, just copy

Output format (one per line):
1. [Hook text]
2. [Hook text]
3. [Hook text]
...

Output ONLY the numbered list. No explanations.`

  const response = await callLLM({
    prompt,
    max_tokens: 400,
    temperature: 0.9,
  })

  return response
    .split('\n')
    .filter((line) => line.trim().match(/^\d+\./))
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)
}

// =====================================================================
// CAPTION GENERATOR — Engaging captions for posts (3 variants)
// =====================================================================
export async function generateCaptions(content: string, count: number = 3): Promise<string[]> {
  const prompt = `You are a social media caption expert. Generate ${count} engaging captions for this content:

CONTENT: "${content.trim()}"

Requirements:
- Each caption is 1-3 sentences
- Emotionally resonant (vulnerable, funny, insightful, or celebratory)
- Includes a micro-call-to-action or question (not pushy)
- Creator-authentic voice
- Short-form optimized (read fast, feel fast)

Output format (one per line, separated by ---|---):
[Caption 1]
---|---
[Caption 2]
---|---
[Caption 3]

Output ONLY the captions with separators. No explanations.`

  const response = await callLLM({
    prompt,
    max_tokens: 400,
    temperature: 0.85,
  })

  return response
    .split('---|---')
    .map((cap) => cap.trim())
    .filter(Boolean)
}
