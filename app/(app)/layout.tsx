import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/shell/dashboard-shell'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  // V3.4 — Floating <MugteeAssistant /> removed. Its functionality (voice, intent routing,
  // hooks, narration, AudioSpectrumLogo) is now consolidated into the unified ViralQuickStart
  // hero on /dashboard per the Unified Cinematic Workflow mandate. One workflow, one entry point.
  return (
    <DashboardShell user={{ id: user.id, email: user.email, user_metadata: user.user_metadata }}>
      {children}
    </DashboardShell>
  )
}
