import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

import { advanceV3Production } from '@/lib/v3/orchestrator.server'



export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'

export const maxDuration = 300



type RouteContext = { params: Promise<{ id: string }> }



/** MVP alias for advancing the full generation pipeline. */

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



    const snapshot = await advanceV3Production({

      supabase,

      projectId: id,

      userId: user.id,

    })



    return NextResponse.json(snapshot)

  } catch (err) {

    const message = err instanceof Error ? err.message : 'Generation failed'

    return NextResponse.json({ error: message }, { status: 500 })

  }

}


