import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { FREE_OPENAI_CHAT_MODEL } from '@/lib/ai/free-tier'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VISUAL_SUFFIX =
  'Ultra realistic cinematic scene, historically accurate, volumetric lighting, film quality, high detail, epic composition, cinematic color grading, 8k, masterpiece.'

export type VideoScene = {
  sceneNumber: number
  narration: string
  visualPrompt: string
  cameraMovement: string
  duration: string
}

export type VideoGeneratorOutput = {
  title: string
  hook: string
  voiceover: string
  scenes: VideoScene[]
  thumbnailPrompt: string
  captions: string[]
  hashtags: string[]
}

function coerceInput(raw: Record<string, unknown>): { topic: string; isScript: boolean } {
  const script =
    typeof raw.script === 'string' && raw.script.trim().length >= 20
      ? raw.script.trim().slice(0, 12_000)
      : null
  const topic =
    typeof raw.topic === 'string' && raw.topic.trim().length >= 6
      ? raw.topic.trim().slice(0, 2_000)
      : typeof raw.prompt === 'string' && raw.prompt.trim().length >= 6
        ? raw.prompt.trim().slice(0, 2_000)
        : null

  if (script) return { topic: script, isScript: true }
  if (topic) return { topic, isScript: false }
  return { topic: '', isScript: false }
}

function appendVisualSuffix(prompt: string): string {
  const trimmed = prompt.trim()
  if (!trimmed) return VISUAL_SUFFIX
  if (trimmed.toLowerCase().includes('ultra realistic cinematic scene')) return trimmed
  return `${trimmed.replace(/[.\s]+$/, '')}. ${VISUAL_SUFFIX}`
}

function normalizeOutput(raw: unknown, fallbackTopic: string): VideoGeneratorOutput {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const scenesRaw = Array.isArray(data.scenes) ? data.scenes : []

  const scenes: VideoScene[] = scenesRaw.slice(0, 8).map((item, index) => {
    const scene = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    const visualPrompt = appendVisualSuffix(
      typeof scene.visualPrompt === 'string'
        ? scene.visualPrompt
        : typeof scene.visual === 'string'
          ? scene.visual
          : ''
    )
    return {
      sceneNumber:
        typeof scene.sceneNumber === 'number' && scene.sceneNumber > 0
          ? scene.sceneNumber
          : index + 1,
      narration:
        typeof scene.narration === 'string'
          ? scene.narration.trim()
          : typeof scene.description === 'string'
            ? scene.description.trim()
            : '',
      visualPrompt,
      cameraMovement:
        typeof scene.cameraMovement === 'string'
          ? scene.cameraMovement.trim()
          : typeof scene.camera === 'string'
            ? scene.camera.trim()
            : 'Slow cinematic push-in',
      duration:
        typeof scene.duration === 'string'
          ? scene.duration.trim()
          : typeof scene.duration === 'number'
            ? `${scene.duration}s`
            : '4-6s',
    }
  })

  const captions = Array.isArray(data.captions)
    ? data.captions.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    : typeof data.captions === 'string'
      ? data.captions
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
      : []

  const hashtags = Array.isArray(data.hashtags)
    ? data.hashtags.filter((h): h is string => typeof h === 'string' && h.trim().length > 0)
    : typeof data.hashtags === 'string'
      ? data.hashtags
          .split(/[\s,]+/)
          .map((tag) => tag.trim())
          .filter(Boolean)
      : []

  return {
    title:
      typeof data.title === 'string' && data.title.trim()
        ? data.title.trim()
        : fallbackTopic.slice(0, 80),
    hook: typeof data.hook === 'string' ? data.hook.trim() : '',
    voiceover: typeof data.voiceover === 'string' ? data.voiceover.trim() : '',
    scenes,
    thumbnailPrompt:
      typeof data.thumbnailPrompt === 'string'
        ? appendVisualSuffix(data.thumbnailPrompt)
        : typeof data.thumbnail === 'string'
          ? appendVisualSuffix(data.thumbnail)
          : appendVisualSuffix(`Cinematic thumbnail for ${fallbackTopic}`),
    captions,
    hashtags,
  }
}

function buildMockOutput(topic: string): VideoGeneratorOutput {
  const isRome = /ancient rome|rome at its peak/i.test(topic)
  const title = isRome ? 'What Ancient Rome Looked Like At Its Peak' : topic.slice(0, 80)

  const scenes: VideoScene[] = isRome
    ? [
        {
          sceneNumber: 1,
          narration:
            'At its height, Rome was not a ruin — it was the beating heart of an empire. Marble temples caught the morning sun as fifty thousand voices filled the Forum.',
          visualPrompt: appendVisualSuffix(
            'The Roman Forum at golden hour, marble temples, senators in togas, bustling crowds, sun rays through columns'
          ),
          cameraMovement: 'Slow crane rise over the Forum',
          duration: '5s',
        },
        {
          sceneNumber: 2,
          narration:
            'Markets overflowed with grain, spices, and silk from every corner of the known world. Traders shouted in a dozen languages beneath painted awnings.',
          visualPrompt: appendVisualSuffix(
            'Vibrant Roman marketplace, merchants, colorful stalls, amphorae, citizens in tunics, warm Mediterranean light'
          ),
          cameraMovement: 'Tracking shot through market aisles',
          duration: '5s',
        },
        {
          sceneNumber: 3,
          narration:
            'The Colosseum loomed over the city — eighty thousand spectators waiting for the roar of the crowd and the flash of sand beneath gladiators\' feet.',
          visualPrompt: appendVisualSuffix(
            'Exterior of the Colosseum in its prime, massive stone arches, crowds entering, banners, dramatic sky'
          ),
          cameraMovement: 'Wide establishing pan, then slow push-in',
          duration: '6s',
        },
        {
          sceneNumber: 4,
          narration:
            'Aqueducts carved the horizon, delivering fresh water to fountains and baths. Rome was engineered to awe — every arch a statement of power.',
          visualPrompt: appendVisualSuffix(
            'Roman aqueduct spanning green hills, stone arches, workers below, late afternoon golden light'
          ),
          cameraMovement: 'Lateral dolly along aqueduct span',
          duration: '5s',
        },
        {
          sceneNumber: 5,
          narration:
            'This was Rome at its peak — not myth, not legend. A city built to last forever. And somehow, we can still feel its echo.',
          visualPrompt: appendVisualSuffix(
            'Panoramic view of ancient Rome skyline, domes, temples, smoke from hearths, sunset over the Tiber river'
          ),
          cameraMovement: 'Slow aerial pullback revealing full cityscape',
          duration: '6s',
        },
      ]
    : [
        {
          sceneNumber: 1,
          narration: `Most people never see ${title} the way it truly was. Tonight, we walk through it together.`,
          visualPrompt: appendVisualSuffix(`Opening cinematic establishing shot for ${title}`),
          cameraMovement: 'Slow push-in from wide to medium',
          duration: '5s',
        },
        {
          sceneNumber: 2,
          narration: 'Every detail tells a story — the light, the texture, the rhythm of daily life frozen in time.',
          visualPrompt: appendVisualSuffix(`Intimate mid-shot capturing daily life for ${title}`),
          cameraMovement: 'Handheld drift through environment',
          duration: '5s',
        },
        {
          sceneNumber: 3,
          narration: 'The scale is overwhelming. You begin to understand why this moment changed everything.',
          visualPrompt: appendVisualSuffix(`Epic wide composition showcasing scale for ${title}`),
          cameraMovement: 'Crane rise revealing full environment',
          duration: '6s',
        },
        {
          sceneNumber: 4,
          narration: 'And as the light fades, one truth remains — history is never as distant as we think.',
          visualPrompt: appendVisualSuffix(`Closing golden-hour cinematic frame for ${title}`),
          cameraMovement: 'Slow pull back to silhouette',
          duration: '5s',
        },
      ]

  const voiceover = scenes.map((s) => s.narration).join('\n\n')

  return {
    title,
    hook: isRome
      ? 'Rome wasn\'t built in a day — but at its peak, it looked like it was built to last forever.'
      : `What if you could walk through ${title} — and see it exactly as it was?`,
    voiceover,
    scenes,
    thumbnailPrompt: appendVisualSuffix(
      isRome
        ? 'Dramatic Roman Colosseum at sunset, epic scale, cinematic lighting, bold title-safe composition'
        : `Cinematic thumbnail for ${title}, dramatic lighting, bold composition, scroll-stopping visual`
    ),
    captions: isRome
      ? [
          'Rome at its peak was unlike anything on Earth.',
          'Fifty thousand voices. One Forum. Infinite ambition.',
          'This is what power looked like — in stone.',
        ]
      : [
          `The story of ${title} — told frame by frame.`,
          'History hits different when you can see it.',
          'Save this before it disappears from your feed.',
        ],
    hashtags: isRome
      ? ['#AncientRome', '#History', '#Cinematic', '#Documentary', '#Shorts']
      : ['#Cinematic', '#History', '#Storytelling', '#Reels', '#Documentary'],
  }
}

function buildSystemPrompt(isScript: boolean): string {
  return `You are Mugtee AI — a cinematic short-form video architect for creators on YouTube Shorts, Instagram Reels, and TikTok.

Your job: transform ${isScript ? 'a creator script' : 'a topic or idea'} into a retention-optimized cinematic video package.

RULES:
- Hook must stop the scroll in under 3 seconds — curiosity, tension, or awe. No quote spam, no cliché openers.
- Voiceover is the full spoken narration (60-90 seconds when read aloud), emotionally paced, documentary-cinematic tone.
- Produce exactly 4-5 scenes. Each scene = one visual beat with distinct location/moment.
- Narration per scene: 1-3 sentences, vivid, spoken-word ready.
- visualPrompt: describe ONLY the visual (location, subjects, lighting, era). Do NOT repeat the suffix — it is appended server-side.
- cameraMovement: specific cinematic move (dolly, crane, push-in, tracking, aerial, etc.).
- duration: estimated screen time like "4-6s" or "5s".
- thumbnailPrompt: scroll-stopping hero frame, title-safe composition.
- captions: 3-5 short on-screen caption lines (not full narration).
- hashtags: 5-8 relevant tags with # prefix.

Think like a filmmaker AND a retention editor. Avoid robotic AI language.

Return ONLY valid JSON matching this schema:
{
  "title": "string",
  "hook": "string",
  "voiceover": "string",
  "scenes": [{
    "sceneNumber": 1,
    "narration": "string",
    "visualPrompt": "string",
    "cameraMovement": "string",
    "duration": "string"
  }],
  "thumbnailPrompt": "string",
  "captions": ["string"],
  "hashtags": ["string"]
}`
}

function buildUserPrompt(topic: string, isScript: boolean): string {
  if (isScript) {
    return `Adapt this creator script into a cinematic video package with hook, voiceover, 4-5 storyboard scenes, thumbnail, captions, and hashtags:

---
${topic}
---`
  }
  return `Create a cinematic video package for this topic:

"${topic}"`
}

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 })
    }

    const { topic, isScript } = coerceInput(raw)
    if (topic.length < 6) {
      return NextResponse.json(
        { error: 'Provide a topic (6+ chars) or script (20+ chars)' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json({
        ...buildMockOutput(topic),
        mock: true,
        reason: 'missing_api_key',
      })
    }

    try {
      const openai = getOpenAIClient()
      const completion = await openai.chat.completions.create({
        model: FREE_OPENAI_CHAT_MODEL,
        temperature: 0.85,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSystemPrompt(isScript) },
          { role: 'user', content: buildUserPrompt(topic, isScript) },
        ],
      })

      const content = completion.choices[0]?.message?.content ?? '{}'
      const parsed = JSON.parse(content) as unknown
      const output = normalizeOutput(parsed, topic)

      if (output.scenes.length < 1) {
        return NextResponse.json({
          ...buildMockOutput(topic),
          mock: true,
          reason: 'empty_scenes_fallback',
        })
      }

      if (!output.voiceover && output.scenes.length > 0) {
        output.voiceover = output.scenes.map((s) => s.narration).join('\n\n')
      }

      return NextResponse.json(output)
    } catch (err) {
      console.error('[video-generator] OpenAI error:', err)
      return NextResponse.json({
        ...buildMockOutput(topic),
        mock: true,
        reason: 'provider_fallback',
      })
    }
  } catch (err) {
    console.error('[video-generator] exception:', err)
    return NextResponse.json({ error: 'Video package generation failed' }, { status: 500 })
  }
}
