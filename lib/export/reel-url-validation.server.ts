import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { REEL_BUCKET } from '@/lib/video/reel-storage-upload'
import { exportLog } from '@/lib/export/export-log.server'
import {
  isValidReelDownloadUrl,
  type ReelFileVerification,
} from '@/lib/export/reel-url-validation'

const VERIFY_TIMEOUT_MS = 12_000

async function headCheck(url: string): Promise<ReelFileVerification> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` }
    }
    const lenHeader = res.headers.get('content-length')
    if (lenHeader !== null) {
      const size = Number.parseInt(lenHeader, 10)
      if (!Number.isFinite(size) || size <= 0) {
        return { ok: false, error: 'empty file' }
      }
      return { ok: true, size }
    }
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'HEAD request failed'
    return { ok: false, error: message }
  } finally {
    clearTimeout(timer)
  }
}

async function rangeCheck(url: string): Promise<ReelFileVerification> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!res.ok && res.status !== 206) {
      return { ok: false, error: `HTTP ${res.status}` }
    }
    const lenHeader = res.headers.get('content-range') ?? res.headers.get('content-length')
    if (lenHeader?.includes('/')) {
      const total = Number.parseInt(lenHeader.split('/')[1] ?? '', 10)
      if (Number.isFinite(total) && total <= 0) {
        return { ok: false, error: 'empty file' }
      }
      if (Number.isFinite(total)) return { ok: true, size: total }
    }
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'range request failed'
    return { ok: false, error: message }
  } finally {
    clearTimeout(timer)
  }
}

async function storageFallback(projectId: string): Promise<ReelFileVerification> {
  const supabase = createSupabaseServerClient()
  const storagePath = `${projectId}/final-reel.mp4`
  const { data, error } = await supabase.storage.from(REEL_BUCKET).download(storagePath)
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'storage download failed' }
  }
  const size = data.size
  if (size <= 0) return { ok: false, error: 'empty file' }
  return { ok: true, size }
}

/** Server-side verification that a reel file exists and is non-empty. */
export async function verifyReelFileExists(
  url: string | null | undefined,
  projectId?: string | null
): Promise<ReelFileVerification> {
  if (!isValidReelDownloadUrl(url)) {
    return { ok: false, error: 'invalid url' }
  }

  const trimmed = url!.trim()
  let result = await headCheck(trimmed)
  if (!result.ok) {
    result = await rangeCheck(trimmed)
  }

  if (result.ok) return result

  if (projectId?.trim()) {
    exportLog.error('verify url', result.error ?? 'unreachable', { projectId })
    const fallback = await storageFallback(projectId.trim())
    if (fallback.ok) return fallback
  }

  return result
}
