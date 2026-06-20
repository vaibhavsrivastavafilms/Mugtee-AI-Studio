import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { tryCreateSupabaseServerClient } from '@/lib/supabase/server'
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
  const supabase = tryCreateSupabaseServerClient()
  const user = supabase
    ? (await supabase.auth.getUser()).data.user
    : null

  if (!user) {
    const pathname = (await headers()).get('x-pathname') ?? APP_ROUTE_LOGIN_FALLBACK
    redirect(loginRedirectUrl(pathname))
  }

  return (
    <DashboardShell user={user}>
      {children}
      <Suspense fallback={null}>
        <MugteeAssistant />
      </Suspense>
    </DashboardShell>
  )
}
