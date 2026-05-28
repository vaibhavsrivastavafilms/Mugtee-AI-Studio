import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function QuickCutPage() {
  redirect('/create?mode=quick')
}
