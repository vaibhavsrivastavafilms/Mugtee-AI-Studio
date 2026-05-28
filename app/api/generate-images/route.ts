import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  buildSceneImagePrompt,
  type GeneratedScene,
} from '@/lib/cinematic/generation'
import { placeholderSceneImageUrl } from '@/lib/cinematic/scene-preview-url'
import {
  generateOpenAISceneImage,
  hasImageGenerationKey,
  persistRemoteImage,
} from '@/lib/ai/generate-scene-image'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function sceneImagePrompt(scene: GeneratedScene): string {
  const beat =
    scene.imagePrompt?.trim() || buildSceneImagePrompt(scene)
  return [
    'Vertical 9:16 cinematic still, no text, no watermark.',
    beat,
  ]
    .filter(Boolean)
    .join(' ')
}

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const scenes = Array.isArray(raw?.scenes) ? (raw.scenes as GeneratedScene[]) : []
    if (scenes.length === 0) {
      return NextResponse.json({ error: 'scenes array required' }, { status: 400 })
    }

    const canGenerate = hasImageGenerationKey()
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const updated: GeneratedScene[] = []
    let anyMock = !canGenerate

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i] as GeneratedScene
      const prompt = sceneImagePrompt(scene)
      let imageUrl: string | null = null

      if (process.env.OPENAI_API_KEY?.trim()) {
        const remoteUrl = await generateOpenAISceneImage(prompt)
        if (remoteUrl) {
          const filename = user
            ? `${user.id}/faceless/scene_${i}_${Date.now()}.png`
            : `anon/faceless/scene_${i}_${Date.now()}.png`
          imageUrl = await persistRemoteImage({
            remoteUrl,
            userId: user?.id,
            filename,
          })
        }
      }

      if (!imageUrl) {
        imageUrl = placeholderSceneImageUrl(scene, i)
        anyMock = true
      }

      updated.push({ ...scene, imageUrl })
    }

    return NextResponse.json({ scenes: updated, mock: anyMock })
  } catch (err) {
    logError('generate-images', err)
    return NextResponse.json({ error: 'Image generation paused' }, { status: 500 })
  }
}
