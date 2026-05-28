import { NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/ai/openai-client'

type GenerateRequest = {
  idea: string
  platform: string
  tone: string
  niche: string
}

export async function POST(req: Request) {
  try {
    const body: GenerateRequest =
      await req.json()

    const {
      idea,
      platform,
      tone,
      niche,
    } = body

    // Validation
    if (!idea?.trim()) {
      return NextResponse.json(
        {
          error:
            'Idea is required',
        },
        {
          status: 400,
        }
      )
    }

    // Cinematic Mugtee Prompt
    const prompt = `
You are Mugtee AI.

Mugtee is a cinematic AI creator platform designed for:
- filmmakers
- YouTubers
- storytellers
- short-form creators
- cinematic brands

Your job:
Transform creator ideas into emotionally cinematic creator-ready outputs.

The output should feel:
- premium
- emotional
- visually cinematic
- creator-native
- social-first
- high-retention

Creator Idea:
"${idea}"

Platform:
"${platform}"

Tone:
"${tone}"

Niche:
"${niche}"

Generate these sections:

1. Hook
- powerful opening
- emotionally engaging
- curiosity-driven
- optimized for short-form retention

2. Script
- cinematic pacing
- emotional storytelling
- scene-by-scene flow
- narration style
- visual moments
- creator-ready

3. Storyboard
- shot-by-shot visual sequence
- camera angles
- lighting
- transitions
- cinematic framing

4. Captions
- viral creator captions
- emotionally engaging
- platform optimized
- concise but impactful

5. Thumbnail Concept
- cinematic visual concept
- emotional facial expression
- dramatic lighting
- composition details
- viral thumbnail psychology

IMPORTANT:
- Avoid robotic AI language
- Avoid generic outputs
- Think like a filmmaker
- Think like a creator
- Make the story emotionally compelling
- Add tension, curiosity and pacing

Return ONLY valid JSON.

JSON format:

{
  "hook": "...",
  "script": "...",
  "storyboard": "...",
  "captions": "...",
  "thumbnail": "..."
}
`

    const openai = getOpenAIClient()
    const completion =
      await openai.chat.completions.create({
        model: 'gpt-4.1-mini',

        temperature: 0.9,

        response_format: {
          type: 'json_object',
        },

        messages: [
          {
            role: 'system',
            content:
              'You are Mugtee AI, a cinematic storytelling assistant for creators.',
          },

          {
            role: 'user',
            content: prompt,
          },
        ],
      })

    const content =
      completion.choices[0]?.message
        ?.content || '{}'

    const parsed = JSON.parse(content)

    return NextResponse.json({
      hook:
        parsed.hook ||
        'No hook generated',

      script:
        parsed.script ||
        'No script generated',

      storyboard:
        parsed.storyboard ||
        'No storyboard generated',

      captions:
        parsed.captions ||
        'No captions generated',

      thumbnail:
        parsed.thumbnail ||
        'No thumbnail generated',
    })
  } catch (error) {
    console.error(
      'Mugtee AI Error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Failed to generate cinematic content',
      },
      {
        status: 500,
      }
    )
  }
}