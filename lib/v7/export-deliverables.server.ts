import 'server-only'

import fs from 'fs/promises'
import os from 'os'
import path from 'path'

import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { runFfmpeg } from '@/lib/video/render-pipeline'
import { isFfmpegAvailable } from '@/lib/video/ffmpeg-path.server'
import { REEL_BUCKET } from '@/lib/video/reel-storage-upload'
import type { V7ProductionSnapshot } from '@/types/v7/production'

export type V7ExportDeliverables = {
  movUrl: string | null
  thumbnailUrl: string | null
  creatorPackUrl: string | null
  durationMs: number
}

async function downloadToBuffer(url: string): Promise<Buffer> {
  if (url.startsWith('data:')) {
    const comma = url.indexOf(',')
    const payload = comma >= 0 ? url.slice(comma + 1) : url
    return Buffer.from(payload, 'base64')
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed (${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

async function resolveExportStorageClient() {
  return createSupabaseServiceClient() ?? (await createSupabaseServerClient())
}

async function uploadBuffer(params: {
  bucket: string
  storagePath: string
  buffer: Buffer
  contentType: string
}): Promise<string> {
  const supabase = await resolveExportStorageClient()
  const { error } = await supabase.storage.from(params.bucket).upload(params.storagePath, params.buffer, {
    contentType: params.contentType,
    upsert: true,
  })
  if (error) throw new Error(error.message)
  const { data: pub } = supabase.storage.from(params.bucket).getPublicUrl(params.storagePath)
  return pub.publicUrl
}

async function remuxMp4ToMov(localMp4: string, localMov: string): Promise<void> {
  await runFfmpeg(
    ['-y', '-i', localMp4, '-c', 'copy', '-movflags', '+faststart', localMov],
    { operation: 'v7_mov_remux' }
  )
}

export async function executeV7ExportDeliverables(params: {
  snapshot: V7ProductionSnapshot
  reelUrl: string
  renderThumbnailUrl?: string | null
}): Promise<V7ExportDeliverables> {
  const started = Date.now()
  const { production, scenes } = params.snapshot
  const productionId = production.id

  let thumbnailUrl = params.renderThumbnailUrl?.trim() || production.thumbnail_url?.trim() || null

  if (!thumbnailUrl) {
    const firstImage = scenes
      .map((s) => (s.storyboard as { imageUrl?: string })?.imageUrl?.trim())
      .find(Boolean)
    if (firstImage) {
      try {
        const buf = await downloadToBuffer(firstImage)
        thumbnailUrl = await uploadBuffer({
          bucket: REEL_BUCKET,
          storagePath: `${productionId}/poster.jpg`,
          buffer: buf,
          contentType: 'image/jpeg',
        })
      } catch {
        thumbnailUrl = firstImage
      }
    }
  }

  let movUrl: string | null = production.mov_url?.trim() || null
  if (!movUrl) {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mugtee-v7-mov-'))
    const localMp4 = path.join(tmpDir, 'final-reel.mp4')
    const localMov = path.join(tmpDir, 'final-reel.mov')
    try {
      const mp4Buf = await downloadToBuffer(params.reelUrl)
      await fs.writeFile(localMp4, mp4Buf)

      if (isFfmpegAvailable()) {
        await remuxMp4ToMov(localMp4, localMov)
        const movBuf = await fs.readFile(localMov)
        movUrl = await uploadBuffer({
          bucket: REEL_BUCKET,
          storagePath: `${productionId}/final-reel.mov`,
          buffer: movBuf,
          contentType: 'video/quicktime',
        })
      } else {
        movUrl = await uploadBuffer({
          bucket: REEL_BUCKET,
          storagePath: `${productionId}/final-reel.mov`,
          buffer: mp4Buf,
          contentType: 'video/quicktime',
        })
      }
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined)
    }
  }

  const manifest = {
    version: 1,
    productionId,
    title: production.title,
    prompt: production.prompt,
    exportedAt: new Date().toISOString(),
    assets: {
      mp4: params.reelUrl,
      mov: movUrl,
      thumbnail: thumbnailUrl,
      voice: production.voice_url,
      music: production.music_url,
    },
    scenes: scenes.map((s) => ({
      number: s.number,
      duration: s.duration,
      imageUrl: (s.storyboard as { imageUrl?: string })?.imageUrl ?? null,
    })),
  }

  const creatorPackUrl = await uploadBuffer({
    bucket: REEL_BUCKET,
    storagePath: `${productionId}/creator-pack.json`,
    buffer: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'),
    contentType: 'application/json',
  })

  return {
    movUrl,
    thumbnailUrl,
    creatorPackUrl,
    durationMs: Date.now() - started,
  }
}
