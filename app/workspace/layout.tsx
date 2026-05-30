// Mugtee Workspace — server layout that auth-gates the cinematic creator route.
// Outside the (app) shell so it owns its own immersive 3-panel layout.
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loginRedirectUrl } from '@/lib/auth/public-routes'

export const dynamic = 'force-dynamic'

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(loginRedirectUrl('/studio/director'))
  return <div className="min-h-screen bg-background text-foreground">{children}</div>
}
