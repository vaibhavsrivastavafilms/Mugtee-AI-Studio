import { redirect } from 'next/navigation'
import { STUDIO } from '@/lib/create/routes'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Record<string, string | string[] | undefined>
}

/** Legacy /studio/workspace — forwards to Director Mode. */
export default function StudioWorkspaceRedirectPage({ searchParams }: Props) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') qs.set(key, value)
    else if (Array.isArray(value) && value[0]) qs.set(key, value[0])
  }
  const q = qs.toString()
  redirect(q ? `${STUDIO.director}?${q}` : STUDIO.director)
}
