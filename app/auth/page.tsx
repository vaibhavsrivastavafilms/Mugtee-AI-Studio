import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Canonical auth entry — forwards to login with preserved query string. */
export default async function AuthIndexPage({
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
  redirect(q ? `/auth/login?${q}` : '/auth/login')
}
