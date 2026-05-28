import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  generateOpenAISceneImage,
  hasImageGenerationKey,
  persistRemoteImage,
} from '@/lib/ai/generate-scene-image'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

function buildThumbnailPrompt(input: {
  title?: string
  hook?: string
  script?: string
  thumbnailIdea?: string
}): string {
  const title = (input.title || '').trim()
  const hook = (input.hook || '').trim()
  const script = (input.script || '').trim().slice(0, 400)
  const idea = (input.thumbnailIdea || '').trim()

  const context = [
    title ? `Project: ${title}` : '',
    hook ? `Hook: ${hook}` : '',
    script ? `Story excerpt: ${script}` : '',
    idea ? `Thumbnail direction: ${idea}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return [
    'YouTube / Short-form viral thumbnail frame. Ultra high detail, cinematic lighting, emotional face or symbolic focal subject, strong contrast, scroll-stopping composition.',
    '16:9 landscape thumbnail safe framing. No text, no logos, no watermarks, no UI.',
    'Moody gold and deep shadow palette, premium film still aesthetic.',
    context,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const title = String(body?.title || '').trim()
    const hook = String(body?.hook || '').trim()
    const script = String(body?.script || '').trim()
    const thumbnailIdea = String(body?.thumbnailIdea || '').trim()

    if (!title && !hook && !script && !thumbnailIdea) {
      return NextResponse.json(
        { error: 'Provide title, hook, script, or thumbnail idea for context' },
        { status: 400 }
      )
    }

    if (!hasImageGenerationKey()) {
      return NextResponse.json({ error: 'Image generation not configured' }, { status: 503 })
    }

    const prompt = buildThumbnailPrompt({ title, hook, script, thumbnailIdea })
    const remoteUrl = await generateOpenAISceneImage(prompt, {
      quality: 'hd',
      size: '1792x1024',
    })

    if (!remoteUrl) {
      return NextResponse.json({ error: 'Thumbnail generation failed' }, { status: 502 })
    }

    const filename = `${user.id}/thumbnails/thumb_${Date.now()}.png`
    const url = await persistRemoteImage({
      remoteUrl,
      userId: user.id,
      filename,
    })

    return NextResponse.json({ url, mock: false })
  } catch (err) {
    logError('workspace.thumbnail', err)
    return NextResponse.json({ error: 'Thumbnail generation paused' }, { status: 500 })
  }
}
