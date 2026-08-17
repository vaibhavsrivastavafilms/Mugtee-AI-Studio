import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/auth/server-user'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getV7Production } from '@/lib/v7/db.server'
import {
  buildScriptReviewPayload,
  extractScriptFromStageOutput,
  scriptToDownloadText,
} from '@/lib/v7/workspace/workspace-script.core'
import { buildV7ScenePackages } from '@/lib/v7/scene-package.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

function safeFilename(raw: string): string {
  return raw.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'asset'
}

async function proxyAsset(url: string, filename: string, contentType: string): Promise<NextResponse> {
  const upstream = await fetch(url)
  if (!upstream.ok) {
    return NextResponse.json({ error: 'Asset unavailable' }, { status: 502 })
  }
  const buffer = await upstream.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': 'private, max-age=3600',
    },
  })
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const productionId = id?.trim()
  if (!productionId) {
    return NextResponse.json({ error: 'productionId required' }, { status: 400 })
  }

  const kind = req.nextUrl.searchParams.get('kind')?.trim()
  const sceneId = req.nextUrl.searchParams.get('sceneId')?.trim()
  if (!kind) {
    return NextResponse.json({ error: 'kind query param required' }, { status: 400 })
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

  const title = safeFilename(snapshot.production.title || 'mugtee-production')

  if (kind === 'script') {
    const scriptStage = snapshot.stages.find((row) => row.stage === 'script')
    const script = extractScriptFromStageOutput(scriptStage?.output)
    const review = buildScriptReviewPayload({
      script,
      sceneRows: snapshot.scenes,
      briefTitle: snapshot.production.creative_brief?.title ?? snapshot.production.title,
    })
    const text = scriptToDownloadText(review)
    return new NextResponse(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${title}-script.txt"`,
      },
    })
  }

  if (kind === 'voice') {
    const voiceUrl = snapshot.production.voice_url?.trim()
    if (!voiceUrl) return NextResponse.json({ error: 'Voice not available' }, { status: 404 })
    return proxyAsset(voiceUrl, `${title}-voice.mp3`, 'audio/mpeg')
  }

  if (kind === 'music') {
    const musicUrl = snapshot.production.music_url?.trim()
    if (!musicUrl) return NextResponse.json({ error: 'Music not available' }, { status: 404 })
    return proxyAsset(musicUrl, `${title}-music.mp3`, 'audio/mpeg')
  }

  if (kind === 'image' || kind === 'video') {
    if (!sceneId) return NextResponse.json({ error: 'sceneId required' }, { status: 400 })
    const packages = buildV7ScenePackages(snapshot)
    const scene = packages.find((pkg) => pkg.sceneId === sceneId)
    if (!scene) return NextResponse.json({ error: 'Scene not found' }, { status: 404 })

    if (kind === 'image') {
      const url = scene.imageUrl?.trim()
      if (!url) return NextResponse.json({ error: 'Image not available' }, { status: 404 })
      return proxyAsset(url, `${title}-scene-${scene.sceneNumber}.jpg`, 'image/jpeg')
    }

    const videoUrl = scene.videoUrl?.trim()
    if (!videoUrl) return NextResponse.json({ error: 'Video not available' }, { status: 404 })
    return proxyAsset(videoUrl, `${title}-scene-${scene.sceneNumber}.mp4`, 'video/mp4')
  }

  if (kind === 'captions') {
    const editStage = snapshot.stages.find((row) => row.stage === 'edit')
    const captions = (editStage?.output as { captions?: unknown } | null)?.captions
    const body = typeof captions === 'string' ? captions : JSON.stringify(captions ?? {}, null, 2)
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${title}-captions.json"`,
      },
    })
  }

  return NextResponse.json({ error: 'Unsupported asset kind' }, { status: 400 })
}
