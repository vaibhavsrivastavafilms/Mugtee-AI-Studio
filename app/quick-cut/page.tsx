import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Legacy /quick-cut — canonical route is /create?mode=quick. */
export default function QuickCutLegacyPage() {
  redirect('/create?mode=quick')
}
