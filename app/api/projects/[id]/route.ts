import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

import { deleteV3Project, getV3Project } from '@/lib/v3/db.server'



export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'



type RouteContext = { params: Promise<{ id: string }> }



export async function DELETE(_req: Request, context: RouteContext) {

  try {

    const { id } = await context.params

    const supabase = await createSupabaseServerClient()

    const {

      data: { user },

    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })



    const snapshot = await getV3Project(supabase, id, user.id)

    if (!snapshot) return NextResponse.json({ error: 'Project not found' }, { status: 404 })



    await deleteV3Project(supabase, id, user.id)

    return NextResponse.json({ success: true })

  } catch (err) {

    const message = err instanceof Error ? err.message : 'Delete failed'

    return NextResponse.json({ error: message }, { status: 500 })

  }

}


