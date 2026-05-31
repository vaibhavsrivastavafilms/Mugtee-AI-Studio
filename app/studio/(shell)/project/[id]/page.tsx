import { redirect } from 'next/navigation'
import { commandCenterWorkspaceHref } from '@/lib/create/routes'

export const dynamic = 'force-dynamic'

type Props = {
  params: { id: string }
  searchParams: Record<string, string | string[] | undefined>
}

/** Legacy project route — forwards to unified Command Center workspace. */
export default function StudioProjectRedirectPage({ params, searchParams }: Props) {
  const tab = typeof searchParams.tab === 'string' ? searchParams.tab : undefined
  const regen = searchParams.regen === '1'
  redirect(
    commandCenterWorkspaceHref(params.id, {
      tab: tab as import('@/lib/cinematic/quick-cut/stage-tabs').QuickCutStageTab | undefined,
      regen,
    })
  )
}
