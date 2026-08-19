import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'

import { getAuthenticatedUser } from '@/lib/auth/server-user'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getV7Production } from '@/lib/v7/db.server'
import {
  buildScriptReviewPayload,
  extractScriptFromStageOutput,
  scriptToDownloadText,
} from '@/lib/v7/workspace/workspace-script.core'
import { buildV7ScenePackages } from '@/lib/v7/scene-package.server'
import { captionsFromEditStageOutput } from '@/lib/v7/captions.core'
import { packagesToSubtitleSegments } from '@/lib/v7/scene-package.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

function safeFilename(raw: string): string {
  return raw.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'mugtee-production'
}

async function fetchBinary(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const bytes = new Uint8Array(await response.arrayBuffer())
    return bytes.byteLength > 0 ? bytes : null
  } catch {
    return null
  }
}

/** Downloads a ZIP bundle of all existing stage outputs without regeneration. */
export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const productionId = id?.trim()
  if (!productionId) {
    return NextResponse.json({ error: 'productionId required' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const authResult = await getAuthenticatedUser(supabase)
  if (authResult.error) {
    return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 })
  }
  if (!authResult.user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const snapshot = await getV7Production(supabase, productionId, authResult.user.id)
  if (!snapshot) {
    return NextResponse.json({ error: 'Production not found' }, { status: 404 })
  }

  const zip = new JSZip()
  const packages = buildV7ScenePackages(snapshot)
  const title = safeFilename(snapshot.production.title || 'mugtee-production')

  const scriptStage = snapshot.stages.find((row) => row.stage === 'script')
  const script = extractScriptFromStageOutput(scriptStage?.output)
  const scriptReview = buildScriptReviewPayload({
    script,
    sceneRows: snapshot.scenes,
    briefTitle: snapshot.production.creative_brief?.title ?? snapshot.production.title,
  })
  zip.file('script.txt', scriptToDownloadText(scriptReview))

  const captionsStage = snapshot.stages.find((row) => row.stage === 'edit')
  const editCaptions = captionsFromEditStageOutput(
    (captionsStage?.output as Record<string, unknown> | null) ?? null
  )
  const captions = editCaptions.length > 0 ? editCaptions : packagesToSubtitleSegments(packages)
  if (captions.length > 0) {
    zip.file('captions/captions.json', JSON.stringify(captions, null, 2))
  }

  const voiceBytes = snapshot.production.voice_url
    ? await fetchBinary(snapshot.production.voice_url)
    : null
  if (voiceBytes) zip.file('voice/voice.mp3', voiceBytes)

  const musicBytes = snapshot.production.music_url
    ? await fetchBinary(snapshot.production.music_url)
    : null
  if (musicBytes) zip.file('music/music.mp3', musicBytes)

  const reelBytes = snapshot.production.reel_url ? await fetchBinary(snapshot.production.reel_url) : null
  if (reelBytes) zip.file('final/final.mp4', reelBytes)

  const soundStage = snapshot.stages.find((row) => row.stage === 'sound')
  const sfx = (soundStage?.output as { sfx?: unknown[] } | null)?.sfx
  if (Array.isArray(sfx) && sfx.length > 0) {
    zip.file('sfx/sfx.json', JSON.stringify(sfx, null, 2))
  }

  for (const scene of packages) {
    const imageBytes = scene.imageUrl ? await fetchBinary(scene.imageUrl) : null
    if (imageBytes) {
      zip.file(`images/scene-${String(scene.sceneNumber).padStart(2, '0')}.jpg`, imageBytes)
    }
    const videoBytes = scene.videoUrl ? await fetchBinary(scene.videoUrl) : null
    if (videoBytes) {
      zip.file(`animation/scene-${String(scene.sceneNumber).padStart(2, '0')}.mp4`, videoBytes)
    }
  }

  const zipBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
  return new NextResponse(zipBytes, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${title}-all-assets.zip"`,
      'Content-Length': String(zipBytes.byteLength),
      'Cache-Control': 'private, max-age=300',
    },
  })
}
