import { redirect } from 'next/navigation'
import { STUDIO } from '@/lib/create/routes'

/** Legacy /studio/quick-cut — canonical route is /studio/quick. */
export default async function StudioQuickCutRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === 'string') qs.set(key, value)
    else if (Array.isArray(value) && value[0]) qs.set(key, value[0])
  }
  const q = qs.toString()
  redirect(q ? `${STUDIO.quick}?${q}` : STUDIO.quick)
}
