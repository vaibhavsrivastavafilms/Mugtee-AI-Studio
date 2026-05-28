import { redirect } from 'next/navigation'
import { directorWorkspaceHref } from '@/lib/create/routes'

export const dynamic = 'force-dynamic'

type Props = { params: { projectId: string } }

export default function CreateDirectorPage({ params }: Props) {
  redirect(directorWorkspaceHref(params.projectId))
}
