// MUGTEE V2.1 — Image generation endpoint.
//
// POST /api/ai/image
// body: { project_id: uuid, prompt: string, aspect_ratio?: '1:1'|'9:16'|'16:9' }
//
// Flow:
//   1. Auth check (must be signed in; project must belong to the user)
//   2. Call FluxAPI Kontext (FLUXAPI_KEY), then Together (FLUX.1-schnell), then Pollinations.
//   3. Download image bytes → upload to Supabase Storage (`project-assets` bucket).
//   4. Insert a row into project_assets and return { id, url, prompt, kind:'image' }.
//
// Sequential by design — the client loops over storyboard prompts and calls this once per shot.

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateImage } from '@/lib/image-providers'
import { uploadImageBuffer } from '@/lib/ai/generate-scene-image'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'project-assets'
const IMAGE_UNAVAILABLE = 'Image generation temporarily unavailable'

async function fetchImageBuffer(remoteUrl: string): Promise<Buffer | null> {
  const dataMatch = /^data:([^;]+);base64,(.+)$/i.exec(remoteUrl)
  if (dataMatch) return Buffer.from(dataMatch[2], 'base64')

  const imgRes = await fetch(remoteUrl)
  if (!imgRes.ok) return null
  return Buffer.from(await imgRes.arrayBuffer())
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const projectId    = String(body?.project_id || '').trim()
    const prompt       = String(body?.prompt || '').trim()
    const aspectRatio  = (String(body?.aspect_ratio || '9:16') as '1:1' | '9:16' | '16:9')
    const styleLock        = String(body?.style_lock || '').trim()
    const cameraDirection  = String(body?.camera_direction || '').trim()
    const emotionalTone    = String(body?.emotional_tone || '').trim()
    const sceneType        = String(body?.scene_type || '').trim()
    const narrationLine    = String(body?.narration_line || '').trim()
    const sequenceIndex    = Number.isFinite(body?.sequence_index) ? Number(body.sequence_index) : null
    if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    if (!prompt)    return NextResponse.json({ error: 'prompt required' }, { status: 400 })

    const { data: piece, error: pieceErr } = await supabase
      .from('content_pieces').select('id, title, user_id').eq('id', projectId).single()
    if (pieceErr || !piece || piece.user_id !== user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const cinematicBits: string[] = []
    if (styleLock)       cinematicBits.push(`Style lock (apply consistently): ${styleLock}`)
    if (cameraDirection) cinematicBits.push(`Camera: ${cameraDirection}`)
    if (emotionalTone)   cinematicBits.push(`Emotional tone: ${emotionalTone}`)
    if (sceneType)       cinematicBits.push(`Scene type: ${sceneType}`)
    cinematicBits.push(`Composition: cinematic, professional, high detail, ${aspectRatio === '9:16' ? 'vertical reel composition' : aspectRatio === '16:9' ? 'cinematic landscape' : 'square feed composition'}.`)
    const cinematic = `${prompt}\n\n${cinematicBits.join('\n')}`

    const generated = await generateImage(cinematic, { aspectRatio })
    if (!generated) {
      return NextResponse.json(
        { success: false, error: IMAGE_UNAVAILABLE },
        { status: 503 }
      )
    }

    const buffer = await fetchImageBuffer(generated.url)
    if (!buffer) {
      console.error('[IMAGE_ERROR] Failed to download generated image', {
        provider: generated.provider,
        seq: sequenceIndex,
      })
      return NextResponse.json(
        { success: false, error: IMAGE_UNAVAILABLE },
        { status: 503 }
      )
    }

    const filename = `${user.id}/${projectId}/img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.png`
    const url = await uploadImageBuffer({
      buffer,
      filename,
      contentType: 'image/png',
    })
    if (!url) {
      console.error('[image] supabase upload error')
      return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
    }

    const { data: row, error: rowErr } = await supabase.from('project_assets').insert({
      project_id: projectId,
      user_id: user.id,
      kind: 'image',
      url,
      storage_path: filename,
      mime_type: 'image/png',
      title: piece.title || null,
      prompt,
      metadata: {
        aspect_ratio:     aspectRatio,
        style_lock:       styleLock || null,
        camera_direction: cameraDirection || null,
        emotional_tone:   emotionalTone || null,
        scene_type:       sceneType || null,
        narration_line:   narrationLine || null,
        sequence_index:   sequenceIndex,
        image_provider:   generated.provider,
      },
    }).select('id, url, kind, prompt, metadata, created_at').single()

    if (rowErr) {
      console.error('[image] insert error:', rowErr)
      return NextResponse.json({ error: rowErr.message }, { status: 500 })
    }

    try {
      await supabase
        .from('content_pieces')
        .update({ status: 'editing' })
        .eq('id', projectId)
        .eq('user_id', user.id)
        .in('status', ['draft', 'idea', 'scripting', 'shooting'])
    } catch (statusErr: unknown) {
      const msg = statusErr instanceof Error ? statusErr.message : String(statusErr)
      console.warn('[image] status promote soft-fail:', msg)
    }

    return NextResponse.json({ ok: true, asset: row })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unexpected error'
    console.error('[image] unexpected:', msg)
    return NextResponse.json({ error: msg || 'Unexpected error' }, { status: 500 })
  }
}
