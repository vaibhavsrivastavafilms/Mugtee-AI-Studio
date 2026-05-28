import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Internal film output stub — structured not-ready until FFmpeg provider lands. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const segments = params.path ?? []
  const filename = segments[segments.length - 1] ?? 'film.mp4'
  const digest = filename.replace(/\.mp4$/i, '')

  return NextResponse.json(
    {
      ready: false,
      status: 'preparing',
      presenceLine: 'Your cinematic world is still gathering motion.',
      assemblyDigest: digest,
      outputFormat: 'mp4',
      aspectRatio: '9:16',
      placeholder: true,
    },
    {
      status: 202,
      headers: {
        'Cache-Control': 'no-store',
        'X-Cinematic-Output': 'not-ready',
      },
    }
  )
}
