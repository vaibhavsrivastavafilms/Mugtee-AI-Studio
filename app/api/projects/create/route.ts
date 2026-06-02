import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'
import { Mp4ExportEvents } from '@/lib/analytics/mp4-export-events'
import { trackMp4ExportServer } from '@/lib/analytics/mp4-export-track.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 })
    }

    const blocked = await guardUsageLimit(user.id, 'projects')
    if (blocked) return blocked

    const body = await req.json()

    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          title: body.title,
          prompt: body.prompt,
          platform: body.platform || 'instagram',
          category: body.category || 'cinematic',
        },
      ])
      .select()

    if (error) {
      return NextResponse.json({
        success: false,
        error,
      })
    }

    await trackUsageMetric(user.id, 'projects')

    const projectId = data?.[0]?.id ? String(data[0].id) : null
    void trackMp4ExportServer({
      event: Mp4ExportEvents.PROJECT_CREATED,
      userId: user.id,
      page: '/api/projects/create',
      metadata: { projectId, source: 'projects_table' },
    })

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Server error',
      },
      { status: 500 }
    )
  }
}
