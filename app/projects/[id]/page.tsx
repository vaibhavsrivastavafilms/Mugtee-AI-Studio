import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { STUDIO } from '@/lib/create/routes'
import { QuickCutProjectPageClient } from '@/components/quick-cut/v2/quick-cut-project-page-client'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

/** Quick Cut V2 — cinematic generation page for a single project. */
export default async function ProjectsQuickCutPage({ params }: Props) {
  const { id } = await params
  const supabase = createSupabaseServerClient()
  const { data: row, error } = await supabase
    .from('cinematic_projects')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (error || !row) {
    redirect(STUDIO.projects)
  }

  return <QuickCutProjectPageClient projectId={id} />
}
