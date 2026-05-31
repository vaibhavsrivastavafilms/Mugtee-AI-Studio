import { NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import {
  buildRewriteSystemPrompt,
  buildRewriteUserPrompt,
} from '@/lib/rewrite/rewrite-prompts'
import type { RewriteContentType, RewriteVariant } from '@/lib/rewrite/rewrite-actions'
import type { StoryBible } from '@/lib/cinematic/story-bible'

export type RewriteRequestBody = {
  selectedText?: string
  contentType?: RewriteContentType
  rewriteAction?: RewriteVariant
  projectNiche?: string
  storyBible?: StoryBible | null
  language?: string
  /** Legacy aliases */
  selection?: string
  rewrite_variant?: RewriteVariant
  content_type?: RewriteContentType
  niche?: string
  full_script?: string
  title?: string
  platform?: string
  tone?: string
}

export async function POST(req: Request) {
  try {
    const body: RewriteRequestBody = await req.json()

    const selection = String(body.selectedText ?? body.selection ?? '').trim()
    const variant = (body.rewriteAction ?? body.rewrite_variant ?? 'more_viral') as RewriteVariant
    const contentType = (body.contentType ?? body.content_type) as RewriteContentType | undefined
    const niche = body.projectNiche ?? body.niche

    if (!selection) {
      return NextResponse.json({ error: 'selectedText is required' }, { status: 400 })
    }

    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.85,
      messages: [
        { role: 'system', content: buildRewriteSystemPrompt({ language: body.language, niche }) },
        {
          role: 'user',
          content: buildRewriteUserPrompt({
            selection,
            variant,
            contentType,
            fullScript: body.full_script,
            title: body.title,
            platform: body.platform,
            niche,
            tone: body.tone,
            storyBible: body.storyBible,
            language: body.language,
          }),
        },
      ],
    })

    const rewrittenText = completion.choices[0]?.message?.content?.trim() || ''
    if (!rewrittenText) {
      return NextResponse.json({ error: 'Empty rewrite returned' }, { status: 502 })
    }

    return NextResponse.json({ rewrittenText, output: rewrittenText })
  } catch (error) {
    console.error('[rewrite]', error)
    return NextResponse.json({ error: 'Rewrite failed' }, { status: 500 })
  }
}
