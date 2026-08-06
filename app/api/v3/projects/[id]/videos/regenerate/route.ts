import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

import { runV3VideoEngine } from '@/lib/v3/video-engine.server'



export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'

export const maxDuration = 300



type RouteContext = { params: Promise<{ id: string }> }



export async function POST(req: Request, context: RouteContext) {

  try {

    const { id } = await context.params

    const supabase = await createSupabaseServerClient()

    const {

      data: { user },

    } = await supabase.auth.getUser()



    if (!user) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }



    const body = (await req.json().catch(() => null)) as { sceneId?: string } | null

    const sceneId = body?.sceneId?.trim()

    if (!sceneId) {

      return NextResponse.json({ error: 'sceneId is required' }, { status: 400 })

    }



    const result = await runV3VideoEngine({

      supabase,

      projectId: id,

      userId: user.id,

      sceneIds: [sceneId],

    })



    return NextResponse.json(result)

  } catch (err) {

    const message = err instanceof Error ? err.message : 'Video regeneration failed'

    return NextResponse.json({ error: message }, { status: 500 })

  }

}


