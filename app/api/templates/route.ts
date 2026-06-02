import { NextResponse } from 'next/server'
import { listBuiltinStyleTemplates } from '@/lib/templates/style-templates'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from('style_templates')
      .select('*')
      .order('category')
      .order('name')

    if (error || !data?.length) {
      return NextResponse.json({ ok: true, templates: listBuiltinStyleTemplates(), source: 'builtin' })
    }

    return NextResponse.json({ ok: true, templates: data, source: 'database' })
  } catch {
    return NextResponse.json({ ok: true, templates: listBuiltinStyleTemplates(), source: 'builtin' })
  }
}
