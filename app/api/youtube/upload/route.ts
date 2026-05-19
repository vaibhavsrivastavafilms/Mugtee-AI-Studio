// POST /api/youtube/upload
// Body: { contentPieceId: string, videoUrl?: string, privacyStatus?: 'private'|'unlisted'|'public' }
// Streams video from videoUrl (or first linked media row of type=video) into YouTube resumable upload.
// Reuses existing content_pieces title/description/tags.

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getFreshYoutubeCredentials } from '@/lib/youtube'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_BYTES = 128 * 1024 * 1024 * 1024  // 128 GB (YouTube hard cap)

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as {
      contentPieceId?: string
      videoUrl?: string
      privacyStatus?: 'private' | 'unlisted' | 'public'
    }
    const contentPieceId = body.contentPieceId
    const privacyStatus  = body.privacyStatus || 'unlisted'
    if (!contentPieceId) return NextResponse.json({ error: 'missing_content_piece' }, { status: 400 })
    if (!['private','unlisted','public'].includes(privacyStatus)) {
      return NextResponse.json({ error: 'invalid_privacy' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // 1) Load piece + linked video (if videoUrl not provided)
    const { data: piece, error: pErr } = await supabase
      .from('content_pieces')
      .select('id, title, description, tags, media_url, user_id')
      .eq('id', contentPieceId)
      .eq('user_id', user.id)
      .single()
    if (pErr || !piece) return NextResponse.json({ error: 'content_not_found' }, { status: 404 })

    let videoUrl = body.videoUrl || piece.media_url || null
    if (!videoUrl) {
      const { data: mediaRow } = await supabase
        .from('media')
        .select('url')
        .eq('content_id', contentPieceId)
        .eq('type', 'video')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      videoUrl = mediaRow?.url || null
    }
    if (!videoUrl) return NextResponse.json({ error: 'no_video_url' }, { status: 400 })

    // 2) Optimistic status
    await supabase.from('content_pieces').update({
      youtube_status: 'uploading',
      youtube_error: null,
    }).eq('id', contentPieceId).eq('user_id', user.id)

    // 3) Fresh tokens
    let creds
    try { creds = await getFreshYoutubeCredentials() }
    catch (e: any) {
      const m = e?.message || 'token_failed'
      await supabase.from('content_pieces').update({ youtube_status: 'failed', youtube_error: m }).eq('id', contentPieceId).eq('user_id', user.id)
      const status = (m === 'not_connected' || m === 'invalid_grant') ? 400 : 500
      return NextResponse.json({ error: m }, { status })
    }
    const accessToken = creds.account.access_token

    // 4) HEAD remote video for size + type
    const head = await fetch(videoUrl, { method: 'HEAD' })
    if (!head.ok) {
      await supabase.from('content_pieces').update({ youtube_status: 'failed', youtube_error: 'video_url_not_accessible' }).eq('id', contentPieceId).eq('user_id', user.id)
      return NextResponse.json({ error: 'video_url_not_accessible' }, { status: 400 })
    }
    const lenStr = head.headers.get('content-length')
    const mime   = head.headers.get('content-type') || 'video/mp4'
    if (!lenStr) {
      await supabase.from('content_pieces').update({ youtube_status: 'failed', youtube_error: 'missing_content_length' }).eq('id', contentPieceId).eq('user_id', user.id)
      return NextResponse.json({ error: 'missing_content_length' }, { status: 400 })
    }
    const totalBytes = Number(lenStr)
    if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
      return NextResponse.json({ error: 'bad_content_length' }, { status: 400 })
    }
    if (totalBytes > MAX_BYTES) {
      await supabase.from('content_pieces').update({ youtube_status: 'failed', youtube_error: 'file_too_large' }).eq('id', contentPieceId).eq('user_id', user.id)
      return NextResponse.json({ error: 'file_too_large' }, { status: 400 })
    }

    // 5) Initiate resumable session
    const tags = Array.isArray(piece.tags) ? piece.tags : []
    const meta = {
      snippet: {
        title: (piece.title || 'Untitled').slice(0, 100),
        description: piece.description || '',
        tags: tags.slice(0, 20),
        categoryId: '22',
      },
      status: { privacyStatus, selfDeclaredMadeForKids: false },
    }
    const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(totalBytes),
        'X-Upload-Content-Type':   mime,
      },
      body: JSON.stringify(meta),
    })
    if (!initRes.ok) {
      const txt = await initRes.text()
      console.error('[yt-upload] initiate', initRes.status, txt)
      await supabase.from('content_pieces').update({ youtube_status: 'failed', youtube_error: `initiate_failed:${initRes.status}` }).eq('id', contentPieceId).eq('user_id', user.id)
      return NextResponse.json({ error: 'youtube_initiate_failed', detail: txt.slice(0, 300) }, { status: initRes.status })
    }
    const sessionUrl = initRes.headers.get('location')
    if (!sessionUrl) return NextResponse.json({ error: 'missing_session_url' }, { status: 500 })

    // 6) Stream the source into the session
    const src = await fetch(videoUrl)
    if (!src.ok || !src.body) {
      await supabase.from('content_pieces').update({ youtube_status: 'failed', youtube_error: 'video_download_failed' }).eq('id', contentPieceId).eq('user_id', user.id)
      return NextResponse.json({ error: 'video_download_failed' }, { status: 400 })
    }
    const up = await fetch(sessionUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': String(totalBytes),
        'Content-Type':   mime,
        'Content-Range':  `bytes 0-${totalBytes - 1}/${totalBytes}`,
      },
      // @ts-ignore — Node 18+ fetch supports ReadableStream body w/ duplex half
      body: src.body, duplex: 'half',
    })
    if (up.status === 403) {
      const txt = await up.text()
      await supabase.from('content_pieces').update({ youtube_status: 'failed', youtube_error: 'quota_exceeded' }).eq('id', contentPieceId).eq('user_id', user.id)
      return NextResponse.json({ error: 'youtube_quota_exceeded', detail: txt.slice(0, 300) }, { status: 403 })
    }
    if (!up.ok) {
      const txt = await up.text()
      console.error('[yt-upload] put', up.status, txt)
      await supabase.from('content_pieces').update({ youtube_status: 'failed', youtube_error: `upload_failed:${up.status}` }).eq('id', contentPieceId).eq('user_id', user.id)
      return NextResponse.json({ error: 'youtube_upload_failed', detail: txt.slice(0, 300) }, { status: 500 })
    }
    const video = await up.json().catch(() => ({})) as { id?: string }
    if (!video?.id) {
      await supabase.from('content_pieces').update({ youtube_status: 'failed', youtube_error: 'missing_video_id' }).eq('id', contentPieceId).eq('user_id', user.id)
      return NextResponse.json({ error: 'missing_video_id' }, { status: 500 })
    }

    // 7) Persist success
    await supabase.from('content_pieces').update({
      youtube_status: 'published',
      youtube_video_id: video.id,
      youtube_error: null,
      status: 'published',
    }).eq('id', contentPieceId).eq('user_id', user.id)

    return NextResponse.json({ ok: true, videoId: video.id, watchUrl: `https://youtu.be/${video.id}` })
  } catch (e: any) {
    console.error('[yt-upload]', e)
    return NextResponse.json({ error: e?.message || 'internal_error' }, { status: 500 })
  }
}
