import { redirect } from 'next/navigation'
import { directorWorkspaceHref } from '@/lib/create/routes'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ projectId: string }> }

export default async function StudioCreateDirectorPage({ params }: Props) {
  const { projectId } = await params
  redirect(directorWorkspaceHref(projectId))
}
