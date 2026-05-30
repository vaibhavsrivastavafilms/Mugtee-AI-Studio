import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  APP_ROUTE_LOGIN_FALLBACK,
  loginRedirectUrl,
} from '@/lib/auth/public-routes'
import DashboardShell from '@/components/shell/dashboard-shell'
import { MugteeAssistant } from '@/components/mugtee/mugtee-assistant'

export const dynamic = 'force-dynamic'

export default async function StudioShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const pathname = headers().get('x-pathname') ?? APP_ROUTE_LOGIN_FALLBACK
    redirect(loginRedirectUrl(pathname))
  }

  return (
    <DashboardShell user={user}>
      {children}
      <MugteeAssistant />
    </DashboardShell>
  )
}
