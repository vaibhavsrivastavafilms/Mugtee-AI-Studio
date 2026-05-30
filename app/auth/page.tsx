import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Canonical auth entry — forwards to login with preserved query string. */
export default function AuthIndexPage({
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
  redirect(q ? `/auth/login?${q}` : '/auth/login')
}
