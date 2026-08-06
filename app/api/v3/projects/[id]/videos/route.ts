import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

import { runV3VideoEngine } from '@/lib/v3/video-engine.server'



export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'

export const maxDuration = 300



type RouteContext = { params: Promise<{ id: string }> }



export async function POST(_req: Request, context: RouteContext) {

  try {

    const { id } = await context.params

    const supabase = await createSupabaseServerClient()

    const {

      data: { user },

    } = await supabase.auth.getUser()



    if (!user) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }



    const result = await runV3VideoEngine({

      supabase,

      projectId: id,

      userId: user.id,

    })



    return NextResponse.json(result)

  } catch (err) {

    const message = err instanceof Error ? err.message : 'Video generation failed'

    return NextResponse.json({ error: message }, { status: 500 })

  }

}


