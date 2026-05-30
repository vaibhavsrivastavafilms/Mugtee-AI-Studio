import { redirect } from 'next/navigation'
import { STUDIO } from '@/lib/create/routes'

export default function AnalyticsRedirectPage() {
  redirect(STUDIO.analytics)
}
