import { redirect } from 'next/navigation'

/** Legacy /studio/quick-cut — canonical route is /create?mode=quick. */
export default function StudioQuickCutRedirectPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const qs = new URLSearchParams({ mode: 'quick' })
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'mode') continue
    if (typeof value === 'string') qs.set(key, value)
    else if (Array.isArray(value) && value[0]) qs.set(key, value[0])
  }
  redirect(`/create?${qs.toString()}`)
}
