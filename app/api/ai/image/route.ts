// MUGTEE V2.1 — Image generation endpoint.
//
// POST /api/ai/image
// body: { project_id: uuid, prompt: string, aspect_ratio?: '1:1'|'9:16'|'16:9' }
//
// Flow:
//   1. Auth check (must be signed in; project must belong to the user)
//   2. Call Gemini via Emergent universal LLM gateway (model: gemini-2.5-flash-image-preview).
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
    const cinematic = `${prompt}\n\nStyle: cinematic, professional, high detail, ${aspectRatio === '9:16' ? 'vertical reel composition' : aspectRatio === '16:9' ? 'cinematic landscape' : 'square feed composition'}.`

    const ggRes = await fetch(EMERGENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${EMERGENT_LLM_KEY}` },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-image-preview',
        modalities: ['image', 'text'],
        messages: [{ role: 'user', content: cinematic }],
      }),
    })

    if (!ggRes.ok) {
      const errText = await ggRes.text().catch(() => '')
      console.error('[image] Emergent gateway error:', ggRes.status, errText.slice(0, 400))
      return NextResponse.json({ error: 'Image provider error', detail: errText.slice(0, 400) }, { status: 502 })
    }
    const ggJson: any = await ggRes.json().catch(() => ({}))

    // ---- Extract base64 image ----
    const b64 = extractB64(ggJson)
    if (!b64) {
      return NextResponse.json({ error: 'No image returned by model' }, { status: 502 })
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
      metadata: { aspect_ratio: aspectRatio },
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

  // Shape 2: chat-completions with image_url data:…;base64,XXX
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
  }

  // Shape 3: Gemini-native candidates.content.parts[].inline_data.data
  const parts = json?.candidates?.[0]?.content?.parts || []
  for (const p of parts) {
    if (p?.inline_data?.data) return String(p.inline_data.data)
    if (p?.inlineData?.data)  return String(p.inlineData.data)
  }
  return null
}
