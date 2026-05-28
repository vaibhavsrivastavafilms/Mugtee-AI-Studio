import { redirect } from 'next/navigation'
import { legacyCreateRedirectTarget } from '@/lib/create/routes'
import { CreateEntry } from '@/components/create/create-entry'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Record<string, string | string[] | undefined>
}

export default function CreatePage({ searchParams }: Props) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') qs.set(key, value)
    else if (Array.isArray(value) && value[0]) qs.set(key, value[0])
  }

  const legacyTarget = legacyCreateRedirectTarget(qs)
  if (legacyTarget) redirect(legacyTarget)

  if (qs.get('tab') === 'projects' || qs.get('tab') === 'exports') {
    const filter = qs.get('filter')
    redirect(filter ? `/projects?filter=${filter}` : '/projects')
  }

  return <CreateEntry />
}
