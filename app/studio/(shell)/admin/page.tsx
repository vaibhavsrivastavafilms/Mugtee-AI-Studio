import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isAdminUser } from '@/lib/admin/is-admin'
import { loginRedirectUrl } from '@/lib/auth/public-routes'
import { CreatorValidationDashboard } from '@/components/admin/creator-validation-dashboard'

export const dynamic = 'force-dynamic'

export default async function StudioAdminPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(loginRedirectUrl('/studio/admin'))
  if (!isAdminUser(user)) redirect('/studio')

  return (
    <main className="min-h-[calc(100dvh-4rem)] px-4 sm:px-6 py-8">
      <CreatorValidationDashboard />
    </main>
  )
}
