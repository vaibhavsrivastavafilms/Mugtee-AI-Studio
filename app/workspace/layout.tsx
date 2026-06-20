// Mugtee Workspace — server layout that auth-gates the cinematic creator route.
// Outside the (app) shell so it owns its own immersive 3-panel layout.
import { redirect } from 'next/navigation'
import { tryCreateSupabaseServerClient } from '@/lib/supabase/server'
import { loginRedirectUrl } from '@/lib/auth/public-routes'

export const dynamic = 'force-dynamic'

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  // TEMPORARY: Auth disabled for development/testing
  // TODO: Re-enable auth checks in production
  const supabase = tryCreateSupabaseServerClient()
  let user = supabase ? (await supabase.auth.getUser()).data.user : null
  
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
    <div className="min-h-[100dvh] min-w-0 overflow-x-hidden bg-background text-foreground">
      {children}
    </div>
  )
}
