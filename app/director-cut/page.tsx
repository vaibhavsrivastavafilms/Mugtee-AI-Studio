import { redirect } from 'next/navigation'
import { directorWorkspaceHref } from '@/lib/create/routes'

export const dynamic = 'force-dynamic'

export default function DirectorCutPage() {
  redirect(directorWorkspaceHref())
}
