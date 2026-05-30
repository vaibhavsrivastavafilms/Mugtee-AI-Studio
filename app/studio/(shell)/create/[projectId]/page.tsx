import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createEntryHref, hrefForProject } from '@/lib/create/routes'

export const dynamic = 'force-dynamic'

type Props = { params: { projectId: string } }

export default async function StudioCreateProjectPage({ params }: Props) {
  const supabase = createSupabaseServerClient()
  const { data: row, error } = await supabase
    .from('cinematic_projects')
    .select('id, status, mode')
    .eq('id', params.projectId)
    .maybeSingle()

  if (error || !row) {
    redirect(createEntryHref('quick'))
  }

  redirect(hrefForProject(row.status, row.id, row.mode))
}
