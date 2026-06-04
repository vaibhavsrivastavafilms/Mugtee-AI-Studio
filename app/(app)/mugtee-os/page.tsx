import { redirect } from 'next/navigation'
import { MugteeOsShell } from '@/components/mugtee-os/mugtee-os-shell'
import { canAccessLiveCompanion } from '@/lib/companion/access'
import { STUDIO } from '@/lib/create/routes'
import { tryCreateSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function MugteeOsPage() {
  const supabase = tryCreateSupabaseServerClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null
  if (!user || !canAccessLiveCompanion(user)) {
    redirect(STUDIO.root)
  }
  return (
    <main className="min-h-[calc(100dvh-4rem)] px-4 sm:px-6 py-8">
      <MugteeOsShell />
    </main>
  )
}
