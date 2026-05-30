import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { projectWorkspaceHref, STUDIO } from '@/lib/create/routes'

export const dynamic = 'force-dynamic'

type Props = { params: { id: string } }

/** Legacy /project/[id] — forwards to the studio project workspace. */
export default async function ProjectContinuityPage({ params }: Props) {
  const supabase = createSupabaseServerClient()
  const { data: row, error } = await supabase
    .from('cinematic_projects')
    .select('id')
    .eq('id', params.id)
    .maybeSingle()

  if (error || !row) {
    redirect(STUDIO.projects)
  }

  redirect(projectWorkspaceHref(params.id))
}
