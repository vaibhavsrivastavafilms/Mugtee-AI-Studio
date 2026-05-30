import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateSceneImages } from '@/lib/cinematic/generate-scene-images'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { VirloMetadata } from '@/lib/virlo-engine/types'
import { parseVisualStyle } from '@/lib/cinematic/workflow-state'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const scenes = Array.isArray(raw?.scenes) ? (raw.scenes as GeneratedScene[]) : []
    if (scenes.length === 0) {
      return NextResponse.json({ error: 'scenes array required' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const sceneIds = Array.isArray(raw?.sceneIds)
      ? (raw.sceneIds as string[]).filter((id) => typeof id === 'string')
      : undefined

    const referenceStyleNote =
      typeof raw?.referenceStyleNote === 'string'
        ? raw.referenceStyleNote
        : typeof raw?.imageNote === 'string'
          ? raw.imageNote
          : undefined

    const result = await generateSceneImages({
      scenes,
      characterDescription:
        typeof raw?.characterDescription === 'string'
          ? raw.characterDescription
          : undefined,
      niche: typeof raw?.niche === 'string' ? raw.niche : undefined,
      virlo:
        raw?.virlo && typeof raw.virlo === 'object'
          ? (raw.virlo as VirloMetadata)
          : undefined,
      style: typeof raw?.style === 'string' ? raw.style : undefined,
      visualStyle: parseVisualStyle(raw?.visualStyle),
      hook: typeof raw?.hook === 'string' ? raw.hook : undefined,
      script: typeof raw?.script === 'string' ? raw.script : undefined,
      sceneIds: sceneIds?.length ? sceneIds : undefined,
      variation: raw?.variation === true,
      diversityAttempt:
        typeof raw?.diversityAttempt === 'number' ? raw.diversityAttempt : 0,
      userId: user?.id,
      hasReferenceStyle:
        raw?.hasReferenceStyle === true || Boolean(referenceStyleNote?.trim()),
      referenceStyleNote,
    })

    return NextResponse.json({
      scenes: result.scenes,
      mock: result.mock,
      characterDescription: result.characterDescription,
      ...(result.degradedSceneIds?.length
        ? {
            degraded: true,
            degradedSceneIds: result.degradedSceneIds,
            imageFailures: result.imageFailures,
            warning:
              'Some scenes used placeholder images because all configured image providers failed. Check server logs for provider details.',
          }
        : {}),
    })
  } catch (err) {
    logError('generate-images', err)
    return NextResponse.json({ error: 'Image generation paused' }, { status: 500 })
  }
}
