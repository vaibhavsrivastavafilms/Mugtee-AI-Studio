// MUGTEE V2.1 — Image generation endpoint.
//
// POST /api/ai/image
// body: { project_id: uuid, prompt: string, aspect_ratio?: '1:1'|'9:16'|'16:9' }
//
// Flow:
//   1. Auth check (must be signed in; project must belong to the user)
//   2. Call Gemini via Emergent universal LLM gateway (model: gemini/gemini-2.5-flash-image).
//      Expects an OpenAI-compatible chat completions response with an image part.
//   3. Extract base64 image bytes → upload to Supabase Storage (`project-assets` bucket).
//   4. Insert a row into project_assets and return { id, url, prompt, kind:'image' }.
//
// Sequential by design — the client loops over storyboard prompts and calls this once per shot.
// EXTREME LOW CREDIT MODE: no SDKs, raw fetch only.

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMERGENT_LLM_KEY = process.env.EMERGENT_LLM_KEY
const EMERGENT_URL = 'https://integrations.emergentagent.com/llm/chat/completions'
const BUCKET = 'project-assets'
// V4.2 — Image provider model. The Emergent gateway namespaces all upstream
// providers (gemini/, vertex_ai/, gpt-image-*). The old bare
// 'gemini-2.5-flash-image-preview' identifier was removed and the preview
// model itself is deprecated upstream. The current GA model returns the image
// in choices[0].message.images[0].image_url.url instead of inline content.
const IMAGE_MODEL = 'gemini/gemini-2.5-flash-image'

// Categorize a provider failure so we can give the client actionable detail
// without leaking secrets. Returns a stable machine code + human label.
function categorizeProviderError(status: number, sample: string): { code: string; label: string } {
  const s = sample.toLowerCase()
  if (status === 401 || status === 403 || s.includes('unauthor') || s.includes('forbidden') || s.includes('invalid api key')) {
    return { code: 'auth_failed', label: 'Image provider authentication failed' }
  }
  if (status === 429 || s.includes('quota') || s.includes('rate limit') || s.includes('exceed')) {
    return { code: 'quota_exceeded', label: 'Image provider quota or rate limit exceeded' }
  }
  if (status === 404 || s.includes('not found') || s.includes('invalid model') || s.includes('not supported')) {
    return { code: 'invalid_model', label: 'Image model is no longer available' }
  }
  if (status === 408 || status === 504 || s.includes('timeout') || s.includes('timed out')) {
    return { code: 'timeout', label: 'Image provider timed out' }
  }
  if (status >= 500) {
    return { code: 'provider_unavailable', label: 'Image provider is temporarily unavailable' }
  }
  return { code: 'provider_error', label: 'Image provider error' }
}

export async function POST(req: NextRequest) {
  try {
    if (!EMERGENT_LLM_KEY) {
      return NextResponse.json({ error: 'EMERGENT_LLM_KEY not configured' }, { status: 500 })
    }
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const body = await req.json().catch(() => ({} as any))
    const projectId    = String(body?.project_id || '').trim()
    const prompt       = String(body?.prompt || '').trim()
    const aspectRatio  = (String(body?.aspect_ratio || '9:16') as '1:1' | '9:16' | '16:9')
    // V3.6 — Visual Consistency Lock. When the storyboard pipeline calls this endpoint
    // it passes the global `style_lock` (the project's style_summary), plus per-frame
    // camera_direction / emotional_tone / scene_type / narration_line. They get baked
    // into the prompt so every image in the same project shares a consistent visual identity.
    const styleLock        = String(body?.style_lock || '').trim()
    const cameraDirection  = String(body?.camera_direction || '').trim()
    const emotionalTone    = String(body?.emotional_tone || '').trim()
    const sceneType        = String(body?.scene_type || '').trim()
    const narrationLine    = String(body?.narration_line || '').trim()
    const sequenceIndex    = Number.isFinite(body?.sequence_index) ? Number(body.sequence_index) : null
    if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    if (!prompt)    return NextResponse.json({ error: 'prompt required' }, { status: 400 })

    // Verify ownership of the project.
    const { data: piece, error: pieceErr } = await supabase
      .from('content_pieces').select('id, title, user_id').eq('id', projectId).single()
    if (pieceErr || !piece || piece.user_id !== user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // ---- Call Gemini image via Emergent gateway ----
    // We use OpenAI-compatible chat completions with the Gemini image preview model.
    // The response may carry the image either as base64 in message.content (image_url data:),
    // or as a `b64_json` field. We try multiple shapes to be resilient.
    // V3.6 — Visual Consistency Lock applied here. The style_lock is prepended to every
    // frame in the same project so adjacent images share lighting / lens / palette / grade.
    const cinematicBits: string[] = []
    if (styleLock)       cinematicBits.push(`Style lock (apply consistently): ${styleLock}`)
    if (cameraDirection) cinematicBits.push(`Camera: ${cameraDirection}`)
    if (emotionalTone)   cinematicBits.push(`Emotional tone: ${emotionalTone}`)
    if (sceneType)       cinematicBits.push(`Scene type: ${sceneType}`)
    cinematicBits.push(`Composition: cinematic, professional, high detail, ${aspectRatio === '9:16' ? 'vertical reel composition' : aspectRatio === '16:9' ? 'cinematic landscape' : 'square feed composition'}.`)
    const cinematic = `${prompt}\n\n${cinematicBits.join('\n')}`

    const ggRes = await fetch(EMERGENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${EMERGENT_LLM_KEY}` },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        modalities: ['image', 'text'],
        messages: [{ role: 'user', content: cinematic }],
      }),
    })

    if (!ggRes.ok) {
      const errText = await ggRes.text().catch(() => '')
      const cat = categorizeProviderError(ggRes.status, errText)
      console.error('[image] provider error', {
        provider: 'emergent-gateway',
        model: IMAGE_MODEL,
        status: ggRes.status,
        code: cat.code,
        seq: sequenceIndex,
        promptLen: cinematic.length,
        aspect: aspectRatio,
        sample: errText.slice(0, 400),
      })
      return NextResponse.json({ error: cat.label, code: cat.code, detail: errText.slice(0, 400) }, { status: 502 })
    }
    const ggJson: any = await ggRes.json().catch(() => ({}))

    // ---- Extract base64 image ----
    const b64 = extractB64(ggJson)
    if (!b64) {
      // Sometimes the gateway returns 200 but with an upstream error nested in the body.
      const nestedErr = typeof ggJson?.error === 'object'
        ? (ggJson.error?.message || JSON.stringify(ggJson.error))
        : (typeof ggJson?.error === 'string' ? ggJson.error : '')
      const cat = nestedErr
        ? categorizeProviderError(0, nestedErr)
        : { code: 'no_image', label: 'No image returned by model' }
      console.error('[image] no image in response', {
        provider: 'emergent-gateway',
        model: IMAGE_MODEL,
        seq: sequenceIndex,
        promptLen: cinematic.length,
        code: cat.code,
        keys: Object.keys(ggJson || {}),
        firstChoice: typeof ggJson?.choices?.[0]?.message?.content,
        nestedErr: nestedErr ? String(nestedErr).slice(0, 300) : undefined,
      })
      return NextResponse.json({ error: cat.label, code: cat.code, detail: nestedErr ? String(nestedErr).slice(0, 300) : undefined }, { status: 502 })
    }
    const buffer = Buffer.from(b64, 'base64')

    // ---- Upload to Supabase Storage ----
    const filename = `${user.id}/${projectId}/img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.png`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
      contentType: 'image/png',
      upsert: false,
    })
    if (upErr) {
      console.error('[image] supabase upload error:', upErr)
      return NextResponse.json({ error: upErr.message || 'Storage upload failed' }, { status: 500 })
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filename)
    const url = pub.publicUrl

    // ---- Persist row ----
    const { data: row, error: rowErr } = await supabase.from('project_assets').insert({
      project_id: projectId,
      user_id: user.id,
      kind: 'image',
      url,
      storage_path: filename,
      mime_type: 'image/png',
      title: piece.title || null,
      prompt,
      // V3.6 — Persist storyboard context so the storyboard tab can reconstruct
      // the cinematic sequence on reload (visual lock + per-frame direction).
      metadata: {
        aspect_ratio:     aspectRatio,
        style_lock:       styleLock || null,
        camera_direction: cameraDirection || null,
        emotional_tone:   emotionalTone || null,
        scene_type:       sceneType || null,
        narration_line:   narrationLine || null,
        sequence_index:   sequenceIndex,
      },
    }).select('id, url, kind, prompt, metadata, created_at').single()

    if (rowErr) {
      console.error('[image] insert error:', rowErr)
      return NextResponse.json({ error: rowErr.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, asset: row })
  } catch (e: any) {
    console.error('[image] unexpected:', e?.message)
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

function extractB64(json: any): string | null {
  // Shape 1: OpenAI-compatible images.generations style.
  if (Array.isArray(json?.data) && json.data[0]?.b64_json) return String(json.data[0].b64_json)

  // Shape 2: chat-completions with image_url data:…;base64,XXX inside content[]
  const msg = json?.choices?.[0]?.message
  if (msg) {
    const content = msg.content
    if (Array.isArray(content)) {
      for (const c of content) {
        if (c?.type === 'image_url' && typeof c.image_url?.url === 'string') {
          const m = /^data:image\/[a-z+]+;base64,(.+)$/i.exec(c.image_url.url)
          if (m) return m[1]
        }
        if (c?.type === 'output_image' && typeof c.b64_json === 'string') return c.b64_json
      }
    }
    if (typeof content === 'string') {
      const m = /data:image\/[a-z+]+;base64,([A-Za-z0-9+/=]+)/.exec(content)
      if (m) return m[1]
    }

    // Shape 2b (V4.2 — current GA gemini): images returned alongside content
    //   { choices:[{ message:{ content:"…", images:[{ image_url:{ url:"data:image/png;base64,…" }, type:"image_url" }] }}] }
    if (Array.isArray(msg.images)) {
      for (const img of msg.images) {
        const url = img?.image_url?.url
        if (typeof url === 'string') {
          const m = /^data:image\/[a-z+]+;base64,(.+)$/i.exec(url)
          if (m) return m[1]
        }
        if (typeof img?.b64_json === 'string') return img.b64_json
      }
    }
  }

  // Shape 3: Gemini-native candidates.content.parts[].inline_data.data
  const parts = json?.candidates?.[0]?.content?.parts || []
  for (const p of parts) {
    if (p?.inline_data?.data) return String(p.inline_data.data)
    if (p?.inlineData?.data)  return String(p.inlineData.data)
  }
  return null
}
