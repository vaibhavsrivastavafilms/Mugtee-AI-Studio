import { redirect } from 'next/navigation'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SignUpPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const next = typeof params.next === 'string' ? params.next : undefined
  const query = new URLSearchParams({ mode: 'signup' })
  if (next) query.set('next', next)
  redirect(`/auth/login?${query.toString()}`)
}
