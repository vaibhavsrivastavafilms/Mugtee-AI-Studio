import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CompanionHomePage } from '@/components/home/companion-home-page'
import { canAccessLiveCompanion } from '@/lib/companion/access'
import { tryCreateSupabaseServerClient } from '@/lib/supabase/server'
import { STUDIO } from '@/lib/create/routes'

export const metadata: Metadata = {
  title: 'Mugtee · Story Companion',
  description:
    'Your cinematic guide inside Mugtee Studio — creator memory, hooks, and visual direction for your next reel.',
}

export default async function HomeCompanionPage() {
  const supabase = tryCreateSupabaseServerClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null
  if (!user || !canAccessLiveCompanion(user)) {
    redirect(STUDIO.root)
  }
  return <CompanionHomePage />
}
