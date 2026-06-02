import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateSceneImages } from '@/lib/cinematic/generate-scene-images'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { VirloMetadata } from '@/lib/virlo-engine/types'
import { parseVisualStyle } from '@/lib/cinematic/workflow-state'
import { parseStoryBible } from '@/lib/cinematic/story-bible'
import { normalizeContentBrief } from '@/lib/content-director/content-brief'
import {
  parseOutputAlignmentControls,
  parseSceneBlueprints,
} from '@/lib/cinematic/scene-blueprint'
import { parseVisualBible } from '@/lib/cinematic/visual-bible'
import { logError } from '@/lib/workspace/validation'
import {
  FeatureUsageFeatures,
  parseFeatureUsageProjectId,
  trackFeatureUsage,
} from '@/lib/analytics/feature-usage'
import { Mp4ExportEvents } from '@/lib/analytics/mp4-export-events'
import { trackMp4ExportServer } from '@/lib/analytics/mp4-export-track.server'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'
import {
  IMAGE_GENERATION_UNAVAILABLE,
  IMAGE_GENERATION_UNAVAILABLE_MESSAGE,
  ImageGenerationUnavailableError,
} from '@/lib/ai/image-provider-errors'

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
    if (user) {
      const blocked = await guardUsageLimit(user.id, 'generations')
      if (blocked) return blocked
    }

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
      storyBible: parseStoryBible(raw?.storyBible),
      contentBrief: normalizeContentBrief(raw?.contentBrief ?? raw?.content_brief) ?? undefined,
      sceneBlueprints: parseSceneBlueprints(raw?.sceneBlueprints ?? raw?.scene_blueprints),
      visualBible: parseVisualBible(raw?.visualBible ?? raw?.visual_bible),
      outputAlignmentControls: parseOutputAlignmentControls(
        raw?.outputAlignmentControls ?? raw?.output_alignment_controls
      ),
    })

    if (user) {
      await trackUsageMetric(user.id, 'generations')
      void trackFeatureUsage(
        user.id,
        FeatureUsageFeatures.IMAGE_GENERATION,
        parseFeatureUsageProjectId(raw)
      )
    }

    if (result.duplicateImageWarnings?.length) {
      console.warn('[generate-images] duplicate scene image URLs', result.duplicateImageWarnings)
    }
    if (result.duplicatePromptSceneIds?.length) {
      console.warn('[generate-images] duplicate image prompts', result.duplicatePromptSceneIds)
    }

    if (user) {
      const withImages = result.scenes.filter((s) => s.imageUrl?.trim()).length
      void trackMp4ExportServer({
        event: Mp4ExportEvents.STORYBOARD_GENERATED,
        userId: user.id,
        page: '/api/generate-images',
        metadata: {
          projectId: parseFeatureUsageProjectId(raw),
          scene_count: result.scenes.length,
          images_count: withImages,
        },
      })
    }

    return NextResponse.json({
      scenes: result.scenes,
      mock: result.mock,
      characterDescription: result.characterDescription,
      ...(result.duplicateImageWarnings?.length
        ? { duplicateImageWarnings: result.duplicateImageWarnings }
        : {}),
      ...(result.retriedSceneIds?.length ? { retriedSceneIds: result.retriedSceneIds } : {}),
      ...(result.duplicatePromptSceneIds?.length
        ? { duplicatePromptSceneIds: result.duplicatePromptSceneIds }
        : {}),
      ...(result.alignmentResults?.length
        ? { alignmentResults: result.alignmentResults }
        : {}),
      ...(result.sequenceCoherence
        ? { sequenceCoherence: result.sequenceCoherence }
        : {}),
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
    if (err instanceof ImageGenerationUnavailableError) {
      return NextResponse.json(
        {
          error: IMAGE_GENERATION_UNAVAILABLE,
          message: err.message || IMAGE_GENERATION_UNAVAILABLE_MESSAGE,
        },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: 'Image generation paused' }, { status: 500 })
  }
}
