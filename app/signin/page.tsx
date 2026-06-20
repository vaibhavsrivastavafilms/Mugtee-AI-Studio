import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Legacy /signin — forwards to canonical auth login. */
export default async function SigninRedirectPage({ searchParams }: Props) {
  const sp = await searchParams
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === 'string') qs.set(key, value)
    else if (Array.isArray(value) && value[0]) qs.set(key, value[0])
  }
  const q = qs.toString()
  redirect(q ? `/auth/login?${q}` : '/auth/login')
}
