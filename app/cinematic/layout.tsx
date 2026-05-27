// Mugtee cinematic workflow — auth-gated immersive creator routes.
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function CinematicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = headers().get('x-pathname') ?? ''
  const isPublicExample = pathname.startsWith('/cinematic/examples')

  if (isPublicExample) {
    return (
      <div className="min-h-screen bg-background text-foreground">{children}</div>
    )
  }

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const next =
      pathname.startsWith('/cinematic') && pathname.length > 1
        ? pathname
        : '/cinematic/create'
    redirect(`/login?next=${encodeURIComponent(next)}`)
  }

  return <div className="min-h-screen bg-background text-foreground">{children}</div>
}
