import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { hrefForProject } from '@/lib/create/routes'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ projectId: string }> }

/** Project shell — routes to generate or director based on stored mode + status. */
export default async function CreateProjectPage({ params }: Props) {
  const { projectId } = await params
  const supabase = createSupabaseServerClient()
  const { data: row, error } = await supabase
    .from('cinematic_projects')
    .select('id, status, mode')
    .eq('id', projectId)
    .maybeSingle()

  if (error || !row) {
    redirect('/create')
  }

  redirect(hrefForProject(row.status, row.id, row.mode))
}
