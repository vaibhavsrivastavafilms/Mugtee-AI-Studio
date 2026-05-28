import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Record<string, string | string[] | undefined>
}

/** Legacy /login — forwards to canonical mode-aware auth route. */
export default function LoginRedirectPage({ searchParams }: Props) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') qs.set(key, value)
    else if (Array.isArray(value) && value[0]) qs.set(key, value[0])
  }
  const q = qs.toString()
  redirect(q ? `/auth/login?${q}` : '/auth/login')
}
