import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { hrefForProject } from '@/lib/create/routes'

export const dynamic = 'force-dynamic'

type Props = { params: { id: string } }

/** Project continuity — resolves mode + status to the correct surface. */
export default async function ProjectContinuityPage({ params }: Props) {
  const supabase = createSupabaseServerClient()
  const { data: row, error } = await supabase
    .from('cinematic_projects')
    .select('id, status, mode')
    .eq('id', params.id)
    .maybeSingle()

  if (error || !row) {
    redirect('/projects')
  }

  redirect(hrefForProject(row.status, row.id, row.mode))
}
