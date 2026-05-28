import { redirect } from 'next/navigation'
import { cinematicLegacyRedirectTarget } from '@/lib/create/routes'
import { isDirectorCutLocked } from '@/lib/features/director-cut-lock'
import { DirectorCutLockedPage } from '@/components/mugtee-portal/director-cut-locked-page'

export const dynamic = 'force-dynamic'

type Props = { searchParams?: { project?: string } }

function toSearchParams(sp?: { project?: string }) {
  const qs = new URLSearchParams()
  if (sp?.project) qs.set('project', sp.project)
  return qs
}

export default function CinematicCreateRedirect({ searchParams }: Props) {
  if (isDirectorCutLocked && !searchParams?.project) {
    return <DirectorCutLockedPage showBack />
  }

  redirect(cinematicLegacyRedirectTarget('/cinematic/create', toSearchParams(searchParams)))
}
