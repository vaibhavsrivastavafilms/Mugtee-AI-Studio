import { redirect } from 'next/navigation'
import { STUDIO } from '@/lib/create/routes'

export const dynamic = 'force-dynamic'

/** Legacy /quick-cut — canonical route is /studio/quick. */
export default function QuickCutLegacyPage() {
  redirect(STUDIO.quick)
}
