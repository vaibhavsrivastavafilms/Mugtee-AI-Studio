// Mugtee Workspace — server layout that auth-gates the cinematic creator route.
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { tryCreateSupabaseServerClient } from '@/lib/supabase/server'
import { APP_ROUTE_LOGIN_FALLBACK, loginRedirectUrl } from '@/lib/auth/public-routes'

export const dynamic = 'force-dynamic'

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const supabase = await tryCreateSupabaseServerClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null

  if (!user) {
    const pathname = (await headers()).get('x-pathname') ?? APP_ROUTE_LOGIN_FALLBACK
    redirect(loginRedirectUrl(pathname))
  }

  return (
    <div className="min-h-[100dvh] min-w-0 overflow-x-hidden bg-background text-foreground">
      {children}
    </div>
  )
}
