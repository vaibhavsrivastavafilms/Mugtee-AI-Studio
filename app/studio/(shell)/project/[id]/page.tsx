import { redirect } from 'next/navigation'
import { commandCenterWorkspaceHref } from '@/lib/create/routes'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Legacy project route — forwards to unified Command Center workspace. */
export default async function StudioProjectRedirectPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
  const tab = typeof sp.tab === 'string' ? sp.tab : undefined
  const regen = sp.regen === '1'
  redirect(
    commandCenterWorkspaceHref(id, {
      tab: tab as import('@/lib/cinematic/quick-cut/stage-tabs').QuickCutStageTab | undefined,
      regen,
    })
  )
}
