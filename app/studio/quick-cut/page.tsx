import { redirect } from 'next/navigation'
import { STUDIO } from '@/lib/create/routes'

/** Legacy /studio/quick-cut — canonical route is /studio/quick. */
export default function StudioQuickCutRedirectPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') qs.set(key, value)
    else if (Array.isArray(value) && value[0]) qs.set(key, value[0])
  }
  const q = qs.toString()
  redirect(q ? `${STUDIO.quick}?${q}` : STUDIO.quick)
}
