import 'server-only'



import { createSupabaseServerClient } from '@/lib/supabase/server'



const BUCKET = 'project-assets'



/** Download remote video and persist to Supabase storage. */

export async function persistRemoteVideo(params: {

  remoteUrl: string

  storagePath: string

  headers?: Record<string, string>

}): Promise<string> {

  const res = await fetch(params.remoteUrl, {

    headers: params.headers,

    signal: AbortSignal.timeout(180_000),

  })



  if (!res.ok) {

    throw new Error(`Failed to download generated video (${res.status})`)

  }



  const buffer = Buffer.from(await res.arrayBuffer())

  if (buffer.byteLength < 1024) {

    throw new Error('Downloaded video appears corrupt (file too small)')

  }



  const contentType = res.headers.get('content-type') ?? 'video/mp4'

  if (!contentType.startsWith('video/')) {

    throw new Error(`Unsupported video content type: ${contentType}`)

  }



  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.storage.from(BUCKET).upload(params.storagePath, buffer, {

    contentType,

    upsert: true,

  })



  if (error) throw new Error(error.message)



  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(params.storagePath)

  return pub.publicUrl

}



/** Lightweight remote video sanity check before accepting a provider URL. */

export async function probeRemoteVideo(url: string, headers?: Record<string, string>): Promise<void> {

  const res = await fetch(url, {

    method: 'HEAD',

    headers,

    signal: AbortSignal.timeout(30_000),

  }).catch(async () => {

    const getRes = await fetch(url, {

      method: 'GET',

      headers: { ...headers, Range: 'bytes=0-1023' },

      signal: AbortSignal.timeout(30_000),

    })

    return getRes

  })



  if (!res.ok) {

    throw new Error(`Video probe failed (${res.status})`)

  }



  const contentType = res.headers.get('content-type') ?? ''

  if (contentType && !contentType.startsWith('video/') && !contentType.includes('octet-stream')) {

    throw new Error(`Video probe rejected content type: ${contentType}`)

  }



  const contentLength = Number.parseInt(res.headers.get('content-length') ?? '0', 10)

  if (contentLength > 0 && contentLength < 1024) {

    throw new Error('Video probe rejected corrupt file (too small)')

  }

}


