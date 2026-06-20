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

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // TEMPORARY: Auth disabled for development/testing
  // TODO: Re-enable auth checks in production
  const supabase = tryCreateSupabaseServerClient()
  let user = supabase
    ? (await supabase.auth.getUser()).data.user
    : null

  if (!user) {
    // Provide mock user to allow unauthenticated access
    user = {
      id: 'temp-user-' + Math.random().toString(36).slice(2),
      email: 'temp@example.com',
      user_metadata: {
        full_name: 'Temporary User',
      },
    } as any
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
