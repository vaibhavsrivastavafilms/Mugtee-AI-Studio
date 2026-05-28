import { redirect } from 'next/navigation'
import { cinematicLegacyRedirectTarget } from '@/lib/create/routes'

export const dynamic = 'force-dynamic'

type Props = { searchParams?: { project?: string } }

function toSearchParams(sp?: { project?: string }) {
  const qs = new URLSearchParams()
  if (sp?.project) qs.set('project', sp.project)
  return qs
}

export default function CinematicPreviewRedirect({ searchParams }: Props) {
  redirect(cinematicLegacyRedirectTarget('/cinematic/preview', toSearchParams(searchParams)))
}
