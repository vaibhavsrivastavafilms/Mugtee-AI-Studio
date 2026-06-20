import { redirect } from 'next/navigation'
import { legacyCreateRedirectTarget } from '@/lib/create/routes'
import { CreateEntry } from '@/components/create/create-entry'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CreatePage({ searchParams }: Props) {
  const sp = await searchParams
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === 'string') qs.set(key, value)
    else if (Array.isArray(value) && value[0]) qs.set(key, value[0])
  }

  const legacyTarget = legacyCreateRedirectTarget(qs)
  if (legacyTarget) redirect(legacyTarget)

  if (qs.get('tab') === 'projects' || qs.get('tab') === 'exports') {
    const filter = qs.get('filter')
    if (filter) {
      const params = new URLSearchParams({ filter })
      redirect(`/projects?${params.toString()}`)
    } else {
      redirect('/projects')
    }
  }

  return <CreateEntry />
}
