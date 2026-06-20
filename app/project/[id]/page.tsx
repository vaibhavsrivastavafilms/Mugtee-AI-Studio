import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { STUDIO } from '@/lib/create/routes'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

/** Legacy /project/[id] — forwards to Quick Cut V2 project page. */
export default async function ProjectContinuityPage({ params }: Props) {
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

  redirect(`/projects/${id}`)
}
