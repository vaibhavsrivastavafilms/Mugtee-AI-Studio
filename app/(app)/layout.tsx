import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/shell/dashboard-shell'
import { MugteeAssistant } from '@/components/mugtee/mugtee-assistant'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <DashboardShell user={user}>
      {children}
      <MugteeAssistant />
    </DashboardShell>
  )
}
