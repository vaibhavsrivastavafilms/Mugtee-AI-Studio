import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

import { getV3Project } from '@/lib/v3/db.server'

import { buildV3ScriptText, v3SnapshotToGeneratedScenes } from '@/lib/v3/render-bridge.server'



export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'



type RouteContext = { params: Promise<{ id: string }> }



export async function GET(req: Request, context: RouteContext) {

  try {

    const { id } = await context.params

    const supabase = await createSupabaseServerClient()

    const {

      data: { user },

    } = await supabase.auth.getUser()



    if (!user) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }



    const snapshot = await getV3Project(supabase, id, user.id)

    if (!snapshot) {

      return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    }



    const url = new URL(req.url)

    const format = url.searchParams.get('format')



    if (format === 'script') {

      const scenes = v3SnapshotToGeneratedScenes(snapshot)

      const script = buildV3ScriptText(scenes)

      return new NextResponse(script, {

        headers: {

          'Content-Type': 'text/plain; charset=utf-8',

          'Content-Disposition': `attachment; filename="${snapshot.project.title.replace(/\s+/g, '-').toLowerCase()}-script.txt"`,

        },

      })

    }



    if (!snapshot.project.reel_url) {

      return NextResponse.json(

        {

          error: 'MP4 not ready yet',

          exportStatus: snapshot.project.export_status,

        },

        { status: 409 }

      )

    }



    return NextResponse.json({

      success: true,

      reelUrl: snapshot.project.reel_url,

      exportStatus: snapshot.project.export_status,

    })

  } catch (err) {

    const message = err instanceof Error ? err.message : 'Download failed'

    return NextResponse.json({ error: message }, { status: 500 })

  }

}


