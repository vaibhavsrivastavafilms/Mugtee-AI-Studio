import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function ScriptsPage() {
  redirect('/create?tab=scripts')
}
