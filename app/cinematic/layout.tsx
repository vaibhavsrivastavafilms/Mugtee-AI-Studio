// Mugtee cinematic workflow — auth-gated immersive creator routes.
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { tryCreateSupabaseServerClient } from '@/lib/supabase/server'

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
      <div className="min-h-screen bg-background text-foreground">{children}</div>
    )
  }

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

  return <div className="min-h-screen bg-background text-foreground">{children}</div>
}
