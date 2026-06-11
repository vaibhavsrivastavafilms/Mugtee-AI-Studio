import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Verify generation_jobs table exists (migrations 0064 + 0065). */
export async function GET() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { error } = await supabase.from('generation_jobs').select('id').limit(1)
  if (error) {
    const missing =
      error.message.includes('does not exist') ||
      error.message.includes('relation') ||
      error.code === '42P01'
    return NextResponse.json(
      {
        ok: false,
        error: missing
          ? 'generation_jobs table missing — apply migrations 0064_generation_jobs.sql and 0065_generation_jobs_pipeline_columns.sql in Supabase SQL Editor.'
          : error.message,
      },
      { status: missing ? 503 : 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
