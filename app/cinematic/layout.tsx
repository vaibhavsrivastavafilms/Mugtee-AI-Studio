// Mugtee cinematic workflow — auth-gated immersive creator routes.
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { tryCreateSupabaseServerClient } from '@/lib/supabase/server'
import { APP_ROUTE_LOGIN_FALLBACK, loginRedirectUrl } from '@/lib/auth/public-routes'

export const dynamic = 'force-dynamic'

export default async function CinematicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = (await headers()).get('x-pathname') ?? ''
  const isPublicExample = pathname.startsWith('/cinematic/examples')

  if (isPublicExample) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground">{children}</div>
    )
  }

  const supabase = await tryCreateSupabaseServerClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null

  if (!user) {
    redirect(loginRedirectUrl(pathname || APP_ROUTE_LOGIN_FALLBACK))
  }

  return <div className="min-h-[100dvh] bg-background text-foreground">{children}</div>
}
