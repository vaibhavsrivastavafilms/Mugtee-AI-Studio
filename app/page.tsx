// Phase — Cinematic landing page (replaces redirect-only page).
// Auth-aware: signed-in users still skip straight to /dashboard.
// Visual system uses existing tokens: bg-gold-gradient · glass-strong · shadow-gold-glow ·
// border-gold-soft · text-gold-gradient. No new deps, no new CSS.

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import LandingClient from './landing-client'

export const dynamic = 'force-dynamic'

export default async function Index() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/dashboard')
  } catch {}
  return <LandingClient />
}
