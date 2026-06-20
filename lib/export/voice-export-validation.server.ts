import 'server-only'

import type { CinematicProjectRow } from '@/lib/cinematic-projects'
import { loadProjectAssetCounts } from '@/lib/export/export-readiness.server'
import { extractStoragePathFromUrl } from '@/lib/storyboard/storyboard-asset'
import {
  refreshStoryboardUrl,
  storyboardStorageExists,
} from '@/lib/storyboard/storyboard-url-service.server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type VoiceTracePayload = {
  projectId: string
  audioAssetPath: string | null
  narrationUrl: string | null
  uploadStatus: string
  persisted: boolean
  exportPayloadNarrationUrl: string | null
}

export function logVoiceTrace(payload: VoiceTracePayload): void {
  console.log('[VOICE_TRACE]', JSON.stringify(payload))
}

async function latestVoiceoverStoragePath(
  projectId: string,
  userId: string
): Promise<string | null> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('project_assets')
    .select('storage_path, url')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('kind', 'voiceover')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const fromPath = data?.storage_path?.trim()
  if (fromPath) return fromPath
  return extractStoragePathFromUrl(data?.url ?? null)
}

function voiceAssetPathFromRow(row: CinematicProjectRow): string | null {
  const voice = row.voice as { audioAssetPath?: string | null; storagePath?: string | null } | null
  const explicit = voice?.audioAssetPath?.trim() || voice?.storagePath?.trim()
  if (explicit) return explicit
  return extractStoragePathFromUrl(row.voice?.audioUrl ?? null)
}

async function assetReachable(url: string): Promise<boolean> {
  if (!url?.trim()) return false
  if (url.startsWith('data:')) return true
  try {
    const getRes = await fetch(url, {
      headers: { Range: 'bytes=0-0' },
      signal: AbortSignal.timeout(20_000),
    })
    if (getRes.ok || getRes.status === 206) return true
    const headRes = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(15_000),
    })
    return headRes.ok || headRes.status === 405
  } catch {
    return false
  }
}

async function persistVoiceUrl(
  row: CinematicProjectRow,
  userId: string,
  voiceUrl: string,
  audioAssetPath: string | null
): Promise<boolean> {
  const supabase = createSupabaseServerClient()
  const nextVoice = {
    ...(row.voice ?? {}),
    audioUrl: voiceUrl,
    ...(audioAssetPath ? { audioAssetPath } : {}),
  }
  const { error } = await supabase
    .from('cinematic_projects')
    .update({ voice: nextVoice, updated_at: new Date().toISOString() })
    .eq('id', row.id)
    .eq('user_id', userId)
  return !error
}

/** Storage path is source of truth ΓÇö refresh narration URL when missing or stale. */
export async function ensureVoiceExportUrl(params: {
  row: CinematicProjectRow
  userId: string
  includeVoiceover: boolean
  exportPayloadNarrationUrl?: string | null
}): Promise<{
  row: CinematicProjectRow
  voiceUrl: string | null
  audioAssetPath: string | null
  uploadStatus: string
  persisted: boolean
}> {
  const projectId = params.row.id
  const narrationUrl = params.row.voice?.audioUrl?.trim() ?? null
  let audioAssetPath =
    voiceAssetPathFromRow(params.row) ??
    (await latestVoiceoverStoragePath(projectId, params.userId))

  if (!audioAssetPath && params.includeVoiceover) {
    const counts = await loadProjectAssetCounts(projectId, params.userId)
    if (counts.voiceoverCount > 0) {
      audioAssetPath = await latestVoiceoverStoragePath(projectId, params.userId)
    }
  }

  const uploadStatus = audioAssetPath
    ? (await storyboardStorageExists(audioAssetPath))
      ? 'stored'
      : 'path_missing_in_storage'
    : narrationUrl
      ? 'url_only'
      : 'missing'

  logVoiceTrace({
    projectId,
    audioAssetPath,
    narrationUrl,
    uploadStatus,
    persisted: Boolean(narrationUrl),
    exportPayloadNarrationUrl: params.exportPayloadNarrationUrl?.trim() ?? null,
  })

  if (!params.includeVoiceover) {
    return {
      row: params.row,
      voiceUrl: null,
      audioAssetPath,
      uploadStatus,
      persisted: Boolean(narrationUrl),
    }
  }

  let voiceUrl = narrationUrl
  const needsRefresh = Boolean(
    audioAssetPath && (!voiceUrl || !(await assetReachable(voiceUrl)))
  )

  if (needsRefresh && audioAssetPath) {
    const freshNarrationUrl = await refreshStoryboardUrl(audioAssetPath)
    console.log(
      '[VOICE_ASSET_REFRESH]',
      JSON.stringify({ audioAssetPath, freshNarrationUrl: freshNarrationUrl ?? null })
    )
    if (freshNarrationUrl) {
      voiceUrl = freshNarrationUrl
      const persisted = await persistVoiceUrl(params.row, params.userId, voiceUrl, audioAssetPath)
      const nextRow: CinematicProjectRow = {
        ...params.row,
        voice: {
          ...(params.row.voice ?? {}),
          audioUrl: voiceUrl,
          ...(audioAssetPath ? { audioAssetPath } : {}),
        },
      }
      logVoiceTrace({
        projectId,
        audioAssetPath,
        narrationUrl: voiceUrl,
        uploadStatus: 'refreshed',
        persisted,
        exportPayloadNarrationUrl: params.exportPayloadNarrationUrl?.trim() ?? null,
      })
      return {
        row: nextRow,
        voiceUrl,
        audioAssetPath,
        uploadStatus: 'refreshed',
        persisted,
      }
    }
  }

  return {
    row: params.row,
    voiceUrl,
    audioAssetPath,
    uploadStatus,
    persisted: Boolean(voiceUrl),
  }
}
