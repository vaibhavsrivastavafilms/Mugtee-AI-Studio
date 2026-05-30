import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient()
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
