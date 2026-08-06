import 'server-only'

import { runExportInBackground } from '@/lib/export/export-background.server'
import { orchestrateRemotionReel } from '@/lib/video/orchestrate-remotion-reel'
import { getV3Project, updateV3Project, upsertV3Job } from '@/lib/v3/db.server'
import { buildV3RenderBundle } from '@/lib/v3/render-bridge.server'
import { resolveMvpRoyaltyFreeMusicUrl } from '@/lib/v3/music.server'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'
import { captureException } from '@/lib/monitoring/observability.server'
import type { SupabaseServerClient } from '@/lib/supabase/server'

export type ExecuteV3ExportResult = {
  reelUrl: string
  durationMs: number
  mock: boolean
}

export async function executeV3Export(params: {
  supabase: SupabaseServerClient
  projectId: string
  userId: string
}): Promise<ExecuteV3ExportResult> {
  const started = Date.now()

  const renderBlocked = await guardUsageLimit(params.userId, 'renders')
  if (renderBlocked) {
    const body = (await renderBlocked.json()) as { error?: string }
    throw new Error(body.error ?? 'Render limit reached')
  }

  const snapshot = await getV3Project(params.supabase, params.projectId, params.userId)
  if (!snapshot) throw new Error('Project not found')

  if (snapshot.project.reel_url) {
    return {
      reelUrl: snapshot.project.reel_url,
      durationMs: Date.now() - started,
      mock: false,
    }
  }

  const voiceUrl = snapshot.project.voice_url
  if (!voiceUrl) {
    throw new Error('Voice narration missing — cannot export')
  }

  const musicUrl = resolveMvpRoyaltyFreeMusicUrl()

  await updateV3Project(params.supabase, params.projectId, params.userId, {
    export_status: 'rendering',
    music_url: musicUrl,
  })

  const bundle = buildV3RenderBundle({ snapshot, voiceUrl })

  const result = await orchestrateRemotionReel(bundle.renderInput, {
    jobId: `v3-export-${params.projectId}`,
    musicUrl,
    onProgress: async (percent, stage, label) => {
      await upsertV3Job(params.supabase, {
        projectId: params.projectId,
        agent: 'export',
        status: 'running',
        output: { percent, stage, label },
      })
    },
  })

  if (!result.videoUrl) {
    throw new Error('Export did not produce an MP4')
  }

  await updateV3Project(params.supabase, params.projectId, params.userId, {
    reel_url: result.videoUrl,
    export_status: 'completed',
    status: 'completed',
    current_stage: 'export',
  })

  await upsertV3Job(params.supabase, {
    projectId: params.projectId,
    agent: 'export',
    status: 'completed',
    output: {
      reelUrl: result.videoUrl,
      durationMs: Date.now() - started,
      mock: Boolean(result.mock),
    },
  })

  await trackUsageMetric(params.userId, 'renders')
  await trackUsageMetric(params.userId, 'exports')

  return {
    reelUrl: result.videoUrl,
    durationMs: Date.now() - started,
    mock: Boolean(result.mock),
  }
}

export function startV3ExportInBackground(params: {
  supabase: SupabaseServerClient
  projectId: string
  userId: string
}): void {
  runExportInBackground(async () => {
    try {
      await executeV3Export(params)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed'
      captureException(err, {
        projectId: params.projectId,
        userId: params.userId,
        stage: 'export',
      })
      await updateV3Project(params.supabase, params.projectId, params.userId, {
        export_status: 'failed',
        status: 'failed',
        current_stage: 'export',
      })
      await upsertV3Job(params.supabase, {
        projectId: params.projectId,
        agent: 'export',
        status: 'failed',
        error: message,
      })
    }
  })
}
