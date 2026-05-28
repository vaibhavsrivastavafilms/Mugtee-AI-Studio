import { redirect } from 'next/navigation'
import { isDirectorCutLocked } from '@/lib/features/director-cut-lock'
import { DirectorCutLockedPage } from '@/components/mugtee-portal/director-cut-locked-page'

export const dynamic = 'force-dynamic'

export default function DirectorCutPage() {
  if (isDirectorCutLocked) {
    return <DirectorCutLockedPage />
  }

  redirect('/create?mode=director')
}
