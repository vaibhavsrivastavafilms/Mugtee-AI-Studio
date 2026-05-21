import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/shell/dashboard-shell'
import { MugteeAssistant } from '@/components/mugtee/mugtee-assistant'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  // V3.7 — Floating <MugteeAssistant /> RESTORED as a lightweight ambient orb.
  // It auto-hides on /dashboard (where the unified studio owns the orb + input) and
  // on landing/legal routes, so there is no duplication with the central workflow.
  // Pure CSS Mugtee Orb (4 states) + the existing voice/intent/chat logic — no new
  // architecture, no avatar engine.
  return (
    <DashboardShell user={{ id: user.id, email: user.email, user_metadata: user.user_metadata }}>
      {children}
      <MugteeAssistant />
    </DashboardShell>
  )
}
